DO $$ BEGIN
 CREATE TYPE "question_type" AS ENUM('true-false', 'multiple-choice');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(512) NOT NULL,
	"quiz_id" integer NOT NULL,
	"type" "question_type" NOT NULL,
	"answer1" varchar(512) NOT NULL,
	"answer2" varchar(512) NOT NULL,
	"answer3" varchar(512),
	"answer4" varchar(512),
	"correct_answer" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quizs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(512)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_quizs_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "quizs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
