document.querySelector("#update-password-btn").addEventListener("click", async () => {
  const newPassword = document.querySelector("#new-password-input").value;
  const messageBox = document.querySelector("#reset-message");

  const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

  if (error) {
    messageBox.textContent = "Error: " + error.message;
  } else {
    messageBox.textContent = "Password updated! Redirecting...";
    setTimeout(() => window.location.href = "login.html", 1500);
  }
});