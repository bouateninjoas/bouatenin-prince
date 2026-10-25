const form = document.querySelector('#auth-form');
const loginTab = document.querySelector('#login-tab');
const registerTab = document.querySelector('#register-tab');
const confirmGroup = document.querySelector('#confirm-group');
const confirmPassword = document.querySelector('#confirm-password');
const password = document.querySelector('#password');
const message = document.querySelector('#auth-message');
const submitButton = document.querySelector('#submit-button');
const submitLabel = document.querySelector('#submit-label');
let mode = 'login';

document.querySelector('.password-toggle').addEventListener('click', (event) => {
  const toggle = event.currentTarget;
  const showing = password.type === 'text';
  password.type = showing ? 'password' : 'text';
  toggle.setAttribute('aria-pressed', String(!showing));
  toggle.setAttribute('aria-label', showing ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
  toggle.textContent = showing ? 'Afficher' : 'Masquer';
});

function setMode(nextMode) {
  mode = nextMode;
  const registering = mode === 'register';
  loginTab.classList.toggle('is-active', !registering);
  registerTab.classList.toggle('is-active', registering);
  loginTab.setAttribute('aria-selected', String(!registering));
  registerTab.setAttribute('aria-selected', String(registering));
  confirmGroup.hidden = !registering;
  confirmPassword.required = registering;
  password.autocomplete = registering ? 'new-password' : 'current-password';
  submitLabel.textContent = registering ? 'Créer mon compte' : 'Se connecter';
  message.textContent = '';
  message.classList.remove('is-success');
}

loginTab.addEventListener('click', () => setMode('login'));
registerTab.addEventListener('click', () => setMode('register'));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  message.classList.remove('is-success');
  if (!form.reportValidity()) return;
  if (mode === 'register' && password.value !== confirmPassword.value) {
    message.textContent = 'Les mots de passe ne correspondent pas.';
    confirmPassword.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.setAttribute('aria-busy', 'true');
  submitLabel.textContent = mode === 'register' ? 'Création du compte…' : 'Connexion…';
  try {
    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: form.elements.phone.value, password: password.value }),
    });
    const result = await response.json();
    if (!response.ok) {
      message.textContent = result.error || 'Impossible de traiter la demande.';
      return;
    }
    message.classList.add('is-success');
    message.textContent = mode === 'register'
      ? 'Compte créé. Ouverture de la boutique…'
      : 'Connexion réussie. Ouverture de la boutique…';
    window.location.assign('/gomycode.HTML');
  } catch {
    message.textContent = 'Le serveur est injoignable. Réessaie dans un instant.';
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute('aria-busy');
    submitLabel.textContent = mode === 'register' ? 'Créer mon compte' : 'Se connecter';
  }
});
