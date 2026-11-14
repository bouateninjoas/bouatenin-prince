const CONTACT_EMAIL = "";
const contactForm = document.querySelector("#contact-form");
const contactNotice = document.querySelector("#contact-notice");

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!contactForm.reportValidity()) {
    return;
  }

  if (!CONTACT_EMAIL) {
    contactNotice.textContent =
      "Le formulaire est complet, mais l’adresse e-mail de réception n’est pas encore configurée. Aucun message n’a été envoyé.";
    contactNotice.classList.add("is-visible");
    return;
  }

  const formData = new FormData(contactForm);
  const subject = `Demande MarketCI — ${formData.get("topic")}`;
  const body = [
    `Nom : ${formData.get("name")}`,
    `E-mail : ${formData.get("email")}`,
    "",
    String(formData.get("message")),
  ].join("\n");

  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  contactNotice.textContent =
    "Votre application de messagerie s’ouvre avec votre demande préremplie. Vérifiez le message puis envoyez-le.";
  contactNotice.classList.add("is-visible");
});
