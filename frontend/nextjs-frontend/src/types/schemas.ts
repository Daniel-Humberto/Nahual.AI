/**
 * TypeScript interfaces — espejo de los schemas Pydantic del backend
 * Sección 3 del Manifiesto: CONTRATOS DE DATOS ESTRICTOS
 */

export interface RouterOutput {
  intent: "dashboard" | "action" | "info";
  required_tools: string[];
  search_queries: string[];
}

export interface UIComponentProps {
  data?: unknown[];
  title?: string;
  actions?: unknown[];
  submitAction?: string;
  fields?: Array<{
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
  }>;
  submitButtonLabel?: string;
  value?: number | string;
  label?: string;
  content?: string;
}

export interface UIOutput {
  ui_component:
    | "BarChart"
    | "ApprovalForm"
    | "DataTable"
    | "Form"
    | "Card"
    | "Metric"
    | "Row"
    | "Column"
    | "Text";
  props: UIComponentProps;
  text_fallback: string;
}

export interface AgentRequest {
  query: string;
  session_id?: string;
}

/** Eventos SSE emitidos por FastAPI */
export type PipelineEvent =
  | { event: "pipeline_start"; data: { status: string; query: string } }
  | { event: "node_router"; data: RouterOutput & { ttft_ms: number | null } }
  | { event: "node_graphrag"; data: { sources_found: string[]; count: number } }
  | { event: "node_ui_generation"; data: UIOutput & { total_latency_ms: number } }
  | { event: "pipeline_end"; data: { status: string; total_latency_ms: number; error: string | null } }
  | { event: "error"; data: { error: string } };
