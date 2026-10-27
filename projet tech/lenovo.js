const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=760&q=80`;
const productsDemo = [
  { id: 'lenovo-thinkpad-x395', title: 'Lenovo ThinkPad X395', category: 'ordinateur', family: 'Lenovo · Professionnel', description: 'Ryzen 5, 16 Go de mémoire et SSD 256 Go dans un format compact.', price: 200000, tag: 'Lenovo', image: '/images/lenovo-x395.png', order: 1 },
  { id: 'dell-ms116-mouse', title: 'Souris filaire Dell MS116', category: 'accessoires', family: 'Dell · Souris filaire', description: 'Souris filaire optique pour les tâches informatiques du quotidien.', price: 8000, tag: 'Dell', image: image('photo-1527814050087-3793815479db'), order: 3 },
  { id: 'surface-laptop-4', title: 'Microsoft Surface Laptop 4', category: 'ordinateur', family: 'Microsoft · Surface Laptop 4', description: 'Ryzen 5 Pro, 16 Go de RAM et SSD 256 Go. Écran tactile selon la configuration.', price: 350000, tag: 'Microsoft Surface', image: '/images/surface-laptop-4.jpg', order: 4 },
  { id: 'dell-latitude-7200-2-in-1', title: 'Dell Latitude 7200 2-en-1', category: 'ordinateur', family: 'Dell · Latitude 7200 2-en-1', description: 'PC tablette 2-en-1 avec Intel Core i5, 8 Go de RAM et SSD 256 Go.', price: 250000, tag: 'Dell 2-en-1', image: '/images/dell-latitude-7200-2-in-1.jpg', order: 5 },
  { id: 'soyo-m5-air', title: 'SOYO M5 Air', category: 'ordinateur', family: 'SOYO · Mini PC', description: 'Mini PC avec Ryzen 5 5600U, 16 Go de RAM, SSD M.2 512 Go, Wi-Fi 6 et Bluetooth 5.2.', price: 200000, tag: 'SOYO Mini PC', image: '/images/soyo-m5-air.jpg', order: 6, priceNote: 'Prix provisoire à confirmer auprès du vendeur.' },
  { id: 'usb-c-hdmi-8-in-1', title: 'Adaptateur USB-C HDMI 8-en-1', category: 'accessoires', family: 'Accessoires · Hub USB-C HDMI 8-en-1', description: 'Hub USB-C avec HDMI 4K, USB, lecteur SD/TF et autres ports indiqués sur l’emballage.', price: 10000, tag: 'Hub USB-C', image: '/images/usb-c-hdmi-8-in-1.jpg', order: 7 },
  { id: 'usb-c-adapter-6-in-1', title: 'Adaptateur USB-C 6-en-1', category: 'accessoires', family: 'Accessoires · Adaptateur USB-C 6-en-1', description: 'Adaptateur avec ports USB, lecteur de carte SD et TF, selon l’emballage.', price: 10000, tag: 'Adaptateur USB-C', image: '/images/usb-c-adapter-6-in-1.jpg', order: 8 },
  { id: 'aoa-b1001-wireless-mouse', title: 'Souris sans fil AOA B-1001', category: 'accessoires', family: 'AOA · Souris sans fil B-1001', description: 'Souris sans fil avec Bluetooth 5.2 et connexion 2,4 GHz indiqués sur l’emballage.', price: 8000, tag: 'AOA', image: '/images/aoa-b1001-wireless-mouse.jpg', order: 9 },
  { id: 'wireless-mouse-led', title: 'Souris sans fil lumineuse', category: 'accessoires', family: 'Accessoires · Souris lumineuse', description: 'Souris au design translucide avec éclairage. Détails de connexion à confirmer auprès du vendeur.', price: 8000, tag: 'Souris', image: '/images/wireless-mouse-led.jpg', order: 10 },
];
const grid = document.querySelector('#product-grid');
const search = document.querySelector('#search-input');
const filters = [...document.querySelectorAll('.filter-chip')];
const sort = document.querySelector('#sort-select');
const cart = new Map();
const cartStorageKey = 'pc-market-cart';
const businessWhatsAppNumber = '2250757589892';
const products = [...productsDemo];
let category = 'all';
let toastTimer;
let cartStorageErrorShown = false;
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = (amount) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(amount))} FCFA`;
const quoteProductUrl = (product) => `https://wa.me/${businessWhatsAppNumber}?text=${encodeURIComponent(`Bonjour, quel est le prix de ${product.title} ?`)}`;
const productColors = ['#d43d32', '#287a78', '#7958a6', '#b96d36', '#527a4b', '#3f70a5'];
const productImages = new Map([
  ['lenovo-thinkpad-x395', '/images/lenovo-x395.png'],
  ['surface-laptop-4', '/images/surface-laptop-4.jpg'],
  ['dell-latitude-7200-2-in-1', '/images/dell-latitude-7200-2-in-1.jpg'],
  ['soyo-m5-air', '/images/soyo-m5-air.jpg'],
  ['usb-c-hdmi-8-in-1', '/images/usb-c-hdmi-8-in-1.jpg'],
  ['usb-c-adapter-6-in-1', '/images/usb-c-adapter-6-in-1.jpg'],
  ['aoa-b1001-wireless-mouse', '/images/aoa-b1001-wireless-mouse.jpg'],
  ['wireless-mouse-led', '/images/wireless-mouse-led.jpg'],
]);
const productsWithoutImage = new Set(['dell-ms116-mouse']);
const productImage = (product) => productsWithoutImage.has(product.id) ? '' : productImages.get(product.id) || product.image || '';

