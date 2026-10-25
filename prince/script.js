document.addEventListener("DOMContentLoaded", () => {
  const colorBox = document.getElementById("color-box");
  const changeColorButton = document.getElementById("change-color-btn");
  const colorValue = document.getElementById("color-value");

  if (!colorBox || !changeColorButton || !colorValue) {
    throw new Error("Les éléments du changeur de couleurs sont introuvables.");
  }

  function getRandomColor() {
    const color = Math.floor(Math.random() * 0x1000000)
      .toString(16)
      .padStart(6, "0");

    return `#${color.toUpperCase()}`;
  }

  changeColorButton.addEventListener("click", () => {
    const color = getRandomColor();
    colorBox.style.backgroundColor = color;
    colorBox.setAttribute("aria-label", `Couleur actuelle : ${color}`);
    colorValue.textContent = color;
  });
});