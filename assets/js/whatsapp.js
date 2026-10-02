/* Botón flotante de WhatsApp en todas las páginas.
   En una ficha de producto, el mensaje prellenado incluye el nombre del producto.
   Los clics a cualquier enlace de WhatsApp se registran en el dataLayer como click_whatsapp. */
(function() {
  'use strict';

  const NUMERO = '56992460216';

  function mensaje(){
    const producto = document.querySelector('.producto-detalle h1');
    if(producto){
      return 'Hola, me interesa el producto "' + producto.textContent.trim() + '". ¿Me pueden ayudar?';
    }
    return 'Hola, tengo una consulta sobre cloro en tabletas.';
  }

  function crearBoton(){
    if(document.querySelector('.wa-flotante')) return;

    const style = document.createElement('style');
    style.textContent = [
      '.wa-flotante{position:fixed;right:22px;bottom:22px;z-index:9990;width:60px;height:60px;border-radius:50%;',
      'background:#25d366;display:flex;align-items:center;justify-content:center;',
      'box-shadow:0 8px 24px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s;}',
      '.wa-flotante:hover{transform:scale(1.07);box-shadow:0 12px 28px rgba(0,0,0,.3);}',
      '.wa-flotante svg{width:32px;height:32px;fill:#fff;}',
      // En móvil se deja espacio bajo el copyright para que el botón no tape texto
      '@media(max-width:768px){.wa-flotante{right:16px;bottom:16px;width:54px;height:54px;}.wa-flotante svg{width:28px;height:28px;}',
      '.copyright{padding-bottom:78px !important;}}'
    ].join('');
    document.head.appendChild(style);

    const a = document.createElement('a');
    a.className = 'wa-flotante';
    a.href = 'https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(mensaje());
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'Escríbenos por WhatsApp');
    a.title = 'Escríbenos por WhatsApp';
    a.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.04 3C9.09 3 3.45 8.63 3.45 15.58c0 2.22.58 4.39 1.69 6.3L3.33 28.5l6.8-1.78a12.55 12.55 0 0 0 5.9 1.5h.01c6.95 0 12.6-5.64 12.6-12.59A12.6 12.6 0 0 0 16.04 3zm0 23.06h-.01a10.45 10.45 0 0 1-5.33-1.46l-.38-.23-4.04 1.06 1.08-3.94-.25-.4a10.43 10.43 0 0 1-1.6-5.5c0-5.78 4.7-10.48 10.49-10.48a10.48 10.48 0 0 1 10.48 10.49c0 5.78-4.7 10.46-10.44 10.46zm5.75-7.84c-.31-.16-1.86-.92-2.15-1.02-.29-.11-.5-.16-.71.16-.21.31-.82 1.02-1 1.23-.18.21-.37.24-.68.08-.31-.16-1.33-.49-2.53-1.56-.94-.83-1.57-1.86-1.75-2.18-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.11-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.55.08-.84.39-.29.31-1.1 1.07-1.1 2.62 0 1.55 1.13 3.04 1.28 3.25.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.75.24 1.44.21 1.98.13.6-.09 1.86-.76 2.12-1.5.26-.73.26-1.36.18-1.5-.08-.13-.29-.21-.6-.37z"/></svg>';
    document.body.appendChild(a);
  }

  // Medición: cualquier enlace a WhatsApp (botón flotante, footer, contacto)
  document.addEventListener('click', function(e){
    const link = e.target.closest('a[href*="wa.me/"]');
    if(!link) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'click_whatsapp',
      link_location: link.classList.contains('wa-flotante') ? 'boton_flotante' : 'enlace',
    });
  });

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', crearBoton);
  else crearBoton();
})();
