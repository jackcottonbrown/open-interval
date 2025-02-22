import { relations } from 'drizzle-orm';
import { sequences, users } from './schema';

export const usersRelations = relations(users, ({ many }) => ({
  sequences: many(sequences),
}));

export const sequencesRelations = relations(sequences, ({ one }) => ({
  user: one(users, {
    fields: [sequences.userId],
    references: [users.id],
  }),
})); 