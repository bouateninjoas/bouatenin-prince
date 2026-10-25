const API_URL = 'https://dummyjson.com/products/search?q=lenovo&limit=12';
const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=760&q=80`;
const productsDemo = [
  { id: 'toshiba-chromebook', title: 'Toshiba Chromebook 2', category: 'ordinateur', family: 'Toshiba · Chromebook reconditionné', description: 'Un ordinateur compact pour les cours et les tâches du quotidien.', price: 200000, tag: 'Toshiba', image: image('photo-1496181133206-80ce9b88a853'), order: 1 },
  { id: 'fujitsu-lifebook', title: 'Fujitsu LIFEBOOK E5410', category: 'ordinateur', family: 'Fujitsu · Reconditionné', description: 'Un format pratique pour travailler au bureau ou en déplacement.', price: 200000, tag: 'Fujitsu', image: image('photo-1517336714731-489689fd1ca8'), order: 2 },
  { id: 'samsung-galaxy-book', title: 'Samsung Galaxy Book Go', category: 'ordinateur', family: 'Samsung · Quotidien', description: 'Un portable léger pour les études et la bureautique.', price: 200000, tag: 'Samsung', image: image('photo-1588872657578-7efd1f1555ed'), order: 3 },
  { id: 'sony-vaio-fit', title: 'Sony VAIO Fit 15', category: 'ordinateur', family: 'Sony VAIO · Reconditionné', description: 'Un ordinateur polyvalent pour le travail et le multimédia.', price: 200000, tag: 'Sony VAIO', image: image('photo-1593642632823-8f785ba67e45'), order: 4 },
  { id: 'chuwi-corebook', title: 'Chuwi CoreBook X', category: 'ordinateur', family: 'Chuwi · Quotidien', description: 'Un écran confortable pour les cours et les projets.', price: 200000, tag: 'Chuwi', image: image('photo-1593642634367-d91a135587b5'), order: 5 },
  { id: 'lenovo-thinkpad-x395', title: 'Lenovo ThinkPad X395', category: 'ordinateur', family: 'Lenovo · Professionnel', description: 'Ryzen 5, 16 Go de mémoire et SSD 256 Go dans un format compact.', price: 200000, tag: 'Lenovo', image: '/images/lenovo-x395.png', order: 6 },
  { id: 'medion-akoya', title: 'Medion AKOYA E15403', category: 'ordinateur', family: 'Medion · Quotidien', description: 'Un bon équilibre pour la bureautique et les études.', price: 200000, tag: 'Medion', image: image('photo-1593642632823-8f785ba67e45'), order: 7 },
  { id: 'honor-hunter', title: 'HONOR Hunter V700', category: 'gaming', family: 'HONOR · Gaming', description: 'Un ordinateur gaming pour jouer et créer.', price: 200000, tag: 'HONOR Gaming', image: image('photo-1593642634367-d91a135587b5'), order: 8 },
  { id: 'razer-blade', title: 'Razer Blade 15', category: 'gaming', family: 'Razer · Gaming', description: 'Un portable gaming au design fin et affirmé.', price: 200000, tag: 'Razer Gaming', image: image('photo-1496181133206-80ce9b88a853'), order: 9 },
  { id: 'gigabyte-aero', title: 'Gigabyte AERO 15', category: 'ordinateur', family: 'Gigabyte · Création', description: 'Un ordinateur pensé pour la création et le multitâche.', price: 200000, tag: 'Gigabyte', image: image('photo-1517336714731-489689fd1ca8'), order: 10 },
  { id: 'thinkpad-dock', title: 'Station ThinkPad USB-C', category: 'accessoires', family: 'Accessoires · Bureau', description: 'Un seul câble pour tout connecter.', price: 145000, tag: 'Accessoire', image: image('photo-1498050108023-c5249f4df085'), order: 11 },
  { id: 'dell-inspiron-15', title: 'Dell Inspiron 15', category: 'ordinateur', family: 'Dell · Quotidien', description: 'Un portable polyvalent pour les études et le travail.', price: 200000, tag: 'Dell', image: image('photo-1496181133206-80ce9b88a853'), order: 12 },
  { id: 'lenovo-thinkpad-t480', title: 'Lenovo ThinkPad T480', category: 'ordinateur', family: 'Lenovo · Professionnel', description: 'Un ordinateur portable reconditionné pour le travail et les études.', price: 200000, tag: 'Lenovo', image: image('photo-1496181133206-80ce9b88a853'), order: 13 },
  { id: 'dell-latitude-5420', title: 'Dell Latitude 5420', category: 'ordinateur', family: 'Dell · Professionnel', description: 'Un portable professionnel reconditionné pour travailler au bureau ou en déplacement.', price: 200000, tag: 'Dell', image: image('photo-1517336714731-489689fd1ca8'), order: 14 },
  { id: 'dell-optiplex-micro', title: 'Dell OptiPlex Micro', category: 'ordinateur', family: 'Dell · Mini PC', description: 'Un mini PC compact pour équiper un bureau sans encombrer la table.', price: 200000, tag: 'Dell Mini PC', image: image('photo-1593642632823-8f785ba67e45'), order: 15 },
  { id: 'hp-prodesk-mini', title: 'HP ProDesk Mini', category: 'ordinateur', family: 'HP · Mini PC', description: 'Un mini PC compact adapté à un espace de travail réduit.', price: 200000, tag: 'HP Mini PC', image: image('photo-1593642634367-d91a135587b5'), order: 16 },
  { id: 'dell-ms116-mouse', title: 'Souris filaire Dell MS116', category: 'accessoires', family: 'Dell · Souris filaire', description: 'Souris filaire optique pour les tâches informatiques du quotidien.', price: 10000, tag: 'Dell', image: image('photo-1527814050087-3793815479db'), order: 17 },
  { id: 'lenovo-300-usb-mouse', title: 'Souris USB Lenovo 300', category: 'accessoires', family: 'Lenovo · Souris filaire', description: 'Souris USB filaire pour le bureau et les déplacements.', price: 10000, tag: 'Lenovo', image: image('photo-1527814050087-3793815479db'), order: 18 },
  { id: 'hp-pavilion-15', title: 'HP Pavilion 15', category: 'ordinateur', family: 'HP · Quotidien', description: 'Confortable pour la bureautique, les cours et le multimédia.', price: 200000, tag: 'HP', image: image('photo-1517336714731-489689fd1ca8'), order: 19 },
  { id: 'asus-vivobook-15', title: 'ASUS VivoBook 15', category: 'ordinateur', family: 'ASUS · Quotidien', description: 'Un design fin pour accompagner tes journées.', price: 200000, tag: 'ASUS', image: image('photo-1593642632823-8f785ba67e45'), order: 20 },
  { id: 'acer-aspire-5', title: 'Acer Aspire 5', category: 'ordinateur', family: 'Acer · Quotidien', description: 'Un ordinateur pratique pour travailler et étudier.', price: 200000, tag: 'Acer', image: image('photo-1588872657578-7efd1f1555ed'), order: 21 },
  { id: 'apple-macbook-air', title: 'Apple MacBook Air', category: 'ordinateur', family: 'Apple · Création', description: 'Un portable léger pour créer et travailler en mobilité.', price: 200000, tag: 'Apple', image: image('photo-1517336714731-489689fd1ca8'), order: 22 },
  { id: 'msi-modern-15', title: 'MSI Modern 15', category: 'ordinateur', family: 'MSI · Performance', description: 'De bonnes performances dans un format élégant.', price: 200000, tag: 'MSI', image: image('photo-1593642634367-d91a135587b5'), order: 23 },
  { id: 'huawei-matebook-d15', title: 'Huawei MateBook D 15', category: 'ordinateur', family: 'Huawei · Quotidien', description: 'Un écran confortable pour étudier et travailler.', price: 200000, tag: 'Huawei', image: image('photo-1593642632823-8f785ba67e45'), order: 24 },
  { id: 'microsoft-surface-laptop', title: 'Microsoft Surface Laptop', category: 'ordinateur', family: 'Microsoft · Premium', description: 'Un ordinateur fin avec une finition soignée.', price: 200000, tag: 'Microsoft', image: image('photo-1498050108023-c5249f4df085'), order: 25 },
  { id: 'soyo-m5-air', title: 'SOYO M5 Air', category: 'ordinateur', family: 'SOYO · Mini PC', description: 'Mini PC équipé d’un processeur Ryzen 5, de 16 Go de RAM et d’un SSD M.2 de 512 Go.', price: 200000, tag: 'SOYO Mini PC', image: '/images/soyo-m5-air.jpg', order: 26, priceNote: 'Prix provisoire au tarif actuel des ordinateurs ; à confirmer.' },
  { id: 'surface-laptop-4', title: 'Microsoft Surface Laptop 4', category: 'ordinateur', family: 'Microsoft · Surface Laptop 4', description: 'Ryzen 5 Pro, 16 Go de RAM et SSD 256 Go. Écran tactile selon la configuration.', price: 350000, tag: 'Microsoft Surface', image: '/images/surface-laptop-4.jpg', order: 27 },
  { id: 'dell-latitude-7200-2-in-1', title: 'Dell Latitude 7200 2-en-1', category: 'ordinateur', family: 'Dell · Latitude 7200 2-en-1', description: 'PC tablette 2-en-1 avec Intel Core i5, 8 Go de RAM et SSD 256 Go.', price: 250000, tag: 'Dell 2-en-1', image: '/images/dell-latitude-7200-2-in-1.jpg', order: 28 },
];
const grid = document.querySelector('#product-grid');
const search = document.querySelector('#search-input');
const filters = [...document.querySelectorAll('.filter-chip')];
const sort = document.querySelector('#sort-select');
const cart = new Map();
let products = [...productsDemo];
let category = 'all';
let toastTimer;
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = (amount) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(amount))} FCFA`;
const productBrand = (product) => product.family.split(' · ')[0].toLocaleLowerCase('fr');
const productColors = ['#c43b32', '#287a78', '#7958a6', '#b96d36', '#527a4b', '#3f70a5'];
const productImages = new Map([
  ['soyo-m5-air', '/images/soyo-m5-air.jpg'],
  ['surface-laptop-4', '/images/surface-laptop-4.jpg'],
  ['dell-latitude-7200-2-in-1', '/images/dell-latitude-7200-2-in-1.jpg'],
]);
const productsWithoutImage = new Set(['dell-ms116-mouse', 'lenovo-300-usb-mouse']);
const productImage = (product) => productsWithoutImage.has(product.id) ? '' : productImages.get(product.id)
  || (product.category === 'accessoires' ? product.image : '/images/lenovo-x395.png');

