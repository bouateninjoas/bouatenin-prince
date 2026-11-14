const signupForm = document.querySelector("#signup-form");
const formNotice = document.querySelector("#form-notice");

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!signupForm.reportValidity()) {
    return;
  }

  formNotice.textContent =
    "Merci ! Le formulaire a été validé. En mode démo, vos coordonnées ne sont pas enregistrées et aucune demande n’est envoyée.";
  formNotice.classList.add("is-visible");
  signupForm.reset();
});
