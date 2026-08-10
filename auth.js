// This is a browser-only demo login. A real application needs a secure backend
// for account storage, password hashing, email delivery, and password recovery.
const AUTH_USERS_KEY = "simple-todo-users";
const AUTH_SESSION_KEY = "simple-todo-current-user";
const PASSWORD_RESET_KEY = "simple-todo-password-reset";

let authMode = "signin";

const authForm = document.querySelector("#auth-form");
const authTitle = document.querySelector("#auth-title");
const authIntro = document.querySelector("#auth-intro");
const nameField = document.querySelector("#name-field");
const nameInput = document.querySelector("#auth-name");
const emailField = document.querySelector("#email-field");
const emailInput = document.querySelector("#auth-email");
const otpField = document.querySelector("#otp-field");
const otpInput = document.querySelector("#auth-otp");
const passwordField = document.querySelector("#password-field");
const passwordInput = document.querySelector("#auth-password");
const confirmPasswordField = document.querySelector("#confirm-password-field");
const confirmPasswordInput = document.querySelector("#auth-confirm-password");
const authSubmitButton = document.querySelector("#auth-submit");
const authMessage = document.querySelector("#auth-message");
const authSuccessPanel = document.querySelector("#auth-success-panel");
const forgotPasswordButton = document.querySelector("#forgot-password-button");
const goToLoginButton = document.querySelector("#go-to-login-button");
const authSwitch = document.querySelector("#auth-switch");
const authSwitchText = document.querySelector("#auth-switch-text");
const authSwitchButton = document.querySelector("#auth-switch-button");

// A signed-in user should go directly to their task list instead of seeing this page again.
if (getCurrentUser()) {
  window.location.replace("app.html");
}

authForm.addEventListener("submit", submitAuthenticationForm);
authSwitchButton.addEventListener("click", () => {
  const nextMode = authMode === "signin" ? "signup" : authMode === "verify" ? "request" : "signin";
  setAuthMode(nextMode);
});
forgotPasswordButton.addEventListener("click", () => setAuthMode("request"));
goToLoginButton.addEventListener("click", () => setAuthMode("signin"));

