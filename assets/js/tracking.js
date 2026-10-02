/* Medición: envía al dataLayer de GTM los eventos de comercio electrónico (formato GA4),
   cuenta, contacto y técnicos. No envía datos personales (nombre, email, teléfono).
   Debe cargarse antes de cart.js y auth.js, que llaman a window.CloroTrack. */
(function() {
  'use strict';

  window.dataLayer = window.dataLayer || [];
  const CURRENCY = 'CLP';
  const ORDERS_KEY = 'cloroentabletas_tracked_orders';

  function push(event, ecommerce, extra){
    if(ecommerce) window.dataLayer.push({ ecommerce: null });
    const data = { event: event };
    if(ecommerce) data.ecommerce = ecommerce;
    window.dataLayer.push(Object.assign(data, extra || {}));
  }

  function slugify(str){
    return String(str).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function parsePrice(str){
    return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;
  }

  function category(id){
    if(/^cloro/.test(id)) return 'Cloro en tabletas';
    if(/^(algicida|baja-ph)/.test(id)) return 'Tratamiento';
    return 'Accesorios';
  }

  // Producto del carrito ({id, name, price, quantity}) -> item de GA4
  function toItem(p, extra){
    return Object.assign({
      item_id: p.id,
      item_name: p.name,
      item_category: category(p.id),
      price: Number(p.price) || 0,
      quantity: Number(p.quantity) || 1,
    }, extra || {});
  }

  function value(items){
    return items.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  function ecommerce(items, extra){
    return Object.assign({ currency: CURRENCY, value: value(items), items: items }, extra || {});
  }

  // Tarjeta de producto de un listado (home, catálogo, relacionados) -> item de GA4
  function itemFromCard(card, listName, index){
    const nameEl = card.querySelector('h3');
    const priceEl = card.querySelector('.precio, .cc-precio');
    if(!nameEl || !priceEl) return null;
    const name = nameEl.textContent.trim();
    // data-id (catálogo) coincide con el id de la ficha y del carrito; si no hay, el mismo slug que usa cart.js
    const id = card.dataset.id || slugify(name);
    return toItem({ id: id, name: name, price: parsePrice(priceEl.textContent), quantity: 1 },
      { item_list_name: listName, index: index });
  }

  // Listados de productos presentes en la página
  const LISTS = [
    ['#productosTrack .producto-card:not([aria-hidden="true"])', 'Productos destacados'],
    ['#mas-vendidos .otro-card', 'Más vendidos'],
    ['#ofertas .producto-card', 'Ofertas'],
    ['#tienda .otro-card', 'Otros productos'],
    ['.productos-relacionados .catalogo-card', 'Relacionados'],
  ];

  function pageLists(){
    const lists = LISTS.map(([sel, name]) => [Array.from(document.querySelectorAll(sel)), name]);
    // Catálogo /productos/: una lista por sección, con el título de la sección
    document.querySelectorAll('.catalogo-section').forEach(sec => {
      const cards = Array.from(sec.querySelectorAll('.catalogo-card'));
      const h2 = sec.querySelector('h2');
      if(cards.length && h2) lists.push([cards, 'Catálogo: ' + h2.textContent.trim()]);
    });
    return lists.filter(([cards]) => cards.length);
  }

  // ---------- API usada por cart.js, auth.js y el checkout ----------

  const api = {
    addToCart(p, qty){
      const items = [toItem(Object.assign({}, p, { quantity: qty || 1 }))];
      push('add_to_cart', ecommerce(items));
    },
    removeFromCart(p, qty){
      const items = [toItem(Object.assign({}, p, { quantity: qty || p.quantity || 1 }))];
      push('remove_from_cart', ecommerce(items));
    },
    viewCart(cart){
      const items = cart.map(p => toItem(p));
      push('view_cart', ecommerce(items));
    },
    beginCheckout(cart){
      push('begin_checkout', ecommerce(cart.map(p => toItem(p))));
    },
    addShippingInfo(cart, tier){
      push('add_shipping_info', ecommerce(cart.map(p => toItem(p)), { shipping_tier: tier }));
    },
    applyCoupon(code, valid){
      push('apply_coupon', null, { coupon_code: code, coupon_valid: valid });
    },
    addPaymentInfo(cart, paymentType, coupon){
      const extra = { payment_type: paymentType };
      if(coupon) extra.coupon = coupon;
      push('add_payment_info', ecommerce(cart.map(p => toItem(p)), extra));
    },
    signUp(){ push('sign_up', null, { method: 'email' }); },
    login(){ push('login', null, { method: 'email' }); },
    passwordResetRequest(){ push('password_reset_request'); },
  };

  window.CloroTrack = api;

  // ---------- Eventos que se detectan solos al cargar la página ----------

  function trackedOrders(){
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch(e){ return []; }
  }

  function trackPurchase(){
    let order;
    try { order = JSON.parse(sessionStorage.getItem('cloroentabletas_pedido') || 'null'); } catch(e){ return; }
    if(!order || !order.pedido || !Array.isArray(order.productos)) return;

    // Una sola vez por pedido, aunque se recargue la página de gracias
    const sent = trackedOrders();
    if(sent.includes(order.pedido)) return;

    const items = order.productos.map(p => toItem(p));
    const extra = { transaction_id: order.pedido, shipping: Number(order.envio) || 0 };
    if(order.cupon) extra.coupon = order.cupon;
    push('purchase', { currency: CURRENCY, value: Number(order.total) || 0, items: items, ...extra });

    sent.push(order.pedido);
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(sent.slice(-50))); } catch(e){}
  }

  document.addEventListener('DOMContentLoaded', function(){
    // Página de error
    if(document.querySelector('.error-code')){
      push('page_not_found', null, { page_referrer: document.referrer || '(directo)' });
      return;
    }

    // Confirmación de pedido
    if(/\/checkout\/gracias\//.test(location.pathname)) trackPurchase();

    // Ficha de producto
    const buy = document.querySelector('.producto-detalle .btn-producto[data-name]');
    if(buy){
      const item = toItem({ id: buy.dataset.id, name: buy.dataset.name, price: parsePrice(buy.dataset.price), quantity: 1 });
      push('view_item', ecommerce([item]));
    }

    // Listados de productos
    pageLists().forEach(([cards, name]) => {
      const items = cards.map((c, i) => itemFromCard(c, name, i)).filter(Boolean);
      if(items.length) push('view_item_list', { item_list_name: name, items: items });
    });
  });

  // ---------- Clics (delegados: cubren también contenido clonado o re-renderizado) ----------

  document.addEventListener('click', function(e){
    const link = e.target.closest('a');
    if(!link) return;
    const href = link.getAttribute('href') || '';

    if(/^mailto:/i.test(href)){
      push('click_email');
      return;
    }

    if(!/productos\//.test(href)) return;

    // Caja de producto o sidebar dentro de un artículo del blog
    const promo = link.closest('.product-cta-box, .sidebar-product');
    if(promo){
      const title = promo.querySelector('.cta-text h4, .sp-title');
      const slug = location.pathname.replace(/^\/|\/$/g, '');
      push('select_promotion', {
        promotion_name: slug,
        creative_slot: promo.classList.contains('sidebar-product') ? 'sidebar' : 'caja_producto',
        items: title ? [{ item_name: title.textContent.trim() }] : [],
      });
      return;
    }

    // Clic en un producto desde un listado
    for(const [cards, name] of pageLists()){
      const index = cards.findIndex(c => c === link || c.contains(link));
      if(index >= 0){
        const item = itemFromCard(cards[index], name, index);
        if(item) push('select_item', { item_list_name: name, items: [item] });
        return;
      }
    }
  });
})();
