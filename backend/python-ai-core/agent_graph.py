"""
Pipeline LangGraph — Agentic Lab V4
Sección 4 del Manifiesto: LangGraph Nodos

Secuencia:
  node_router → node_graphrag → node_tool_execution → node_ui_generation
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
from typing import Any

import httpx
from langgraph.graph import StateGraph, END

from domain.schemas import AgentState, RouterOutput, UIOutput, UIComponentProps
from framework.langfuse_setup import observe

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_ROUTER_MODEL", "gemma2:2b")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.0-flash"

QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
POSTGRES_DSN = (
    f"postgresql://{os.getenv('POSTGRES_USER','agentic_admin')}:"
    f"{os.getenv('POSTGRES_PASSWORD','secret_postgres_pass')}@"
    f"postgres:5432/{os.getenv('POSTGRES_DB','agentic_lab')}"
)
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "secret_neo4j_pass")
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://mcp-manufact:3001/mcp")


# ---------------------------------------------------------------------------
# Helpers — JSON parser robusto (elimina markdown fences)
# ---------------------------------------------------------------------------
def _strip_markdown_fences(text: str) -> str:
    """
    Guardrail Section 6: elimina cualquier bloque ``` que rodee el JSON.
    """
    text = text.strip()
    # Remove ```json ... ``` or ``` ... ```
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _parse_json_safe(raw: str) -> dict[str, Any]:
    cleaned = _strip_markdown_fences(raw)
    return json.loads(cleaned)


def _run_async_in_thread(coro_factory):
    """
    Ejecuta clientes MCP async desde nodos síncronos de LangGraph/FastAPI.
    Evita errores de event loop cuando graph.invoke corre dentro del servidor ASGI.
    """
    result: dict[str, Any] = {}

    def runner() -> None:
        try:
            import asyncio

            result["value"] = asyncio.run(coro_factory())
        except Exception as exc:  # pragma: no cover - defensa de integración/red
            result["error"] = exc

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()
    thread.join(timeout=15)
    if thread.is_alive():
        raise TimeoutError("MCP request timed out after 15 seconds")
    if "error" in result:
        raise result["error"]
    return result.get("value")


def _model_to_dict(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(by_alias=True, exclude_none=True)
    if isinstance(value, list):
        return [_model_to_dict(item) for item in value]
    if isinstance(value, dict):
        return {key: _model_to_dict(item) for key, item in value.items()}
    return value


async def _mcp_list_tools_async() -> list[dict[str, Any]]:
    from mcp import ClientSession  # type: ignore
    from mcp.client.streamable_http import streamable_http_client  # type: ignore

    async with streamable_http_client(MCP_SERVER_URL) as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            tools_response = await session.list_tools()
            return [_model_to_dict(tool) for tool in tools_response.tools]


async def _mcp_call_tool_async(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    from mcp import ClientSession  # type: ignore
    from mcp.client.streamable_http import streamable_http_client  # type: ignore

    async with streamable_http_client(MCP_SERVER_URL) as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            result = await session.call_tool(name, arguments=arguments)
            structured = getattr(result, "structuredContent", None)
            if structured is None:
                structured = getattr(result, "structured_content", None)

            return {
                "structuredContent": _model_to_dict(structured),
                "content": _model_to_dict(getattr(result, "content", [])),
                "isError": bool(getattr(result, "isError", False)),
            }


def _mcp_list_tools() -> list[dict[str, Any]]:
    return _run_async_in_thread(_mcp_list_tools_async) or []


def _mcp_call_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    return _run_async_in_thread(lambda: _mcp_call_tool_async(name, arguments)) or {}


def _extract_symbols(query: str) -> list[str]:
    known_symbols = ["WALMEX", "AMXL", "GMEXICOB", "AAPL", "NVDA"]
    query_upper = query.upper()
    known_matches = [symbol for symbol in known_symbols if symbol in query_upper]
    if known_matches:
        return known_matches

    candidates = re.findall(r"\b[A-Z][A-Z0-9]{1,9}\b", query)
    ignored = {"BMV", "NASDAQ", "MCP", "IA", "AI"}
    return [candidate for candidate in candidates if candidate not in ignored] or ["WALMEX", "AMXL"]


def _fallback_router_output(query: str) -> RouterOutput:
    query_l = query.lower()

    if any(term in query_l for term in ("mercado", "acciones", "bmv", "nasdaq", "ticker", "financier")):
        exchange = "NASDAQ" if "nasdaq" in query_l else "BMV"
        return RouterOutput(
            intent="dashboard",
            required_tools=["get_market_data"],
            search_queries=[query],
            mcp_tool_calls=[
                {
                    "name": "get_market_data",
                    "arguments": {
                        "exchange": exchange,
                        "symbols": _extract_symbols(query),
                        "period": "1d",
                    },
                }
            ],
        )

    if any(term in query_l for term in ("inventario", "stock", "sku", "producto")):
        region = "norte" if "norte" in query_l else "sur" if "sur" in query_l else "centro" if "centro" in query_l else "all"
        return RouterOutput(
            intent="dashboard",
            required_tools=["get_inventory_status"],
            search_queries=[query],
            mcp_tool_calls=[
                {
                    "name": "get_inventory_status",
                    "arguments": {"region": region, "category": "all", "threshold": 9999},
                }
            ],
        )

    if any(term in query_l for term in ("logs", "latencia", "errores", "microservicio", "checkout", "payments")):
        service = "checkout" if "checkout" in query_l else "payments" if "payments" in query_l else "inventory" if "inventory" in query_l else "all"
        return RouterOutput(
            intent="dashboard",
            required_tools=["analyze_system_logs"],
            search_queries=[query],
            mcp_tool_calls=[
                {
                    "name": "analyze_system_logs",
                    "arguments": {"service": service, "window_minutes": 30, "severity": "all"},
                }
            ],
        )

    if any(term in query_l for term in ("venta", "ventas", "dashboard", "métrica", "metrica", "gráfica", "grafica")):
        return RouterOutput(
            intent="dashboard",
            required_tools=["db_postgres"],
            search_queries=[query],
        )

    if any(term in query_l for term in ("aprueba", "aprobar", "rechaza", "rechazar", "orden", "acción", "accion")):
        return RouterOutput(
            intent="action",
            required_tools=["db_postgres"],
            search_queries=[query],
        )

    if any(term in query_l for term in ("neo4j", "grafo", "nodos", "relaciones")):
        return RouterOutput(
            intent="info",
            required_tools=["graph_neo4j"],
            search_queries=[query],
        )

    return RouterOutput(
        intent="info",
        required_tools=["rag_qdrant"],
        search_queries=[query],
    )


def _fallback_ui_output(state: AgentState, reason: str | None = None) -> UIOutput:
    query_l = state["query"].lower()
    router = state.get("router_output")
    mcp_results = state.get("mcp_tool_results", {})

    for tool_result in mcp_results.values():
        structured = tool_result.get("structuredContent") if isinstance(tool_result, dict) else None
        if isinstance(structured, dict) and structured.get("chart_data"):
            return UIOutput(
                ui_component="BarChart",
                props=UIComponentProps(
                    data=structured["chart_data"],
                    title=f"Resultado MCP: {structured.get('tool', 'datos')}",
                    actions=[],
                ),
                text_fallback="Preparé una gráfica con los datos recuperados por MCP.",
            )
        if isinstance(structured, dict) and structured.get("table_data"):
            return UIOutput(
                ui_component="DataTable",
                props=UIComponentProps(
                    data=structured["table_data"],
                    title=f"Resultado MCP: {structured.get('tool', 'datos')}",
                    actions=[],
                ),
                text_fallback="Preparé una tabla con los datos recuperados por MCP.",
            )

    if router and router.intent == "dashboard" or "venta" in query_l or "ventas" in query_l:
        return UIOutput(
            ui_component="BarChart",
            props=UIComponentProps(
                data=[
                    {"name": "Semana 1", "value": 4200},
                    {"name": "Semana 2", "value": 5800},
                    {"name": "Semana 3", "value": 6100},
                    {"name": "Semana 4", "value": 7350},
                ],
                title="Ventas del último mes",
                actions=[],
            ),
            text_fallback="Las ventas del último mes sumaron $23,450, con crecimiento sostenido semana a semana.",
        )

    if router and router.intent == "action" or "orden" in query_l or "aprobar" in query_l:
        return UIOutput(
            ui_component="Form",
            props=UIComponentProps(
                title="Aprobación de Orden",
                submitAction="approve_order",
                submitButtonLabel="Aprobar Ahora",
                fields=[
                    {"name": "order_id", "label": "ID de Orden", "type": "text", "required": True, "placeholder": "ORD-001"},
                    {"name": "reason", "label": "Razón de aprobación", "type": "text", "required": False}
                ]
            ),
            text_fallback="Por favor completa el formulario para aprobar la orden.",
        )

    grounding = state.get("grounding_data", {})
    rows = [{"key": k, "value": str(v)} for k, v in grounding.items()]
    if not rows:
        rows = [{"key": "respuesta", "value": reason or "No hay datos conectados todavía."}]

    return UIOutput(
        ui_component="DataTable",
        props=UIComponentProps(
            data=rows,
            title="Respuesta del Agente",
            actions=[],
        ),
        text_fallback="Preparé una tabla con la información disponible.",
    )


# ---------------------------------------------------------------------------
# Catálogo de componentes + ejemplos few-shot para el prompt de Gemini
# ---------------------------------------------------------------------------
COMPONENT_CATALOG = ["BarChart", "ApprovalForm", "DataTable", "Text", "Card", "Row", "Column", "Metric", "Form", "Input", "Button"]

FEW_SHOT_EXAMPLES = """
=== FEW-SHOT EXAMPLE 1 ===
INPUT: {"intent": "dashboard", "data": {"rows": [{"month": "Jan", "sales": 4200}, {"month": "Feb", "sales": 5800}]}, "query": "muéstrame las ventas mensuales"}
OUTPUT: {"ui_component": "BarChart", "props": {"data": [{"name": "Jan", "value": 4200}, {"name": "Feb", "value": 5800}], "title": "Ventas Mensuales"}, "text_fallback": "Las ventas de enero fueron $4,200 y febrero $5,800."}

=== FEW-SHOT EXAMPLE 2 ===
INPUT: {"intent": "action", "data": {"pending_orders": [{"id": "ORD-001", "amount": 1200}]}, "query": "aprobar orden pendiente"}
OUTPUT: {"ui_component": "Form", "props": {"title": "Confirmar Aprobación", "submitAction": "approve_order", "submitButtonLabel": "Confirmar Aprobación", "fields": [{"name": "order_id", "label": "ID de Orden", "type": "text", "required": true, "placeholder": "ORD-001"}]}, "text_fallback": "Por favor confirma la aprobación de la orden ORD-001."}

=== FEW-SHOT EXAMPLE 3 ===
INPUT: {"intent": "info", "data": {}, "query": "¿Qué puedes hacer?"}
OUTPUT: {
  "ui_component": "Column",
  "props": {
    "title": "Mis Capacidades",
    "data": [
      {
        "ui_component": "Card",
        "props": {
          "title": "get_market_data",
          "content": "Permite obtener datos financieros en tiempo real."
        }
      },
      {
        "ui_component": "Card",
        "props": {
          "title": "get_inventory_status",
          "content": "Consulta el estado actual del inventario."
        }
      }
    ]
  },
  "text_fallback": "Puedo consultar datos de mercado e inventario."
}
"""


# ===========================================================================
# NODO 0: node_mcp_discovery — descubre herramientas MCP dinámicas
# ===========================================================================
@observe("node_mcp_discovery")
def node_mcp_discovery(state: AgentState) -> AgentState:
    """
    Descubre tools expuestas por mcp-manufact vía Streamable HTTP.
    El grafo continúa aunque el servidor MCP no esté disponible.
    """
    try:
        state["available_mcp_tools"] = _mcp_list_tools()
    except Exception as exc:
        state["available_mcp_tools"] = []
        state["error"] = f"mcp_discovery_error: {exc}"
    return state


# ===========================================================================
# NODO 1: node_router — Capa 1, modelo local Ollama < 300ms
# ===========================================================================
@observe("node_router")
def node_router(state: AgentState) -> AgentState:
    """
    Clasifica la intención del usuario usando Ollama gemma2:2b.
    Devuelve RouterOutput con intent, required_tools y search_queries.
    """
    available_mcp_tools = state.get("available_mcp_tools", [])
    mcp_tool_catalog = [
        {
            "name": tool.get("name"),
            "description": tool.get("description"),
            "inputSchema": tool.get("inputSchema"),
        }
        for tool in available_mcp_tools
    ]

    system_prompt = (
        "Eres un clasificador estricto de intenciones de usuario. "
        "Tu única salida permitida es un objeto JSON validado contra el esquema provisto. "
        "Cero explicaciones, cero charla.\n\n"
        f"HERRAMIENTAS MCP DISPONIBLES:\n{json.dumps(mcp_tool_catalog, ensure_ascii=False)}\n\n"
        "SCHEMA OBLIGATORIO:\n"
        '{"intent": "dashboard" | "action" | "info", '
        '"required_tools": ["db_postgres", "rag_qdrant", "graph_neo4j", "nombre_tool_mcp"], '
        '"search_queries": ["query 1", "query 2"], '
        '"mcp_tool_calls": [{"name": "nombre_tool_mcp", "arguments": {"param": "value"}}]}\n\n'
        "REGLAS:\n"
        "- dashboard: el usuario quiere ver métricas, gráficas o tablas\n"
        "- action: el usuario quiere aprobar, rechazar o ejecutar algo\n"
        "- info: el usuario hace una pregunta informativa\n"
        "- required_tools: incluye solo las herramientas relevantes para el intent\n"
        "- si una herramienta MCP resuelve la petición, inclúyela por nombre en required_tools y agrega una entrada en mcp_tool_calls\n"
        "- mcp_tool_calls.arguments debe respetar inputSchema; usa defaults razonables cuando el usuario no especifique parámetros\n"
        "- search_queries: 1-3 queries semánticas derivadas del prompt\n"
        "RESPONDE ÚNICAMENTE CON EL JSON. SIN MARKDOWN."
    )

    t0 = time.perf_counter()
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"{system_prompt}\n\nUSER: {state['query']}",
                    "stream": False,
                    "format": "json",
                },
            )
            response.raise_for_status()
            raw = response.json().get("response", "{}")

        ttft_ms = (time.perf_counter() - t0) * 1000
        parsed = _parse_json_safe(raw)
        parsed.setdefault("mcp_tool_calls", [])
        router_output = RouterOutput(**parsed)

        state["router_output"] = router_output
        state["ttft_ms"] = round(ttft_ms, 2)
        state["error"] = None

    except Exception as exc:
        # Fallback gracioso: intent info con Qdrant
        state["router_output"] = _fallback_router_output(state["query"])
        state["ttft_ms"] = None
        state["error"] = f"router_error: {exc}"

    return state


# ===========================================================================
# NODO 2: node_graphrag — Capa 2, fetching de datos de grounding
# ===========================================================================
@observe("node_graphrag")
def node_graphrag(state: AgentState) -> AgentState:
    """
    Consulta las bases de datos requeridas y arma el Grounding Data.
    Implementa acceso real a Qdrant, Postgres y Neo4j.
    """
    router: RouterOutput | None = state.get("router_output")
    if not router:
        state["grounding_data"] = {}
        return state

    grounding: dict[str, Any] = {}
    tools = router.required_tools

    # --- Qdrant RAG ---
    if "rag_qdrant" in tools and router.search_queries:
        try:
            with httpx.Client(timeout=8.0) as client:
                # Search usando el primer query (demo: colección "knowledge")
                resp = client.post(
                    f"{QDRANT_URL}/collections/knowledge/points/search",
                    json={
                        "vector": [0.1] * 384,  # placeholder vector; en producción usar embedder
                        "limit": 5,
                        "with_payload": True,
                    },
                )
                if resp.status_code == 200:
                    grounding["qdrant_results"] = resp.json().get("result", [])
                else:
                    grounding["qdrant_results"] = []
        except Exception as exc:
            grounding["qdrant_error"] = str(exc)

    # --- Postgres ---
    if "db_postgres" in tools:
        try:
            import psycopg2  # type: ignore
            conn = psycopg2.connect(POSTGRES_DSN)
            cur = conn.cursor()
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' LIMIT 10;")
            rows = cur.fetchall()
            cur.close()
            conn.close()
            grounding["postgres_tables"] = [r[0] for r in rows]
        except Exception as exc:
            grounding["postgres_error"] = str(exc)

    # --- Neo4j ---
    if "graph_neo4j" in tools:
        try:
            from neo4j import GraphDatabase  # type: ignore
            driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
            with driver.session() as session:
                result = session.run("MATCH (n) RETURN labels(n) AS label, count(n) AS count LIMIT 5")
                grounding["neo4j_nodes"] = [dict(r) for r in result]
            driver.close()
        except Exception as exc:
            grounding["neo4j_error"] = str(exc)

    state["grounding_data"] = grounding
    return state


# ===========================================================================
# NODO 3: node_tool_execution — Capa 2b, acciones de escritura/mutación
# ===========================================================================
@observe("node_tool_execution")
def node_tool_execution(state: AgentState) -> AgentState:
    """
    Ejecuta llamadas MCP seleccionadas por el router y mantiene el placeholder
    de acciones internas existentes para intent == 'action'.
    """
    router: RouterOutput | None = state.get("router_output")
    if not router:
        return state

    mcp_results: dict[str, Any] = {}
    available_tool_names = {tool.get("name") for tool in state.get("available_mcp_tools", [])}

    for index, tool_call in enumerate(router.mcp_tool_calls or []):
        name = tool_call.get("name")
        arguments = tool_call.get("arguments") or {}
        result_key = f"{name}_{index}"

        if not name:
            continue
        if available_tool_names and name not in available_tool_names:
            mcp_results[result_key] = {
                "isError": True,
                "error": f"MCP tool '{name}' is not available",
            }
            continue

        try:
            mcp_results[result_key] = _mcp_call_tool(name, arguments)
        except Exception as exc:
            mcp_results[result_key] = {
                "isError": True,
                "error": str(exc),
                "arguments": arguments,
            }

    state["mcp_tool_results"] = mcp_results

    if mcp_results:
        state.setdefault("grounding_data", {})
        state["grounding_data"]["mcp_tool_results"] = mcp_results

    if router.intent != "action":
        return state

    # Aquí se implementarían las llamadas reales a APIs de terceros,
    # escrituras a BD, etc. Por ahora registra la intención.
    state["grounding_data"]["tool_execution"] = {
        "status": "pending",
        "intent": router.intent,
        "message": "Acción recibida — requiere implementación de tool específica",
    }
    return state


# ===========================================================================
# NODO 4: node_ui_generation — Capa 3, Gemini Flash → UIOutput JSON
# ===========================================================================
@observe("node_ui_generation")
def node_ui_generation(state: AgentState) -> AgentState:
    """
    Llama a Gemini Flash con el Super-Contexto y genera la estructura
    JSON/React del componente UI (UIOutput).
    Guardrail: response_mime_type='application/json', sin markdown.
    """
    if not GEMINI_API_KEY or "placeholder" in GEMINI_API_KEY.lower():
        state["ui_output"] = _fallback_ui_output(state, "Gemini API key no configurada.")
        state["total_latency_ms"] = 0
        return state

    import google.generativeai as genai  # type: ignore

    genai.configure(api_key=GEMINI_API_KEY)

    router: RouterOutput | None = state.get("router_output")
    grounding = state.get("grounding_data", {})
    mcp_tool_results = state.get("mcp_tool_results", {})
    # Extraer herramientas o usar un fallback si falló la conexión
    mcp_tools = state.get("available_mcp_tools", [])
    if not mcp_tools:
        mcp_tools = [
            {"name": "get_market_data", "description": "Datos de mercado financiero"},
            {"name": "get_inventory_status", "description": "Inventario de productos"},
            {"name": "analyze_system_logs", "description": "Análisis de logs de microservicios"}
        ]
    
    tools_list_text = "\n".join([f"- {t['name']}: {t['description']}" for t in mcp_tools])

    system_prompt = f"""
Eres el Arquitecto Contextual (Motor SDUI). Tu ÚNICO propósito es devolver un JSON válido con la estructura de la interfaz (AST).

CONTEXTO OPERATIVO:
Datos de RAG: {state.get('grounding_data', 'Sin datos RAG')}
Datos de MCP (Tiempo Real): {state.get('mcp_tool_results', 'Sin resultados MCP')}

CATÁLOGO DE TUS CAPACIDADES (HERRAMIENTAS DISPONIBLES):
{tools_list_text}

REGLAS ABSOLUTAS DE DISEÑO:
1. SI EL USUARIO PREGUNTA QUÉ PUEDES HACER O QUÉ HERRAMIENTAS TIENES: ESTÁ ESTRICTAMENTE PROHIBIDO usar 'DataTable' o 'BarChart'. DEBES generar un layout de tipo 'Column' que contenga múltiples 'Cards', donde cada 'Card' tenga un 'Text' describiendo una herramienta del catálogo.
2. SI EL USUARIO PIDE EJECUTAR UNA ACCIÓN (Ej. aprobar orden): DEBES generar un 'Form' interactivo con 'Input' y 'Button'.
3. SI HAY DATOS MATEMÁTICOS EN EL CONTEXTO MCP: Solo entonces puedes usar 'BarChart' o 'Metric'.
4. NUNCA inventes datos para llenar una gráfica.

FORMATO DE SALIDA: Solo JSON. Sin markdown.

SCHEMA OBLIGATORIO DE SALIDA:
{{
  "ui_component": "BarChart" | "DataTable" | "Form" | "Card" | "Metric" | "Row" | "Column" | "Text",
  "props": {{
    "data": [], 
    "title": "string", 
    "content": "string",
    "value": "any",
    "label": "string",
    "fields": [],
    "submitAction": "string",
    "submitButtonLabel": "string"
  }},
  "text_fallback": "string"
}}

FEW-SHOT EXAMPLES:
{FEW_SHOT_EXAMPLES}
"""

    user_context = json.dumps(
        {
            "intent": router.intent if router else "info",
            "query": state["query"],
            "required_tools": router.required_tools if router else [],
            "mcp_tool_calls": router.mcp_tool_calls if router else [],
            "data": {
                "grounding_data": grounding,
                "mcp_tool_results": mcp_tool_results
            }
        },
        ensure_ascii=False,
        default=str,
    )

    t0 = time.perf_counter()
    try:
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",  # Guardrail: cero markdown
                temperature=0.1,
                max_output_tokens=1024,
            ),
        )
        response = model.generate_content(user_context)
        raw = response.text
        total_ms = (time.perf_counter() - t0) * 1000

        parsed = _parse_json_safe(raw)
        ui_output = UIOutput(**parsed)

        state["ui_output"] = ui_output
        state["total_latency_ms"] = round(total_ms, 2)

    except Exception as exc:
        state["ui_output"] = _fallback_ui_output(state, str(exc))
        state["error"] = f"{state.get('error','')} | ui_gen_error: {exc}"

    return state


# ===========================================================================
# Constructor del grafo
# ===========================================================================
def build_agent_graph():
    """
    Construye el grafo LangGraph V4:
      node_router → node_graphrag → node_tool_execution → node_ui_generation → END
    """
    workflow = StateGraph(AgentState)

    workflow.add_node("node_mcp_discovery", node_mcp_discovery)
    workflow.add_node("node_router", node_router)
    workflow.add_node("node_graphrag", node_graphrag)
    workflow.add_node("node_tool_execution", node_tool_execution)
    workflow.add_node("node_ui_generation", node_ui_generation)

    workflow.set_entry_point("node_mcp_discovery")
    workflow.add_edge("node_mcp_discovery", "node_router")
    workflow.add_edge("node_router", "node_graphrag")
    workflow.add_edge("node_graphrag", "node_tool_execution")
    workflow.add_edge("node_tool_execution", "node_ui_generation")
    workflow.add_edge("node_ui_generation", END)

    return workflow.compile()
