
"use strict";

// NUMERO WHATSAPP DE LA BOUTIQUE
const WHATSAPP_NUMBER = "2250757589892";

// CATALOGUE DES PRODUITS
const products = [
    {
        id: 1,
        category: "Lenovo",
        name: "Lenovo ThinkPad",
        description: "Ordinateur professionnel",
        price: 285000,
        image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600"
    },
    {
        id: 2,
        category: "Lenovo",
        name: "Lenovo IdeaPad",
        description: "Portable pour les études et le travail",
        price: 245000,
        image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600"
    },
    {
        id: 3,
        category: "Lenovo",
        name: "Lenovo Yoga",
        description: "Portable convertible",
        price: 395000,
        image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600"
    },
    {
        id: 4,
        category: "Mini PC",
        name: "Mini PC compact",
        description: "Ordinateur compact",
        price: 185000,
        image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600"
    },
    {
        id: 5,
        category: "Mini PC",
        name: "Mini PC professionnel",
        description: "Pour votre espace de travail",
        price: 225000,
        image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600"
    },
    {
        id: 6,
        category: "Accessoires",
        name: "Souris sans fil",
        description: "Souris ergonomique",
        price: 8500,
        image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=600"
    },
    {
        id: 7,
        category: "Accessoires",
        name: "Clavier sans fil",
        description: "Clavier moderne",
        price: 12500,
        image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600"
    },
    {
        id: 8,
        category: "Accessoires",
        name: "Pack clavier et souris",
        description: "Ensemble sans fil",
        price: 18500,
        image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600"
    },
    {
        id: 9,
        category: "Accessoires",
        name: "Casque informatique",
        description: "Casque audio confortable",
        price: 15000,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"
    }
];

// VARIABLES
let cart = [];
let authMode = "login";

const money = amount =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

const getElement = id => document.getElementById(id);

// AFFICHER LES PRODUITS
function displayProducts(category = "Tous") {
    const container = getElement("products");

    const filtered = products.filter(product =>
        category === "Tous" || product.category === category
    );

    container.innerHTML = filtered.map(product => `
        <article class="product-card">

            <div class="product-image">
                <img src="${product.image}" alt="${product.name}">
            </div>

            <div class="product-info">
                <span class="product-category">
                    ${product.category}
                </span>

                <h3>${product.name}</h3>

                <p>${product.description}</p>

                <div class="product-bottom">
                    <span class="price">
                        ${money(product.price)}
                    </span>

                    <button class="add-button"
                        data-add="${product.id}">
                        Ajouter
                    </button>
                </div>
            </div>

        </article>
    `).join("");
}

// AJOUTER AU PANIER
function addToCart(id) {
    const existing = cart.find(item => item.id === id);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            id: id,
            quantity: 1
        });
    }

    updateCart();
}

// MODIFIER QUANTITE
function changeQuantity(id, amount) {
    const item = cart.find(item => item.id === id);

    if (!item) return;

    item.quantity += amount;

    if (item.quantity <= 0) {
        cart = cart.filter(item => item.id !== id);
    }

    updateCart();
}

// CALCULER LE TOTAL
function calculateTotal() {
    return cart.reduce((total, item) => {
        const product = products.find(p => p.id === item.id);
        return total + product.price * item.quantity;
    }, 0);
}

// AFFICHER LE PANIER
function updateCart() {
    const count = cart.reduce(
        (total, item) => total + item.quantity, 0
    );

    getElement("cartCount").textContent = count;

    const container = getElement("cartItems");

    if (cart.length === 0) {
        container.innerHTML = "<p>Votre panier est vide.</p>";
    } else {
        container.innerHTML = cart.map(item => {
            const product = products.find(p => p.id === item.id);

            return `
                <div class="cart-row">
                    <div>
                        <strong>${product.name}</strong><br>
                        ${money(product.price)}
                    </div>

                    <div class="quantity-controls">
                        <button data-quantity="${item.id}"
                                data-change="-1">−</button>

                        ${item.quantity}

                        <button data-quantity="${item.id}"
                                data-change="1">+</button>
                    </div>
                </div>
            `;
        }).join("");
    }

    getElement("cartTotal").textContent =
        "TOTAL : " + money(calculateTotal());
}

