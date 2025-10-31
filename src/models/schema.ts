import { relations } from 'drizzle-orm';
import { boolean, index, int, mysqlTable, text, timestamp, unique, varchar } from 'drizzle-orm/mysql-core';

export const sessions = mysqlTable('sessions', {
  sessionId: varchar('session_id', { length: 36 }).primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().onUpdateNow().notNull(),
});

export const polls = mysqlTable('polls', {
  pollId: varchar('poll_id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  totalVotes: int('total_votes').default(0).notNull(),
  totalLikes: int('total_likes').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  createdByIdx: index('polls_created_by_idx').on(table.createdBy),
  activeIdx: index('polls_active_idx').on(table.isActive),
  createdAtIdx: index('polls_created_at_idx').on(table.createdAt),
}));

export const pollOptions = mysqlTable('poll_options', {
  optionId: varchar('option_id', { length: 36 }).primaryKey(),
  pollId: varchar('poll_id', { length: 36 }).notNull(),
  optionText: varchar('option_text', { length: 500 }).notNull(),
  voteCount: int('vote_count').default(0).notNull(),
  displayOrder: int('display_order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pollIdx: index('poll_options_poll_idx').on(table.pollId),
  orderIdx: index('poll_options_order_idx').on(table.pollId, table.displayOrder),
}));

export const votes = mysqlTable('votes', {
  voteId: varchar('vote_id', { length: 36 }).primaryKey(),
  pollId: varchar('poll_id', { length: 36 }).notNull(),
  optionId: varchar('option_id', { length: 36 }).notNull(),
  sessionId: varchar('session_id', { length: 36 }).notNull(),
  votedAt: timestamp('voted_at').defaultNow().notNull(),
}, (table) => ({
  pollSessionIdx: unique('votes_poll_session_unique').on(table.pollId, table.sessionId),
  pollIdx: index('votes_poll_idx').on(table.pollId),
  sessionIdx: index('votes_session_idx').on(table.sessionId),
}));

export const likes = mysqlTable('likes', {
  likeId: varchar('like_id', { length: 36 }).primaryKey(),
  pollId: varchar('poll_id', { length: 36 }).notNull(),
  sessionId: varchar('session_id', { length: 36 }).notNull(),
  likedAt: timestamp('liked_at').defaultNow().notNull(),
}, (table) => ({
  pollSessionIdx: unique('likes_poll_session_unique').on(table.pollId, table.sessionId),
  pollIdx: index('likes_poll_idx').on(table.pollId),
  sessionIdx: index('likes_session_idx').on(table.sessionId),
}));

export const sessionsRelations = relations(sessions, ({ many }) => ({
  polls: many(polls),
  votes: many(votes),
  likes: many(likes),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  creator: one(sessions, {
    fields: [polls.createdBy],
    references: [sessions.sessionId],
  }),
  options: many(pollOptions),
  votes: many(votes),
  likes: many(likes),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.pollId],
  }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  poll: one(polls, {
    fields: [votes.pollId],
    references: [polls.pollId],
  }),
  option: one(pollOptions, {
    fields: [votes.optionId],
    references: [pollOptions.optionId],
  }),
  session: one(sessions, {
    fields: [votes.sessionId],
    references: [sessions.sessionId],
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  poll: one(polls, {
    fields: [likes.pollId],
    references: [polls.pollId],
  }),
  session: one(sessions, {
    fields: [likes.sessionId],
    references: [sessions.sessionId],
  }),
}));
