const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

function init(server) {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        socket.disconnect(true);
        return;
      }
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      const userId = decoded?.userId;
      if (!userId) {
        socket.disconnect(true);
        return;
      }
      const room = `user:${userId}`;
      socket.join(room);
      socket.emit("socket:ready", { ok: true });
    } catch (_) {
      socket.disconnect(true);
    }
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { init, getIO, emitToUser };