function restoreCart() {
  try {
    const savedItems = JSON.parse(localStorage.getItem(cartStorageKey) || '[]');
    if (!Array.isArray(savedItems)) throw new TypeError('Le panier enregistré est invalide.');
    savedItems.forEach((item) => {
      if (!item || typeof item.id !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return;
      const product = productsDemo.find((candidate) => candidate.id === item.id);
      if (product && Number.isFinite(product.price)) cart.set(product.id, { ...product, quantity: item.quantity });
    });
  } catch (error) {
    console.error('Impossible de restaurer le panier enregistré.', error);
    toast('Le panier enregistré ne peut pas être restauré sur cet appareil.');
  }
}

function persistCart() {
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify(
      [...cart.values()].filter((item) => productsDemo.some((product) => product.id === item.id))
        .map(({ id, quantity }) => ({ id, quantity })),
    ));
  } catch (error) {
    console.error('Impossible d’enregistrer le panier sur cet appareil.', error);
    if (!cartStorageErrorShown) {
      toast('Le panier ne peut pas être conservé après fermeture de la page.');
      cartStorageErrorShown = true;
    }
  }
}

function renderProducts() {
  const query = search.value.trim().toLocaleLowerCase('fr');
  const visible = products.filter((p) => (category === 'all' || p.category === category) && `${p.title} ${p.family} ${p.description}`.toLocaleLowerCase('fr').includes(query));
  if (sort.value === 'price-asc' || sort.value === 'price-desc') visible.sort((a, b) => {
    if (a.price === null) return b.price === null ? 0 : 1;
    if (b.price === null) return -1;
    return sort.value === 'price-asc' ? a.price - b.price : b.price - a.price;
  });
  if (sort.value === 'name') visible.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  if (sort.value === 'featured') visible.sort((a, b) => a.order - b.order);
  grid.innerHTML = visible.map((p, i) => {
    const color = productColors[(p.order - 1) % productColors.length];
    const computer = p.category !== 'accessoires';
    const productPhoto = productImages.has(p.id);
    const productPhotoPath = productImage(p);
    const price = p.price === null ? 'Prix à confirmer' : `${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ''}${money(p.price)}`;
    const priceBadge = computer && p.price !== null ? `<span class="computer-price-badge">${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(p.price))} F</span>` : '';
    const cartAction = p.price === null
      ? `<a class="add-button" href="${quoteProductUrl(p)}" target="_blank" rel="noopener noreferrer">Demander le prix <span aria-hidden="true">↗</span></a>`
      : `<button class="add-button" data-add="${escapeHtml(p.id)}" type="button" aria-label="Ajouter ${escapeHtml(p.title)} au panier">Ajouter <span aria-hidden="true">+</span></button>`;
    return `<article class="product-card" style="--product-accent:${color};animation-delay:${Math.min(i * 45, 250)}ms"><button class="product-media product-open${productPhoto ? ' supplied-product-photo' : ''}" data-details="${escapeHtml(p.id)}" type="button" aria-label="Voir les caractéristiques de ${escapeHtml(p.title)}">${productPhotoPath ? `<img src="${escapeHtml(productPhotoPath)}" alt="" loading="lazy">` : ''}<span class="product-tag${p.api ? ' api-tag' : ''}">${p.api ? 'API Lenovo' : escapeHtml(p.tag)}</span>${priceBadge}</button><div class="product-info"><p class="product-category">${escapeHtml(p.family)}</p><h3>${escapeHtml(p.title)}</h3><p class="product-description">${escapeHtml(p.description)}</p><div class="product-bottom"><span class="product-price">${price}</span><button class="detail-button" data-details="${escapeHtml(p.id)}" type="button">Caractéristiques <span aria-hidden="true">↗</span></button>${cartAction}</div></div></article>`;
  }).join('');
  document.querySelector('#empty-state').hidden = visible.length > 0;
  document.querySelector('#all-count').textContent = products.length;
}

