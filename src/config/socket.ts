import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

export interface SocketData {
  userId?: string;
  pollId?: string;
}

export const createSocketServer = (httpServer: HTTPServer) => {
  const allowedSocketOrigins = [
    'http://localhost:3000',
    'https://quick-poll-dev.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  const io = new SocketIOServer<any, any, any, SocketData>(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        if (allowedSocketOrigins.includes(origin) || origin.includes('.vercel.app')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  return io;
};

export default createSocketServer;
