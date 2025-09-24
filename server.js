import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { Server } from "socket.io";
import http from "http";
import archiver from "archiver";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const upload = multer({ dest: "uploads_tmp/" });

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Upload files
app.post("/upload", upload.array("files"), (req, res) => {
  const session = req.query.session;
  if (!session) return res.status(400).send("Missing session");

  const sessionDir = path.join("uploads", session);
  fs.mkdirSync(sessionDir, { recursive: true });

  req.files.forEach((f) => {
    const originalName = f.originalname;
    let finalPath = path.join(sessionDir, originalName);

    let counter = 1;
    while (fs.existsSync(finalPath)) {
      const ext = path.extname(originalName);
      const base = path.basename(originalName, ext);
      finalPath = path.join(sessionDir, `${base}(${counter})${ext}`);
      counter++;
    }

    fs.renameSync(f.path, finalPath);

    io.to(session).emit("newFile", {
      session,
      filename: path.basename(finalPath),
      type: f.mimetype,
    });
  });

  res.send("ok");
});

// Delete file
app.delete("/delete", (req, res) => {
  const { session, filename } = req.query;
  if (!session || !filename) return res.status(400).send("Missing data");

  const filePath = path.join("uploads", session, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    io.to(session).emit("deleteFile", { filename });
    res.send("deleted");
  } else {
    res.status(404).send("Not found");
  }
});

// Download all files as ZIP
app.get("/download-all", (req, res) => {
  const { session } = req.query;
  if (!session) return res.status(400).send("Missing session");

  const sessionDir = path.join("uploads", session);
  if (!fs.existsSync(sessionDir)) return res.status(404).send("No files");

  res.attachment(`qikpic-${session}.zip`);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(sessionDir, false);
  archive.finalize();
});

// Socket.io
io.on("connection", (socket) => {
  socket.on("joinSession", (session) => {
    socket.join(session);
    console.log(`Client joined session: ${session}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