// OUVRIR ET FERMER LES FENETRES
function openModal(id) {
    getElement(id).classList.add("is-open");
}

function closeModal(id) {
    getElement(id).classList.remove("is-open");
}

// COMMANDER
function checkout() {
    if (cart.length === 0) {
        alert("Votre panier est vide !");
        return;
    }

    closeModal("cartModal");
    openModal("orderModal");
}

// ENVOYER COMMANDE WHATSAPP
function sendOrder(event) {
    event.preventDefault();

    if (cart.length === 0) return;

    const name = getElement("customerName").value.trim();
    const phone = getElement("customerPhone").value.trim();
    const city = getElement("customerCity").value.trim();
    const address = getElement("customerAddress").value.trim();
    const note = getElement("customerNote").value.trim();

    let message = "Bonjour FUTURE TECH ! Je souhaite commander :\n\n";

    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);

        message +=
            product.name + " x" + item.quantity +
            " : " + money(product.price * item.quantity) + "\n";
    });

    message += "\nTOTAL : " + money(calculateTotal());
    message += "\n\nNom : " + name;
    message += "\nTéléphone : " + phone;
    message += "\nVille : " + city;
    message += "\nAdresse : " + address;
    message += "\nNote : " + (note || "Aucune");
    message += "\n\nPaiement à la livraison.";

    const url =
        "https://wa.me/" + WHATSAPP_NUMBER +
        "?text=" + encodeURIComponent(message);

    window.open(url, "_blank");

    cart = [];
    updateCart();

    getElement("orderForm").reset();
    closeModal("orderModal");
}

// AUTHENTIFICATION DEMO
// A remplacer par Supabase ou Firebase pour la production.
function setAuthMode(mode) {
    authMode = mode;

    getElement("loginTab").classList.toggle(
        "active", mode === "login"
    );

    getElement("signupTab").classList.toggle(
        "active", mode === "signup"
    );

    getElement("authSubmit").textContent =
        mode === "login" ? "SE CONNECTER" : "CRÉER MON COMPTE";
}

function handleAuth(event) {
    event.preventDefault();

    alert(
        "Authentification de démonstration. " +
        "Connectez un service sécurisé pour activer les vrais comptes clients."
    );
}

// EVENEMENTS
document.addEventListener("click", event => {

    const addButton = event.target.closest("[data-add]");

    if (addButton) {
        addToCart(Number(addButton.dataset.add));
    }

    const quantityButton = event.target.closest("[data-quantity]");

    if (quantityButton) {
        changeQuantity(
            Number(quantityButton.dataset.quantity),
            Number(quantityButton.dataset.change)
        );
    }

    const filterButton = event.target.closest("[data-filter]");

    if (filterButton) {
        document.querySelectorAll("[data-filter]")
            .forEach(button => button.classList.remove("active"));

        filterButton.classList.add("active");

        displayProducts(filterButton.dataset.filter);
    }

    const closeButton = event.target.closest("[data-close]");

    if (closeButton) {
        closeModal(closeButton.dataset.close);
    }
});

// BOUTONS PRINCIPAUX
getElement("openAuth").addEventListener("click", () => {
    openModal("authModal");
});

getElement("openCart").addEventListener("click", () => {
    updateCart();
    openModal("cartModal");
});

getElement("checkoutButton").addEventListener("click", checkout);

getElement("orderForm").addEventListener("submit", sendOrder);

getElement("authForm").addEventListener("submit", handleAuth);

getElement("loginTab").addEventListener("click", () => {
    setAuthMode("login");
});

getElement("signupTab").addEventListener("click", () => {
    setAuthMode("signup");
});

// FERMER EN CLIQUANT A L'EXTERIEUR
document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal(modal.id);
        }
    });
});

// INITIALISATION
displayProducts();
updateCart();
