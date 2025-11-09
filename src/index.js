import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { log, warn } from "./logger.js";
import { registry } from "./registry.js";

const app = express();

// ---------- FIXED ORIGIN ----------
const ORIGIN = "http://localhost:3000";
log("CORS ORIGIN =", ORIGIN);

// ---------- HTTP CORS ----------
app.use(
    cors({
        origin: ORIGIN, // ระบุ origin ชัด ๆ
        credentials: true, // ใช้คู่กับ origin เฉพาะได้
    })
);

app.get("/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
});

const httpServer = createServer(app);

// ---------- Socket.IO + CORS ----------
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: ORIGIN, // ตรงกับด้านบน
        methods: ["GET", "POST"],
        credentials: true,
    },
    // path: "/socket.io",
});

// ---------- helper ----------
function emitRoster(roomId) {
    const room = registry.ensure(roomId);
    const participants = [...room.participants.keys()];
    io.to(roomId).emit("meeting:roster", { participants });
}

// ---------- events ----------
io.on("connection", (socket) => {
    log("[io] connected", socket.id);

    let current = { roomId: null, userId: null };

    socket.on("meeting:join", ({ roomId, userId }) => {
        if (!roomId || !userId) return;

        const prevSocketId = registry.getSocketId(roomId, userId);

        current = { roomId, userId };
        registry.join(roomId, userId, socket.id);
        socket.join(roomId);

        const others = registry.getOthers(roomId, userId);
        socket.emit("meeting:joined", { participants: others });

        if (!prevSocketId) {
            socket.to(roomId).emit("meeting:user-joined", { userId });
            log(
                `[meeting] join room=${roomId} user=${userId} sock=${socket.id} (others=${others.length})`
            );
        } else {
            log(
                `[meeting] rejoin room=${roomId} user=${userId} sock=${socket.id} (update socketId)`
            );
        }

        emitRoster(roomId);
    });

    socket.on("meeting:leave", ({ roomId }) => {
        const rid = roomId || current.roomId;
        if (!rid || !current.userId) return;
        registry.leave(rid, current.userId);
        socket.leave(rid);
        socket.to(rid).emit("meeting:user-left", { userId: current.userId });
        log(`[meeting] leave room=${rid} user=${current.userId}`);
        emitRoster(rid);
        current = { roomId: null, userId: null };
    });

    socket.on("meeting:offer", ({ roomId, to, sdp }) => {
        if (!roomId || !to || !sdp) return;
        const targetSocketId = registry.getSocketId(roomId, to);
        if (!targetSocketId)
            return warn("[offer] target not found", { roomId, to });
        if (targetSocketId === socket.id) return;
        io.to(targetSocketId).emit("meeting:offer", {
            from: current.userId,
            sdp,
        });
    });

    socket.on("meeting:answer", ({ roomId, to, sdp }) => {
        if (!roomId || !to || !sdp) return;
        const targetSocketId = registry.getSocketId(roomId, to);
        if (!targetSocketId)
            return warn("[answer] target not found", { roomId, to });
        if (targetSocketId === socket.id) return;
        io.to(targetSocketId).emit("meeting:answer", {
            from: current.userId,
            sdp,
        });
    });

    socket.on("meeting:ice", ({ roomId, to, candidate }) => {
        if (!roomId || !to || !candidate) return;
        const targetSocketId = registry.getSocketId(roomId, to);
        if (!targetSocketId)
            return warn("[ice] target not found", { roomId, to });
        if (targetSocketId === socket.id) return;
        io.to(targetSocketId).emit("meeting:ice", {
            from: current.userId,
            candidate,
        });
    });

    socket.on("disconnect", () => {
        const removed = registry.removeBySocket(socket.id);
        if (removed) {
            const { roomId, userId } = removed;
            socket.to(roomId).emit("meeting:user-left", { userId });
            emitRoster(roomId);
            log(
                "[io] disconnected + cleaned",
                socket.id,
                "user=",
                userId,
                "room=",
                roomId
            );
        } else {
            log("[io] disconnected", socket.id);
        }
    });
});

const PORT = Number(process.env.PORT || 3001);
httpServer.listen(PORT, "0.0.0.0", () => {
    log(`HTTP listening on :${PORT}`);
    log(`CORS ORIGIN = ${ORIGIN}`);
});
