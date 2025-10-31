import { v4 as uuidv4 } from 'uuid';
import { likeRepository } from '@/repository/like.repository';
import { pollRepository } from '@/repository/poll.repository';
import { sessionRepository } from '@/repository/session.repository';
import { voteRepository } from '@/repository/vote.repository';
import { CreatePollRequest, ForbiddenError, NotFoundError, PaginatedResponse, Poll, PollFilters, UpdatePollRequest, ValidationError } from '@/types';

export class PollService {
  async createPoll(sessionId: string, pollData: CreatePollRequest): Promise<Poll> {
    await sessionRepository.ensureExists(sessionId);

    if (pollData.options.length < 2) {
      throw new ValidationError('At least 2 options are required');
    }

    if (pollData.options.length > 10) {
      throw new ValidationError('Maximum 10 options allowed');
    }

    const uniqueOptions = new Set(pollData.options);
    if (uniqueOptions.size !== pollData.options.length) {
      throw new ValidationError('Duplicate options are not allowed');
    }

    const pollId = uuidv4();
    await pollRepository.create({
      pollId,
      title: pollData.title,
      ...(pollData.description && { description: pollData.description }),
      createdBy: sessionId,
    }, pollData.options);

    return await this.getPollById(pollId, sessionId);
  }

  async getPollById(pollId: string, sessionId?: string): Promise<Poll> {
    const poll = await pollRepository.findById(pollId, sessionId);
    if (!poll) {
      throw new NotFoundError('Poll');
    }

    return poll;
  }

  async getPolls(filters: PollFilters, sessionId?: string): Promise<PaginatedResponse<Poll>> {
    return await pollRepository.findMany(filters, sessionId);
  }

  async getSessionPolls(sessionId: string, page = 1, limit = 20): Promise<PaginatedResponse<Poll>> {
    return await pollRepository.findBySessionId(sessionId, page, limit);
  }

  async updatePoll(pollId: string, sessionId: string, pollData: UpdatePollRequest): Promise<Poll> {
    const isOwner = await pollRepository.isOwner(pollId, sessionId);
    if (!isOwner) {
      throw new ForbiddenError('You can only update your own polls');
    }

    if (pollData.options) {
      if (pollData.options.length < 2) {
        throw new ValidationError('At least 2 options are required');
      }

      if (pollData.options.length > 10) {
        throw new ValidationError('Maximum 10 options allowed');
      }

      const uniqueOptions = new Set(pollData.options);
      if (uniqueOptions.size !== pollData.options.length) {
        throw new ValidationError('Duplicate options are not allowed');
      }
    }

    const updateData: any = {};
    
    if (pollData.title !== undefined) updateData.title = pollData.title;
    if (pollData.description !== undefined) updateData.description = pollData.description;

    await pollRepository.update(pollId, updateData);

    return await this.getPollById(pollId, sessionId);
  }

  async deletePoll(pollId: string, sessionId: string): Promise<void> {
    const isOwner = await pollRepository.isOwner(pollId, sessionId);
    if (!isOwner) {
      throw new ForbiddenError('You can only delete your own polls');
    }

    await pollRepository.delete(pollId);
  }

  async voteOnPoll(pollId: string, sessionId: string, optionId: string): Promise<{
    vote: any;
    updatedCounts: Record<string, number>;
    action: 'added' | 'changed' | 'unchanged';
  }> {
    const poll = await pollRepository.findById(pollId);
    if (!poll) {
      throw new NotFoundError('Poll');
    }

    if (!poll.isActive) {
      throw new ValidationError('Poll is not active');
    }

    const option = poll.options?.find(opt => opt.optionId === optionId);
    if (!option) {
      throw new ValidationError('Invalid option for this poll');
    }

    const existingVote = await voteRepository.findByPollAndSession(pollId, sessionId);
    
    if (existingVote) {
      if (existingVote.optionId === optionId) {
        const updatedCounts = await voteRepository.getVoteCounts(pollId);
        return { vote: existingVote, updatedCounts, action: 'unchanged' };
      }
      
      await voteRepository.update(existingVote.voteId, optionId);
      const updatedVote = await voteRepository.findById(existingVote.voteId);
      const updatedCounts = await voteRepository.getVoteCounts(pollId);
      return { vote: updatedVote, updatedCounts, action: 'changed' };
    }

    const voteId = uuidv4();
    const vote = await voteRepository.create({
      voteId,
      pollId,
      optionId,
      sessionId,
    });

    const updatedCounts = await voteRepository.getVoteCounts(pollId);

    return { vote, updatedCounts, action: 'added' };
  }

  async removeVote(pollId: string, sessionId: string): Promise<{
    updatedCounts: Record<string, number>;
  }> {
    const poll = await pollRepository.findById(pollId);
    if (!poll) {
      throw new NotFoundError('Poll');
    }

    const existingVote = await voteRepository.findByPollAndSession(pollId, sessionId);
    if (!existingVote) {
      throw new ValidationError('You have not voted on this poll');
    }

    await voteRepository.delete(pollId, sessionId);
    const updatedCounts = await voteRepository.getVoteCounts(pollId);

    return { updatedCounts };
  }

  async likePoll(pollId: string, sessionId: string): Promise<{
    like: any;
    totalLikes: number;
  }> {
    const poll = await pollRepository.findById(pollId);
    if (!poll) {
      throw new NotFoundError('Poll');
    }

    const likeId = uuidv4();
    const like = await likeRepository.create({
      likeId,
      pollId,
      sessionId,
    });

    const totalLikes = await likeRepository.getTotalLikes(pollId);

    return { like, totalLikes };
  }

  async unlikePoll(pollId: string, sessionId: string): Promise<{
    totalLikes: number;
  }> {
    const poll = await pollRepository.findById(pollId);
    if (!poll) {
      throw new NotFoundError('Poll');
    }

    const hasLiked = await likeRepository.exists(pollId, sessionId);
    if (!hasLiked) {
      throw new ValidationError('You have not liked this poll');
    }

    await likeRepository.delete(pollId, sessionId);
    const totalLikes = await likeRepository.getTotalLikes(pollId);

    return { totalLikes };
  }

  async getSessionVotes(sessionId: string, page = 1, limit = 20): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return await voteRepository.findBySessionId(sessionId, page, limit);
  }
}

export const pollService = new PollService();