function renderProducts() {
  const query = search.value.trim().toLocaleLowerCase('fr');
  const visible = products.filter((p) => (category === 'all' || p.category === category) && `${p.title} ${p.family} ${p.description}`.toLocaleLowerCase('fr').includes(query));
  if (sort.value === 'price-asc') visible.sort((a, b) => a.price - b.price);
  if (sort.value === 'price-desc') visible.sort((a, b) => b.price - a.price);
  if (sort.value === 'name') visible.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  if (sort.value === 'featured') visible.sort((a, b) => a.order - b.order);
  grid.innerHTML = visible.map((p, i) => {
    const color = productColors[(p.order - 1) % productColors.length];
    const computer = p.category !== 'accessoires';
    const productPhoto = productImages.has(p.id);
    const productPhotoPath = productImage(p);
    return `<article class="product-card" style="--product-accent:${color};animation-delay:${Math.min(i * 45, 250)}ms"><button class="product-media product-open${productPhoto ? ' supplied-product-photo' : ''}" data-details="${escapeHtml(p.id)}" type="button" aria-label="Voir les caractéristiques de ${escapeHtml(p.title)}">${productPhotoPath ? `<img src="${escapeHtml(productPhotoPath)}" alt="" loading="lazy">` : ''}<span class="product-tag${p.api ? ' api-tag' : ''}">${p.api ? 'API Lenovo' : escapeHtml(p.tag)}</span>${computer ? `<span class="computer-price-badge">${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(p.price))} F</span>` : ''}</button><div class="product-info"><p class="product-category">${escapeHtml(p.family)}</p><h3>${escapeHtml(p.title)}</h3><p class="product-description">${escapeHtml(p.description)}</p><div class="product-bottom"><span class="product-price">${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ''}${money(p.price)}</span><button class="detail-button" data-details="${escapeHtml(p.id)}" type="button">Caractéristiques <span aria-hidden="true">↗</span></button><button class="add-button" data-add="${escapeHtml(p.id)}" type="button" aria-label="Ajouter ${escapeHtml(p.title)} au panier">Ajouter <span aria-hidden="true">+</span></button></div></div></article>`;
  }).join('');
  document.querySelector('#empty-state').hidden = visible.length > 0;
  document.querySelector('#all-count').textContent = products.length;
}

