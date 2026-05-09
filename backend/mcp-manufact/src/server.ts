import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type MarketPoint = {
  symbol: string;
  exchange: string;
  name: string;
  price: number;
  changePct: number;
  volume: number;
  name_for_chart: string;
  value: number;
};

type InventoryRow = {
  sku: string;
  product: string;
  region: string;
  category: string;
  stock: number;
  reorderPoint: number;
  status: "critical" | "low" | "healthy";
};

type LogSummary = {
  service: string;
  window_minutes: number;
  severity: string;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  error_rate_pct: number;
  incidents: number;
};

const MARKET_FIXTURES: Record<string, MarketPoint> = {
  WALMEX: {
    symbol: "WALMEX",
    exchange: "BMV",
    name: "Walmart de Mexico",
    price: 68.42,
    changePct: 1.34,
    volume: 1842300,
    name_for_chart: "WALMEX",
    value: 68.42,
  },
  AMXL: {
    symbol: "AMXL",
    exchange: "BMV",
    name: "America Movil",
    price: 15.87,
    changePct: -0.42,
    volume: 5240100,
    name_for_chart: "AMXL",
    value: 15.87,
  },
  GMEXICOB: {
    symbol: "GMEXICOB",
    exchange: "BMV",
    name: "Grupo Mexico",
    price: 104.55,
    changePct: 0.76,
    volume: 812900,
    name_for_chart: "GMEXICOB",
    value: 104.55,
  },
  AAPL: {
    symbol: "AAPL",
    exchange: "NASDAQ",
    name: "Apple Inc.",
    price: 196.23,
    changePct: 0.91,
    volume: 47891200,
    name_for_chart: "AAPL",
    value: 196.23,
  },
  NVDA: {
    symbol: "NVDA",
    exchange: "NASDAQ",
    name: "NVIDIA Corp.",
    price: 121.74,
    changePct: 2.18,
    volume: 61422000,
    name_for_chart: "NVDA",
    value: 121.74,
  },
};

const INVENTORY_FIXTURES: InventoryRow[] = [
  { sku: "MX-ROUTER-8G", product: "Industrial Router 8G", region: "norte", category: "networking", stock: 18, reorderPoint: 35, status: "low" },
  { sku: "MX-SENSOR-T2", product: "Thermal Sensor T2", region: "norte", category: "iot", stock: 6, reorderPoint: 24, status: "critical" },
  { sku: "MX-PLC-200", product: "PLC Controller 200", region: "centro", category: "automation", stock: 54, reorderPoint: 30, status: "healthy" },
  { sku: "MX-HMI-10", product: "HMI Panel 10in", region: "sur", category: "automation", stock: 14, reorderPoint: 18, status: "low" },
  { sku: "MX-CAM-AI", product: "AI Vision Camera", region: "centro", category: "iot", stock: 9, reorderPoint: 16, status: "low" },
];

const SERVICE_BASELINES: Record<string, LogSummary> = {
  checkout: {
    service: "checkout",
    window_minutes: 30,
    severity: "warning",
    p50_ms: 98,
    p95_ms: 384,
    p99_ms: 821,
    error_rate_pct: 2.7,
    incidents: 4,
  },
  inventory: {
    service: "inventory",
    window_minutes: 30,
    severity: "info",
    p50_ms: 72,
    p95_ms: 210,
    p99_ms: 355,
    error_rate_pct: 0.8,
    incidents: 1,
  },
  payments: {
    service: "payments",
    window_minutes: 30,
    severity: "critical",
    p50_ms: 130,
    p95_ms: 610,
    p99_ms: 1280,
    error_rate_pct: 4.9,
    incidents: 7,
  },
};

function toToolResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

