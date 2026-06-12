/**
 * quiz.js — Vanilla JS quiz engine
 * Loads quiz data from a file specified by window.QUIZ_DATA_FILE
 * tracks answers, shows feedback, computes score, supports retry.
 */
(function () {
  "use strict";

  /* ── DOM refs ── */
  const quizArea       = document.getElementById("quizArea");
  const resultsSection = document.getElementById("resultsSection");
  const scoreText      = document.getElementById("scoreText");
  const answeredText   = document.getElementById("answeredText");
  const totalText      = document.getElementById("totalText");
  const progressBar    = document.getElementById("progressBar");
  const statusText     = document.getElementById("statusText");
  const submitBtn      = document.getElementById("submitBtn");
  const heroTitle      = document.getElementById("heroTitle");
  const heroSubtitle   = document.getElementById("heroSubtitle");

  /* ── State ── */
  let quizData = [];
  let state    = {};

  /* ── Fisher-Yates shuffle ── */
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ── Prepare: shuffle questions then shuffle each question's options ── */
  function prepareData(raw) {
    const shuffledQs = shuffle(raw.questions);
    return shuffledQs.map((item) => {
      const paired = item.options.map((opt, idx) => ({
        opt,
        isCorrect: idx === item.answerIndex,
      }));
      const shuffledPairs = shuffle(paired);
      return {
        question    : item.question,
        explanation : item.explanation,
        category    : item.category || "",
        level       : item.level    || "",
        tags        : item.tags     || [],
        shuffledOpts: shuffledPairs.map((x) => x.opt),
        correctIndex: shuffledPairs.findIndex((x) => x.isCorrect),
      };
    });
  }

  /* ── Reset state ── */
  function resetState() {
    state = {
      answered : Array(quizData.length).fill(null),
      locked   : Array(quizData.length).fill(false),
      submitted: false,
      score    : 0,
    };
  }

  /* ── Update topbar ── */
  function updateTopbar() {
    const answeredCount = state.answered.filter((v) => v !== null).length;
    const score = state.answered.reduce(
      (acc, val, idx) =>
        acc + (val !== null && val === quizData[idx].correctIndex ? 1 : 0), 0
    );
    state.score          = score;
    scoreText.textContent    = score;
    answeredText.textContent = answeredCount;
    progressBar.style.width  = `${(answeredCount / quizData.length) * 100}%`;
  }

  /* ── Handle option selection ── */
  function selectAnswer(qIndex, optIndex) {
    if (state.locked[qIndex] || state.submitted) return;
    state.answered[qIndex] = optIndex;
    state.locked[qIndex]   = true;

    const item     = quizData[qIndex];
    const options  = document.querySelectorAll(`#options-${qIndex} .option`);
    const feedback = document.getElementById(`feedback-${qIndex}`);

    options.forEach((el, idx) => {
      el.classList.add("locked");
      if (idx === item.correctIndex) el.classList.add("correct");
      if (idx === optIndex && optIndex !== item.correctIndex) el.classList.add("wrong");
      const input    = el.querySelector("input");
      input.checked  = idx === optIndex;
      input.disabled = true;
    });

    const isCorrect = optIndex === item.correctIndex;
    feedback.className = `feedback show ${isCorrect ? "correct" : "wrong"}`;
    feedback.innerHTML = isCorrect
      ? `<strong>Correct.</strong> ${item.explanation}`
      : `<strong>Incorrect.</strong> ${item.explanation}`;
    updateTopbar();
  }

  /* ── Render all question cards ── */
  function renderQuiz() {
    quizArea.innerHTML = "";
    quizData.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "question-card";
      card.innerHTML = `
        <h3 class="question-title">${index + 1}. ${item.question}</h3>
        <div class="options" id="options-${index}"></div>
        <div class="feedback" id="feedback-${index}"></div>
      `;
      quizArea.appendChild(card);

      const optionsWrap = card.querySelector(`#options-${index}`);
      item.shuffledOpts.forEach((opt, optIndex) => {
        const label = document.createElement("label");
        label.className = "option";
        label.innerHTML = `
          <input type="radio" name="q-${index}" value="${optIndex}" />
          <span><strong>${String.fromCharCode(65 + optIndex)}.</strong> ${opt}</span>
        `;
        label.addEventListener("click", () => selectAnswer(index, optIndex));
        optionsWrap.appendChild(label);
      });
    });
  }

  /* ── Submit quiz ── */
  function submitQuiz() {
    state.submitted = true;
    let score  = 0;
    const wrong   = [];
    const skipped = [];

    quizData.forEach((q, idx) => {
      const userAns = state.answered[idx];
      if (userAns === null) skipped.push(idx);
      else if (userAns === q.correctIndex) score++;
      else wrong.push(idx);

      const feedback = document.getElementById(`feedback-${idx}`);
      const options  = document.querySelectorAll(`#options-${idx} .option`);

      if (userAns === null) {
        options[q.correctIndex].classList.add("correct");
        feedback.className = "feedback show skip";
        feedback.innerHTML = `<strong>Skipped.</strong> ${q.explanation}`;
      } else {
        options.forEach((el, optIndex) => {
          if (optIndex === q.correctIndex) el.classList.add("correct");
          if (optIndex === userAns && userAns !== q.correctIndex) el.classList.add("wrong");
          el.classList.add("locked");
          el.querySelector("input").disabled = true;
        });
      }
    });

    state.score          = score;
    scoreText.textContent    = score;
    answeredText.textContent = quizData.length;
    progressBar.style.width  = "100%";
    statusText.textContent   = "Completed";

    const wrongRecap = wrong.map((i) => `
      <div class="recap-item">
        <div class="tag bad">Wrong</div>
        <div><strong>Q${i + 1}.</strong> ${quizData[i].question}</div>
        <div><strong>Your answer:</strong> ${quizData[i].shuffledOpts[state.answered[i]]}</div>
        <div><strong>Correct answer:</strong> ${quizData[i].shuffledOpts[quizData[i].correctIndex]}</div>
        <div><strong>Explanation:</strong> ${quizData[i].explanation}</div>
      </div>`).join("");

    const skippedRecap = skipped.map((i) => `
      <div class="recap-item">
        <div class="tag skip">Skipped</div>
        <div><strong>Q${i + 1}.</strong> ${quizData[i].question}</div>
        <div><strong>Correct answer:</strong> ${quizData[i].shuffledOpts[quizData[i].correctIndex]}</div>
        <div><strong>Explanation:</strong> ${quizData[i].explanation}</div>
      </div>`).join("");

    resultsSection.innerHTML = `
      <div class="result-card">
        <h3>Results Summary</h3>
        <div class="result-summary">
          <div>Score: ${score} / ${quizData.length}</div>
          <div>Correct: ${score}</div>
          <div>Wrong: ${wrong.length}</div>
          <div>Skipped: ${skipped.length}</div>
        </div>
        <div class="actions" style="justify-content:flex-start;margin-top:16px;">
          <button class="btn btn-retry" id="retryBtn">Retry Quiz</button>
        </div>
      </div>
      ${wrong.length   ? `<div class="result-card"><h3>Incorrect Answers Recap</h3>${wrongRecap}</div>`   : ""}
      ${skipped.length ? `<div class="result-card"><h3>Skipped Questions Recap</h3>${skippedRecap}</div>` : ""}
    `;

    document.getElementById("retryBtn").addEventListener("click", retryQuiz);
    submitBtn.classList.add("hidden");
    quizArea.querySelectorAll(".option").forEach((el) => el.classList.add("locked"));
  }

  /* ── Retry: re-shuffle everything ── */
  function retryQuiz() {
    const raw = window.__quizRawData__;
    if (raw) quizData = prepareData(raw);
    resetState();
    resultsSection.innerHTML = "";
    statusText.textContent   = "In progress";
    submitBtn.classList.remove("hidden");
    renderQuiz();
    updateTopbar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── Bootstrap ── */
  function init(raw) {
    window.__quizRawData__ = raw;
    if (heroTitle)    heroTitle.textContent    = raw.title    || "Quiz";
    if (heroSubtitle) heroSubtitle.textContent = raw.subtitle || "";
    totalText.textContent = raw.totalQuestions || raw.questions.length;
    quizData = prepareData(raw);
    resetState();
    renderQuiz();
    updateTopbar();
    submitBtn.addEventListener("click", submitQuiz);
  }

  /* ── Load JSON ── */
  fetch(window.QUIZ_DATA_FILE || "quiz1.json")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load quiz data: " + res.status);
      return res.json();
    })
    .then(init)
    .catch((err) => {
      quizArea.innerHTML = `<p style="color:red;padding:20px;">Error: ${err.message}</p>`;
      console.error(err);
    });
})();
