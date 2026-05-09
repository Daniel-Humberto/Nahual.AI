type StatCardComponent = {
  type: "stat_card";
  title: string;
  value: string;
  description?: string;
};

type TextBlockComponent = {
  type: "text_block";
  title: string;
  content: string;
};

type ListComponent = {
  type: "list";
  title: string;
  items: string[];
};

type CodeBlockComponent = {
  type: "code_block";
  title: string;
  language: string;
  code: string;
};

type TableComponent = {
  type: "table";
  title: string;
  columns: string[];
  rows: string[][];
};

type BarChartComponent = {
  type: "bar_chart";
  title: string;
  values: {
    label: string;
    value: string;
    percentage: string;
  }[];
};

type FormPreviewComponent = {
  type: "form_preview";
  title: string;
  fields: {
    label: string;
    value: string;
  }[];
  actionLabel: string;
};

type ApprovalFlowComponent = {
  type: "approval_flow";
  title: string;
  steps: {
    label: string;
    status: "pending" | "approved" | "rejected";
  }[];
};

// Nuevos componentes Súper MCP
type WeatherWidgetComponent = {
  type: "weather_widget";
  location: string;
  temperature: string;
  condition: string; // ej. "Soleado", "Lluvia", "Nublado"
  humidity: string;
  windSpeed: string;
  forecast: {
    day: string;
    temp: string;
    condition: string;
  }[];
};

type FlightCardComponent = {
  type: "flight_card";
  flightNumber: string;
  airline: string;
  origin: {
    code: string;
    city: string;
    time: string;
  };
  destination: {
    code: string;
    city: string;
    time: string;
  };
  status: "On Time" | "Delayed" | "Cancelled" | "Boarding" | "In Air";
  gate: string;
};

type MapViewComponent = {
  type: "map_view";
  title: string;
  lat: string;
  lng: string;
  zoom: string;
  locationName: string;
};

type TrafficSourcesComponent = {
  type: "traffic_sources";
  title: string;
  totalViews: string;
  sources: {
    source: string; // ej. "Directo", "Orgánico", "Social"
    percentage: string;
    trend: "up" | "down" | "neutral";
  }[];
};

export type VisualComponent =
  | StatCardComponent
  | TextBlockComponent
  | ListComponent
  | CodeBlockComponent
  | TableComponent
  | BarChartComponent
  | FormPreviewComponent
  | ApprovalFlowComponent
  | WeatherWidgetComponent
  | FlightCardComponent
  | MapViewComponent
  | TrafficSourcesComponent;

