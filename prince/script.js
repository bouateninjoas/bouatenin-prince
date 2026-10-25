function reverseString(text) {
	return Array.from(text).reverse().join("");
}

function countCharacters(text) {
	return Array.from(text).length;
}

function capitalizeWords(sentence) {
	return sentence.replace(/\S+/gu, (word) => {
		const characters = Array.from(word);
		characters[0] = characters[0].toLocaleUpperCase("fr-FR");
		return characters.join("");
	});
}

function findMax(numbers) {
	if (numbers.length === 0) {
		return undefined;
	}

	return numbers.reduce((maximum, number) => Math.max(maximum, number));
}

function findMin(numbers) {
	if (numbers.length === 0) {
		return undefined;
	}

	return numbers.reduce((minimum, number) => Math.min(minimum, number));
}

function sumArray(numbers) {
	return numbers.reduce((sum, number) => sum + number, 0);
}

function filterArray(items, condition) {
	return items.filter(condition);
}

function factorial(number) {
	if (!Number.isInteger(number) || number < 0) {
		throw new RangeError("Le nombre doit être un entier positif ou nul.");
	}

	let result = 1;
	for (let current = 2; current <= number; current += 1) {
		result *= current;
	}
	return result;
}

function isPrime(number) {
	if (!Number.isInteger(number) || number < 2) {
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
	if (!Number.isInteger(termCount) || termCount < 0) {
		throw new RangeError("Le nombre de termes doit être un entier positif ou nul.");
	}

	const sequence = [];
	let previous = 0;
	let current = 1;

	for (let index = 0; index < termCount; index += 1) {
		sequence.push(previous);
		[previous, current] = [current, previous + current];
	}

	return sequence;
}

console.log("Chaîne inversée :", reverseString("Bonjour"));
console.log("Nombre de caractères :", countCharacters("Bonjour"));
console.log("Mots en majuscules :", capitalizeWords("bonjour tout le monde"));
console.log("Maximum :", findMax([4, 9, 2, 7]));
console.log("Minimum :", findMin([4, 9, 2, 7]));
console.log("Somme :", sumArray([4, 9, 2, 7]));
console.log("Nombres pairs :", filterArray([1, 2, 3, 4], (number) => number % 2 === 0));
console.log("Factorielle de 5 :", factorial(5));
console.log("17 est premier :", isPrime(17));
console.log("10 termes de Fibonacci :", fibonacci(10));
