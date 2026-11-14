const moneyFormatter = new Intl.NumberFormat("fr-FR");
const categoryGrid = document.querySelector("#category-grid");
const productGrid = document.querySelector("#product-grid");
const searchInput = document.querySelector("#site-search");
const sortSelect = document.querySelector("#sort-products");
const productsTitle = document.querySelector("#products-title");
const resultsMessage = document.querySelector("#results-message");
const emptyState = document.querySelector("#empty-state");
const cartCount = document.querySelector("#cart-count");
const cartButton = document.querySelector("#cart-button");
const toast = document.querySelector("#toast");
let selectedCategory = "all";
let cartItems = 0;
let toastTimeout;
let productRequest = 0;
let searchTimeout;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderCategories(categories) {
  categoryGrid.innerHTML = categories.map(({ name, icon }) => `
    <button class="category-card" type="button" data-category="${escapeHtml(name)}" aria-pressed="false">
      <span class="category-icon" aria-hidden="true">${escapeHtml(icon)}</span>
      <span class="category-name">${escapeHtml(name)}</span>
      <span class="category-arrow" aria-hidden="true">↗</span>
    </button>
  `).join("");
}

function renderProductCards(products) {
  productGrid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-image-wrap">
        <img class="product-image" src="https://images.unsplash.com/${escapeHtml(product.image)}?auto=format&amp;fit=crop&amp;w=700&amp;q=80" alt="${escapeHtml(product.name)}" loading="lazy">
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
        <button class="favorite-button" type="button" aria-label="Ajouter ${escapeHtml(product.name)} aux favoris" aria-pressed="false">♡</button>
      </div>
      <div class="product-info">
        <span class="product-category">${escapeHtml(product.category)}</span>
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        ${product.rating ? `<div class="product-rating" aria-label="Note : ${escapeHtml(product.rating)} sur 5">★★★★★<span>${escapeHtml(product.rating)} (${escapeHtml(product.reviews)})</span></div>` : ""}
        <div class="product-bottom">
          <span class="product-price">${moneyFormatter.format(product.price)} <small>FCFA</small></span>
          <button class="add-to-cart" type="button" data-product="${escapeHtml(product.name)}" aria-label="Ajouter ${escapeHtml(product.name)} au panier">+</button>
        </div>
      </div>
    </article>
  `).join("");
}

async function renderProducts() {
  const requestId = ++productRequest;
  const isSearching = searchInput.value.trim().length > 0;
  productsTitle.textContent = isSearching
    ? "Résultats de recherche"
    : selectedCategory === "all" ? "À découvrir pour vous" : selectedCategory;
  resultsMessage.textContent = "";
  emptyState.hidden = true;

  const query = new URLSearchParams({
    q: searchInput.value.trim(),
    category: selectedCategory,
    sort: sortSelect.value,
  });

  try {
    const response = await fetch(`/api/products?${query}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Impossible de charger les produits.");
    if (requestId !== productRequest) return;

    renderProductCards(result.items);
    resultsMessage.textContent = `${result.total} produit${result.total > 1 ? "s" : ""} à découvrir`;
    emptyState.hidden = result.items.length > 0;
  } catch (_error) {
    if (requestId !== productRequest) return;
    productGrid.replaceChildren();
    resultsMessage.textContent = "";
    emptyState.textContent = "Le catalogue est momentanément indisponible. Réessayez dans quelques instants.";
    emptyState.hidden = false;
  }
}

async function loadStorefront() {
  try {
    const response = await fetch("/api/categories");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Impossible de charger les catégories.");
    renderCategories(result.items);
    await renderProducts();
  } catch (_error) {
    categoryGrid.replaceChildren();
    emptyState.textContent = "Le catalogue est momentanément indisponible. Relancez le site avec le serveur MarketCI.";
    emptyState.hidden = false;
  }
}

function selectCategory(category) {
  selectedCategory = category;
  document.querySelectorAll(".category-card").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.category === category));
  });
  document.querySelectorAll(".nav-category[data-category]").forEach((link) => {
    link.classList.toggle("active", link.dataset.category === category);
  });
  renderProducts();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

categoryGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  selectCategory(button.dataset.category);
  document.querySelector("#produits").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelectorAll(".nav-category[data-category]").forEach((link) => {
  link.addEventListener("click", () => selectCategory(link.dataset.category));
});

document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  selectCategory("all");
  document.querySelector("#produits").scrollIntoView({ behavior: "smooth", block: "start" });
});

searchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimeout);
  searchTimeout = window.setTimeout(renderProducts, 180);
});
sortSelect.addEventListener("change", renderProducts);
document.querySelector("#view-all").addEventListener("click", () => {
  searchInput.value = "";
  selectCategory("all");
});

productGrid.addEventListener("click", (event) => {
  const favoriteButton = event.target.closest(".favorite-button");
  if (favoriteButton) {
    const isFavorite = favoriteButton.getAttribute("aria-pressed") !== "true";
    favoriteButton.setAttribute("aria-pressed", String(isFavorite));
    favoriteButton.textContent = isFavorite ? "♥" : "♡";
    return;
  }

  const addButton = event.target.closest(".add-to-cart");
  if (!addButton) return;
  cartItems += 1;
  cartCount.textContent = String(cartItems);
  cartButton.setAttribute("aria-label", `Votre panier, ${cartItems} article${cartItems > 1 ? "s" : ""}`);
  showToast(`${addButton.dataset.product} ajouté au panier.`);
});

cartButton.addEventListener("click", () => {
  showToast(cartItems === 0
    ? "Votre panier est vide. Découvrez nos produits pour commencer vos achats."
    : `${cartItems} article${cartItems > 1 ? "s" : ""} dans votre panier.`);
});

loadStorefront();
