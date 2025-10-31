import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/config/database';
import { likes, polls } from '@/models/schema';
import { Like } from '@/types';

export class LikeRepository {
  async create(likeData: {
    likeId: string;
    pollId: string;
    sessionId: string;
  }): Promise<Like> {
    return await db.transaction(async (tx) => {
      const [existingLike] = await tx
        .select()
        .from(likes)
        .where(and(eq(likes.pollId, likeData.pollId), eq(likes.sessionId, likeData.sessionId)))
        .limit(1);

      if (existingLike) {
        return existingLike;
      }

      await tx.insert(likes).values(likeData);
      
      const [like] = await tx
        .select()
        .from(likes)
        .where(and(eq(likes.pollId, likeData.pollId), eq(likes.sessionId, likeData.sessionId)))
        .limit(1);

      await this.updateLikeCount(tx, likeData.pollId);

      if (!like) {
        throw new Error('Failed to create like');
      }
      return like;
    });
  }

  async delete(pollId: string, sessionId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(likes).where(
        and(eq(likes.pollId, pollId), eq(likes.sessionId, sessionId))
      );

      await this.updateLikeCount(tx, pollId);
    });
  }

  async exists(pollId: string, sessionId: string): Promise<boolean> {
    const [like] = await db
      .select({ likeId: likes.likeId })
      .from(likes)
      .where(and(eq(likes.pollId, pollId), eq(likes.sessionId, sessionId)))
      .limit(1);
    
    return !!like;
  }

  async getTotalLikes(pollId: string): Promise<number> {
    const result = await db
      .select({ totalLikes: sql<number>`count(*)` })
      .from(likes)
      .where(eq(likes.pollId, pollId));
    
    return result[0]?.totalLikes ?? 0;
  }

  private async updateLikeCount(tx: any, pollId: string): Promise<void> {
    const [{ totalLikes }] = await tx
      .select({ totalLikes: sql<number>`count(*)` })
      .from(likes)
      .where(eq(likes.pollId, pollId));

    await tx
      .update(polls)
      .set({ totalLikes })
      .where(eq(polls.pollId, pollId));
  }
}

export const likeRepository = new LikeRepository();
