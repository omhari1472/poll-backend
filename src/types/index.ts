import { z } from 'zod';

export interface Session {
  sessionId: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface Poll {
  pollId: string;
  title: string;
  description?: string;
  createdBy: string;
  isActive: boolean;
  totalVotes: number;
  totalLikes: number;
  createdAt: Date;
  updatedAt: Date;
  creator?: Session;
  options?: PollOption[];
  sessionVote?: Vote;
  sessionLiked?: boolean;
}

export interface PollOption {
  optionId: string;
  pollId: string;
  optionText: string;
  voteCount: number;
  displayOrder: number;
  createdAt: Date;
}

export interface Vote {
  voteId: string;
  pollId: string;
  optionId: string;
  sessionId: string;
  votedAt: Date;
}

export interface Like {
  likeId: string;
  pollId: string;
  sessionId: string;
  likedAt: Date;
}

export interface CreatePollRequest {
  title: string;
  description?: string;
  options: string[];
}

export interface UpdatePollRequest {
  title?: string;
  description?: string;
  options?: string[];
}

export interface VoteRequest {
  optionId: string;
}

export interface PollFilters {
  sortBy?: 'newest';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SocketEvents {
  join_poll: (pollId: string) => void;
  leave_poll: (pollId: string) => void;
  
  poll_updated: (data: { pollId: string; poll: Poll }) => void;
  vote_added: (data: { pollId: string; vote: Vote; updatedCounts: Record<string, number> }) => void;
  vote_changed: (data: { pollId: string; vote: Vote; updatedCounts: Record<string, number> }) => void;
  vote_removed: (data: { pollId: string; sessionId: string; updatedCounts: Record<string, number> }) => void;
  like_added: (data: { pollId: string; like: Like; totalLikes: number }) => void;
  like_removed: (data: { pollId: string; sessionId: string; totalLikes: number }) => void;
  poll_deleted: (data: { pollId: string }) => void;
}

export const createPollSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  options: z.array(z.string().min(1, 'Option cannot be empty').max(500, 'Option too long'))
    .min(2, 'At least 2 options required')
    .max(10, 'Maximum 10 options allowed'),
});

export const updatePollSchema = createPollSchema.partial();

export const voteSchema = z.object({
  optionId: z.string().uuid('Invalid option ID'),
});

export const pollFiltersSchema = z.object({
  sortBy: z.enum(['newest']).default('newest'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}

export class PollError extends Error {
  constructor(
    public override message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PollError';
  }
}

export class NotFoundError extends PollError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends PollError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends PollError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ValidationError extends PollError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
