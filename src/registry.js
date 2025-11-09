class RoomRegistry {
    constructor() {
        this.rooms = new Map(); // roomId -> { participants: Map<userId, socketId> }
    }

    ensure(roomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, { participants: new Map() });
        }
        return this.rooms.get(roomId);
    }

    join(roomId, userId, socketId) {
        const room = this.ensure(roomId);
        room.participants.set(userId, socketId);
        return room;
    }

    leave(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        room.participants.delete(userId);
        if (room.participants.size === 0) {
            this.rooms.delete(roomId);
        }
    }

    getOthers(roomId, exceptUserId) {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        if (exceptUserId == null) return [...room.participants.keys()];
        return [...room.participants.keys()].filter((id) => id !== exceptUserId);
    }

    getSocketId(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        return room.participants.get(userId) || null;
    }

    removeBySocket(socketId) {
        for (const [roomId, room] of this.rooms) {
            for (const [userId, sid] of room.participants) {
                if (sid === socketId) {
                    room.participants.delete(userId);
                    if (room.participants.size === 0) this.rooms.delete(roomId);
                    return { roomId, userId };
                }
            }
        }
        return null;
    }
}

export const registry = new RoomRegistry();
