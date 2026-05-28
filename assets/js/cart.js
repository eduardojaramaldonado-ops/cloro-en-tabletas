(function() {
  'use strict';

  const STORAGE_KEY = 'cloroentabletas_cart';

  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ cart = []; }

  function saveCart(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent('cartchange'));
  }

  function formatPrice(n){
    return '$' + Number(n).toLocaleString('es-CL');
  }

  function parsePrice(str){
    return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;
  }

  function slugify(str){
    return String(str).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function getCount(){
    return cart.reduce((s, i) => s + i.quantity, 0);
  }

  function getTotal(){
    return cart.reduce((s, i) => s + (i.price * i.quantity), 0);
  }

  function addToCart(product){
    const existing = cart.find(i => i.id === product.id);
    if(existing){
      existing.quantity++;
    } else {
      cart.push(Object.assign({}, product, { quantity: 1 }));
    }
    saveCart();
    renderCart();
    openCart();
  }

  function removeFromCart(id){
    cart = cart.filter(i => i.id !== id);
    saveCart();
    renderCart();
  }

  function updateQuantity(id, change){
    const item = cart.find(i => i.id === id);
    if(!item) return;
    item.quantity += change;
    if(item.quantity < 1){
      removeFromCart(id);
      return;
    }
    saveCart();
    renderCart();
  }

  function clearCart(){
    cart = [];
    saveCart();
    renderCart();
  }

  function renderCart(){
    document.querySelectorAll('.cart-badge').forEach(b => {
      b.textContent = getCount();
    });

    const itemsEl = document.getElementById('cartItems');
    const emptyEl = document.getElementById('cartEmpty');
    const footerEl = document.getElementById('cartFooter');
    const subtotalEl = document.getElementById('cartSubtotal');

    if(!itemsEl) return;

    if(cart.length === 0){
      itemsEl.innerHTML = '';
      if(emptyEl) emptyEl.style.display = 'flex';
      if(footerEl) footerEl.style.display = 'none';
      return;
    }

    if(emptyEl) emptyEl.style.display = 'none';
    if(footerEl) footerEl.style.display = 'block';

    itemsEl.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-img"><img src="${item.image}" alt="${item.name}"></div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatPrice(item.price)}</div>
          <div class="cart-item-actions">
            <div class="qty-control">
              <button class="qty-btn" data-action="dec" aria-label="Restar">−</button>
              <span class="qty">${item.quantity}</span>
              <button class="qty-btn" data-action="inc" aria-label="Sumar">+</button>
            </div>
            <button class="remove-btn" data-action="remove" aria-label="Eliminar">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="cart-item-subtotal">${formatPrice(item.price * item.quantity)}</div>
      </div>
    `).join('');

    if(subtotalEl) subtotalEl.textContent = formatPrice(getTotal());

    itemsEl.querySelectorAll('.cart-item').forEach(el => {
      const id = el.dataset.id;
      el.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          if(action === 'inc') updateQuantity(id, 1);
          else if(action === 'dec') updateQuantity(id, -1);
          else if(action === 'remove') removeFromCart(id);
        });
      });
    });
  }

  function openCart(){
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if(drawer) drawer.classList.add('active');
    if(overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCart(){
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if(drawer) drawer.classList.remove('active');
    if(overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.addEventListener('DOMContentLoaded', function() {
    renderCart();

    document.querySelectorAll('.cart-icon').forEach(icon => {
      icon.addEventListener('click', function(e){
        e.preventDefault();
        openCart();
      });
    });

    const closeBtn = document.getElementById('cartClose');
    const overlay = document.getElementById('cartOverlay');
    if(closeBtn) closeBtn.addEventListener('click', closeCart);
    if(overlay) overlay.addEventListener('click', closeCart);

    document.querySelectorAll('.btn-producto').forEach(btn => {
      btn.addEventListener('click', function(e){
        e.preventDefault();
        const card = btn.closest('.producto-card, .otro-card');
        if(!card) return;

        const nameEl = card.querySelector('h3');
        const priceEl = card.querySelector('.precio');
        const imgEl = card.querySelector('img');
        if(!nameEl || !priceEl || !imgEl) return;

        const name = nameEl.textContent.trim();
        const price = parsePrice(priceEl.textContent);
        const image = imgEl.src;
        const id = slugify(name);

        addToCart({ id: id, name: name, price: price, image: image });
      });
    });
  });

  window.CloroCart = {
    getItems: function(){ return cart.slice(); },
    getCount: getCount,
    getTotal: getTotal,
    formatPrice: formatPrice,
    clearCart: clearCart
  };
})();
