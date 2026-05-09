"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  DatabaseZap,
  LayoutTemplate,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Zap
} from "lucide-react";

import { VisualRenderer } from "@/components/renderers/VisualRenderer";

import {
  VisualUIScreenSchema,
  type VisualUIScreen,
} from "@/lib/schemas/visual-ui-schema";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [screen, setScreen] = useState<VisualUIScreen | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canGenerate = prompt.trim().length > 0 && !loading;

  const examples = [
    "Muéstrame el mapa de Nueva York con sus coordenadas exactas",
    "¿Cuál es el estado del vuelo IB6844 de Madrid a Buenos Aires?",
    "Dame el reporte meteorológico detallado de Tokio para hoy",
    "Genera un dashboard de fuentes de tráfico web de este mes",
  ];

  const mcpCapabilities = [
    "Google Maps API",
    "Flight Radar MCP",
    "OpenWeather API",
    "Traffic Analytics",
    "Salesforce CRM",
    "Postgres DB",
    "Notion Workspace",
    "Jira Tickets"
  ];

  async function handleGenerate() {
    if (!prompt.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 26000);

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
        }),
      });
      window.clearTimeout(timeout);

      const data: unknown = await response.json();

      if (!response.ok) {
        const apiError =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Error conectando con la IA.";
        setError(apiError);
        return;
      }

      const payload = typeof data === "object" && data !== null ? data : {};
      const safeScreen = VisualUIScreenSchema.parse(
        "screen" in payload ? payload.screen : null
      );

      setScreen(safeScreen);
      setMessage(
        "warning" in payload && typeof payload.warning === "string"
          ? payload.warning
          : null
      );
    } catch (error) {
      console.error(error);
      setError(
        error instanceof DOMException && error.name === "AbortError"
          ? "El análisis profundo tardó demasiado. Intenta ser más específico."
          : "Fallo en la matriz de conexión MCP."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleNewProject() {
    setPrompt("");
    setScreen(null);
    setError(null);
    setMessage(null);
  }

  return (
    <main className="min-h-screen bg-white text-[#202124]">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4285F4] text-white">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <span className="text-xl font-medium tracking-tight text-[#5f6368]">
            Nahual<span className="font-bold text-[#202124]">.IA</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleNewProject}
            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-[#5f6368] hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Limpiar sesión
          </button>
          <div className="h-8 w-8 rounded-full bg-[#EA4335] text-white flex items-center justify-center font-bold text-sm">
            N
          </div>
        </div>
      </nav>

      <section className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <header className="mb-10 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-normal tracking-tight text-[#202124] mb-4">
            El Copilot que <span className="font-bold text-[#4285F4]">construye</span> tus ideas
          </h1>
          <p className="text-lg text-[#5f6368]">
            Genera interfaces interactivas en tiempo real. Conéctate a cualquier origen de datos MCP y transforma información cruda en controles y dashboards listos para usar.
          </p>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-8 lg:grid-cols-[400px_1fr]">
          
          {/* Left Panel: Prompt Input */}
          <aside className="flex flex-col gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-[#202124]">
                <Zap className="h-5 w-5 text-[#FBBC05]" />
                <h2 className="text-base font-medium">¿Qué interfaz necesitas hoy?</h2>
              </div>

              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  className="min-h-40 w-full resize-none rounded-xl border border-gray-300 bg-gray-50 p-4 pl-10 text-sm leading-6 outline-none transition-all placeholder:text-gray-400 focus:border-[#4285F4] focus:bg-white focus:ring-1 focus:ring-[#4285F4]"
                  placeholder="Ej: 'Conéctate a Jira y muéstrame los tickets críticos de esta semana en una tabla...'"
                />
                <Search className="absolute left-3 top-4 h-5 w-5 text-gray-400" />
              </div>

              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#4285F4] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3367d6] disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Analizando repositorios...
                  </>
                ) : (
                  <>
                    <LayoutTemplate className="h-4 w-4" />
                    Generar Interfaz
                  </>
                )}
              </button>
            </div>

            {/* Example Prompts */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
               <h3 className="text-xs font-bold uppercase tracking-wider text-[#5f6368] mb-4">Ejemplos de Misiones MCP</h3>
               <div className="space-y-2">
                 {examples.map((example) => (
                   <button
                     key={example}
                     type="button"
                     onClick={() => setPrompt(example)}
                     className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left text-sm text-[#5f6368] transition hover:border-[#4285F4] hover:bg-[#e8f0fe] hover:text-[#1967d2]"
                   >
                     <span>{example}</span>
                     <ArrowRight className="h-4 w-4 shrink-0 opacity-50" />
                   </button>
                 ))}
               </div>
            </div>

            {/* MCP Capabilities */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <DatabaseZap className="h-5 w-5 text-[#34A853]" />
                  <h3 className="text-sm font-medium text-[#202124]">Integraciones MCP Activas</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mcpCapabilities.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-[#5f6368]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]"></span>
                      {item}
                    </span>
                  ))}
                </div>
            </div>
            
            {error && (
              <div className="flex gap-3 rounded-xl border border-[#fce8e6] bg-[#fce8e6] p-4 text-sm text-[#c5221f]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="min-w-0 break-words leading-6">{error}</p>
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-[#fef7e0] bg-[#fef7e0] p-4 text-sm leading-6 text-[#b06000]">
                {message}
              </div>
            )}
          </aside>

          {/* Right Panel: Output Canvas */}
          <section className="relative flex flex-col rounded-2xl border border-gray-200 bg-gray-50 shadow-inner overflow-hidden min-h-[600px]">
            {/* Fake browser header */}
            <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200">
               <div className="flex items-center gap-2">
                 <div className="h-3 w-3 rounded-full bg-[#EA4335]"></div>
                 <div className="h-3 w-3 rounded-full bg-[#FBBC05]"></div>
                 <div className="h-3 w-3 rounded-full bg-[#34A853]"></div>
               </div>
               <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                 <ShieldCheck className="h-3 w-3 text-[#34A853]" />
                 Renderizado Seguro
               </div>
               <div className="flex items-center text-gray-400">
                 <Settings className="h-4 w-4" />
               </div>
            </div>
            
            <div className="flex-1 p-6 sm:p-8 bg-white overflow-y-auto">
              <VisualRenderer screen={screen} />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
