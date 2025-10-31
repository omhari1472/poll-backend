import { Socket, Server as SocketIOServer } from 'socket.io';
import { SocketData } from '@/config/socket';
import { pollService } from './poll.service';

export class WebSocketService {
  private io: SocketIOServer<any, any, any, SocketData>;

  constructor(io: SocketIOServer<any, any, any, SocketData>) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket<any, any, any, SocketData>) => {
      console.log(`User connected: ${socket.id}`);

      socket.on('join_poll', async (pollId: string) => {
        try {
          await pollService.getPollById(pollId);
          
          socket.join(`poll:${pollId}`);
          socket.data.pollId = pollId;
          
          socket.emit('joined_poll', { pollId });
        } catch (error) {
          console.error('Error joining poll:', error);
          socket.emit('error', { message: 'Failed to join poll' });
        }
      });

      socket.on('leave_poll', (pollId: string) => {
        socket.leave(`poll:${pollId}`);
        if (socket.data.pollId === pollId) {
          delete socket.data.pollId;
        }
        console.log(`User ${socket.id} left poll ${pollId}`);
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  async broadcastPollUpdate(pollId: string, poll: any) {
    this.io.to(`poll:${pollId}`).emit('poll_updated', {
      pollId,
      poll,
    });
  }

  async broadcastVoteAdded(pollId: string, vote: any, updatedCounts: Record<string, number>) {
    this.io.to(`poll:${pollId}`).emit('vote_added', {
      pollId,
      vote,
      updatedCounts,
    });
  }

  async broadcastVoteChanged(pollId: string, vote: any, updatedCounts: Record<string, number>) {
    this.io.to(`poll:${pollId}`).emit('vote_changed', {
      pollId,
      vote,
      updatedCounts,
    });
  }

  async broadcastVoteRemoved(pollId: string, userId: string, updatedCounts: Record<string, number>) {
    this.io.to(`poll:${pollId}`).emit('vote_removed', {
      pollId,
      userId,
      updatedCounts,
    });
  }

  async broadcastLikeAdded(pollId: string, like: any, totalLikes: number) {
    this.io.to(`poll:${pollId}`).emit('like_added', {
      pollId,
      like,
      totalLikes,
    });
  }

  async broadcastLikeRemoved(pollId: string, userId: string, totalLikes: number) {
    this.io.to(`poll:${pollId}`).emit('like_removed', {
      pollId,
      userId,
      totalLikes,
    });
  }

  async broadcastPollDeleted(pollId: string) {
    this.io.to(`poll:${pollId}`).emit('poll_deleted', {
      pollId,
    });
  }

  async getPollClientCount(pollId: string): Promise<number> {
    const room = this.io.sockets.adapter.rooms.get(`poll:${pollId}`);
    return room ? room.size : 0;
  }

  async getPollClients(pollId: string): Promise<string[]> {
    const room = this.io.sockets.adapter.rooms.get(`poll:${pollId}`);
    return room ? Array.from(room) : [];
  }
}

export const createWebSocketService = (io: SocketIOServer<SocketData>) => {
  return new WebSocketService(io);
};
