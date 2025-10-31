import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/config/database';
import { pollOptions, polls, votes } from '@/models/schema';
import { Vote } from '@/types';

export class VoteRepository {
  async create(voteData: {
    voteId: string;
    pollId: string;
    optionId: string;
    sessionId: string;
  }): Promise<Vote> {
    return await db.transaction(async (tx) => {
      await tx.delete(votes).where(
        and(eq(votes.pollId, voteData.pollId), eq(votes.sessionId, voteData.sessionId))
      );

      await tx.insert(votes).values(voteData);
      
      const [vote] = await tx
        .select()
        .from(votes)
        .where(and(eq(votes.pollId, voteData.pollId), eq(votes.sessionId, voteData.sessionId)))
        .limit(1);

      await this.updateVoteCounts(tx, voteData.pollId);

      if (!vote) {
        throw new Error('Failed to create vote');
      }
      return vote;
    });
  }

  async findById(voteId: string): Promise<Vote | null> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.voteId, voteId))
      .limit(1);
    
    return vote || null;
  }

  async findByPollAndSession(pollId: string, sessionId: string): Promise<Vote | null> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.pollId, pollId), eq(votes.sessionId, sessionId)))
      .limit(1);
    
    return vote || null;
  }

  async update(voteId: string, optionId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [vote] = await tx
        .select()
        .from(votes)
        .where(eq(votes.voteId, voteId))
        .limit(1);

      if (!vote) {
        throw new Error('Vote not found');
      }

      await tx
        .update(votes)
        .set({ optionId })
        .where(eq(votes.voteId, voteId));

      await this.updateVoteCounts(tx, vote.pollId);
    });
  }

  async findBySessionId(sessionId: string, page = 1, limit = 20): Promise<{
    data: Vote[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const offset = (page - 1) * limit;

    const totalResult = await db
      .select({ total: sql<number>`count(*)` })
      .from(votes)
      .where(eq(votes.sessionId, sessionId));
    const total = totalResult[0]?.total ?? 0;

    const sessionVotes = await db
      .select()
      .from(votes)
      .where(eq(votes.sessionId, sessionId))
      .orderBy(sql`${votes.votedAt} DESC`)
      .limit(limit)
      .offset(offset);

    return {
      data: sessionVotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async delete(pollId: string, sessionId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(votes).where(
        and(eq(votes.pollId, pollId), eq(votes.sessionId, sessionId))
      );

      await this.updateVoteCounts(tx, pollId);
    });
  }

  async getVoteCounts(pollId: string): Promise<Record<string, number>> {
    const voteCounts = await db
      .select({
        optionId: votes.optionId,
        count: sql<number>`count(*)`,
      })
      .from(votes)
      .where(eq(votes.pollId, pollId))
      .groupBy(votes.optionId);

    return voteCounts.reduce((acc, { optionId, count }) => {
      acc[optionId] = count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async updateVoteCounts(tx: any, pollId: string): Promise<void> {
    await tx
      .update(pollOptions)
      .set({ voteCount: 0 })
      .where(eq(pollOptions.pollId, pollId));

    const voteCounts = await tx
      .select({
        optionId: votes.optionId,
        count: sql<number>`count(*)`,
      })
      .from(votes)
      .where(eq(votes.pollId, pollId))
      .groupBy(votes.optionId);

    for (const { optionId, count } of voteCounts) {
      await tx
        .update(pollOptions)
        .set({ voteCount: count })
        .where(and(eq(pollOptions.optionId, optionId), eq(pollOptions.pollId, pollId)));
    }

    const [{ totalVotes }] = await tx
      .select({ totalVotes: sql<number>`count(*)` })
      .from(votes)
      .where(eq(votes.pollId, pollId));

    await tx
      .update(polls)
      .set({ totalVotes })
      .where(eq(polls.pollId, pollId));
  }
}

export const voteRepository = new VoteRepository();
