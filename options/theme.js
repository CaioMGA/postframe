// Editor theme. A classic script in <head>, so the saved theme applies before first paint.
const THEME_KEY = "theme";
const darkScheme = matchMedia("(prefers-color-scheme: dark)");

const getTheme = () => localStorage.getItem(THEME_KEY) || "light";

function applyTheme() {
  const theme = getTheme();
  document.documentElement.dataset.theme = theme === "system" ? (darkScheme.matches ? "dark" : "light") : theme;
}

function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
}

darkScheme.addEventListener("change", applyTheme);
addEventListener("storage", applyTheme);   // keeps other open settings tabs in step
applyTheme();
