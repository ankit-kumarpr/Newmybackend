require("dotenv").config();

const http = require("http");
const app = require("./app");
const { initializeSocket } = require("./socket/socketHandler");

const port = process.env.PORT || 3000;
const server = http.createServer(app);
initializeSocket(server);

server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
   console.log(`🔌 Socket.io initialized for real-time enquiries`);
});