function addProductToCart(product) {
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
      ['Type', product.family.toLocaleLowerCase('fr').includes('souris') ? 'Souris filaire' : 'Accessoire informatique'],
      ['Connexion et compatibilité', product.family.toLocaleLowerCase('fr').includes('souris') ? 'Connexion USB filaire' : 'À confirmer auprès du vendeur'],
      ['Utilisation', product.description],
    ];
  const availableSpecs = specs.filter(([, value]) => !value.startsWith('À confirmer'));
  const specificationsNote = computer && availableSpecs.length < 4
    ? '<p class="detail-note">Les caractéristiques techniques exactes ne sont pas toutes renseignées. Contacte le vendeur pour les confirmer avant l’achat.</p>'
    : '';
  const priceNote = product.priceNote ? `<p class="detail-note">${escapeHtml(product.priceNote)}</p>` : '';
  const detailsDialog = document.querySelector('#product-detail-dialog');
  const detailImage = productImage(product);
  detailsDialog.innerHTML = `<div class="detail-heading"><p class="eyebrow">Fiche produit</p><button class="icon-button" data-detail-close type="button" aria-label="Fermer les caractéristiques">×</button></div><div class="detail-content${detailImage ? '' : ' product-without-image'}">${detailImage ? `<img class="detail-image" src="${escapeHtml(detailImage)}" alt="${escapeHtml(product.title)}">` : ''}<div class="detail-copy"><p class="product-category">${escapeHtml(product.family)}</p><h2 id="product-detail-title">${escapeHtml(product.title)}</h2><p class="detail-description">${escapeHtml(product.description)}</p><strong class="detail-price">${money(product.price)}</strong>${priceNote}<h3>Caractéristiques</h3><dl class="detail-specs">${specs.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>${specificationsNote}<button class="button button-red detail-add" data-detail-add="${escapeHtml(product.id)}" type="button">Ajouter au panier <span aria-hidden="true">→</span></button></div></div>`;
  detailsDialog.showModal();
}

