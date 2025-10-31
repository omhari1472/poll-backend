import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/config/database';
import { likes, pollOptions, polls, sessions, votes } from '@/models/schema';
import { PaginatedResponse, Poll, PollFilters } from '@/types';

export class PollRepository {
  async create(pollData: {
    pollId: string;
    title: string;
    description?: string;
    createdBy: string;
  }, options: string[]): Promise<Poll> {
    return await db.transaction(async (tx) => {
      await tx.insert(polls).values(pollData);
      
      const [poll] = await tx
        .select()
        .from(polls)
        .where(eq(polls.pollId, pollData.pollId))
        .limit(1);
      
      if (!poll) {
        throw new Error('Failed to create poll');
      }
      
      const pollOptionsData = options.map((optionText, index) => ({
        optionId: crypto.randomUUID(),
        pollId: poll.pollId,
        optionText,
        displayOrder: index + 1,
      }));
      
      await tx.insert(pollOptions).values(pollOptionsData);
      
      return {
        ...poll,
        description: (poll as any).description ?? undefined,
      } as unknown as Poll;
    });
  }

  async findById(pollId: string, sessionId?: string): Promise<Poll | null> {
    const [result] = await db
      .select({
        poll: polls,
        creator: sessions,
      })
      .from(polls)
      .leftJoin(sessions, eq(polls.createdBy, sessions.sessionId))
      .where(eq(polls.pollId, pollId))
      .limit(1);

    if (!result?.poll) return null;

    const pollOptionsData = await db
      .select()
      .from(pollOptions)
      .where(eq(pollOptions.pollId, pollId))
      .orderBy(asc(pollOptions.displayOrder));

    let sessionVote = null;
    if (sessionId) {
      const [vote] = await db
        .select()
        .from(votes)
        .where(and(eq(votes.pollId, pollId), eq(votes.sessionId, sessionId)))
        .limit(1);
      sessionVote = vote || null;
    }

    let sessionLiked = false;
    if (sessionId) {
      const [like] = await db
        .select()
        .from(likes)
        .where(and(eq(likes.pollId, pollId), eq(likes.sessionId, sessionId)))
        .limit(1);
      sessionLiked = !!like;
    }

    const base: any = {
      ...result.poll,
      description: (result.poll as any).description ?? undefined,
      options: pollOptionsData,
      sessionLiked,
    };
    if (result.creator) base.creator = result.creator;
    if (sessionVote) base.sessionVote = sessionVote;
    return base as Poll;
  }

