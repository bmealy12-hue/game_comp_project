const emailInput = document.querySelector("#email-input");
const passwordInput = document.querySelector("#password-input");
const messageBox = document.querySelector("#auth-message");

document.querySelector("#signup-btn").addEventListener("click", async () => {
  const { data, error } = await supabaseClient.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value
  });

  if (error) {
    messageBox.textContent = "Signup failed: " + error.message;
  } else {
    messageBox.textContent = "Signed up! Check your email to confirm, then log in.";
  }
});

document.querySelector("#login-btn").addEventListener("click", async () => {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });

  if (error) {
    messageBox.textContent = "Login failed: " + error.message;
  } else {
    window.location.href = "index.html";
  }
});

document.querySelector("#forgot-link").addEventListener("click", async (e) => {
  e.preventDefault();

  const email = emailInput.value;
  if (!email) {
    messageBox.textContent = "Enter your email first, then click 'Forgot password?'";
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: "http://127.0.0.1:5500/reset-password.html"
  });

  if (error) {
    messageBox.textContent = "Error: " + error.message;
  } else {
    messageBox.textContent = "Check your email for a password reset link.";
  }
});