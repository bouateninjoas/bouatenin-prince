const accountForm = document.querySelector("#account-form");
const accountPassword = document.querySelector("#account-password");
const accountConfirm = document.querySelector("#account-confirm");
const accountNotice = document.querySelector("#account-notice");

function validateMatchingPasswords() {
  accountConfirm.setCustomValidity(
    accountConfirm.value && accountConfirm.value !== accountPassword.value
      ? "Les deux mots de passe ne correspondent pas."
      : "",
  );
}

accountPassword.addEventListener("input", validateMatchingPasswords);
accountConfirm.addEventListener("input", validateMatchingPasswords);

accountForm.addEventListener("submit", (event) => {
  event.preventDefault();
  validateMatchingPasswords();

  if (!accountForm.reportValidity()) {
    return;
  }

  accountNotice.textContent =
    "Votre formulaire est valide. Cette version de démonstration ne crée ni n’enregistre encore de compte.";
  accountNotice.classList.add("is-visible");
  accountForm.reset();
});
