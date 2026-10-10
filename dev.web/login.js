const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");
const submitButton = form.querySelector('button[type="submit"]');
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector(".password-toggle");

document.querySelector("#year").textContent = String(new Date().getFullYear());

passwordToggle.addEventListener("click", () => {
  const isVisible = passwordInput.type === "text";
  passwordInput.type = isVisible ? "password" : "text";
  passwordToggle.setAttribute("aria-pressed", String(!isVisible));
  passwordToggle.setAttribute(
    "aria-label",
    isVisible ? "Afficher le mot de passe" : "Masquer le mot de passe",
  );
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";

  if (!form.reportValidity()) return;

  submitButton.disabled = true;
  submitButton.querySelector("span:first-child").textContent = "Connexion…";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.querySelector("#display-name").value,
        password: passwordInput.value,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      message.textContent = result.error || "La connexion a échoué. Réessayez.";
      return;
    }

    window.location.assign("/");
  } catch {
    message.textContent = "Impossible de joindre le serveur. Vérifiez votre connexion.";
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span:first-child").textContent = "Entrer dans mon espace";
  }
});
