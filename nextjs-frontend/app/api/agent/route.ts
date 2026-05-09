import { NextResponse } from "next/server";
import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

import { generateMockInterface } from "@/lib/agents/mock-visual-agent";
import { VisualUIScreenSchema } from "@/lib/schemas/visual-ui-schema";

type AIProvider = "openai" | "openrouter" | "groq";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const MAX_PROMPT_LENGTH = 3000;
const AI_TIMEOUT_MS = 22000;
const MAX_COMPLETION_TOKENS = 900;
const ALLOW_DEMO_FALLBACK = process.env.ALLOW_DEMO_FALLBACK === "true";

const visualUIScreenJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "components"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    components: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        required: ["type", "title"],
        properties: {
          type: {
            type: "string",
            enum: [
              "stat_card",
              "text_block",
              "list",
              "code_block",
              "table",
              "bar_chart",
              "form_preview",
              "approval_flow",
            ],
          },
          title: { type: "string" },
        },
      },
    },
  },
};

function getOpenAIErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "insufficient_quota"
  ) {
    return "La API key de OpenAI no tiene cuota disponible. Activa billing o usa una key/proyecto con créditos.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 401
  ) {
    return "La API key de OpenAI no es válida o fue revocada. Revisa OPENAI_API_KEY.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 429
  ) {
    return "OpenAI rechazó la solicitud por límite de uso. Revisa cuota, límites del proyecto o billing.";
  }

  return "No se pudo completar la generación con el proveedor de IA. Revisa la API key, el modelo y los logs del servidor.";
}

function getAIProvider(): AIProvider {
  const configuredProvider = process.env.AI_PROVIDER?.toLowerCase();

  if (
    configuredProvider === "openai" ||
    configuredProvider === "openrouter" ||
    configuredProvider === "groq"
  ) {
    return configuredProvider;
  }

  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.GROQ_API_KEY) return "groq";

  return "openai";
}

function getProviderConfig() {
  const provider = getAIProvider();

  if (provider === "openrouter") {
    return {
      provider,
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
      clientOptions: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "AURA UI Agents",
        },
      },
    };
  }

  if (provider === "groq") {
    return {
      provider,
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
      clientOptions: {
        baseURL: "https://api.groq.com/openai/v1",
      },
    };
  }

  return {
    provider,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    clientOptions: {},
  };
}

function getResponseFormat(provider: AIProvider) {
  if (provider === "groq" || provider === "openrouter") {
    return {
      type: "json_object" as const,
    };
  }

  return {
    type: "json_schema" as const,
    json_schema: {
      name: "visual_ui_screen",
      description: "Pantalla visual segura generada por el agente.",
      schema: visualUIScreenJsonSchema,
      strict: false,
    },
  };
}

function parseJsonResponse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1]);
    }

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }

    throw new Error("El modelo no devolvió JSON válido.");
  }
}

