function reverseString(text) {
  return Array.from(text).reverse().join("");
}

function countCharacters(text) {
  return Array.from(text).length;
}

function capitalizeWords(sentence) {
  return sentence.replace(/\p{L}[\p{L}\p{M}]*/gu, (word) => {
    const [firstCharacter, ...remainingCharacters] = Array.from(word);
    return firstCharacter.toLocaleUpperCase("fr-FR") + remainingCharacters.join("");
  });
}

function validateNumbers(numbers) {
  if (!Array.isArray(numbers) || !numbers.every(Number.isFinite)) {
    throw new TypeError("Le tableau doit contenir uniquement des nombres finis.");
  }

  return numbers;
}

function findMax(numbers) {
  validateNumbers(numbers);
  return numbers.length === 0 ? undefined : numbers.reduce((maximum, number) => Math.max(maximum, number));
}

function findMin(numbers) {
  validateNumbers(numbers);
  return numbers.length === 0 ? undefined : numbers.reduce((minimum, number) => Math.min(minimum, number));
}

function sumArray(numbers) {
  validateNumbers(numbers);
  return numbers.reduce((sum, number) => sum + number, 0);
}

function filterArray(items, condition) {
  validateNumbers(items);
  if (typeof condition !== "function") {
    throw new TypeError("La condition de filtrage doit être une fonction.");
  }

  return items.filter(condition);
}

function factorial(number) {
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new RangeError("La factorielle attend un entier positif ou nul.");
  }

  let result = 1;
  for (let current = 2; current <= number; current += 1) {
    if (result > Number.MAX_SAFE_INTEGER / current) {
      throw new RangeError("Le résultat dépasse la précision exacte des nombres JavaScript.");
    }
    result *= current;
  }

  return result;
}

function isPrime(number) {
  if (!Number.isSafeInteger(number)) {
    throw new TypeError("La vérification attend un nombre entier.");
  }
  if (number < 2) {
    return false;
  }

  for (let divisor = 2; divisor <= Math.sqrt(number); divisor += 1) {
    if (number % divisor === 0) {
      return false;
    }
  }

  return true;
}

function fibonacci(termCount) {
  if (!Number.isSafeInteger(termCount) || termCount < 0) {
    throw new RangeError("Le nombre de termes doit être un entier positif ou nul.");
  }

  const sequence = [];
  let previous = 0;
  let current = 1;

  for (let index = 0; index < termCount; index += 1) {
    if (!Number.isSafeInteger(previous)) {
      throw new RangeError("La suite dépasse la précision exacte des nombres JavaScript.");
    }
    sequence.push(previous);
    [previous, current] = [current, previous + current];
  }

  return sequence;
}

function parseNumberArray(value) {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    return [];
  }

  return trimmedValue.split(",").map((entry) => {
    const trimmedEntry = entry.trim();
    if (trimmedEntry === "") {
      throw new TypeError("Séparez les nombres par des virgules sans laisser de valeur vide.");
    }

    const number = Number(trimmedEntry);
    if (!Number.isFinite(number)) {
      throw new TypeError("Chaque valeur du tableau doit être un nombre fini.");
    }

    return number;
  });
}

function parseInteger(value) {
  if (value.trim() === "") {
    throw new TypeError("Saisissez un nombre entier.");
  }

  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new TypeError("Saisissez un entier représentable précisément.");
  }

  return number;
}

function displayResult(output, render) {
  output.removeAttribute("data-error");
  try {
    output.textContent = render();
  } catch (error) {
    if (!(error instanceof TypeError || error instanceof RangeError)) {
      throw error;
    }

    output.textContent = error.message;
    output.dataset.error = "true";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("text-input");
  const arrayInput = document.getElementById("array-input");
  const numberInput = document.getElementById("number-input");
  const results = {
    text: document.querySelector('[data-result="text"]'),
    array: document.querySelector('[data-result="array"]'),
    math: document.querySelector('[data-result="math"]'),
  };

  document.querySelectorAll("[data-operation]").forEach((button) => {
    button.addEventListener("click", () => {
      const operation = button.dataset.operation;

      if (["reverse", "count-characters", "capitalize-words"].includes(operation)) {
        displayResult(results.text, () => {
          const text = textInput.value;
          switch (operation) {
            case "reverse":
              return reverseString(text);
            case "count-characters":
              return `${countCharacters(text)} caractère(s)`;
            case "capitalize-words":
              return capitalizeWords(text);
            default:
              return text;
          }
        });
        return;
      }

      if (["maximum", "minimum", "sum", "filter"].includes(operation)) {
        displayResult(results.array, () => {
          const numbers = parseNumberArray(arrayInput.value);
          switch (operation) {
            case "maximum":
              return `Maximum : ${findMax(numbers) ?? "aucune valeur"}`;
            case "minimum":
              return `Minimum : ${findMin(numbers) ?? "aucune valeur"}`;
            case "sum":
              return `Somme : ${sumArray(numbers)}`;
            case "filter":
              return JSON.stringify(filterArray(numbers, (number) => number % 2 === 0));
            default:
              return "";
          }
        });
        return;
      }

      displayResult(results.math, () => {
        const number = parseInteger(numberInput.value);
        switch (operation) {
          case "factorial":
            return `${number}! = ${factorial(number)}`;
          case "prime":
            return `${number} ${isPrime(number) ? "est un nombre premier" : "n’est pas un nombre premier"}`;
          case "fibonacci":
            return JSON.stringify(fibonacci(number));
          default:
            return "";
        }
      });
    });
  });
});