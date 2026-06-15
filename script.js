const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzeyNsUjUp1ZGvJVGfg_ibW86JCfu7dJXyTYwBU77LMwF3eRqRMIIq21Org3aLcWIgyHg/exec";

document.addEventListener("DOMContentLoaded", () => {
  const loginScreen = document.getElementById("loginScreen");
  const loadingScreen = document.getElementById("loadingScreen");
  const quizScreen = document.getElementById("quizScreen");
  const resultScreen = document.getElementById("resultScreen");

  const studentNameInput = document.getElementById("studentName");
  const studentIdInput = document.getElementById("studentId");
  const startBtn = document.getElementById("startBtn");

  const loginMessage = document.getElementById("loginMessage");
  const quizMessage = document.getElementById("quizMessage");

  const questionCounter = document.getElementById("questionCounter");
  const questionText = document.getElementById("questionText");
  const optionsContainer = document.getElementById("optionsContainer");

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const finalScore = document.getElementById("finalScore");
  const finalPercentage = document.getElementById("finalPercentage");
  const funMessage = document.getElementById("funMessage");
  const finalTimer = document.getElementById("finalTimer");

  const themeToggle = document.getElementById("themeToggle");
  const timerDisplay = document.getElementById("timerDisplay");
  const bgMusic = document.getElementById("bgMusic");

  if (
    !loginScreen ||
    !loadingScreen ||
    !quizScreen ||
    !resultScreen ||
    !studentNameInput ||
    !studentIdInput ||
    !startBtn ||
    !loginMessage ||
    !quizMessage ||
    !questionCounter ||
    !questionText ||
    !optionsContainer ||
    !prevBtn ||
    !nextBtn ||
    !finalScore ||
    !finalPercentage ||
    !funMessage ||
    !finalTimer ||
    !themeToggle ||
    !timerDisplay
  ) {
    console.error("Some required HTML elements were not found.");
    alert("HTML and JavaScript are not connected correctly.");
    return;
  }

  let questions = [];
  let currentQuestionIndex = 0;
  let selectedAnswers = [];
  let currentStudent = {
    name: "",
    id: ""
  };

  let timerInterval = null;
  let quizStartTime = null;
  let finalElapsedTime = "00:00:00:00";
  let autoAdvanceLock = false;
  let typingTimeout = null;

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });

  startBtn.addEventListener("click", startQuizFlow);
  prevBtn.addEventListener("click", goToPreviousQuestion);
  nextBtn.addEventListener("click", goToNextQuestionManual);

  studentIdInput.addEventListener("input", () => {
    studentIdInput.value = studentIdInput.value.replace(/[^\d]/g, "");
  });

  async function startQuizFlow() {
    if (!studentNameInput || !studentIdInput || !loginMessage) {
      alert("Input elements are missing.");
      return;
    }

    const name = studentNameInput.value.trim();
    const studentId = studentIdInput.value.trim();

    console.log("Name:", name);
    console.log("ID:", studentId);

    loginMessage.textContent = "";

    if (name === "" || studentId === "") {
      loginMessage.textContent = "Student name and student number are required.";
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
      quizMessage.textContent = "";

      startTimer();

      showScreen("quiz");
      renderQuestion();
    } catch (error) {
      console.error("Start quiz error:", error);
      showScreen("login");
      loginMessage.textContent = error.message || "Something went wrong while starting the quiz.";
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

    const url = `${WEB_APP_URL}?action=checkStudent&studentId=${encodeURIComponent(studentId)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Could not verify student eligibility.");
    }

    const data = await response.json();

    if (!data.allowed) {
      throw new Error(data.message || "This student has already taken the quiz.");
    }
  }

  async function fetchQuestions() {
    const url = `${WEB_APP_URL}?action=getQuestions`;
    const response = await fetch(url);

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
    quizMessage.textContent = "";

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
    const optionButtons = document.querySelectorAll(".option-btn");

    optionButtons.forEach((btn) => {
      btn.classList.toggle("selected", btn.textContent === optionText);
    });
  }

  function goToPreviousQuestion() {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex -= 1;
      renderQuestion();
    }
  }

  function goToNextQuestionManual() {
    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex += 1;
      renderQuestion();
    } else {
      submitQuiz();
    }
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

      finalScore.textContent = `Score: ${data.score} / ${data.total}`;
      finalPercentage.textContent = `Percentage: ${data.percentage}%`;
      funMessage.textContent = getFunMessage(data.percentage);
      finalTimer.textContent = `Time: ${finalElapsedTime}`;
      finalTimer.classList.add("stopped");

      timerDisplay.classList.remove("active");
      showScreen("result");
    } catch (error) {
      console.error("Submit quiz error:", error);
      showScreen("quiz");
      quizMessage.textContent = error.message || "Submission failed.";
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
    finalTimer.classList.remove("stopped");
    quizStartTime = Date.now();
    timerDisplay.classList.add("active");
    updateTimer();

    if (timerInterval) {
      clearInterval(timerInterval);
    }

    timerInterval = setInterval(updateTimer, 10);
  }

  function updateTimer() {
    if (!quizStartTime) return;

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