export function GET() {
  const providerConfig = getProviderConfig();

  return NextResponse.json({
    ok: true,
    service: "aura-ui-agent",
    provider: providerConfig.provider,
    providerConfigured: Boolean(providerConfig.apiKey),
    model: providerConfig.model,
  });
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "El cuerpo de la solicitud debe ser JSON válido.",
        },
        {
          status: 400,
        }
      );
    }

    const prompt =
      typeof body === "object" &&
      body !== null &&
      "prompt" in body &&
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (!prompt) {
      return NextResponse.json(
        {
          error: "Prompt inválido",
        },
        {
          status: 400,
        }
      );
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        {
          error: `La solicitud es demasiado larga. Usa ${MAX_PROMPT_LENGTH} caracteres o menos.`,
        },
        {
          status: 400,
        }
      );
    }

    const providerConfig = getProviderConfig();
    const apiKey = providerConfig.apiKey;

    if (!apiKey) {
      if (ALLOW_DEMO_FALLBACK) {
        return NextResponse.json({
          screen: generateMockInterface(prompt),
          source: "demo",
          warning:
            `No hay API key configurada para ${providerConfig.provider}. Se generó una interfaz demo segura.`,
        });
      }

      return NextResponse.json(
        {
          error:
            `Falta la API key para ${providerConfig.provider}. Configura ${
              providerConfig.provider === "openrouter"
                ? "OPENROUTER_API_KEY"
                : providerConfig.provider === "groq"
                ? "GROQ_API_KEY"
                : "OPENAI_API_KEY"
            }.`,
        },
        {
          status: 503,
        }
      );
    }

    try {
      const openai = new OpenAI({
        apiKey,
        timeout: AI_TIMEOUT_MS,
        ...providerConfig.clientOptions,
      });

      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `
Eres Nahual.IA, un poderoso agente capaz de generar interfaces de usuario interactivas en tiempo real ("Kill the Dashboard", "The Copilot That Ships").
Tienes acceso simulado a repositorios MCP (Model Context Protocol), bases de datos, APIs de terceros, GitHub, y herramientas internas.
Tu misión es devolver información 1000% funcional y exhaustiva.

REGLAS CRÍTICAS:
1. NUNCA devuelvas datos vacíos, nulos o "placeholder". Si te piden datos que no tienes, invéntalos o simula una conexión exitosa y devuelve datos realistas y útiles.
2. Devuelve ÚNICAMENTE JSON válido. No devuelvas HTML, React, ni texto fuera del JSON.
3. Actúa como si pudieras conectarte a cualquier sistema para extraer información completa. Muestra confianza y profundidad.

La respuesta debe seguir esta estructura estricta:

{
  "title": "string (El título principal del módulo generado)",
  "description": "string (Contexto de qué sistemas conectaste o qué datos lograste procesar)",
  "components": []
}

Tipos permitidos en components:
- stat_card (Métricas clave. Usa valores realistas.)
- text_block (Texto narrativo o conclusiones analíticas.)
- list (Listas de items con información completa.)
- code_block (Código funcional, no snippets incompletos.)
- table (Tablas de datos densas, llenas de información realista. Nunca filas vacías.)
- bar_chart (Gráficos con porcentajes reales.)
- form_preview (Formularios listos para usarse con datos pre-rellenados.)
- approval_flow (Flujos de estado detallados.)
- weather_widget (Clima. Requiere: location, temperature, condition, humidity, windSpeed y un array forecast de 3 dias.)
- flight_card (Vuelos. Requiere: flightNumber, airline, status, gate, y objetos origin/destination con code, city, time.)
- map_view (Mapas. Requiere: title, lat, lng, zoom, locationName.)
- traffic_sources (Tráfico/Métricas Avanzadas. Requiere: title, totalViews y array sources con source, percentage y trend 'up'/'down'.)

Reglas de datos:
- Todos los valores deben ser strings.
- Para preguntas generales o analíticas, construye una interfaz completa combinando múltiples componentes (ej. table + stat_card + bar_chart).
- Tienes acceso (simulado) a TODAS las integraciones MCP posibles: Radares de Vuelo, Meteorología Global, Mapas y Coordenadas, Analítica Web, etc.
- Cuando el usuario te pregunte por vuelos, usa 'flight_card' con datos hiper-precisos e inventados si es necesario.
- Cuando el usuario te pregunte por ubicaciones, usa 'map_view'.
- Cuando pregunte por clima, usa 'weather_widget'.
- Tu diseño y datos deben verse profesionales, como si fueran diseñados por Google.
`,
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      const completionParams: ChatCompletionCreateParamsNonStreaming & {
        reasoning?: {
          effort: "none";
          exclude: boolean;
        };
      } = {
        model: providerConfig.model,
        max_completion_tokens: MAX_COMPLETION_TOKENS,

        response_format: getResponseFormat(providerConfig.provider),
        ...(providerConfig.provider === "openrouter"
          ? {
              reasoning: {
                effort: "none",
                exclude: true,
              },
            }
          : {}),

        messages,
      };

      const completion = await openai.chat.completions.create(completionParams);

      const raw = completion.choices[0]?.message.content;

      if (!raw) {
        throw new Error("No se recibió contenido del modelo.");
      }

      const parsed = parseJsonResponse(raw);

      const validated = VisualUIScreenSchema.parse(parsed);

      return NextResponse.json({
        screen: validated,
        source: providerConfig.provider,
      });
    } catch (error) {
      console.error(
        `${providerConfig.provider} generation failed, using demo fallback:`,
        error
      );
      const errorMessage = getOpenAIErrorMessage(error);

      if (ALLOW_DEMO_FALLBACK) {
        return NextResponse.json({
          screen: generateMockInterface(prompt),
          source: "demo",
          warning: `${errorMessage} Se mostró una interfaz demo segura.`,
        });
      }

      return NextResponse.json(
        {
          error: errorMessage,
        },
        {
          status: 502,
        }
      );
    }
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "No se pudo generar la interfaz.",
      },
      {
        status: 500,
      }
    );
  }
}