function addProductToCart(product) {
  if (!Number.isFinite(product.price)) return;
  cart.set(product.id, { ...product, quantity: (cart.get(product.id)?.quantity || 0) + 1 });
  renderCart();
  toast(`${product.title} ajouté au panier`);
}

function renderProductDetails(product) {
  const knownSpecs = {
    'lenovo-thinkpad-x395': { processor: 'AMD Ryzen 5', memory: '16 Go', storage: 'SSD 256 Go' },
    'soyo-m5-air': { processor: 'AMD Ryzen 5 5600U', memory: '16 Go DDR4', storage: 'SSD M.2 512 Go', screen: 'Mini PC : écran externe à connecter', connectivity: 'Wi-Fi 6, Bluetooth 5.2' },
    'surface-laptop-4': { processor: 'AMD Ryzen 5 Pro', memory: '16 Go', storage: 'SSD 256 Go', screen: 'Écran tactile 13,5 ou 15 pouces selon configuration', os: 'Windows 11' },
    'dell-latitude-7200-2-in-1': { processor: 'Intel Core i5 (génération non précisée)', memory: '8 Go DDR4', storage: 'SSD 256 Go', screen: 'Tactile 12,3 pouces, 1920 × 1280', os: 'Windows 10 ou 11 Pro' },
  }[product.id] || {};
  const computer = product.category !== 'accessoires';
  const specs = computer
    ? [
      ['Processeur', knownSpecs.processor || 'À confirmer auprès du vendeur'],
      ['Mémoire vive (RAM)', knownSpecs.memory || 'À confirmer auprès du vendeur'],
      ['Stockage', knownSpecs.storage || 'À confirmer auprès du vendeur'],
      ['Écran', knownSpecs.screen || 'À confirmer auprès du vendeur'],
      ...(knownSpecs.os ? [['Système d’exploitation', knownSpecs.os]] : []),
      ...(knownSpecs.connectivity ? [['Connectivité', knownSpecs.connectivity]] : []),
      ...(/reconditionné/i.test(product.family) ? [['État', 'Reconditionné (indiqué dans l’annonce)']] : []),
    ]
    : [
      ['Type', product.family.toLocaleLowerCase('fr').includes('souris') ? product.family : 'Accessoire informatique'],
      ['Connexion et compatibilité', product.id === 'aoa-b1001-wireless-mouse' ? 'Bluetooth 5.2 et 2,4 GHz (indiqué sur l’emballage)' : product.id === 'dell-ms116-mouse' ? 'Connexion USB filaire' : 'À confirmer auprès du vendeur'],
      ['Utilisation', product.description],
    ];
  const availableSpecs = specs.filter(([, value]) => !value.startsWith('À confirmer'));
  const specificationsNote = computer && availableSpecs.length < 4
    ? '<p class="detail-note">Les caractéristiques techniques exactes ne sont pas toutes renseignées. Contacte le vendeur pour les confirmer avant l’achat.</p>'
    : '';
  const priceNote = product.priceNote ? `<p class="detail-note">${escapeHtml(product.priceNote)}</p>` : '';
  const detailsDialog = document.querySelector('#product-detail-dialog');
  const detailImage = productImage(product);
  const detailAction = product.price === null
    ? `<a class="button button-red detail-add" href="${quoteProductUrl(product)}" target="_blank" rel="noopener noreferrer">Demander le prix <span aria-hidden="true">↗</span></a>`
    : `<button class="button button-red detail-add" data-detail-add="${escapeHtml(product.id)}" type="button">Ajouter au panier <span aria-hidden="true">→</span></button>`;
  detailsDialog.innerHTML = `<div class="detail-heading"><p class="eyebrow">Fiche produit</p><button class="icon-button" data-detail-close type="button" aria-label="Fermer les caractéristiques">×</button></div><div class="detail-content${detailImage ? '' : ' product-without-image'}">${detailImage ? `<img class="detail-image" src="${escapeHtml(detailImage)}" alt="${escapeHtml(product.title)}">` : ''}<div class="detail-copy"><p class="product-category">${escapeHtml(product.family)}</p><h2 id="product-detail-title">${escapeHtml(product.title)}</h2><p class="detail-description">${escapeHtml(product.description)}</p><strong class="detail-price">${product.price === null ? 'Prix à confirmer' : money(product.price)}</strong>${priceNote}<h3>Caractéristiques</h3><dl class="detail-specs">${specs.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>${specificationsNote}${detailAction}</div></div>`;
  detailsDialog.showModal();
}

