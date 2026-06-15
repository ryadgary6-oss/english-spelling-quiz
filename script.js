console.log("DEBUG SCRIPT VERSION 999");
alert("DEBUG SCRIPT VERSION 999");

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzeyNsUjUp1ZGvJVGfg_ibW86JCfu7dJXyTYwBU77LMwF3eRqRMIIq21Org3aLcWIgyHg/exec";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);

  const loginScreen = $("#loginScreen");
  const loadingScreen = $("#loadingScreen");
  const quizScreen = $("#quizScreen");
  const resultScreen = $("#resultScreen");

  const loginForm = $("#loginForm");

  const studentNameInput =
    $("#studentName") ||
    $('input[name="studentName"]') ||
    $('input[placeholder*="name" i]');

  const studentIdInput =
    $("#studentId") ||
    $('input[name="studentId"]') ||
    $('input[placeholder*="student ID" i]') ||
    $('input[placeholder*="id" i]');

  const startBtn = $("#startBtn");
  const loginMessage = $("#loginMessage");
  const debugMessage = $("#debugMessage");
  const quizMessage = $("#quizMessage");

  const questionCounter = $("#questionCounter");
  const questionText = $("#questionText");
  const optionsContainer = $("#optionsContainer");

  const prevBtn = $("#prevBtn");
  const nextBtn = $("#nextBtn");

  const finalScore = $("#finalScore");
  const finalPercentage = $("#finalPercentage");
  const funMessage = $("#funMessage");
  const finalTimer = $("#finalTimer");

  const themeToggle = $("#themeToggle");
  const timerDisplay = $("#timerDisplay");
  const bgMusic = $("#bgMusic");

  function setDebug(text) {
    if (debugMessage) {
      debugMessage.textContent = text;
    }
    console.log(text);
  }

  setDebug("script loaded");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      startQuizFlow();
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
    });
  }

  if (studentIdInput) {
    studentIdInput.addEventListener("input", () => {
      studentIdInput.value = studentIdInput.value.replace(/[^\d]/g, "");
    });
  }

  if (!startBtn) {
    alert("Start button not found in HTML.");
    return;
  }

  startBtn.addEventListener("click", (e) => {
    e.preventDefault();
    startQuizFlow();
  });

  if (!loginScreen || !loadingScreen || !quizScreen || !resultScreen) {
    alert("Main screens not found in HTML.");
    return;
  }

  let questions = [];
  let currentQuestionIndex = 0;
  let selectedAnswers = [];
  let currentStudent = { name: "", id: "" };

  let timerInterval = null;
  let quizStartTime = null;
  let finalElapsedTime = "00:00:00:00";
  let autoAdvanceLock = false;
  let typingTimeout = null;

  function readSafeValue(input) {
    if (!input) return "";
    return String(input.value || "").trim();
  }

  async function startQuizFlow() {
    const name = readSafeValue(studentNameInput);
    const studentId = readSafeValue(studentIdInput);

    setDebug(`name="${name}" | id="${studentId}"`);

    if (loginMessage) loginMessage.textContent = "";

    if (!studentNameInput) {
      if (loginMessage) loginMessage.textContent = "Name input not found.";
      setDebug("Name input element is missing.");
      return;
    }

    if (!studentIdInput) {
      if (loginMessage) loginMessage.textContent = "Student ID input not found.";
      setDebug("Student ID input element is missing.");
      return;
    }

    if (name === "" || studentId === "") {
      if (loginMessage) loginMessage.textContent = "Student name and student number are required.";
      setDebug("Input values are empty when Start was clicked.");
      return;
    }

    currentStudent.name = name;
    currentStudent.id = studentId;

    showScreen("loading");

    try {
      await checkStudentEligibility(studentId);
      questions = await fetchQuestions();

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("No questions found.");
      }

      selectedAnswers = new Array(questions.length).fill(null);
      currentQuestionIndex = 0;

      if (quizMessage) quizMessage.textContent = "";

      startTimer();
      showScreen("quiz");
      renderQuestion();
    } catch (error) {
      console.error(error);
      showScreen("login");
      if (loginMessage) {
        loginMessage.textContent =
          error.message || "Something went wrong while starting the quiz.";
      }
      setDebug(`start error: ${error.message || error}`);
    }
  }

  function showScreen(screenName) {
    loginScreen.classList.remove("active");
    loadingScreen.classList.remove("active");
    quizScreen.classList.remove("active");
    resultScreen.classList.remove("active");

    if (screenName === "login") loginScreen.classList.add("active");
    if (screenName === "loading") loadingScreen.classList.add("active");
    if (screenName === "quiz") quizScreen.classList.add("active");
    if (screenName === "result") resultScreen.classList.add("active");
  }

  async function checkStudentEligibility(studentId) {
    if (!WEB_APP_URL || WEB_APP_URL === "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
      throw new Error("Please set your Google Apps Script Web App URL in script.js");
    }

    const response = await fetch(
      `${WEB_APP_URL}?action=checkStudent&studentId=${encodeURIComponent(studentId)}`
    );

    if (!response.ok) {
      throw new Error("Could not verify student eligibility.");
    }

    const data = await response.json();

    if (!data.allowed) {
      throw new Error(data.message || "This student has already taken the quiz.");
    }
  }

  async function fetchQuestions() {
    const response = await fetch(`${WEB_APP_URL}?action=getQuestions`);

    if (!response.ok) {
      throw new Error("Could not load questions.");
    }

    const data = await response.json();

    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error("Questions could not be loaded.");
    }

    return data.questions;
  }

  function renderQuestion() {
    if (!questionText || !optionsContainer || !questionCounter) return;

    const question = questions[currentQuestionIndex];
    const number = currentQuestionIndex + 1;

    questionCounter.textContent = String(number);

    const rawText = typeof question.question === "string" ? question.question : "";
    const displayText = `${number} < ${rawText}`;

    typeWriter(questionText, displayText, 32);
    optionsContainer.innerHTML = "";

    const options = [
      question.option1,
      question.option2,
      question.option3,
      question.option4
    ];

    options.forEach((optionText) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.type = "button";
      btn.textContent = String(optionText ?? "");

      if (selectedAnswers[currentQuestionIndex] === btn.textContent) {
        btn.classList.add("selected");
      }

      btn.addEventListener("click", () => {
        handleOptionSelect(btn.textContent);
      });

      optionsContainer.appendChild(btn);
    });
  }

  function handleOptionSelect(optionText) {
    if (autoAdvanceLock) return;

    selectedAnswers[currentQuestionIndex] = optionText;
    highlightSelectedOption(optionText);
    autoAdvanceLock = true;

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex += 1;
        renderQuestion();
      } else {
        submitQuiz();
      }
      autoAdvanceLock = false;
    }, 260);
  }

  function highlightSelectedOption(optionText) {
    const buttons = document.querySelectorAll(".option-btn");
    buttons.forEach((btn) => {
      btn.classList.toggle("selected", btn.textContent === optionText);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex -= 1;
        renderQuestion();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex += 1;
        renderQuestion();
      } else {
        submitQuiz();
      }
    });
  }

  async function submitQuiz() {
    showScreen("loading");

    try {
      const payload = {
        action: "submitQuiz",
        studentName: currentStudent.name,
        studentId: currentStudent.id,
        answers: selectedAnswers
      };

      const response = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Submission failed.");
      }

      const data = await response.json();

      stopTimer();

      if (finalScore) finalScore.textContent = `Score: ${data.score} / ${data.total}`;
      if (finalPercentage) finalPercentage.textContent = `Percentage: ${data.percentage}%`;
      if (funMessage) funMessage.textContent = getFunMessage(data.percentage);
      if (finalTimer) {
        finalTimer.textContent = `Time: ${finalElapsedTime}`;
        finalTimer.classList.add("stopped");
      }

      if (timerDisplay) timerDisplay.classList.remove("active");
      showScreen("result");
    } catch (error) {
      console.error(error);
      showScreen("quiz");
      if (quizMessage) quizMessage.textContent = error.message || "Submission failed.";
    }
  }

  function getFunMessage(percentage) {
    const score = Number(percentage);
    if (score === 100) return "Perfect. Suspiciously perfect, honestly.";
    if (score >= 80) return "Excellent. Your dictionary is probably proud of you.";
    if (score >= 60) return "Not bad at all. Civilized performance.";
    if (score >= 40) return "You survived. Barely, but still.";
    return "Let us never speak of this again.";
  }

  function typeWriter(element, text, speed = 32) {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }

    element.textContent = "";
    let i = 0;

    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i += 1;
        typingTimeout = setTimeout(type, speed);
      }
    }

    type();
  }

  function startTimer() {
    if (!timerDisplay) return;

    if (finalTimer) finalTimer.classList.remove("stopped");

    quizStartTime = Date.now();
    timerDisplay.classList.add("active");
    updateTimer();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 10);
  }

  function updateTimer() {
    if (!quizStartTime || !timerDisplay) return;
    const elapsed = Date.now() - quizStartTime;
    finalElapsedTime = formatElapsedTime(elapsed);
    timerDisplay.textContent = finalElapsedTime;
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    if (quizStartTime) {
      finalElapsedTime = formatElapsedTime(Date.now() - quizStartTime);
    }
  }

  function formatElapsedTime(ms) {
    const totalCentiseconds = Math.floor(ms / 10);
    const cs = totalCentiseconds % 100;
    const totalSeconds = Math.floor(totalCentiseconds / 100);
    const sec = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const min = totalMinutes % 60;
    const hr = Math.floor(totalMinutes / 60);

    return `${pad(hr)}:${pad(min)}:${pad(sec)}:${pad(cs)}`;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }
});
