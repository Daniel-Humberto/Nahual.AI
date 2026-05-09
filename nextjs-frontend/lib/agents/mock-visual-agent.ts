import { VisualUIScreen } from "../schemas/visual-ui-schema";

export function generateMockInterface(prompt: string): VisualUIScreen {
  const lowerPrompt = prompt.toLowerCase();

  if (
    lowerPrompt.includes("manufactura") ||
    lowerPrompt.includes("manofatura") ||
    lowerPrompt.includes("producción") ||
    lowerPrompt.includes("produccion")
  ) {
    return {
      title: "Dashboard de manufactura",
      description:
        "Panel operativo para monitorear producción, órdenes activas, eficiencia y alertas de planta.",
      components: [
        {
          type: "stat_card",
          title: "Eficiencia OEE",
          value: "87%",
          description: "Rendimiento global estimado de la línea.",
        },
        {
          type: "stat_card",
          title: "Órdenes activas",
          value: "24",
          description: "Órdenes en proceso durante el turno.",
        },
        {
          type: "stat_card",
          title: "Scrap detectado",
          value: "2.8%",
          description: "Merma acumulada contra producción total.",
        },
        {
          type: "approval_flow",
          title: "Liberación de producción",
          steps: [
            { label: "Orden creada", status: "approved" },
            { label: "Calidad en revisión", status: "pending" },
            { label: "Supervisor de planta", status: "pending" },
          ],
        },
        {
          type: "bar_chart",
          title: "Avance por línea",
          values: [
            { label: "Línea A", value: "78%", percentage: "78" },
            { label: "Línea B", value: "41%", percentage: "41" },
            { label: "Línea C", value: "64%", percentage: "64" },
          ],
        },
        {
          type: "table",
          title: "Líneas de producción",
          columns: ["Línea", "Producto", "Estado", "Meta", "Avance"],
          rows: [
            ["Línea A", "Carcasa metálica", "Operando", "1,200 pzas", "78%"],
            ["Línea B", "Ensamble final", "Cambio de herramental", "900 pzas", "41%"],
            ["Línea C", "Empaque", "Alerta menor", "1,500 pzas", "64%"],
          ],
        },
        {
          type: "text_block",
          title: "Prioridad del turno",
          content:
            "Atender la alerta de Línea C, validar calidad de lotes pendientes y liberar la siguiente orden después de la revisión del supervisor.",
        },
      ],
    };
  }

  if (lowerPrompt.includes("aprobación") || lowerPrompt.includes("homologación")) {
    return {
      title: "Flujo de aprobación generado",
      description: "Interfaz visual para revisar, aprobar o rechazar solicitudes.",
      components: [
        {
          type: "approval_flow",
          title: "Proceso de aprobación",
          steps: [
            { label: "Solicitud recibida", status: "approved" },
            { label: "Revisión administrativa", status: "pending" },
            { label: "Validación final", status: "pending" },
          ],
        },
        {
          type: "table",
          title: "Solicitudes recientes",
          columns: ["Folio", "Solicitante", "Estado"],
          rows: [
            ["A-001", "Usuario Demo", "Pendiente"],
            ["A-002", "Área Manufactura", "Aprobado"],
          ],
        },
      ],
    };
  }

  if (lowerPrompt.includes("formulario")) {
    return {
      title: "Formulario generado",
      description: "Formulario visual creado a partir de la solicitud del usuario.",
      components: [
        {
          type: "text_block",
          title: "Formulario dinámico",
          content:
            "Aquí se renderizarán campos seguros como nombre, correo, selección, fechas, archivos y validaciones.",
        },
        {
          type: "form_preview",
          title: "Captura principal",
          fields: [
            { label: "Nombre", value: "Usuario demo" },
            { label: "Correo", value: "demo@aura.local" },
            { label: "Área", value: "Operaciones" },
            { label: "Prioridad", value: "Alta" },
          ],
          actionLabel: "Enviar solicitud",
        },
        {
          type: "stat_card",
          title: "Campos detectados",
          value: "6",
          description: "Campos sugeridos por el agente.",
        },
      ],
    };
  }

  return {
    title: "Respuesta general",
    description: "Respuesta demo generada localmente mientras el proveedor de IA no responde.",
    components: [
      {
        type: "text_block",
        title: "Consulta recibida",
        content: `Puedo responder preguntas generales y también convertir información en tablas, listas, formularios o paneles visuales. Tu solicitud fue: "${prompt}".`,
      },
      {
        type: "list",
        title: "Capacidades disponibles",
        items: [
          "Responder preguntas generales de cualquier tema.",
          "Organizar explicaciones en listas o tablas.",
          "Generar dashboards, flujos, formularios y bloques de código seguros.",
          "Usar proveedores configurables como OpenRouter, Groq u OpenAI.",
        ],
      },
      {
        type: "stat_card",
        title: "Modo",
        value: "General",
        description: "No está limitado a manufactura ni formularios.",
      },
    ],
  };
}
