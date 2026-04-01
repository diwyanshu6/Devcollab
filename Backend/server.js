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

// Enable CORS
app.use(cors({
  origin: "http://localhost:5173", // Frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
const userRouter = require("./routes/userRoutes");
const workspaceRouter = require("./routes/workspaceRoutes");
const chatRouter = require("./routes/chatRoutes");
const notesRouter = require("./routes/notesRoutes");

app.use("/api/users", userRouter);
app.use("/api/workspaces", workspaceRouter);
app.use("/api/chats", chatRouter);
app.use("/api/notes", notesRouter);

app.get("/", (req, res) => {
  res.send("DevCollab API Running ");
});

// Handle undefined routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(errorHandler);

// --- SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const { saveMessageToDB } = require("./controllers/chatController");
const pool = require("./config/db");

// Socket Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`User connected to socket: ${socket.user.id}`);

  socket.on("join_workspace", async (workspaceId) => {
    try {
      // Re-verify membership just in case
      const result = await pool.query(
        "SELECT * FROM workspace_members WHERE user_id=$1 AND workspace_id=$2",
        [socket.user.id, workspaceId]
      );
      if (result.rows.length > 0) {
        socket.join(workspaceId.toString());
        console.log(`User ${socket.user.id} joined room ${workspaceId}`);
      } else {
        socket.emit("error", "Not a member of this workspace");
      }
    } catch (err) {
      console.error(err);
      socket.emit("error", "Server error joining workspace");
    }
  });

  socket.on("send_message", async ({ workspaceId, message }) => {
    try {
      // saveMessageToDB validates membership
      const newMsg = await saveMessageToDB(socket.user.id, workspaceId, message);
      
      // Fetch user name to broadcast properly
      const userRes = await pool.query("SELECT name FROM users WHERE id=$1", [socket.user.id]);
      const name = userRes.rows[0]?.name || "Unknown";
      
      const fullMessage = { ...newMsg, name };
      
      // Emit to room
      io.to(workspaceId.toString()).emit("receive_message", fullMessage);
    } catch (err) {
      // emit error back to sender
      socket.emit("error", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected from socket: ${socket.user.id}`);
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});