function renderCart() {
  persistCart();
  const items = [...cart.values()];
  const count = items.reduce((n, item) => n + item.quantity, 0);
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#dialog-cart-count').textContent = `(${count})`;
  document.querySelector('#cart-empty').hidden = count > 0;
  document.querySelector('#cart-summary').hidden = count === 0;
  document.querySelector('#cart-total').textContent = money(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  document.querySelector('#cart-items').innerHTML = items.map((p) => `<article class="cart-row">${productImage(p) ? `<img src="${escapeHtml(productImage(p))}" alt="">` : ''}<div><h3>${escapeHtml(p.title)} × ${p.quantity}</h3><p>${money(p.price)} / unité</p><button class="cart-remove" data-remove="${escapeHtml(p.id)}" type="button">Retirer</button></div><strong>${money(p.price * p.quantity)}</strong></article>`).join('');
}

restoreCart();

function toast(message) {
  const node = document.querySelector('#toast');
  node.textContent = message;
  node.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-visible'), 2200);
}

function showDailyNews() {
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const storageKey = 'pc-market-daily-news-date';
  try {
    if (localStorage.getItem(storageKey) === dateKey) return;
    localStorage.setItem(storageKey, dateKey);
  } catch (error) {
    console.error('Impossible d’enregistrer la date du message quotidien.', error);
  }

  const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  const featuredProducts = productsDemo.filter((item) => Number.isFinite(item.price));
  const product = featuredProducts[((dayNumber % featuredProducts.length) + featuredProducts.length) % featuredProducts.length];
  const panel = document.querySelector('#daily-news');
  document.querySelector('#daily-news-title').textContent = product.title;
  document.querySelector('#daily-news-description').textContent = `${money(product.price)} · Une sélection à découvrir aujourd’hui.`;
  panel.hidden = false;

  function dismissMessage() {
    panel.hidden = true;
  }

  document.querySelector('#daily-news-close').addEventListener('click', dismissMessage, { once: true });
  document.querySelector('#daily-news-link').addEventListener('click', () => {
    dismissMessage();
    category = 'all';
    filters.forEach((button) => button.classList.toggle('is-active', button.dataset.filter === 'all'));
    search.value = product.title;
    renderProducts();
    document.querySelector('#produits').scrollIntoView({ behavior: 'smooth' });
  }, { once: true });
}

filters.forEach((button) => button.addEventListener('click', () => {
  category = button.dataset.filter;
  filters.forEach((item) => item.classList.toggle('is-active', item === button));
  renderProducts();
}));
search.addEventListener('input', renderProducts);
sort.addEventListener('change', renderProducts);
grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (button) {
    const product = products.find((item) => String(item.id) === button.dataset.add);
    if (product) addProductToCart(product);
    return;
  }
  const detailsButton = event.target.closest('[data-details]');
  if (detailsButton) {
    const product = products.find((item) => String(item.id) === detailsButton.dataset.details);
    if (product) renderProductDetails(product);
  }
});
const productDetailDialog = document.querySelector('#product-detail-dialog');
productDetailDialog.addEventListener('click', (event) => {
  if (event.target.closest('[data-detail-close]')) {
    productDetailDialog.close();
    return;
  }
  const addButton = event.target.closest('[data-detail-add]');
  if (addButton) {
    const product = products.find((item) => String(item.id) === addButton.dataset.detailAdd);
    if (product) {
      addProductToCart(product);
      productDetailDialog.close();
    }
  }
  if (event.target === productDetailDialog) productDetailDialog.close();
});
document.querySelector('#cart-items').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (button) { cart.delete(button.dataset.remove); renderCart(); }
});
const dialog = document.querySelector('#cart-dialog');
document.querySelector('#cart-open').addEventListener('click', () => dialog.showModal());
document.querySelector('#cart-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
const checkoutButton = document.querySelector('#checkout-button');
const orderDialog = document.querySelector('#order-dialog');
const orderForm = document.querySelector('#order-form');
const orderSubmit = document.querySelector('#order-submit');
const orderStatus = document.querySelector('#order-status');
document.querySelector('#order-close').addEventListener('click', () => orderDialog.close());
orderDialog.addEventListener('click', (event) => {
  if (event.target === orderDialog) orderDialog.close();
});
checkoutButton.addEventListener('click', async () => {
  checkoutButton.disabled = true;
  checkoutButton.setAttribute('aria-busy', 'true');
  try {
    const sessionResponse = await fetch('/api/auth/me');
    if (!sessionResponse.ok) throw new Error('Impossible de vérifier ta connexion.');
    const session = await sessionResponse.json();
    if (!session.authenticated) {
      dialog.close();
      toast('Connecte-toi pour finaliser ton achat.');
      window.setTimeout(() => window.location.assign('/auth.html'), 800);
      return;
    }
    if (!session.user?.phone) throw new Error('Ton compte ne contient pas de numéro de téléphone valide.');
    orderStatus.textContent = '';
    document.querySelector('#delivery-area').value = '';
    dialog.close();
    orderDialog.showModal();
  } catch (error) {
    console.error(error);
    toast(error.message || 'Impossible de vérifier ta connexion.');
  } finally {
    checkoutButton.disabled = false;
    checkoutButton.removeAttribute('aria-busy');
  }
});
orderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  orderStatus.textContent = '';
  if (!orderForm.reportValidity()) return;

  orderSubmit.disabled = true;
  orderSubmit.setAttribute('aria-busy', 'true');
  const deliveryArea = document.querySelector('#delivery-area').value.trim();
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [...cart.values()].map(({ id, quantity }) => ({ id, quantity })),
        delivery_area: deliveryArea,
        whatsapp_opt_in: document.querySelector('#whatsapp-opt-in').checked,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Impossible d’enregistrer la commande.');
    if (!result.order_id || !Array.isArray(result.items)) throw new Error('La confirmation de commande est invalide.');

    cart.clear();
    renderCart();
    orderDialog.close();
    if (result.whatsapp_notification?.status === 'ACCEPTED_BY_PROVIDER') {
      toast(`Commande PC-${result.order_id} prise en charge. WhatsApp a accepté l’envoi de la confirmation pour une livraison sous 24 h.`);
      return;
    }

    toast(`Commande PC-${result.order_id} enregistrée, mais la confirmation automatique a échoué. Contacte le vendeur.`);
    const message = [
      'Bonjour, ma commande est enregistrée, mais je n’ai pas reçu la confirmation automatique.',
      `Référence : PC-${result.order_id}`,
      `Commune / quartier : ${result.delivery_area}`,
      `Montant des articles : ${money(result.amount)}`,
      'Merci de confirmer la prise en charge et le délai de livraison.',
    ].join('\n');
    window.location.assign(`https://wa.me/${businessWhatsAppNumber}?text=${encodeURIComponent(message)}`);
  } catch (error) {
    console.error(error);
    orderStatus.textContent = error.message || 'Impossible d’enregistrer la commande. Réessaie.';
  } finally {
    orderSubmit.disabled = false;
    orderSubmit.removeAttribute('aria-busy');
  }
});
document.querySelectorAll('[data-nav-filter]').forEach((link) => link.addEventListener('click', () => {
  category = link.dataset.navFilter;
  filters.forEach((button) => button.classList.toggle('is-active', button.dataset.filter === category));
  renderProducts();
}));
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); search.focus(); }
});

