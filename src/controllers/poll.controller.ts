import { Response } from 'express';
import { webSocketService } from '@/index';
import { SessionRequest } from '@/middleware/session.middleware';
import { pollService } from '@/services/poll.service';
import { createPollSchema, pollFiltersSchema, updatePollSchema, ValidationError } from '@/types';

export class PollController {
  async createPoll(req: SessionRequest, res: Response): Promise<void> {
    try {
      const sessionId = req.sessionId;
      
      const validatedData = createPollSchema.parse(req.body);
      const payload = {
        title: validatedData.title,
        options: validatedData.options,
        ...(validatedData.description !== undefined ? { description: validatedData.description } : {}),
      } as const;
      
      const poll = await pollService.createPoll(sessionId, payload);
      
      await webSocketService.broadcastPollUpdate(poll.pollId, poll);
      
      res.status(201).json({
        success: true,
        data: poll,
      });
      return;
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      
      console.error('Create poll error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return;
    }
  }

  async getPoll(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { pollId } = req.params as { pollId: string };
      const sessionId = req.sessionId;
      
      const poll = await pollService.getPollById(pollId, sessionId);
      
      res.json({
        success: true,
        data: poll,
      });
      return;
    } catch (error) {
      console.error('Get poll error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return;
    }
  }

  async getPolls(req: SessionRequest, res: Response): Promise<void> {
    try {
      const sessionId = req.sessionId;
      
      const filters = pollFiltersSchema.parse({
        sortBy: req.query.sortBy,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      });
      
      const result = await pollService.getPolls(filters, sessionId);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
      return;
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      
      console.error('Get polls error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return;
    }
  }

  async getSessionPolls(req: SessionRequest, res: Response): Promise<void> {
    try {
      const sessionId = req.sessionId;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const result = await pollService.getSessionPolls(sessionId, page, limit);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
      return;
    } catch (error) {
      console.error('Get user polls error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return;
    }
  }

  async updatePoll(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { pollId } = req.params as { pollId: string };
      const sessionId = req.sessionId;
      
      const validatedData = updatePollSchema.parse(req.body);
      const updatePayload = {
        ...(validatedData.title !== undefined ? { title: validatedData.title } : {}),
        ...(validatedData.description !== undefined ? { description: validatedData.description } : {}),
        ...(validatedData.options !== undefined ? { options: validatedData.options } : {}),
      } as const;
      
      const poll = await pollService.updatePoll(pollId, sessionId, updatePayload);
      
      await webSocketService.broadcastPollUpdate(pollId, poll);
      
      res.json({
        success: true,
        data: poll,
      });
      return;
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      
      console.error('Update poll error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return;
    }
  }

  async deletePoll(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { pollId } = req.params as { pollId: string };
      const sessionId = req.sessionId;
      
      await pollService.deletePoll(pollId, sessionId);
      
      await webSocketService.broadcastPollDeleted(pollId);
      
      res.json({
        success: true,
        message: 'Poll deleted successfully',
      });
      return;
    } catch (error) {
      console.error('Delete poll error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return;
    }
  }

  async voteOnPoll(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { pollId } = req.params as { pollId: string };
      const sessionId = req.sessionId;
      const { optionId } = req.body;
      
      if (!optionId) {
        res.status(400).json({
          success: false,
          error: 'Option ID is required',
        });
        return;
      }
      
      const result = await pollService.voteOnPoll(pollId, sessionId, optionId);
      
      if (result.action === 'added') {
        await webSocketService.broadcastVoteAdded(pollId, result.vote, result.updatedCounts);
      } else if (result.action === 'changed') {
        await webSocketService.broadcastVoteChanged(pollId, result.vote, result.updatedCounts);
      }
      
      res.json({
        success: true,
        data: {
          vote: result.vote,
          updatedCounts: result.updatedCounts,
        },
      });
      return;
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      
      console.error('Vote on poll error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return;
    }
  }

  async removeVote(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { pollId } = req.params as { pollId: string };
      const sessionId = req.sessionId;
      
      const result = await pollService.removeVote(pollId, sessionId);
      
      await webSocketService.broadcastVoteRemoved(pollId, sessionId, result.updatedCounts);
      
      res.json({
        success: true,
        data: result,
      });
      return;
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      
      console.error('Remove vote error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return;
    }
  }

  async likePoll(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { pollId } = req.params as { pollId: string };
      const sessionId = req.sessionId;
      
      const result = await pollService.likePoll(pollId, sessionId);
      
      await webSocketService.broadcastLikeAdded(pollId, result.like, result.totalLikes);
      
      res.json({
        success: true,
        data: result,
      });
      return;
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      
      console.error('Like poll error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return;
    }
  }

  async unlikePoll(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { pollId } = req.params as { pollId: string };
      const sessionId = req.sessionId;
      
      const result = await pollService.unlikePoll(pollId, sessionId);
      
      await webSocketService.broadcastLikeRemoved(pollId, sessionId, result.totalLikes);
      
      res.json({
        success: true,
        data: result,
      });
      return;
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      
      console.error('Unlike poll error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return;
    }
  }

  async getSessionVotes(req: SessionRequest, res: Response): Promise<void> {
    try {
      const sessionId = req.sessionId;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const result = await pollService.getSessionVotes(sessionId, page, limit);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
      return;
    } catch (error) {
      console.error('Get user votes error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return;
    }
  }
}

export const pollController = new PollController();
