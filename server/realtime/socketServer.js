const { UAParser } = require("ua-parser-js");

function createRealtimeSyncServer({ io, playLeadMs }) {
  const rooms = new Map();
  const roomPeers = new Map();

  function getClientIp(socket) {
    const forwarded = socket.handshake.headers["x-forwarded-for"];
    const raw = forwarded
      ? forwarded.split(",")[0].trim()
      : socket.handshake.address;
    return raw.replace(/^::ffff:/, "");
  }

  function createRoomState() {
    const now = Date.now();
    return {
      trackUrl: "/audio/sample.mp3",
      isPlaying: false,
      anchorPositionSec: 0,
      anchorServerTimeMs: now,
      updatedAtMs: now,
    };
  }

  function getRoomState(roomId) {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, createRoomState());
    }
    return rooms.get(roomId);
  }

  function nowPositionSec(state, nowMs) {
    if (!state.isPlaying) return state.anchorPositionSec;
    return Math.max(
      0,
      state.anchorPositionSec + (nowMs - state.anchorServerTimeMs) / 1000
    );
  }

  function clampPosition(value) {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) return 0;
    return value;
  }

  function emitRoomPeers(roomId) {
    const peers = roomPeers.has(roomId)
      ? [...roomPeers.get(roomId).entries()].map(([clientId, info]) => ({
          clientId,
          ...info,
        }))
      : [];
    io.to(roomId).emit("room_peers", { roomId, peers });
  }

  io.on("connection", (socket) => {
    socket.on("join_room", ({ roomId, clientId, userAgent }) => {
      const id = (roomId || "main").trim() || "main";
      socket.join(id);
      socket.data.roomId = id;
      socket.data.clientId = clientId;

      const parsed = new UAParser(userAgent || "").getResult();
      const browser = parsed.browser.name || "Unknown Browser";
      const os = parsed.os.name || "Unknown OS";

      if (!roomPeers.has(id)) roomPeers.set(id, new Map());
      roomPeers.get(id).set(clientId, {
        browser,
        os,
        ip: getClientIp(socket),
        joinedAt: Date.now(),
      });

      const state = getRoomState(id);
      socket.emit("room_state", { roomId: id, state, serverTimeMs: Date.now() });
      emitRoomPeers(id);
    });

    socket.on("disconnect", () => {
      const { roomId, clientId } = socket.data;
      if (roomId && clientId && roomPeers.has(roomId)) {
        roomPeers.get(roomId).delete(clientId);
        if (roomPeers.get(roomId).size === 0) {
          roomPeers.delete(roomId);
        } else {
          emitRoomPeers(roomId);
        }
      }
    });

    socket.on("clock_ping", ({ clientSentAtMs }) => {
      socket.emit("clock_pong", {
        clientSentAtMs,
        serverTimeMs: Date.now(),
      });
    });

    socket.on("control", (payload = {}) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const state = getRoomState(roomId);
      const nowMs = Date.now();

      switch (payload.action) {
        case "play": {
          const requestedPos = clampPosition(payload.positionSec);
          state.anchorPositionSec = requestedPos;
          state.anchorServerTimeMs = nowMs + playLeadMs;
          state.isPlaying = true;
          state.updatedAtMs = nowMs;
          break;
        }
        case "pause": {
          state.anchorPositionSec = nowPositionSec(state, nowMs);
          state.anchorServerTimeMs = nowMs;
          state.isPlaying = false;
          state.updatedAtMs = nowMs;
          break;
        }
        case "seek": {
          const requestedPos = clampPosition(payload.positionSec);
          state.anchorPositionSec = requestedPos;
          state.anchorServerTimeMs = state.isPlaying
            ? nowMs
            : state.anchorServerTimeMs;
          state.updatedAtMs = nowMs;
          break;
        }
        case "set_track": {
          const nextUrl =
            typeof payload.trackUrl === "string" ? payload.trackUrl.trim() : "";
          if (nextUrl) {
            state.trackUrl = nextUrl;
            state.isPlaying = false;
            state.anchorPositionSec = 0;
            state.anchorServerTimeMs = nowMs;
            state.updatedAtMs = nowMs;
          }
          break;
        }
        default:
          return;
      }

      io.to(roomId).emit("room_state", {
        roomId,
        state,
        serverTimeMs: Date.now(),
      });
    });
  });

  setInterval(() => {
    const nowMs = Date.now();
    for (const [roomId, state] of rooms.entries()) {
      io.to(roomId).emit("room_state", { roomId, state, serverTimeMs: nowMs });
    }
  }, 1000);
}

module.exports = {
  createRealtimeSyncServer,
};