function getUsers() {
  try {
    const savedUsers = localStorage.getItem(AUTH_USERS_KEY);
    return savedUsers ? JSON.parse(savedUsers) : [];
  } catch (error) {
    console.error("Could not read saved accounts:", error);
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  try {
    const savedSession = localStorage.getItem(AUTH_SESSION_KEY);
    return savedSession ? JSON.parse(savedSession) : null;
  } catch (error) {
    return null;
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const isSigningUp = mode === "signup";
  const isRequestingReset = mode === "request";
  const isVerifyingCode = mode === "verify";
  const isResettingPassword = mode === "reset";
  const isShowingSuccess = mode === "success";
  const needsEmail = mode === "signin" || isSigningUp || isRequestingReset;
  const needsPassword = mode === "signin" || isSigningUp || isResettingPassword;
  const needsPasswordConfirmation = isSigningUp || isResettingPassword;

  nameField.hidden = !isSigningUp;
  emailField.hidden = !needsEmail;
  otpField.hidden = !isVerifyingCode;
  passwordField.hidden = !needsPassword;
  confirmPasswordField.hidden = !needsPasswordConfirmation;
  authForm.hidden = isShowingSuccess;
  authSuccessPanel.hidden = !isShowingSuccess;
  authSwitch.hidden = isShowingSuccess;
  forgotPasswordButton.hidden = mode !== "signin";
  nameInput.required = isSigningUp;
  emailInput.required = needsEmail;
  otpInput.required = isVerifyingCode;
  passwordInput.required = needsPassword;
  confirmPasswordInput.required = needsPasswordConfirmation;
  passwordInput.autocomplete = needsPasswordConfirmation ? "new-password" : "current-password";
  passwordInput.previousElementSibling.textContent = isResettingPassword ? "New password" : "Password";
  confirmPasswordInput.previousElementSibling.textContent = isResettingPassword
    ? "Confirm new password"
    : "Confirm password";

  if (isSigningUp) {
    authTitle.textContent = "Create your account";
    authIntro.textContent = "Create an account to keep your task list separate on this browser.";
    authSubmitButton.textContent = "Create account";
    authSwitchText.textContent = "Already have an account?";
    authSwitchButton.textContent = "Sign in";
  } else if (isRequestingReset) {
    authTitle.textContent = "Forgot your password?";
    authIntro.textContent = "Enter your account email to receive a verification code.";
    authSubmitButton.textContent = "Send verification code";
    authSwitchText.textContent = "Remembered your password?";
    authSwitchButton.textContent = "Sign in";
  } else if (isVerifyingCode) {
    authTitle.textContent = "Check your email";
    authIntro.textContent = "Enter the 6-digit verification code sent to your email address.";
    authSubmitButton.textContent = "Verify code";
    authSwitchText.textContent = "Use a different email?";
    authSwitchButton.textContent = "Go back";
  } else if (isResettingPassword) {
    authTitle.textContent = "Create a new password";
    authIntro.textContent = "Choose a new password for your account.";
    authSubmitButton.textContent = "Reset password";
    authSwitchText.textContent = "Want to return to sign in?";
    authSwitchButton.textContent = "Sign in";
  } else if (isShowingSuccess) {
    authTitle.textContent = "Password updated";
    authIntro.textContent = "Your password has been reset. You can now sign in to your account.";
  } else {
    authTitle.textContent = "Welcome back";
    authIntro.textContent = "Sign in to manage your tasks.";
    authSubmitButton.textContent = "Sign in";
    authSwitchText.textContent = "New here?";
    authSwitchButton.textContent = "Create an account";
  }

  authMessage.textContent = "";
  authForm.reset();
  if (!isShowingSuccess) {
    (isSigningUp ? nameInput : isVerifyingCode ? otpInput : emailInput).focus();
  }
}

function submitAuthenticationForm(event) {
  event.preventDefault();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (authMode === "signup") {
    createAccount(email, password);
  } else if (authMode === "request") {
    requestPasswordReset(email);
  } else if (authMode === "verify") {
    verifyPasswordResetCode();
  } else if (authMode === "reset") {
    resetPassword(password);
  } else {
    signIn(email, password);
  }
}

function requestPasswordReset(email) {
  if (!getUsers().some((user) => user.email === email)) {
    showAuthMessage("No account exists with this email address.");
    return;
  }

  const verificationCode = String(Math.floor(100_000 + Math.random() * 900_000));
  sessionStorage.setItem(PASSWORD_RESET_KEY, JSON.stringify({
    email,
    verificationCode,
    expiresAt: Date.now() + 10 * 60 * 1_000,
  }));
  setAuthMode("verify");
  // A browser-only app cannot send email. Showing the code makes this flow testable.
  showAuthMessage(`Demo mode: use verification code ${verificationCode}.`);
}

function verifyPasswordResetCode() {
  const resetRequest = getPasswordResetRequest();

  if (!resetRequest) {
    setAuthMode("request");
    showAuthMessage("Your verification code has expired. Please request a new one.");
    return;
  }

  if (otpInput.value.trim() !== resetRequest.verificationCode) {
    showAuthMessage("That verification code is incorrect. Please try again.");
    otpInput.focus();
    return;
  }

  setAuthMode("reset");
}

function resetPassword(password) {
  const resetRequest = getPasswordResetRequest();
  const users = getUsers();
  const userIndex = resetRequest
    ? users.findIndex((user) => user.email === resetRequest.email)
    : -1;

  if (userIndex === -1) {
    setAuthMode("request");
    showAuthMessage("Please request a new verification code before resetting your password.");
    return;
  }

  if (password !== confirmPasswordInput.value) {
    showAuthMessage("Your passwords do not match.");
    confirmPasswordInput.focus();
    return;
  }

  users[userIndex] = { ...users[userIndex], password };
  saveUsers(users);
  sessionStorage.removeItem(PASSWORD_RESET_KEY);
  setAuthMode("success");
}

function getPasswordResetRequest() {
  try {
    const savedRequest = sessionStorage.getItem(PASSWORD_RESET_KEY);
    const resetRequest = savedRequest ? JSON.parse(savedRequest) : null;

    if (!resetRequest || resetRequest.expiresAt < Date.now()) {
      sessionStorage.removeItem(PASSWORD_RESET_KEY);
      return null;
    }

    return resetRequest;
  } catch (error) {
    return null;
  }
}

function createAccount(email, password) {
  const name = nameInput.value.trim();
  const users = getUsers();

  if (!name) {
    showAuthMessage("Please enter your name.");
    nameInput.focus();
    return;
  }

  if (users.some((user) => user.email === email)) {
    showAuthMessage("An account with this email already exists. Please sign in instead.");
    return;
  }

  if (password !== confirmPasswordInput.value) {
    showAuthMessage("Your passwords do not match.");
    confirmPasswordInput.focus();
    return;
  }

  const newUser = {
    id: createId(),
    name,
    email,
    // This is kept only so the local demo can work. Do not use this approach in production.
    password,
  };

  users.push(newUser);
  saveUsers(users);
  startSession(newUser);
}

function signIn(email, password) {
  const user = getUsers().find((savedUser) => (
    savedUser.email === email && savedUser.password === password
  ));

  if (!user) {
    showAuthMessage("The email address or password is incorrect.");
    return;
  }

  startSession(user);
}

function startSession(user) {
  // The session stores only the details the task app needs to identify this user.
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
  window.location.replace("app.html");
}

function showAuthMessage(message) {
  authMessage.textContent = message;
}

function createId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
