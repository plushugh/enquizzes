import { integer, pgEnum, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const questionTypeEnum = pgEnum('question_type', ['true-false', 'multiple-choice']);

export const quizs = pgTable('quizs', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 512 }),
});

export type Quiz = typeof quizs.$inferSelect;
export type NewQuiz = typeof quizs.$inferInsert;

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 512 }).notNull(),
  quizId: integer('quiz_id').references(() => quizs.id).notNull(),
  type: questionTypeEnum('type').notNull(),
  answer1: varchar('answer1', { length: 512 }).notNull(),
  answer2: varchar('answer2', { length: 512 }).notNull(),
  answer3: varchar('answer3', { length: 512 }),
  answer4: varchar('answer4', { length: 512 }),
  correctAnswer: integer('correct_answer').notNull(),
});

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;