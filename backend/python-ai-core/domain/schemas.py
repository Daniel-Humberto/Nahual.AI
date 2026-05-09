"""
Pydantic schemas para contratos de datos estrictos del pipeline A2UI.
Sección 3 del Manifiesto: CONTRATOS DE DATOS ESTRICTOS.
"""

from __future__ import annotations

from typing import Any, Literal
from typing_extensions import TypedDict

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Contract: Incoming request
# ---------------------------------------------------------------------------
class AgentRequest(BaseModel):
    """Cuerpo del POST /api/v1/agent."""

    query: str = Field(..., description="Consulta del usuario en lenguaje natural")
    session_id: str = Field(default="default", description="ID de sesión para trazabilidad")


# ---------------------------------------------------------------------------
# Contract: Capa 1 — Router Local (Ollama gemma2:2b)
# ---------------------------------------------------------------------------
class RouterOutput(BaseModel):
    """
    Salida estricta del Router Agent (Capa 1).
    El modelo DEBE devolver exactamente este JSON, sin markdown, sin charla.
    """

    intent: Literal["dashboard", "action", "info"] = Field(
        ..., description="Tipo de intención clasificada"
    )
    required_tools: list[str] = Field(
        default_factory=list,
        description="Herramientas requeridas: db_postgres, rag_qdrant, graph_neo4j",
    )
    search_queries: list[str] = Field(
        default_factory=list,
        description="Consultas de búsqueda semántica derivadas del prompt",
    )
    mcp_tool_calls: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Llamadas MCP solicitadas: [{'name': str, 'arguments': dict}]",
    )


# ---------------------------------------------------------------------------
# Contract: Capa 3 — A2UI Generator (Gemini Flash)
# ---------------------------------------------------------------------------
class UIComponentProps(BaseModel):
    """Props dinámicos para el componente React generado."""

    data: list[Any] = Field(default_factory=list)
    title: str = Field(default="")
    actions: list[Any] = Field(default_factory=list)
    submitAction: str | None = Field(default=None)
    fields: list[dict[str, Any]] | None = Field(default=None)
    submitButtonLabel: str | None = Field(default=None)
    value: float | int | str | None = Field(default=None)
    label: str | None = Field(default=None)
    content: str | None = Field(default=None)


class UIOutput(BaseModel):
    """
    Salida estricta del A2UI Generator (Capa 3).
    El modelo cloud DEBE devolver exactamente este JSON para el frontend.
    """

    ui_component: Literal[
        "BarChart",
        "ApprovalForm",
        "DataTable",
        "Form",
        "Card",
        "Metric",
        "Row",
        "Column",
        "Text",
    ] = Field(..., description="Nombre del componente React a renderizar")
    props: UIComponentProps = Field(..., description="Props para el componente")
    text_fallback: str = Field(
        ..., description="Texto de respaldo si el componente no puede renderizarse"
    )


# ---------------------------------------------------------------------------
# LangGraph State — fluye entre todos los nodos
# ---------------------------------------------------------------------------
class AgentState(TypedDict):
    # Input
    query: str
    session_id: str

    # Capa 1: Router
    router_output: RouterOutput | None

    # Capa 2: GraphRAG / grounding
    grounding_data: dict[str, Any]
    available_mcp_tools: list[dict[str, Any]]
    mcp_tool_results: dict[str, Any]

    # Capa 3: UI generation
    ui_output: UIOutput | None

    # Metadata para observabilidad
    ttft_ms: float | None
    total_latency_ms: float | None
    error: str | None
