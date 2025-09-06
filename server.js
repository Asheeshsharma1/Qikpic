const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create uploads folder if not exists
const uploadRoot = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot);
}

// Multer storage setup
function createMulter(sessionId) {
  const sessionDir = path.join(uploadRoot, sessionId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  return multer({ dest: sessionDir });
}

// Upload route
app.post("/upload/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const upload = createMulter(sessionId).array("photos");

  upload(req, res, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Upload error");
    }

    // Notify all desktop clients in this session
    req.files.forEach(file => {
      io.to(sessionId).emit("newPhoto", {
        filename: file.filename,
        url: `/uploads/${sessionId}/${file.filename}`
      });
    });

    res.sendStatus(200);
  });
});

// Upload page route
app.get("/upload/:sessionId", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "upload.html"));
});

// Socket.IO connections
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("joinSession", (sessionId) => {
    socket.join(sessionId);
    console.log(`Client joined session: ${sessionId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