export function createManufactMcpServer() {
  const server = new McpServer({
    name: "mcp-manufact",
    version: "1.0.0",
  });

  server.registerTool(
    "get_market_data",
    {
      title: "Get Market Data",
      description: "Returns realistic simulated market data for BMV and NASDAQ symbols, formatted for SDUI charts or tables.",
      inputSchema: {
        exchange: z.enum(["BMV", "NASDAQ"]).default("BMV").describe("Target exchange."),
        symbols: z.array(z.string()).default(["WALMEX", "AMXL"]).describe("Ticker symbols to retrieve."),
        period: z.enum(["1d", "5d", "1m"]).default("1d").describe("Aggregation period."),
      },
    },
    async ({ exchange, symbols, period }) => {
      const rows = symbols
        .map((symbol) => MARKET_FIXTURES[symbol.toUpperCase()])
        .filter((row): row is MarketPoint => Boolean(row))
        .filter((row) => row.exchange === exchange);

      const fallbackRows = Object.values(MARKET_FIXTURES)
        .filter((row) => row.exchange === exchange)
        .slice(0, 3);

      const selectedRows = rows.length > 0 ? rows : fallbackRows;
      const result = {
        source: "mcp-manufact",
        tool: "get_market_data",
        period,
        exchange,
        rows: selectedRows,
        chart_data: selectedRows.map((row) => ({ name: row.name_for_chart, value: row.value })),
        table_data: selectedRows.map(({ name_for_chart, value, ...row }) => row),
      };

      return toToolResult(result);
    },
  );

  server.registerTool(
    "get_inventory_status",
    {
      title: "Get Inventory Status",
      description: "Returns current stock by region and category with low-stock status for operational dashboards.",
      inputSchema: {
        region: z.enum(["norte", "centro", "sur", "all"]).default("all").describe("Region to filter."),
        category: z.enum(["networking", "iot", "automation", "all"]).default("all").describe("Product category to filter."),
        threshold: z.number().int().min(0).default(9999).describe("Maximum stock level to include."),
      },
    },
    async ({ region, category, threshold }) => {
      const rows = INVENTORY_FIXTURES.filter((row) => {
        const regionMatches = region === "all" || row.region === region;
        const categoryMatches = category === "all" || row.category === category;
        return regionMatches && categoryMatches && row.stock <= threshold;
      });

      const result = {
        source: "mcp-manufact",
        tool: "get_inventory_status",
        region,
        category,
        threshold,
        rows,
        chart_data: rows.map((row) => ({ name: row.sku, value: row.stock })),
        table_data: rows,
        summary: {
          total_skus: rows.length,
          critical_skus: rows.filter((row) => row.status === "critical").length,
          low_skus: rows.filter((row) => row.status === "low").length,
        },
      };

      return toToolResult(result);
    },
  );

  server.registerTool(
    "analyze_system_logs",
    {
      title: "Analyze System Logs",
      description: "Summarizes latency, error rates and incident counts for microservices.",
      inputSchema: {
        service: z.enum(["checkout", "inventory", "payments", "all"]).default("all").describe("Service to analyze."),
        window_minutes: z.number().int().min(5).max(1440).default(30).describe("Time window in minutes."),
        severity: z.enum(["info", "warning", "critical", "all"]).default("all").describe("Minimum severity filter."),
      },
    },
    async ({ service, window_minutes, severity }) => {
      const baselines = Object.values(SERVICE_BASELINES).filter((row) => service === "all" || row.service === service);
      const rows = baselines.map((row) => ({
        ...row,
        window_minutes,
        severity: severity === "all" ? row.severity : severity,
      }));

      const result = {
        source: "mcp-manufact",
        tool: "analyze_system_logs",
        service,
        window_minutes,
        severity,
        rows,
        chart_data: rows.map((row) => ({ name: row.service, value: row.p95_ms })),
        table_data: rows,
        summary: {
          services_analyzed: rows.length,
          max_p95_ms: Math.max(...rows.map((row) => row.p95_ms)),
          total_incidents: rows.reduce((acc, row) => acc + row.incidents, 0),
        },
      };

      return toToolResult(result);
    },
  );

  return server;
}
