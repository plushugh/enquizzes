import express from "express"
import { Server } from "socket.io";
import db from "./db";
import { questions, quizs } from "./db/schema";
import createQuizSchema from "./zod/schema";
import { eq } from "drizzle-orm";
import http from "http";
import cors from "cors"
import e from "express";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: "*"
}))

const server = http.createServer(app);
const io = new Server(server);


app.get("/", (_req, res) => {
  res.send("Enquizzes server is running");
})

app.post("/quiz/create", async (req, res) => {
  const verify = await createQuizSchema.spa(req.body);

  if (!verify.success) {
    res.status(400).send("Invalid quiz json");
    return;
  }

  const quiz = verify.data;

  const { quizId } = (await db.insert(quizs).values({ title: quiz.title }).returning({ quizId: quizs.id }).execute())[0];
  quiz.questions.forEach(async (question) => {
    await db.insert(questions).values({
      title: question.title,
      quizId,
      type: question.type,
      answer1: question.answer1,
      answer2: question.answer2,
      answer3: question.answer3,
      answer4: question.answer4,
      correctAnswer: question.correctAnswer,
    }).execute();
  })
  res.send("Quiz created");
})

let runningQuizs = new Map<string, RunningQuiz>();

type RunningQuiz = {
  leaderboard: Map<string, number>;
  questionIndex: number;
  questionIds: number[];
  quizId: number;
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post("/quiz/host/:id", async (req, res) => {
  console.info("user has requested to host quiz #" + req.params.id)
  const quizId = parseInt(req.params.id);
  const quiz = await db.select().from(quizs).where(eq(quizs.id, quizId)).execute();
  if (quiz.length === 0) {
    res.status(404).send("Quiz not found");
    return;
  }
  const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, quizId)).execute();
  const questionIds = quizQuestions.map((question) => question.id);
  const code = generateCode();
  runningQuizs.set(code, {
    leaderboard: new Map(),
    questionIndex: -2,
    questionIds: questionIds,
    quizId: quizId,
  });
  res.send(code);
})

async function getQuestionById(id: number) {
  return (await db.select().from(questions).where(eq(questions.id, id)).execute())[0];
}

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("host-join", (code: string) => {
    console.info("host has requested to join quiz #" + code)
    if (!runningQuizs.has(code)) {
      socket.emit("invalid-code");
      return;
    }
    const quiz = runningQuizs.get(code);
    if (quiz?.questionIndex !== -2) {
      socket.emit("host-already-joined");
      return;
    }
    socket.join(code);
    quiz.questionIndex = -1;

    socket.on("start-quiz", async () => {
      console.info("host has started quiz #" + code)
      quiz.questionIndex = 0;
      io.to(code).emit("new-question", serializeObj({ ...(await getQuestionById(quiz.questionIds[quiz.questionIndex])), correctAnswer: undefined }));
    });

    socket.on("next-question", async () => {
      console.info("host has requested next question for quiz #" + code)
      io.to(code).emit("leaderboard", serializeLeaderboard(quiz.leaderboard));
      quiz.questionIndex++;
      if (quiz.questionIndex >= quiz.questionIds.length) {
        io.to(code).emit("quiz-ended", serializeLeaderboard(quiz.leaderboard));
        return;
      }
      io.to(code).emit("new-question", serializeObj({ ...(await getQuestionById(quiz.questionIds[quiz.questionIndex])), correctAnswer: undefined }));
    });
  });

  socket.on("player-join", (code: string, name: string) => {
    console.info("player has requested to join code #" + code)
    if (!runningQuizs.has(code)) {
      socket.emit("invalid-code");
      return;
    }
    socket.join(code);

    const quiz = runningQuizs.get(code);
    quiz?.leaderboard?.set(name, 0);

    if (!quiz) return; // compiler doesn't know that runningQuizs.has(code) implies quiz is not undefined

    io.to(code).emit("leaderboard", serializeLeaderboard(quiz.leaderboard));

    socket.on("answer-question", async (answer: number) => {
      console.info("player has answered question for quiz #" + code)
      const question = await getQuestionById(quiz?.questionIds[quiz?.questionIndex]);
      if (question.correctAnswer === answer) {
        console.log("Correct answer");
        quiz?.leaderboard?.set(name, (quiz?.leaderboard?.get(name) || 0) + 1);
        socket.emit("correct-answer");
      } else {
        console.log("Incorrect answer");
        socket.emit("incorrect-answer");
      }
    });
  });
});

server.listen(3022, () => {
  console.log("Enquizzes server running on port 3022");
})

function serializeObj(obj: any) {
  return JSON.stringify(obj);
}

function serializeLeaderboard(obj: Map<string, number>) {
  return serializeObj(Array.from(obj.entries()));
}