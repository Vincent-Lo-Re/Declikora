// Applique le thème sombre avant l'affichage, pour éviter un éclair blanc.
// Même logique et même clé que src/components/theme/theme-provider.tsx.
;(function () {
  var theme = "system"
  try {
    theme = localStorage.getItem("declikora-theme") || "system"
  } catch (e) {
    // Stockage indisponible : on suit l'ordinateur.
  }
  var dark =
    theme === "dark" ||
    (theme !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  if (dark) document.documentElement.classList.add("dark")
})()
