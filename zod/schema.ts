import { z } from "zod";

const createQuizSchema = z.object({
  title: z.string(),
  questions: z.array(
    z.object({
      title: z.string(),
      type: z.enum(["true-false", "multiple-choice"]),
      answer1: z.string(),
      answer2: z.string(),
      answer3: z.string().optional(),
      answer4: z.string().optional(),
      correctAnswer: z.number(),
    })
  ),
});

export type CreateQuiz = z.infer<typeof createQuizSchema>;

export default createQuizSchema;