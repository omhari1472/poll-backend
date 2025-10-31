import { eq } from 'drizzle-orm';
import { db } from '@/config/database';
import { sessions } from '@/models/schema';
import { Session } from '@/types';

export class SessionRepository {
  async create(sessionId: string): Promise<Session> {
    await db.insert(sessions).values({
      sessionId,
    });
    
    const session = await this.findBySessionId(sessionId);
    if (!session) {
      throw new Error('Failed to create session');
    }
    return session;
  }

  async findBySessionId(sessionId: string): Promise<Session | null> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);
    
    return session || null;
  }

  async updateLastActive(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({
        lastActiveAt: new Date(),
      })
      .where(eq(sessions.sessionId, sessionId));
  }

  async exists(sessionId: string): Promise<boolean> {
    const [session] = await db
      .select({ sessionId: sessions.sessionId })
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);
    
    return !!session;
  }

  async ensureExists(sessionId: string): Promise<Session> {
    const existing = await this.findBySessionId(sessionId);
    if (existing) {
      await this.updateLastActive(sessionId);
      return existing;
    }
    
    return await this.create(sessionId);
  }
}

export const sessionRepository = new SessionRepository();
