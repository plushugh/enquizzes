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
    <button on:click={() => (isHost = true)}>Host</button>
    <button on:click={() => (isHost = false)}>Participant</button>
  {/if}

  {#if isHost === true && inQuiz === false}
    <h2>Host</h2>
    <p>Host a quiz</p>
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
      <button type="submit">Start</button>
    </form>
  {/if}

  {#if isHost === true && inQuiz && !quizQuestioning && !quizEnded}
    <h2>Host</h2>
    <p>Quiz is live</p>
    <button
      on:click={async () => {
        socket.emit("start-quiz");
        quizQuestioning = true;
        inLobby = false;
      }}>Start Quiz</button
    >
    <p>Join code: {joinCode}</p>
    <ul>
      {#each lobbyPlayers as player}
        <li>
          {player.name}
        </li>
      {/each}
    </ul>
  {/if}

  {#if isHost === true && inQuiz && quizQuestioning && !quizEnded}
    <h2>Host</h2>
    <p>Questioning</p>
    <p class="question">{currentQuestion}</p>
    <button
      on:click={() => {
        socket.emit("next-question");
      }}>Next</button
    >
    <ul>
      {#each answers as answer}
        <li>
          {answer}
        </li>
      {/each}
    </ul>
    <ol>
      {#each lobbyPlayers as player}
        <li>
          {player.name}: {player.score}
        </li>
      {/each}
    </ol>
  {/if}

  {#if quizEnded}
    <h1>Quiz Ended</h1>
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
      <label for="player-name">Enter player name</label>
      <input type="text" id="player-name" bind:value={playerName} />
      <button type="submit">Join</button>
    </form>
  {/if}

  {#if isHost === false && inQuiz && inLobby}
    <h2>Participant</h2>
    <p>Waiting for host to start quiz</p>
    <p>Join code: {joinCode}</p>
    <ul>
      {#each lobbyPlayers as player}
        <li>
          {player.name}
        </li>
      {/each}
    </ul>
  {/if}

  {#if isHost === false && inQuiz && quizQuestioning && !quizEnded}
    <h2>Participant</h2>
    <p>Questioning</p>
    <p class="question">{currentQuestion}</p>
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
        <p>Correct, waiting for next question</p>
      {:else}
        <p>Incorrect, waiting for next question</p>
      {/if}
    {:else}
      <p>Answer submitted, waiting for results</p>
    {/if}
  {/if}
</main>

<style>
</style>
