const splitValues = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeOrigin = (origin) => (origin || "").replace(/\/+$/, "");

const APP_CONFIG = {
  port: Number(process.env.PORT || 3000),
  playLeadMs: Number(process.env.PLAY_LEAD_MS || 250),
  catalogApiBaseUrl:
    (
      process.env.CATALOG_API_BASE_URL ||
      process.env.JAMENDO_BASE_URL ||
      "https://api.jamendo.com/v3.0"
    ).replace(/\/?$/, "/"),
  catalogApiClientId:
    process.env.CATALOG_API_CLIENT_ID ||
    process.env.JAMENDO_CLIENT_ID ||
    process.env.client_id ||
    "",
  catalogClientIdCookieName: process.env.CATALOG_CLIENT_COOKIE || "catalog_client_id",
};

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.LOCAL_IP ? `http://${process.env.LOCAL_IP}:5173` : null,
  ...splitValues(process.env.VITE_DEV_ORIGIN),
  ...splitValues(process.env.FRONTEND_ORIGIN),
  ...splitValues(process.env.CORS_ORIGINS),
]
  .filter(Boolean)
  .map(normalizeOrigin);

module.exports = {
  APP_CONFIG,
  ALLOWED_ORIGINS,
  normalizeOrigin,
};
