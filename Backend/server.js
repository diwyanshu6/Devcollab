console.log("ENV URL:", process.env.DATABASE_URL);
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const errorHandler = require("./middleware/errorHandler");
const AppError = require("./utils/AppError");

const app = express();
const server = http.createServer(app);

//  CORS 
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// ✅ Logger 
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

//  Routes
const userRouter = require("./routes/userRoutes");
const workspaceRouter = require("./routes/workspaceRoutes");
const chatRouter = require("./routes/chatRoutes");
const notesRouter = require("./routes/notesRoutes");

app.use("/api/users", userRouter);
app.use("/api/workspaces", workspaceRouter);
app.use("/api/chats", chatRouter);
app.use("/api/notes", notesRouter);

//  Health check
app.get("/", (req, res) => {
  res.send("DevCollab API Running 🚀");
});

//  Undefined routes handler
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//  Global Error Handler
app.use(errorHandler);

// ================= SOCKET.IO =================

const io = new Server(server, {
  cors: {
    origin: "https://devcollab-one.vercel.app", 
    methods: ["GET", "POST"],
    credentials: true
  }
});

const { saveMessageToDB } = require("./controllers/chatController");
const pool = require("./config/db");

//  Socket Auth Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

// Socket Events
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user.id}`);

  // Join workspace room
  socket.on("join_workspace", async (workspaceId) => {
    try {
      const result = await pool.query(
        "SELECT * FROM workspace_members WHERE user_id=$1 AND workspace_id=$2",
        [socket.user.id, workspaceId]
      );

      if (result.rows.length > 0) {
        socket.join(workspaceId.toString());
        console.log(`User ${socket.user.id} joined workspace ${workspaceId}`);
      } else {
        socket.emit("error", "Access denied");
      }
    } catch (err) {
      console.error(err);
      socket.emit("error", "Server error");
    }
  });

  // Send message
  socket.on("send_message", async ({ workspaceId, message }) => {
    try {
      if (!message || message.trim() === "") {
        return socket.emit("error", "Message cannot be empty");
      }

      const newMsg = await saveMessageToDB(
        socket.user.id,
        workspaceId,
        message
      );

      const userRes = await pool.query(
        "SELECT name FROM users WHERE id=$1",
        [socket.user.id]
      );

      const name = userRes.rows[0]?.name || "Unknown";

      const fullMessage = { ...newMsg, name };

      io.to(workspaceId.toString()).emit("receive_message", fullMessage);
    } catch (err) {
      socket.emit("error", "Failed to send message");
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.user.id}`);
  });
});

// ================= SERVER =================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});