const API_URL = "PUT_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

const loginScreen = document.getElementById("loginScreen");
const quizScreen = document.getElementById("quizScreen");
const resultScreen = document.getElementById("resultScreen");

const loginForm = document.getElementById("loginForm");
const studentNameInput = document.getElementById("studentName");
const studentNumberInput = document.getElementById("studentNumber");
const loginMessage = document.getElementById("loginMessage");

const questionCounter = document.getElementById("questionCounter");
const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("optionsContainer");
const quizMessage = document.getElementById("quizMessage");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const finalScore = document.getElementById("finalScore");
const finalPercentage = document.getElementById("finalPercentage");
const funMessage = document.getElementById("funMessage");

const themeToggle = document.getElementById("themeToggle");

let questions = [];
let currentQuestionIndex = 0;
let answers = {};
let studentName = "";
let studentNumber = "";
let typingTimer = null;

function setTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
  localStorage.setItem("quizTheme", theme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem("quizTheme") || "light";
  setTheme(savedTheme);
}

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  setTheme(isDark ? "light" : "dark");
});

function showScreen(screen) {
  loginScreen.classList.remove("active");
  quizScreen.classList.remove("active");
  resultScreen.classList.remove("active");
  screen.classList.add("active");
}

function showMessage(element, text, color = "") {
  element.textContent = text;
  element.style.color = color;
}

function sanitizeStudentNumber(value) {
  return value.trim();
}

async function apiRequest(action, payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json();
  return data;
}

async function loadQuestions() {
  const data = await apiRequest("getQuestions");

  if (!data.success) {
    throw new Error(data.message || "Failed to load questions.");
  }

  questions = data.questions || [];
}

function typeWriter(text, element, speed = 35) {
  clearTimeout(typingTimer);
  element.textContent = "";
  let i = 0;

  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i += 1;
      typingTimer = setTimeout(type, speed);
    }
  }

  type();
}

function renderOptions() {
  optionsContainer.innerHTML = "";

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = answers[currentQuestion.id] || "";

  currentQuestion.options.forEach((optionText) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-btn";
    button.textContent = optionText;

    if (selectedAnswer === optionText) {
      button.classList.add("selected");
    }

    button.addEventListener("click", async () => {
      answers[currentQuestion.id] = optionText;
      renderOptions();
      await saveProgress();
    });

    optionsContainer.appendChild(button);
  });
}

function updateNavButtons() {
  prevBtn.style.visibility = currentQuestionIndex === 0 ? "hidden" : "visible";
  nextBtn.textContent =
    currentQuestionIndex === questions.length - 1 ? "Finish" : "Next";
}

function renderQuestion() {
  const currentQuestion = questions[currentQuestionIndex];
  questionCounter.textContent = `Question ${currentQuestionIndex + 1} / ${questions.length}`;
  typeWriter(currentQuestion.word, questionText);
  renderOptions();
  updateNavButtons();
  showMessage(quizMessage, "");
}

async function saveProgress() {
  if (!studentNumber) return;

  try {
    await apiRequest("saveProgress", {
      studentNumber,
      studentName,
      currentQuestion: currentQuestionIndex,
      answers,
    });
  } catch (error) {
    console.error("Progress save failed:", error);
  }
}

function calculateScore() {
  let score = 0;

  questions.forEach((question) => {
    if (answers[question.id] === question.correctAnswer) {
      score += 1;
    }
  });

  return score;
}

function getFunMessage(percentage) {
  if (percentage === 100) return "Outstanding! Perfect score!";
  if (percentage >= 80) return "Excellent work!";
  if (percentage >= 60) return "Good job!";
  if (percentage >= 40) return "Nice try. Keep practicing!";
  return "Don't give up. Practice makes perfect!";
}

async function finishQuiz() {
  const score = calculateScore();
  const percentage = Math.round((score / questions.length) * 100);

  const data = await apiRequest("submitQuiz", {
    studentNumber,
    studentName,
    answers,
    score,
    percentage,
  });

  if (!data.success) {
    showMessage(quizMessage, data.message || "Submission failed.", "red");
    return;
  }

  finalScore.textContent = `Score: ${score} / ${questions.length}`;
  finalPercentage.textContent = `Percentage: ${percentage}%`;
  funMessage.textContent = getFunMessage(percentage);
  showScreen(resultScreen);
}

prevBtn.addEventListener("click", async () => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex -= 1;
    renderQuestion();
    await saveProgress();
  }
});

nextBtn.addEventListener("click", async () => {
  const currentQuestion = questions[currentQuestionIndex];

  if (!answers[currentQuestion.id]) {
    showMessage(quizMessage, "Please select an answer first.", "red");
    return;
  }

  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex += 1;
    renderQuestion();
    await saveProgress();
  } else {
    await finishQuiz();
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  studentName = studentNameInput.value.trim();
  studentNumber = sanitizeStudentNumber(studentNumberInput.value);

  if (!studentName || !studentNumber) {
    showMessage(loginMessage, "Please enter your name and student ID.", "red");
    return;
  }

  showMessage(loginMessage, "Checking...", "");

  try {
    const statusData = await apiRequest("checkStudent", {
      studentNumber,
      studentName,
    });

    if (!statusData.success) {
      showMessage(loginMessage, statusData.message || "Access denied.", "red");
      return;
    }

    await loadQuestions();

    const progressData = await apiRequest("getProgress", { studentNumber });

    answers = progressData.answers || {};
    currentQuestionIndex = Number(progressData.currentQuestion || 0);

    if (currentQuestionIndex >= questions.length) {
      currentQuestionIndex = 0;
    }

    showScreen(quizScreen);
    renderQuestion();
  } catch (error) {
    console.error(error);
    showMessage(loginMessage, "Connection error. Please try again.", "red");
  }
});

loadTheme();