  async findMany(filters: PollFilters, sessionId?: string): Promise<PaginatedResponse<Poll>> {
    const {
      sortBy = 'newest',
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;

    const whereConditions = [eq(polls.isActive, true)];
    const orderBy = desc(polls.createdAt);

    const totalResult = await db
      .select({ total: count() })
      .from(polls)
      .where(and(...whereConditions));
    const total = totalResult[0]?.total ?? 0;

    const pollsData = await db
      .select({
        poll: polls,
        creator: sessions,
      })
      .from(polls)
      .leftJoin(sessions, eq(polls.createdBy, sessions.sessionId))
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const pollIds = pollsData.map(p => p.poll.pollId);
    
    const pollOptionsData = pollIds.length > 0
      ? await db
          .select()
          .from(pollOptions)
          .where(sql`${pollOptions.pollId} IN (${sql.join(pollIds.map(id => sql.raw(`'${id}'`)), sql.raw(','))})`)
          .orderBy(asc(pollOptions.displayOrder))
      : [];

    const optionsByPollId = pollOptionsData.reduce((acc, option) => {
      if (!acc[option.pollId]) acc[option.pollId] = [];
      acc[option.pollId]!.push(option);
      return acc;
    }, {} as Record<string, Array<(typeof pollOptionsData)[number]>>);

    let sessionVotes: Record<string, any> = {};
    let sessionLikes: Record<string, boolean> = {};
    
    if (sessionId && pollIds.length > 0) {
      const sessionVotesData = await db
        .select()
        .from(votes)
        .where(and(
          eq(votes.sessionId, sessionId),
          sql`${votes.pollId} IN (${sql.join(pollIds.map(id => sql.raw(`'${id}'`)), sql.raw(','))})`
        ));
      
      const sessionLikesData = await db
        .select()
        .from(likes)
        .where(and(
          eq(likes.sessionId, sessionId),
          sql`${likes.pollId} IN (${sql.join(pollIds.map(id => sql.raw(`'${id}'`)), sql.raw(','))})`
        ));

      sessionVotes = sessionVotesData.reduce((acc, vote) => {
        acc[vote.pollId] = vote;
        return acc;
      }, {} as Record<string, any>);

      sessionLikes = sessionLikesData.reduce((acc, like) => {
        acc[like.pollId] = true;
        return acc;
      }, {} as Record<string, boolean>);
    }

    const pollsWithDetails = pollsData.map(({ poll, creator }) => {
      const base: any = {
        ...poll,
        description: (poll as any).description ?? undefined,
        options: optionsByPollId[poll.pollId] || [],
        sessionLiked: sessionLikes[poll.pollId] || false,
      };
      if (creator) base.creator = creator;
      if (sessionVotes[poll.pollId]) base.sessionVote = sessionVotes[poll.pollId];
      return base as Poll;
    });

    return {
      data: pollsWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySessionId(sessionId: string, page = 1, limit = 20): Promise<PaginatedResponse<Poll>> {
    const offset = (page - 1) * limit;

    const totalResult = await db
      .select({ total: count() })
      .from(polls)
      .where(eq(polls.createdBy, sessionId));
    const total = totalResult[0]?.total ?? 0;

    const pollsData = await db
      .select({
        poll: polls,
        creator: sessions,
      })
      .from(polls)
      .leftJoin(sessions, eq(polls.createdBy, sessions.sessionId))
      .where(eq(polls.createdBy, sessionId))
      .orderBy(desc(polls.createdAt))
      .limit(limit)
      .offset(offset);

    const pollIds = pollsData.map(p => p.poll.pollId);
    const pollOptionsData = pollIds.length > 0
      ? await db
          .select()
          .from(pollOptions)
          .where(sql`${pollOptions.pollId} IN (${sql.join(pollIds.map(id => sql.raw(`'${id}'`)), sql.raw(','))})`)
          .orderBy(asc(pollOptions.displayOrder))
      : [];

    const optionsByPollId = pollOptionsData.reduce((acc, option) => {
      if (!acc[option.pollId]) acc[option.pollId] = [];
      acc[option.pollId]!.push(option);
      return acc;
    }, {} as Record<string, Array<(typeof pollOptionsData)[number]>>);

    const pollsWithDetails = pollsData.map(({ poll, creator }) => {
      const base: any = {
        ...poll,
        description: (poll as any).description ?? undefined,
        options: optionsByPollId[poll.pollId] || [],
        sessionLiked: false,
      };
      if (creator) base.creator = creator;
      return base as Poll;
    });

    return {
      data: pollsWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(pollId: string, pollData: {
    title?: string;
    description?: string;
    categoryId?: string;
    allowMultipleVotes?: boolean;
    expiresAt?: Date;
  }): Promise<Poll> {
    await db
      .update(polls)
      .set({
        ...pollData,
        updatedAt: new Date(),
      })
      .where(eq(polls.pollId, pollId));
    
    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.pollId, pollId))
      .limit(1);
    
    if (!poll) {
      throw new Error('Poll not found after update');
    }
    
    return {
      ...poll,
      description: (poll as any).description ?? undefined,
    } as unknown as Poll;
  }

  async delete(pollId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(votes).where(eq(votes.pollId, pollId));
      await tx.delete(likes).where(eq(likes.pollId, pollId));
      await tx.delete(pollOptions).where(eq(pollOptions.pollId, pollId));
      await tx.delete(polls).where(eq(polls.pollId, pollId));
    });
  }

  async exists(pollId: string): Promise<boolean> {
    const [poll] = await db
      .select({ pollId: polls.pollId })
      .from(polls)
      .where(eq(polls.pollId, pollId))
      .limit(1);
    
    return !!poll;
  }

  async isOwner(pollId: string, sessionId: string): Promise<boolean> {
    const [poll] = await db
      .select({ createdBy: polls.createdBy })
      .from(polls)
      .where(and(eq(polls.pollId, pollId), eq(polls.createdBy, sessionId)))
      .limit(1);
    
    return !!poll;
  }
}

export const pollRepository = new PollRepository();
