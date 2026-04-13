import http from "node:http";
import { botManager } from "./botManager.js";

let server: http.Server | null = null;

export function startHealthServer(port = 3002): void {
  server = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          activeBots: botManager.activeBotCount,
          activeMatches: botManager.activeMatchCount,
          uptime: process.uptime(),
        }),
      );
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    console.log(`[health] Health endpoint listening on :${port}/health`);
  });
}

export function stopHealthServer(): void {
  server?.close();
}
