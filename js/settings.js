const themeToggle = document.querySelector("#theme-toggle");
const ratingsToggle = document.querySelector("#ratings-toggle");
const compactToggle = document.querySelector("#compact-toggle");

// Load saved values
themeToggle.checked = localStorage.getItem("theme") === "light";
ratingsToggle.checked = localStorage.getItem("showRatings") !== "false";
compactToggle.checked = localStorage.getItem("compactView") === "true";

themeToggle.addEventListener("change", () => {
  const light = themeToggle.checked;
  localStorage.setItem("theme", light ? "light" : "dark");
  document.body.classList.toggle("light-mode", light);
});

ratingsToggle.addEventListener("change", () => {
  localStorage.setItem("showRatings", ratingsToggle.checked);
});

compactToggle.addEventListener("change", () => {
  localStorage.setItem("compactView", compactToggle.checked);
});
