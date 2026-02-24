const express = require("express");
const { parseCookies, setHttpOnlyCookie } = require("../utils/cookies");
const { searchCatalogTracks } = require("../services/catalogService");

function createCatalogRouter({ config, normalizeOrigin }) {
  const router = express.Router();

  function setCatalogClientCookie(req, res) {
    if (!config.catalogApiClientId) return false;

    const requestOrigin = normalizeOrigin(req.headers.origin || "");
    const requestHost = req.headers["x-forwarded-host"] || req.headers.host || "";
    const requestHostName = requestHost.split(":")[0];

    let originHostName = "";
    try {
      originHostName = requestOrigin ? new URL(requestOrigin).hostname : "";
    } catch {
      originHostName = "";
    }

    const isCrossSite = Boolean(originHostName) && originHostName !== requestHostName;
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    const canUseNone = isCrossSite && isSecure;

    setHttpOnlyCookie({
      req,
      res,
      name: config.catalogClientIdCookieName,
      value: config.catalogApiClientId,
      maxAgeSec: 60 * 60 * 24 * 30,
      sameSite: canUseNone ? "None" : "Lax",
      secure: canUseNone || isSecure,
    });

    return true;
  }

  router.get("/bootstrap", (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies[config.catalogClientIdCookieName]) {
      res.json({ ok: true, source: "cookie" });
      return;
    }

    const created = setCatalogClientCookie(req, res);
    if (!created) {
      res.status(500).json({
        ok: false,
        error: "CATALOG_API_CLIENT_ID not configured on server",
      });
      return;
    }

    res.json({ ok: true, source: "set-cookie" });
  });

  router.get("/search", async (req, res) => {
    const q = (req.query.q || "").toString().trim();
    if (!q) {
      res.status(400).json({ ok: false, error: "Missing query parameter q" });
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const cookieClientId = cookies[config.catalogClientIdCookieName];
    if (!cookieClientId) {
      res.status(401).json({
        ok: false,
        error: "Missing catalog client cookie. Call /api/catalog/bootstrap first.",
      });
      return;
    }

    const limitRaw = Number(req.query.limit || 1);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(25, Math.max(1, Math.floor(limitRaw)))
      : 1;

    try {
      const tracks = await searchCatalogTracks({
        baseUrl: config.catalogApiBaseUrl,
        clientId: cookieClientId,
        query: q,
        limit,
      });

      res.json({ ok: true, query: q, tracks });
    } catch (error) {
      res.status(502).json({
        ok: false,
        error: error?.message || "Catalog search failed",
      });
    }
  });

  return router;
}

module.exports = {
  createCatalogRouter,
};
