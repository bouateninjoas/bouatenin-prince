const nameElement = document.querySelector("#welcome-name");
const logoutButtons = document.querySelectorAll("#logout-button, #contact-logout");
const menuToggle = document.querySelector("#menu-toggle");
const navigation = document.querySelector("#main-navigation");

async function loadSession() {
  try {
    const response = await fetch("/api/session");
    if (response.status === 401) {
      window.location.replace("/");
      return;
    }
    if (!response.ok) {
      throw new Error("Impossible de vérifier votre session.");
    }

    const session = await response.json();
    nameElement.textContent = session.name;
  } catch (error) {
    nameElement.textContent = "indisponible";
    const sessionError = document.querySelector("#session-error");
    sessionError.textContent = error.message;
    sessionError.hidden = false;
  }
}

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Ouvrir le menu" : "Fermer le menu");
  navigation.classList.toggle("is-open", !isExpanded);
});

navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Ouvrir le menu");
    navigation.classList.remove("is-open");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Ouvrir le menu");
    navigation.classList.remove("is-open");
    menuToggle.focus();
  }
});

for (const logoutButton of logoutButtons) {
  logoutButton.addEventListener("click", async () => {
    logoutButtons.forEach((button) => {
      button.disabled = true;
    });

    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("La déconnexion a échoué.");
      window.location.assign("/");
    } catch {
      logoutButtons.forEach((button) => {
        button.disabled = false;
      });
      logoutButton.textContent = "Erreur — réessayez";
    }
  });
}

document.querySelector("#year").textContent = String(new Date().getFullYear());
loadSession();