export type VisualUIScreen = {
  title: string;
  description?: string;
  components: VisualComponent[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asTableRows(value: unknown) {
  return Array.isArray(value)
    ? value.map(asStringArray).filter((row) => row.length > 0)
    : [];
}

function normalizePercentage(value: unknown) {
  const parsed = Number.parseInt(asString(value), 10);
  return String(Math.min(100, Math.max(0, Number.isFinite(parsed) ? parsed : 0)));
}

function parseComponent(value: unknown): VisualComponent | null {
  if (!isRecord(value)) return null;

  const title = asString(value.title, "Componente");

  switch (value.type) {
    case "stat_card":
      return {
        type: "stat_card",
        title,
        value: asString(value.value, "0"),
        description: asString(value.description) || undefined,
      };

    case "text_block":
      return {
        type: "text_block",
        title,
        content: asString(value.content, "Sin contenido."),
      };

    case "list":
      return {
        type: "list",
        title,
        items: asStringArray(value.items),
      };

    case "code_block":
      return {
        type: "code_block",
        title,
        language: asString(value.language, "text"),
        code: asString(value.code),
      };

    case "table":
      return {
        type: "table",
        title,
        columns: asStringArray(value.columns),
        rows: asTableRows(value.rows),
      };

    case "bar_chart":
      return {
        type: "bar_chart",
        title,
        values: Array.isArray(value.values)
          ? value.values.filter(isRecord).map((item) => ({
              label: asString(item.label, "Dato"),
              value: asString(item.value, "0"),
              percentage: normalizePercentage(item.percentage),
            }))
          : [],
      };

    case "form_preview":
      return {
        type: "form_preview",
        title,
        fields: Array.isArray(value.fields)
          ? value.fields.filter(isRecord).map((field) => ({
              label: asString(field.label, "Campo"),
              value: asString(field.value),
            }))
          : [],
        actionLabel: asString(value.actionLabel, "Continuar"),
      };

    case "approval_flow":
      return {
        type: "approval_flow",
        title,
        steps: Array.isArray(value.steps)
          ? value.steps.filter(isRecord).map((step) => ({
              label: asString(step.label, "Paso"),
              status:
                step.status === "approved" || step.status === "rejected"
                  ? step.status
                  : "pending",
            }))
          : [],
      };

    case "weather_widget":
      return {
        type: "weather_widget",
        location: asString(value.location, "Ubicación desconocida"),
        temperature: asString(value.temperature, "0°"),
        condition: asString(value.condition, "Desconocido"),
        humidity: asString(value.humidity, "0%"),
        windSpeed: asString(value.windSpeed, "0 km/h"),
        forecast: Array.isArray(value.forecast)
          ? value.forecast.filter(isRecord).map((f) => ({
              day: asString(f.day, "Día"),
              temp: asString(f.temp, "0°"),
              condition: asString(f.condition, "Desconocido"),
            }))
          : [],
      };

    case "flight_card":
      const rawOrigin = isRecord(value.origin) ? value.origin : {};
      const rawDest = isRecord(value.destination) ? value.destination : {};
      
      const statusValue = asString(value.status, "On Time");
      const validStatus = ["On Time", "Delayed", "Cancelled", "Boarding", "In Air"].includes(statusValue) 
        ? (statusValue as FlightCardComponent["status"]) 
        : "On Time";

      return {
        type: "flight_card",
        flightNumber: asString(value.flightNumber, "AA0000"),
        airline: asString(value.airline, "Aerolínea"),
        origin: {
          code: asString(rawOrigin.code, "XXX"),
          city: asString(rawOrigin.city, "Ciudad"),
          time: asString(rawOrigin.time, "00:00"),
        },
        destination: {
          code: asString(rawDest.code, "XXX"),
          city: asString(rawDest.city, "Ciudad"),
          time: asString(rawDest.time, "00:00"),
        },
        status: validStatus,
        gate: asString(value.gate, "TBD"),
      };

    case "map_view":
      return {
        type: "map_view",
        title: asString(value.title, "Mapa"),
        lat: asString(value.lat, "0.0"),
        lng: asString(value.lng, "0.0"),
        zoom: asString(value.zoom, "12"),
        locationName: asString(value.locationName, "Ubicación"),
      };

    case "traffic_sources":
      return {
        type: "traffic_sources",
        title,
        totalViews: asString(value.totalViews, "0"),
        sources: Array.isArray(value.sources)
          ? value.sources.filter(isRecord).map((s) => {
              const trendRaw = asString(s.trend, "neutral");
              const validTrend = ["up", "down", "neutral"].includes(trendRaw) ? trendRaw as "up"|"down"|"neutral" : "neutral";
              return {
                source: asString(s.source, "Directo"),
                percentage: normalizePercentage(s.percentage),
                trend: validTrend,
              };
            })
          : [],
      };

    default:
      return null;
  }
}

export const VisualUIScreenSchema = {
  parse(value: unknown): VisualUIScreen {
    if (!isRecord(value)) {
      throw new Error("La interfaz generada no tiene un formato válido.");
    }

    const components = Array.isArray(value.components)
      ? value.components.map(parseComponent).filter((item) => item !== null)
      : [];

    return {
      title: asString(value.title, "Interfaz generada"),
      description: asString(value.description) || undefined,
      components,
    };
  },
};