function renderCart() {
  const items = [...cart.values()];
  const count = items.reduce((n, item) => n + item.quantity, 0);
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#dialog-cart-count').textContent = `(${count})`;
  document.querySelector('#cart-empty').hidden = count > 0;
  document.querySelector('#cart-summary').hidden = count === 0;
  document.querySelector('#cart-total').textContent = money(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  document.querySelector('#cart-items').innerHTML = items.map((p) => `<article class="cart-row">${productImage(p) ? `<img src="${escapeHtml(productImage(p))}" alt="">` : ''}<div><h3>${escapeHtml(p.title)} × ${p.quantity}</h3><p>${money(p.price)} / unité</p><button class="cart-remove" data-remove="${escapeHtml(p.id)}" type="button">Retirer</button></div><strong>${money(p.price * p.quantity)}</strong></article>`).join('');
}

function toast(message) {
  const node = document.querySelector('#toast');
  node.textContent = message;
  node.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-visible'), 2200);
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
checkoutButton.addEventListener('click', async () => {
  checkoutButton.disabled = true;
  checkoutButton.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/payments/cinetpay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [...cart.values()].map(({ id, quantity }) => ({ id, quantity })) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Impossible de démarrer le paiement.');
    if (!result.payment_url) throw new Error('CinetPay n’a pas renvoyé de lien de paiement.');
    window.location.assign(result.payment_url);
  } catch (error) {
    console.error(error);
    toast(error.message || 'Le paiement est temporairement indisponible.');
    checkoutButton.disabled = false;
    checkoutButton.removeAttribute('aria-busy');
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
const accountActions = document.querySelector('#account-actions');
fetch('/api/auth/me').then((response) => {
  if (response.status === 401) {
    window.location.assign('/');
    return null;
  }
  if (!response.ok) throw new Error('Impossible de vérifier la session.');
  return response.json();
}).then((result) => {
  if (!result) return;
  document.querySelector('#account-phone').textContent = result.user.phone;
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
fetch(API_URL).then((response) => {
  if (!response.ok) throw new Error('API indisponible');
  return response.json();
}).then(({ products: apiProducts = [] }) => {
  const brands = new Set(products.filter((p) => p.category !== 'accessoires').map(productBrand));
  const fromApi = apiProducts.filter((p) => {
    const brand = p.brand?.toLocaleLowerCase('fr');
    if (brand !== 'lenovo' || brands.has(brand)) return false;
    brands.add(brand);
    return true;
  }).map((p, i) => ({
    id: `api-${p.id}`, title: p.title, category: 'ordinateur', family: 'Lenovo · Catalogue API', description: p.description,
    price: 200000, tag: 'API Lenovo',
    image: p.thumbnail || p.images?.[0] || image('photo-1496181133206-80ce9b88a853'), order: 20 + i, api: true,
  }));
  const names = new Set(products.map((p) => p.title.toLowerCase()));
  products = [...products, ...fromApi.filter((p) => !names.has(p.title.toLowerCase()))];
  document.querySelector('#catalog-status').textContent = fromApi.length
    ? `Catalogue connecté · ${fromApi.length} référence${fromApi.length > 1 ? 's' : ''} Lenovo chargée${fromApi.length > 1 ? 's' : ''} depuis l’API. Prix des ordinateurs : 200 000 FCFA.`
    : 'Catalogue de démonstration · Aucun produit Lenovo trouvé dans la réponse API.';
  renderProducts();
}).catch(() => {
  document.querySelector('#catalog-status').textContent = 'Catalogue de démonstration · API indisponible, les produits restent consultables.';
});

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
