class RoomRegistry {
  constructor() {
    this.rooms = new Map();
  }

  ensure(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { participants: new Map(), type: undefined });
    }
    return this.rooms.get(roomId);
  }

  join(roomId, userId, socketId, userName, language, type) {
    const room = this.ensure(roomId);

    room.participants.set(userId, { socketId, userName, language });
    room.type = type;
    return room;
  }

  leave(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.participants.delete(userId);

    if (parseInt(room.participants.size) === 0) {
      this.rooms.delete(roomId);
      return true;
    }
    return false;
  }

  getUser(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.participants.get(userId) || null;
  }

  getOthers(roomId, exceptUserId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    if (exceptUserId == null) return [...room.participants.keys()];
    return [...room.participants.entries()]
      .filter(([key]) => key !== exceptUserId)
      .map(([key, value]) => ({
        userId: key,
        userName: value.userName,
        language: value.language,
        socketId: value.socketId,
      }));
  }

  updateLanguage(roomId, userId, language) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.participants.get(userId);
    if (!user) return null;

    room.participants.set(userId, {
      ...user,
      language, // add/override language
    });

    return room;
  }

  getSocketId(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const userSocket = room.participants.get(userId);
    return userSocket?.socketId || null;
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

  checkRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return {
        ok: true,
        exists: false,
        participants: 0,
      };
    }

    return {
      ok: true,
      exists: true,
      participants: room.participants.size,
    };
  }
}

export const registry = new RoomRegistry();
