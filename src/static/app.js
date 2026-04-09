document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const authStatus = document.getElementById("auth-status");
  const qnaContainer = document.getElementById("qna-container");
  const qnaForm = document.getElementById("qna-form");
  const qnaMessage = document.getElementById("qna-message");
  const questionsList = document.getElementById("questions");
  const currentUserText = document.getElementById("current-user");

  let currentUser = localStorage.getItem("mergington_user") || "";

  function setCurrentUser(email) {
    currentUser = email;
    if (email) {
      localStorage.setItem("mergington_user", email);
      qnaContainer.classList.remove("hidden");
      currentUserText.textContent = `Logged in as ${email}`;
      currentUserText.className = "info";
      fetchQuestions();
    } else {
      localStorage.removeItem("mergington_user");
      qnaContainer.classList.add("hidden");
      currentUserText.textContent = "";
    }
  }

  async function showMessage(element, text, type = "info") {
    element.textContent = text;
    element.className = `message ${type}`;
    element.classList.remove("hidden");
    setTimeout(() => {
      element.classList.add("hidden");
    }, 5000);
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=''>-- Select an activity --</option>";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(
          email
        )}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage(messageDiv, "Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(
          email
        )}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage(messageDiv, "Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      if (response.ok) {
        showMessage(authStatus, result.message, "success");
        setCurrentUser(email);
        registerForm.reset();
      } else {
        showMessage(authStatus, result.detail || "Registration failed", "error");
      }
    } catch (error) {
      showMessage(authStatus, "Registration error. Please try again.", "error");
      console.error("Error registering:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      if (response.ok) {
        showMessage(authStatus, result.message, "success");
        setCurrentUser(email);
        loginForm.reset();
      } else {
        showMessage(authStatus, result.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage(authStatus, "Login error. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  async function fetchQuestions() {
    try {
      const response = await fetch("/qna");
      const questions = await response.json();

      questionsList.innerHTML = "";
      questions.forEach((item) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `<strong>${item.email}</strong>: ${item.question}`;
        questionsList.appendChild(listItem);
      });
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  }

  qnaForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showMessage(qnaMessage, "Please log in first to ask a question.", "error");
      return;
    }

    const question = document.getElementById("question").value;

    try {
      const response = await fetch("/qna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser, question }),
      });

      const result = await response.json();
      if (response.ok) {
        showMessage(qnaMessage, result.message, "success");
        qnaForm.reset();
        fetchQuestions();
      } else {
        showMessage(qnaMessage, result.detail || "Could not submit question", "error");
      }
    } catch (error) {
      showMessage(qnaMessage, "Question submission failed. Please try again.", "error");
      console.error("Error submitting question:", error);
    }
  });

  setCurrentUser(currentUser);
  fetchActivities();
});
