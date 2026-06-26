const emailInput = document.querySelector("#email-input");
const passwordInput = document.querySelector("#password-input");
const messageBox = document.querySelector("#auth-message");

document.querySelector("#signup-btn").addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  const { error: signUpError } = await supabaseClient.auth.signUp({ email, password });

  if (signUpError) {
    messageBox.textContent = "Signup failed: " + signUpError.message;
    return;
  }

  const { error: loginError } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (loginError) {
    messageBox.textContent = "Account created! Please confirm your email then log in.";
  } else {
    window.location.href = "profile-setup.html";
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
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .single();

    window.location.href = profile ? "index.html" : "profile-setup.html";
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