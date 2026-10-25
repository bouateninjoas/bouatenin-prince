const cart = document.querySelector("#cart-items");
const itemCount = document.querySelector("[data-item-count]");
const cartCount = document.querySelector("[data-cart-count]");
const subtotalOutput = document.querySelector("[data-subtotal]");
const totalOutput = document.querySelector("[data-total]");
const emptyCartMessage = document.querySelector("[data-empty-cart]");
const checkoutButton = document.querySelector("[data-checkout]");
const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPrice(amount) {
  return `${currencyFormatter.format(amount)} $`;
}

function updateCartTotals() {
  const products = [...cart.querySelectorAll(".card")];
  let quantityTotal = 0;
  let priceTotal = 0;

  products.forEach((product) => {
    const price = Number(product.dataset.price);
    const quantityOutput = product.querySelector("[data-quantity]");
    const quantity = Number(quantityOutput.value);
    const decrementButton = product.querySelector('[data-action="decrease"]');
    const lineTotal = price * quantity;

    quantityTotal += quantity;
    priceTotal += lineTotal;
    product.querySelector("[data-line-total]").textContent = formatPrice(lineTotal);
    decrementButton.disabled = quantity <= 1;
  });

  const itemLabel = quantityTotal === 1 ? "article" : "articles";
  itemCount.textContent = `${quantityTotal} ${itemLabel}`;
  cartCount.textContent = quantityTotal;
  subtotalOutput.textContent = formatPrice(priceTotal);
  totalOutput.textContent = formatPrice(priceTotal);
  emptyCartMessage.hidden = products.length > 0;
  checkoutButton.disabled = products.length === 0;
}

cart.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button || !cart.contains(button)) {
    return;
  }

  const product = button.closest(".card");

  if (!product) {
    return;
  }

  switch (button.dataset.action) {
    case "increase": {
      const quantityOutput = product.querySelector("[data-quantity]");
      quantityOutput.value = Number(quantityOutput.value) + 1;
      break;
    }
    case "decrease": {
      const quantityOutput = product.querySelector("[data-quantity]");
      quantityOutput.value = Math.max(1, Number(quantityOutput.value) - 1);
      break;
    }
    case "remove":
      product.remove();
      break;
    case "like": {
      const isLiked = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", String(!isLiked));
      button.setAttribute(
        "aria-label",
        `${isLiked ? "Ajouter" : "Retirer"} ${product.querySelector("h2").textContent} ${isLiked ? "aux" : "des"} favoris`,
      );
      break;
    }
    default:
      return;
  }

  updateCartTotals();
});

updateCartTotals();
