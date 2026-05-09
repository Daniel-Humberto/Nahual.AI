import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";

import { createManufactMcpServer } from "./server.js";

const PORT = Number(process.env.MCP_PORT ?? 3001);
const HOST = process.env.MCP_HOST ?? "0.0.0.0";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "mcp-manufact", transport: "streamable-http" });
});

app.post("/mcp", async (req: Request, res: Response) => {
  const server = createManufactMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal MCP server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. Use POST /mcp." },
    id: null,
  });
});

app.delete("/mcp", (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. Use POST /mcp." },
    id: null,
  });
});

app.listen(PORT, HOST, () => {
  console.log(`mcp-manufact listening on http://${HOST}:${PORT}/mcp`);
});
