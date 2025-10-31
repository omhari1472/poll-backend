import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface SessionRequest extends Request {
  sessionId: string;
}

export const sessionMiddleware = (
  req: SessionRequest,
  res: Response,
  next: NextFunction
) => {
  // Get session ID from header or generate new one
  const sessionId = req.headers['x-session-id'] as string || uuidv4();
  
  // Attach session ID to request
  req.sessionId = sessionId;
  
  // Send session ID back to client if it was generated
  if (!req.headers['x-session-id']) {
    res.setHeader('x-session-id', sessionId);
  }
  
  next();
};