renderProducts();
renderCart();
showDailyNews();
const accountActions = document.querySelector('#account-actions');
const loginLink = document.querySelector('#login-link');
fetch('/api/auth/me').then((response) => {
  if (!response.ok) throw new Error('Impossible de vérifier la session.');
  return response.json();
}).then((result) => {
  if (!result.authenticated) {
    loginLink.hidden = false;
    accountActions.hidden = true;
    return;
  }
  document.querySelector('#account-phone').textContent = result.user.phone;
  loginLink.hidden = true;
  accountActions.hidden = false;
}).catch((error) => {
  console.error(error);
  toast('Impossible de vérifier la session. Recharge la page.');
});
document.querySelector('#logout-button').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) throw new Error('La déconnexion a échoué.');
    window.location.assign('/');
  } catch (error) {
    console.error(error);
    toast('Impossible de te déconnecter. Réessaie.');
  }
});
document.querySelector('#catalog-status').textContent = 'Catalogue de démonstration · Un article par catégorie.';

const paymentTransactionId = new URLSearchParams(window.location.search).get('transaction_id');
if (paymentTransactionId) {
  window.history.replaceState({}, '', '/gomycode.HTML');
  fetch('/api/payments/cinetpay/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_id: paymentTransactionId }),
  }).then(async (response) => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Impossible de vérifier le paiement.');
    if (result.status === 'ACCEPTED') toast('Paiement confirmé. Merci pour votre commande !');
    else if (result.status === 'PENDING') toast('Paiement en attente de confirmation.');
    else toast('Le paiement n’a pas été accepté.');
  }).catch((error) => {
    console.error(error);
    toast(error.message || 'Impossible de vérifier le paiement.');
  });
}
