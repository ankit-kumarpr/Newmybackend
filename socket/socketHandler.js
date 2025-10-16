const socketIO = require("socket.io");

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Vendor joins their room
    socket.on("vendor-join", (vendorId) => {
      socket.join(`vendor-${vendorId}`);
      console.log(`Vendor ${vendorId} joined room`);
    });

    // User joins their room
    socket.on("user-join", (userId) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined room`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO
};