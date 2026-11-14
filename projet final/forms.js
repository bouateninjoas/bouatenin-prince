document.querySelectorAll("[data-inquiry-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const status = form.querySelector(".form-status");
    const submitButton = form.querySelector('button[type="submit"]');
    const fields = new FormData(form);
    const additionalDetails = [
      ["Nom de la boutique", String(fields.get("store") || "").trim()],
      ["Catégories", String(fields.get("categories") || "").trim()],
    ].filter(([, value]) => value);
    const message = [
      String(fields.get("message") || "").trim(),
      ...additionalDetails.map(([label, value]) => `${label} : ${value}`),
    ].filter(Boolean).join("\n\n");
    const payload = {
      kind: form.dataset.kind,
      name: String(fields.get("name") || "").trim(),
      email: String(fields.get("email") || "").trim(),
      subject: String(fields.get("subject") || "").trim(),
      message,
      website: String(fields.get("website") || "").trim(),
    };

    submitButton.disabled = true;
    status.textContent = "Envoi de votre demande…";

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible d’envoyer votre demande.");
      status.textContent = "Merci ! Votre demande a bien été enregistrée par MarketCI.";
      form.reset();
    } catch (error) {
      console.error("Échec de l’envoi du formulaire MarketCI.", error);
      status.textContent = error.message || "Une erreur est survenue. Réessayez ou écrivez à bonjour@marketci.ci.";
    } finally {
      submitButton.disabled = false;
    }
  });
});
