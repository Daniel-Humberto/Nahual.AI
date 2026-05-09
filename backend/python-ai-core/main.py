"""
FastAPI — Agentic Lab V4
Sección 4 del Manifiesto: Endpoint POST /api/v1/agent con SSE streaming.

Cambios respecto a V3:
  - Acepta AgentRequest como body JSON (no query param)
  - Devuelve StreamingResponse (SSE) — cada nodo emite un chunk
  - CORS habilitado para Next.js (localhost:3000)
  - Traza completa en Langfuse con TTFT + latencia total
"""

from __future__ import annotations

import json
import time
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from agent_graph import build_agent_graph
from domain.schemas import AgentRequest, AgentState
from framework.langfuse_setup import flush as flush_langfuse
from framework.langfuse_setup import start_trace

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Agentic Lab API — V4",
    description="Pipeline A2UI: Router → GraphRAG → ToolExec → UIGen (SSE Streaming)",
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://nextjs-frontend:3000",
        "*",  # Hackathon mode — restringir en producción
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compilar grafo al inicio (evita cold start en primera request)
graph = build_agent_graph()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "python-ai-core", "version": "4.0.0"}


# ---------------------------------------------------------------------------
# SSE Generator — ejecuta el grafo nodo por nodo y emite chunks
# ---------------------------------------------------------------------------
async def _run_pipeline_sse(request: AgentRequest) -> AsyncGenerator[dict, None]:
    """
    Ejecuta el grafo LangGraph y emite Server-Sent Events por fase.
    Compatible con CopilotKit SSE protocol.
    """
    t_start = time.perf_counter()
    trace = start_trace(query=request.query, session_id=request.session_id)

    # Estado inicial
    state: AgentState = {
        "query": request.query,
        "session_id": request.session_id,
        "router_output": None,
        "grounding_data": {},
        "available_mcp_tools": [],
        "mcp_tool_results": {},
        "ui_output": None,
        "ttft_ms": None,
        "total_latency_ms": None,
        "error": None,
    }

    # --- Emitir chunk de inicio ---
    yield {
        "event": "pipeline_start",
        "data": json.dumps({"status": "started", "query": request.query}),
    }

    # --- Ejecutar grafo completo (sincrónico en thread) ---
    # LangGraph no es async nativo; usamos el modo síncrono
    try:
        final_state: AgentState = graph.invoke(state)
    except Exception as exc:
        yield {
            "event": "error",
            "data": json.dumps({"error": str(exc)}),
        }
        return

    # --- Emitir resultado del router ---
    if final_state.get("router_output"):
        router = final_state["router_output"]
        yield {
            "event": "node_router",
            "data": json.dumps({
                "intent": router.intent,
                "required_tools": router.required_tools,
                "mcp_tool_calls": router.mcp_tool_calls,
                "ttft_ms": final_state.get("ttft_ms"),
            }),
        }

    # --- Emitir resumen de grounding ---
    grounding_keys = list(final_state.get("grounding_data", {}).keys())
    yield {
        "event": "node_graphrag",
        "data": json.dumps({
            "sources_found": grounding_keys,
            "count": len(grounding_keys),
        }),
    }

    # --- Emitir UIOutput final ---
    ui_output = final_state.get("ui_output")
    total_ms = round((time.perf_counter() - t_start) * 1000, 2)

    if ui_output:
        yield {
            "event": "node_ui_generation",
            "data": json.dumps({
                "ui_component": ui_output.ui_component,
                "props": ui_output.props.model_dump(),
                "text_fallback": ui_output.text_fallback,
                "total_latency_ms": total_ms,
            }),
        }
    else:
        yield {
            "event": "node_ui_generation",
            "data": json.dumps({
                "ui_component": "DataTable",
                "props": {"data": [], "title": "Sin datos", "actions": []},
                "text_fallback": "El agente no pudo generar una respuesta visual.",
                "total_latency_ms": total_ms,
            }),
        }

    # --- Evento de cierre ---
    yield {
        "event": "pipeline_end",
        "data": json.dumps({
            "status": "completed",
            "total_latency_ms": total_ms,
            "error": final_state.get("error"),
        }),
    }

    # --- Flush Langfuse ---
    trace.update(
        output={
            "ui_component": ui_output.ui_component if ui_output else None,
            "total_latency_ms": total_ms,
            "ttft_ms": final_state.get("ttft_ms"),
        }
    )
    flush_langfuse()


# ---------------------------------------------------------------------------
# POST /api/v1/agent — SSE Streaming endpoint
# ---------------------------------------------------------------------------
@app.post("/api/v1/agent")
async def run_agent(request: AgentRequest):
    """
    Recibe el query del usuario y ejecuta el pipeline A2UI en streaming SSE.
    Cada nodo del grafo emite un evento independiente.
    """
    return EventSourceResponse(
        _run_pipeline_sse(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# POST /api/v1/agent/sync — Fallback síncrono (para testing)
# ---------------------------------------------------------------------------
@app.post("/api/v1/agent/sync")
def run_agent_sync(request: AgentRequest):
    """Versión síncrona para debugging y pruebas con curl."""
    state: AgentState = {
        "query": request.query,
        "session_id": request.session_id,
        "router_output": None,
        "grounding_data": {},
        "available_mcp_tools": [],
        "mcp_tool_results": {},
        "ui_output": None,
        "ttft_ms": None,
        "total_latency_ms": None,
        "error": None,
    }
    result: AgentState = graph.invoke(state)
    ui = result.get("ui_output")
    return {
        "status": "success",
        "router": result.get("router_output").model_dump() if result.get("router_output") else None,
        "ui_output": ui.model_dump() if ui else None,
        "available_mcp_tools": result.get("available_mcp_tools", []),
        "mcp_tool_results": result.get("mcp_tool_results", {}),
        "ttft_ms": result.get("ttft_ms"),
        "total_latency_ms": result.get("total_latency_ms"),
        "error": result.get("error"),
    }
