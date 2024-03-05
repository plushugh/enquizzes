<script lang="ts">
  import e from "cors";
  import { io } from "socket.io-client";

  const BASE_URL = "http://localhost:3022";

  let socket = io(BASE_URL);

  let leaderboard: Map<string, number> = new Map();

  $: lobbyPlayers = Array.from(leaderboard, ([name, score]) => ({
    name,
    score,
  })).sort((a, b) => b.score - a.score);

  let currentQuestion: string = "";
  let answers: string[] = [];

  let questionAnswered: boolean = false;

  let quizEnded: boolean = false;

  socket.on("connect", () => {
    console.log("Connected to server");

    socket.on("leaderboard", (_leaderboard) => {
      leaderboard = JSON.parse(_leaderboard);
    });

    socket.on("new-question", (_question) => {
      if (!isHost && !quizQuestioning) {
        inLobby = false;
        quizQuestioning = true;
      }

      const question = JSON.parse(_question);

      currentQuestion = question.title;
      answers = [
        question.answer1,
        question.answer2,
        question.answer3,
        question.answer4,
      ];
      questionAnswered = false;
      lastQuestionCorrect = null;
    });

    socket.on("quiz-ended", (_leaderboard) => {
      quizEnded = true;
      leaderboard = JSON.parse(_leaderboard);
    });

    socket.on("correct-answer", () => {
      lastQuestionCorrect = true;
    });
    socket.on("incorrect-answer", () => {
      lastQuestionCorrect = false;
    });
  });

  let isHost: boolean | null = null;
  let inQuiz: boolean = false;
  let inLobby: boolean = false;
  let joinCode: string | null = null;
  let quizQuestioning: boolean = false;

  let quizId: string | null = null;
  let playerName = "";

  let lastQuestionCorrect: boolean | null = false;
</script>

<main>
  <h1>Welcome to Enquizzes</h1>

  {#if isHost === null}
    <h2>Who are you?</h2>
    <button on:click={() => (isHost = true)}>I'm a teacher - Host</button>
    <button on:click={() => (isHost = false)}
      >I'm a student - Participant</button
    >
  {/if}

  {#if isHost === true && inQuiz === false}
    <h2>Host</h2>
    <p>Host a created quiz</p>
    <form
      on:submit|preventDefault={async () => {
        if (!quizId) {
          alert("Please enter a quiz ID");
        }

        const res = await fetch(BASE_URL + "/quiz/host/" + quizId, {
          method: "POST",
        });

        const text = await res.text();

        const codeRegex = /([0-9]){6}/;

        if (codeRegex.test(text)) {
          alert("Quiz created with code: " + text);
          isHost = true;
          inQuiz = true;
          joinCode = text;
          socket.emit("host-join", joinCode);
          inLobby = true;
        } else {
          alert("invalid:" + text);
        }
      }}
    >
      <label for="quiz-id">Enter quiz ID</label>
      <input type="text" id="quiz-id" bind:value={quizId} />
      <button type="submit">Create Lobby</button>
    </form>
  {/if}

  {#if isHost === true && inQuiz && !quizQuestioning && !quizEnded}
    <h2>Quiz lobby is live</h2>
    <p class="join-code">Join code: {joinCode}</p>
    <button
      on:click={async () => {
        socket.emit("start-quiz");
        quizQuestioning = true;
        inLobby = false;
      }}>Start Quiz</button
    >
    <h3>Players</h3>
    <ol>
      {#each lobbyPlayers as player}
        <li>
          {player.name}
        </li>
      {/each}
    </ol>
  {/if}

  {#if isHost === true && inQuiz && quizQuestioning && !quizEnded}
    <h2>Questioning</h2>
    <p class="join-code">Join code: {joinCode}</p>
    <button
      on:click={() => {
        socket.emit("next-question");
      }}>End Answering & Next Question</button
    >
    <h3 class="question">{currentQuestion}</h3>
    <ul>
      {#each answers as answer}
        <li class="host-ans">
          {answer}
        </li>
      {/each}
    </ul>

    <h3>Leaderboard</h3>
    <ol>
      {#each lobbyPlayers as player}
        <li>
          {player.name}: {player.score}
        </li>
      {/each}
    </ol>
  {/if}

  {#if quizEnded}
    <h1>Quiz Ended, Thanks for Playing</h1>
    <h2>Leaderboard</h2>
    <ol>
      {#each lobbyPlayers as player}
        <li>
          {player.name}: {player.score}
        </li>
      {/each}
    </ol>
  {/if}

  {#if isHost === false && !inQuiz}
    <h2>Participant</h2>
    <p>Join a quiz</p>
    <form
      on:submit|preventDefault={async () => {
        if (!joinCode || playerName === "") {
          alert("Please enter a join code and player name");
        }

        socket.emit("player-join", joinCode, playerName);
        socket.on("invalid-code", () => {
          alert("Invalid code");
          // reset everything via reload
          window.location.reload();
        });

        inQuiz = true;
        inLobby = true;

        socket.on("quiz-started", () => {
          quizQuestioning = true;
          inLobby = false;
        });
      }}
    >
      <label for="join-code">Enter join code</label>
      <input type="text" id="join-code" bind:value={joinCode} />
      <label for="player-name">Enter your nickname</label>
      <input type="text" id="player-name" bind:value={playerName} />
      <button type="submit">Join</button>
    </form>
  {/if}

  {#if isHost === false && inQuiz && inLobby}
    <h2>In Lobby</h2>
    <p class="join-code">Join code: {joinCode}</p>
    <h3>Waiting for host to start quiz</h3>
    <h3>Players</h3>
    <ol>
      {#each lobbyPlayers as player}
        <li>
          {player.name}
        </li>
      {/each}
    </ol>
  {/if}

  {#if isHost === false && inQuiz && quizQuestioning && !quizEnded}
    <h2>Answer this question</h2>
    <h3 class="question">{currentQuestion}</h3>
    {#if !questionAnswered}
      <ul>
        {#each answers as answer, index}
          <li>
            <button
              on:click={() => {
                socket.emit("answer-question", index);
                questionAnswered = true;
              }}>{answer}</button
            >
          </li>
        {/each}
      </ul>
    {:else if lastQuestionCorrect !== null}
      {#if lastQuestionCorrect}
        <p class="correct">Correct, waiting for next question</p>
      {:else}
        <p class="incorrect">Incorrect, waiting for next question</p>
      {/if}
    {:else}
      <p>Answer submitted, waiting for results</p>
    {/if}
  {/if}
</main>

<style>
  .correct {
    color: green;
  }
  .incorrect {
    color: red;
  }

  ul {
    list-style: none;
  }

  ul {
    display: grid;
    height: 50vh;

    grid-template-columns: 1fr 1fr;
    grid-gap: 1rem;
    padding: 0;
  }

  ul li button,
  ul li {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    font-size: 1.5rem;
  }

  .host-ans {
    width: 100%;
    height: 100%;
    text-align: center;
  }

  .question {
    font-size: 2rem;
    background: #00000066;
    padding: 2rem 4rem;
  }
</style>
