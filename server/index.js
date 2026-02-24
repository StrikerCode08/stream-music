const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { APP_CONFIG, ALLOWED_ORIGINS, normalizeOrigin } = require("./config/appConfig");
const { createCatalogRouter } = require("./routes/catalogRoutes");
const { createRealtimeSyncServer } = require("./realtime/socketServer");

if (!APP_CONFIG.catalogApiClientId) {
  console.warn(
    "[catalog] CATALOG_API_CLIENT_ID is missing. Set it in root .env file."
  );
}

const app = express();
app.set("trust proxy", 1);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const normalized = normalizeOrigin(origin);
      if (!origin || ALLOWED_ORIGINS.includes(normalized)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed: ${origin}`));
    },
    methods: ["GET", "POST"],
  },
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const normalized = normalizeOrigin(origin);
  if (origin && ALLOWED_ORIGINS.includes(normalized)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

app.use(
  "/api/catalog",
  createCatalogRouter({
    config: APP_CONFIG,
    normalizeOrigin,
  })
);

const audioDir = path.join(__dirname, "public", "audio");
app.use("/audio", express.static(audioDir));

const clientDistDir = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/socket.io") ||
      req.path.startsWith("/audio") ||
      req.path.startsWith("/api")
    ) {
      return next();
    }
    return res.sendFile(path.join(clientDistDir, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.send(
      'Frontend not built yet. Run "npm run dev" for local dev or "npm run build" for production build.'
    );
  });
}

createRealtimeSyncServer({
  io,
  playLeadMs: APP_CONFIG.playLeadMs,
});

server.listen(APP_CONFIG.port, "0.0.0.0", () => {
  console.log(`Sync audio backend running at http://localhost:${APP_CONFIG.port}`);
});
