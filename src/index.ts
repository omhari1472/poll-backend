import cors from 'cors';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { db } from '@/config/database';
import { createSocketServer } from '@/config/socket';
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware';
import pollRoutes from '@/routes/poll.routes';
import { createWebSocketService } from '@/services/websocket.service';

dotenv.config();

const app = express();
const server = createServer(app);
const io = createSocketServer(server);
const webSocketService = createWebSocketService(io);

app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'https://quick-poll-dev.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || origin.includes('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT 1 as test`);
    res.json({ 
      status: 'ok', 
      database: 'connected',
      result: result[0]
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.use('/api', pollRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 8787;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket server ready`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export { webSocketService };
