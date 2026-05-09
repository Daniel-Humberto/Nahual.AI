"""
Langfuse setup — singleton client + @observe decorator helper.
Sección 4 del Manifiesto: Observabilidad con SDK de Langfuse.

Mide:
  - Time To First Token (TTFT)
  - Latencia total del pipeline
  - Spans por nodo LangGraph
"""

from __future__ import annotations

import os
import functools
import time
from typing import Callable, Any

from langfuse import Langfuse

# ---------------------------------------------------------------------------
# Singleton Langfuse client
# ---------------------------------------------------------------------------
langfuse_client = Langfuse(
    secret_key=os.getenv("LANGFUSE_SECRET_KEY", "sk-lf-placeholder"),
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY", "pk-lf-placeholder"),
    host=os.getenv("LANGFUSE_HOST", "http://langfuse:3000"),
)


class _NoopSpan:
    def end(self, *args: Any, **kwargs: Any) -> None:
        return None


class _NoopTrace:
    def span(self, *args: Any, **kwargs: Any) -> _NoopSpan:
        return _NoopSpan()

    def update(self, *args: Any, **kwargs: Any) -> None:
        return None


def _safe_trace(name: str, session_id: str | None = None, input: Any = None) -> Any:
    """
    Langfuse SDK releases have changed their tracing API. The application must
    never break the agent stream because observability is unavailable or
    incompatible, so this helper degrades to a no-op trace when needed.
    """
    trace_factory = getattr(langfuse_client, "trace", None)
    if not callable(trace_factory):
        return _NoopTrace()

    try:
        return trace_factory(name=name, session_id=session_id, input=input)
    except Exception:
        return _NoopTrace()


def flush() -> None:
    flush_fn = getattr(langfuse_client, "flush", None)
    if callable(flush_fn):
        try:
            flush_fn()
        except Exception:
            return None


# ---------------------------------------------------------------------------
# @observe decorator — wraps any LangGraph node function with a Langfuse span
# ---------------------------------------------------------------------------
def observe(span_name: str, capture_input: bool = True, capture_output: bool = True) -> Callable:
    """
    Decorador de observabilidad para nodos LangGraph.

    Uso:
        @observe("node_router")
        def node_router(state: AgentState) -> AgentState:
            ...
    """

    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Extraemos el estado del primer argumento posicional (patrón LangGraph)
            state = args[0] if args else kwargs.get("state", {})
            session_id = state.get("session_id", "unknown") if isinstance(state, dict) else "unknown"

            trace = _safe_trace(
                name=f"agentic-lab-{span_name}",
                session_id=session_id,
                input=dict(state) if capture_input and isinstance(state, dict) else None,
            )
            span = trace.span(name=span_name)

            t0 = time.perf_counter()
            try:
                result = fn(*args, **kwargs)
                elapsed_ms = (time.perf_counter() - t0) * 1000

                span.end(
                    output=dict(result) if capture_output and isinstance(result, dict) else None,
                    metadata={"latency_ms": round(elapsed_ms, 2)},
                )
                return result
            except Exception as exc:
                span.end(
                    level="ERROR",
                    status_message=str(exc),
                )
                raise

        return wrapper

    return decorator


# ---------------------------------------------------------------------------
# Helper: open a top-level trace for the full request
# ---------------------------------------------------------------------------
def start_trace(query: str, session_id: str):
    """Returns a Langfuse Trace object for the full pipeline."""
    return _safe_trace(
        name="agentic-lab-pipeline",
        session_id=session_id,
        input={"query": query},
    )
