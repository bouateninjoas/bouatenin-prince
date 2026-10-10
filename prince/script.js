const form = document.querySelector("#analyzer-form");
const phraseInput = document.querySelector("#phrase");
const characterCount = document.querySelector("#character-count");
const errorMessage = document.querySelector("#error-message");
const results = document.querySelector("#results");
const sampleButton = document.querySelector("#sample-button");
const resetButton = document.querySelector("#reset-button");

function updateCharacterCount() {
  characterCount.textContent = `${Array.from(phraseInput.value).length} / 500`;
}

function analyzePhrase(phrase) {
  const text = phrase.trim().slice(0, -1);
  const words = text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [];
  const normalized = text.normalize("NFD").replace(/\p{M}/gu, "");
  const vowels = normalized.match(/[aeiouy]/giu) || [];

  document.querySelector("#character-result").textContent = String(Array.from(text).length);
  document.querySelector("#word-result").textContent = String(words.length);
  document.querySelector("#vowel-result").textContent = String(vowels.length);
}

function showAnalysis() {
  const phrase = phraseInput.value.trim();
  errorMessage.textContent = "";
  results.hidden = true;

  if (!phrase) {
    errorMessage.textContent = "Écrivez une phrase avant de lancer l’analyse.";
    phraseInput.focus();
    return false;
  }

  if (!phrase.endsWith(".")) {
    errorMessage.textContent = "Ajoutez un point final à votre phrase, puis réessayez.";
    phraseInput.focus();
    return false;
  }

  if (!phrase.slice(0, -1).trim()) {
    errorMessage.textContent = "Écrivez quelques mots avant le point final.";
    phraseInput.focus();
    return false;
  }

  analyzePhrase(phrase);
  results.hidden = false;
  return true;
}

phraseInput.addEventListener("input", () => {
  updateCharacterCount();
  errorMessage.textContent = "";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (showAnalysis()) results.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

sampleButton.addEventListener("click", () => {
  phraseInput.value = "Les idées prennent forme quand on les partage.";
  updateCharacterCount();
  showAnalysis();
  results.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

resetButton.addEventListener("click", () => {
  phraseInput.value = "";
  errorMessage.textContent = "";
  results.hidden = true;
  updateCharacterCount();
  phraseInput.focus();
});

updateCharacterCount();
