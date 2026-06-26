const avatars = ["🎮", "👾", "🕹️", "🐉", "⚔️", "🚀", "🔥", "💀"];

const avatarGrid = document.querySelector("#avatar-grid");
const usernameInput = document.querySelector("#username-input");
const saveBtn = document.querySelector("#save-profile-btn");
const message = document.querySelector("#profile-message");

let selectedAvatar = null;

avatars.forEach((avatar) => {
  const button = document.createElement("button");
  button.textContent = avatar;
  button.classList.add("avatar-btn");
  button.addEventListener("click", () => {
    document.querySelectorAll(".avatar-btn").forEach(btn => btn.classList.remove("selected"));
    button.classList.add("selected");
    selectedAvatar = avatar;
  });
  avatarGrid.appendChild(button);
});

async function loadProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    window.location.href = "Login.html";
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("username, avatar")
    .eq("id", user.id)
    .single();

  if (profile) {
    usernameInput.value = profile.username || "";
    selectedAvatar = profile.avatar || null;
    document.querySelectorAll(".avatar-btn").forEach(btn => {
      if (btn.textContent === selectedAvatar) btn.classList.add("selected");
    });
  }
}

loadProfile();

saveBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();

  if (!username) {
    message.textContent = "Please enter a username.";
    return;
  }

  if (!selectedAvatar) {
    message.textContent = "Please select an avatar.";
    return;
  }

  const { data: { user } } = await supabaseClient.auth.getUser();

  const { error } = await supabaseClient
    .from("profiles")
    .upsert({ id: user.id, username, avatar: selectedAvatar });

  if (error) {
    message.textContent = error.message;
  } else {
    message.textContent = "Profile updated!";
    message.style.color = "#4ade80";
  }
});
