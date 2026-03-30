import "dotenv/config";
import http from "node:http";
import { config } from "./config.js";
import { createApp } from "./gateway/app.js";
import { createSocketServer } from "./ws/wsServer.js";

const app = createApp();
export const httpServer = http.createServer(app);

createSocketServer(httpServer);

httpServer.listen(config.PORT, () => {
  console.log(`[server] ConnectX server listening on port ${config.PORT}`);
  console.log(`[server] CORS origin: ${config.CORS_ORIGIN}`);
});
