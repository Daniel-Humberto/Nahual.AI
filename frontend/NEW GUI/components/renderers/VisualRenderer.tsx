import {
  BarChart3,
  CheckCircle,
  Clock,
  Code2,
  FileText,
  LayoutTemplate,
  ListChecks,
  Send,
  Table2,
  XCircle,
  Database,
  LineChart,
  Plane,
  MapPin,
  CloudSun,
  Wind,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  PieChart,
} from "lucide-react";
import type { VisualUIScreen } from "@/lib/schemas/visual-ui-schema";

type Props = {
  screen: VisualUIScreen | null;
};

export function VisualRenderer({ screen }: Props) {
  if (!screen) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f0fe] text-[#4285F4] mb-6">
          <LayoutTemplate className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-medium text-[#202124] mb-2">
          Lienzo en Blanco
        </h2>
        <p className="max-w-md text-sm text-[#5f6368] leading-relaxed">
          Nahual.IA está listo. Escribe un prompt detallado para generar una interfaz completamente funcional conectada (simulada) a tus repositorios MCP.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header of the generated content */}
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-[#34A853]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#34A853]">
              Datos Extraídos & UI Generada
            </span>
          </div>
          <h2 className="text-2xl font-normal text-[#202124] tracking-tight">
            {screen.title}
          </h2>
          {screen.description && (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5f6368]">
              {screen.description}
            </p>
          )}
        </div>
        <div className="inline-flex items-center gap-2 shrink-0 rounded-full border border-[#e6f4ea] bg-[#e6f4ea] px-3 py-1.5 text-xs font-bold text-[#137333]">
          <CheckCircle className="h-4 w-4" />
          Conexión Exitosa
        </div>
      </div>

      {/* Grid of components */}
      <div className="grid gap-6 md:grid-cols-3">
        {screen.components.map((component, index) => {
          
          if (component.type === "stat_card") {
            const accents = [
              "bg-[#4285F4] text-white",
              "bg-[#34A853] text-white",
              "bg-[#FBBC05] text-white",
              "bg-[#EA4335] text-white",
            ];
            const colorClass = accents[index % accents.length];

            return (
              <div
                key={index}
                className={`flex flex-col justify-between rounded-2xl p-6 shadow-sm transition-transform hover:-translate-y-1 ${colorClass}`}
              >
                <div className="flex items-start justify-between gap-3 opacity-90">
                  <p className="text-sm font-medium">
                    {component.title}
                  </p>
                  <LineChart className="h-5 w-5" />
                </div>
                <div className="mt-4">
                  <h3 className="text-4xl font-normal tracking-tight">
                    {component.value}
                  </h3>
                  {component.description && (
                    <p className="mt-2 text-xs font-medium opacity-80">
                      {component.description}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          if (component.type === "text_block") {
            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white p-6 md:col-span-3"
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-[#4285F4]" />
                  <h3 className="font-medium text-[#202124]">{component.title}</h3>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#5f6368]">
                  {component.content}
                </p>
              </div>
            );
          }

          if (component.type === "list") {
            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white p-6 md:col-span-3"
              >
                <div className="flex items-center gap-2 mb-4">
                  <ListChecks className="h-5 w-5 text-[#4285F4]" />
                  <h3 className="font-medium text-[#202124]">{component.title}</h3>
                </div>
                <ul className="space-y-3">
                  {component.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex gap-3 text-sm text-[#5f6368]">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-[#4285F4]">
                        <CheckCircle className="h-3 w-3" />
                      </div>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          if (component.type === "code_block") {
            return (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white md:col-span-3"
              >
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-[#5f6368]" />
                    <h3 className="font-medium text-[#202124]">
                      {component.title}
                    </h3>
                  </div>
                  <span className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-[#5f6368]">
                    {component.language}
                  </span>
                </div>
                <pre className="max-h-[420px] overflow-auto bg-[#202124] p-5 text-sm leading-6 text-gray-100 font-mono">
                  <code>{component.code}</code>
                </pre>
              </div>
            );
          }

          if (component.type === "table") {
            return (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white md:col-span-3"
              >
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 p-5">
                  <Table2 className="h-5 w-5 text-[#4285F4]" />
                  <h3 className="font-medium text-[#202124]">{component.title}</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="border-b border-gray-200 bg-white">
                      <tr>
                        {component.columns.map((column) => (
                          <th key={column} className="px-5 py-4 font-medium text-[#5f6368]">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {component.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="transition-colors hover:bg-gray-50">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-5 py-4 text-[#202124]"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }

          if (component.type === "bar_chart") {
            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white p-6 md:col-span-3 lg:col-span-2"
              >
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="h-5 w-5 text-[#4285F4]" />
                  <h3 className="font-medium text-[#202124]">{component.title}</h3>
                </div>
                <div className="space-y-5">
                  {component.values.map((item) => {
                    const percentage = Math.min(
                      100,
                      Math.max(0, Number.parseInt(item.percentage, 10) || 0)
                    );

                    return (
                      <div key={item.label}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-[#5f6368]">
                            {item.label}
                          </span>
                          <span className="font-medium text-[#202124]">
                            {item.value}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#4285F4] transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (component.type === "form_preview") {
            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white p-6 md:col-span-3 lg:col-span-2"
              >
                <div className="flex items-center gap-2 mb-6">
                  <LayoutTemplate className="h-5 w-5 text-[#4285F4]" />
                  <h3 className="font-medium text-[#202124]">{component.title}</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {component.fields.map((field) => (
                    <label key={field.label} className="block">
                      <span className="mb-1 block text-xs font-medium text-[#5f6368]">
                        {field.label}
                      </span>
                      <input
                        readOnly
                        value={field.value}
                        className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-[#202124] outline-none"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-[#4285F4] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3367d6]"
                  >
                    <Send className="h-4 w-4" />
                    {component.actionLabel}
                  </button>
                </div>
              </div>
            );
          }

          if (component.type === "approval_flow") {
            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white p-6 md:col-span-3 lg:col-span-1"
              >
                <div className="flex items-center gap-2 mb-6">
                  <ListChecks className="h-5 w-5 text-[#34A853]" />
                  <h3 className="font-medium text-[#202124]">{component.title}</h3>
                </div>

                <div className="relative space-y-4 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-gray-100">
                  {component.steps.map((step, stepIndex) => {
                    const isApproved = step.status === "approved";
                    const isRejected = step.status === "rejected";
                    const isPending = step.status === "pending";

                    const Icon = isApproved ? CheckCircle : isRejected ? XCircle : Clock;
                    const iconColor = isApproved ? "text-[#34A853]" : isRejected ? "text-[#EA4335]" : "text-[#FBBC05]";
                    const bgColor = isApproved ? "bg-white" : isRejected ? "bg-white" : "bg-white";

                    return (
                      <div
                        key={stepIndex}
                        className="relative flex items-center gap-4 pl-8"
                      >
                        <div className={`absolute left-0 rounded-full bg-white p-0.5 ${iconColor}`}>
                           <Icon className="h-5 w-5" fill="currentColor" stroke="white" />
                        </div>
                        <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 p-3">
                           <p className="text-sm font-medium text-[#202124]">{step.label}</p>
                           <p className={`text-xs mt-0.5 ${isApproved ? 'text-[#137333]' : isRejected ? 'text-[#c5221f]' : 'text-[#b06000]'}`}>
                             {isApproved ? "Aprobado" : isRejected ? "Rechazado" : "Pendiente"}
                           </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (component.type === "weather_widget") {
            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-gradient-to-br from-[#4285F4] to-[#3367d6] p-6 text-white shadow-sm md:col-span-3 lg:col-span-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 opacity-80" />
                    <span className="text-sm font-medium opacity-90">{component.location}</span>
                  </div>
                  <CloudSun className="h-8 w-8" />
                </div>
                <div className="mb-6">
                  <h3 className="text-5xl font-light tracking-tighter">{component.temperature}</h3>
                  <p className="mt-1 text-sm font-medium opacity-90">{component.condition}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 opacity-70" />
                    <span className="text-xs font-medium opacity-90">{component.humidity} Hum</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 opacity-70" />
                    <span className="text-xs font-medium opacity-90">{component.windSpeed} Viento</span>
                  </div>
                </div>
                <div className="flex justify-between gap-2 border-t border-white/20 pt-4">
                  {component.forecast.slice(0, 3).map((f, i) => (
                    <div key={i} className="text-center">
                      <p className="text-xs opacity-80">{f.day}</p>
                      <p className="text-sm font-bold mt-1">{f.temp}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (component.type === "flight_card") {
            const isDelayed = component.status === "Delayed";
            const statusColor = isDelayed ? "text-[#EA4335] bg-[#fce8e6]" : "text-[#137333] bg-[#e6f4ea]";

            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-3 lg:col-span-2 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-full w-2 border-l border-dashed border-gray-200"></div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-[#4285F4]" />
                    <span className="font-medium text-[#202124]">{component.airline} • {component.flightNumber}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                    {component.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-8 relative">
                  <div className="text-left z-10 bg-white pr-4">
                    <h3 className="text-3xl font-bold text-[#202124]">{component.origin.code}</h3>
                    <p className="text-sm text-[#5f6368]">{component.origin.city}</p>
                    <p className="text-lg font-medium text-[#202124] mt-2">{component.origin.time}</p>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center relative">
                    <div className="h-[2px] w-full bg-gray-200 absolute top-1/2 -translate-y-1/2"></div>
                    <Plane className="h-6 w-6 text-[#4285F4] bg-white z-10 px-1 rotate-90" />
                  </div>
                  
                  <div className="text-right z-10 bg-white pl-4">
                    <h3 className="text-3xl font-bold text-[#202124]">{component.destination.code}</h3>
                    <p className="text-sm text-[#5f6368]">{component.destination.city}</p>
                    <p className="text-lg font-medium text-[#202124] mt-2">{component.destination.time}</p>
                  </div>
                </div>

                <div className="mt-8 border-t border-gray-100 pt-4 flex items-center justify-between">
                  <span className="text-sm text-[#5f6368]">Puerta / Gate</span>
                  <span className="text-lg font-bold text-[#202124]">{component.gate}</span>
                </div>
              </div>
            );
          }

          if (component.type === "map_view") {
            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm md:col-span-3 overflow-hidden flex flex-col"
              >
                <div className="flex items-center gap-2 p-5 border-b border-gray-100">
                  <MapPin className="h-5 w-5 text-[#EA4335]" />
                  <h3 className="font-medium text-[#202124]">{component.title}</h3>
                  <span className="ml-auto text-xs text-[#5f6368] bg-gray-100 px-2 py-1 rounded">Lat: {component.lat}, Lng: {component.lng}</span>
                </div>
                {/* Simulated map background using CSS patterns or gradients */}
                <div className="h-[300px] w-full bg-[#e8eaed] relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#4285f4 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
                  <div className="flex flex-col items-center relative z-10">
                    <div className="bg-[#EA4335] text-white rounded-full p-3 shadow-lg mb-2">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <span className="bg-white px-3 py-1.5 rounded-lg text-sm font-bold text-[#202124] shadow-md border border-gray-200">
                      {component.locationName}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          if (component.type === "traffic_sources") {
            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-3 lg:col-span-2"
              >
                <div className="flex items-center gap-2 mb-6">
                  <PieChart className="h-5 w-5 text-[#34A853]" />
                  <h3 className="font-medium text-[#202124]">{component.title}</h3>
                </div>
                
                <div className="flex items-end gap-3 mb-8">
                  <h4 className="text-4xl font-light tracking-tight text-[#202124]">{component.totalViews}</h4>
                  <span className="text-sm text-[#5f6368] mb-1">Total de accesos/eventos</span>
                </div>

                <div className="space-y-4">
                  {component.sources.map((src, i) => {
                    const isUp = src.trend === "up";
                    const isDown = src.trend === "down";
                    const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : ArrowRight;
                    const trendColor = isUp ? "text-[#34A853]" : isDown ? "text-[#EA4335]" : "text-[#FBBC05]";

                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 transition-colors hover:bg-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: i === 0 ? "#4285F4" : i === 1 ? "#34A853" : i === 2 ? "#FBBC05" : "#EA4335" }}></div>
                          <span className="font-medium text-[#202124] w-24">{src.source}</span>
                          <span className="text-sm font-bold text-[#5f6368] bg-white px-2 py-0.5 rounded border border-gray-200">{src.percentage}%</span>
                        </div>
                        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
