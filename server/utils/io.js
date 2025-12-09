import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

let ioInstance = null;
const presence = new Map(); // room -> Map(socketId -> user)

export function setIo(io) {
  ioInstance = io;
  io.on('connection', (socket) => {
    // Client SHOULD send auth token in handshake: socket.handshake.auth.token

    socket.on('join-wall', async ({ wallId, shareLink }) => {
      try {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) {
          socket.emit('error', { message: 'Authentication required for realtime editing.' });
          return;
        }

        const secret = process.env.JWT_SECRET || 'dev_secret_tabula_fallback_change_in_prod';
        let decoded = null;
        try {
          decoded = jwt.verify(token, secret);
        } catch (err) {
          socket.emit('error', { message: 'Invalid authentication token.' });
          return;
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, name: true, email: true, avatarUrl: true } });
        if (!user) {
          socket.emit('error', { message: 'User not found.' });
          return;
        }

        const room = wallId ? `wall:${wallId}` : (shareLink ? `share:${shareLink}` : null);
        if (!room) return;
        socket.join(room);

        // presence bookkeeping
        if (!presence.has(room)) presence.set(room, new Map());
        presence.get(room).set(socket.id, { id: user.id, name: user.name, avatarUrl: user.avatarUrl || null });

        // emit current presence list
        const users = Array.from(presence.get(room).values());
        io.to(room).emit('presence', users);
      } catch (err) {
        console.error('Error in join-wall handler', err);
      }
    });

    socket.on('leave-wall', ({ wallId, shareLink }) => {
      const room = wallId ? `wall:${wallId}` : (shareLink ? `share:${shareLink}` : null);
      if (!room) return;
      socket.leave(room);
      if (presence.has(room)) {
        presence.get(room).delete(socket.id);
        io.to(room).emit('presence', Array.from(presence.get(room).values()));
      }
    });

    socket.on('disconnecting', () => {
      // remove socket from all rooms presence
      for (const room of socket.rooms) {
        if (presence.has(room)) {
          presence.get(room).delete(socket.id);
          io.to(room).emit('presence', Array.from(presence.get(room).values()));
        }
      }
    });
  });
}

export function getIo() {
  return ioInstance;
}
