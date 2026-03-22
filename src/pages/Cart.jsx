import { useCart } from '../context/CartContext'

function Cart() {
  const { cart, removeFromCart, getTotal } = useCart()

  const handleWhatsApp = () => {
    const items = cart.map(item => 
      `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-CL')}`
    ).join('\n')
    const total = getTotal().toLocaleString('es-CL')
    const message = `Hola! Me gustaría hacer el siguiente pedido:\n\n${items}\n\nTotal: $${total}`
    const phone = '56912345678'
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (cart.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h2 style={{ color: '#1a1a2e' }}>Tu carrito está vacío</h2>
        <p style={{ color: '#666' }}>Agrega productos desde la tienda</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#1a1a2e', marginBottom: '2rem' }}>Tu Carrito</h1>
      {cart.map(item => (
        <div key={item.id} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          marginBottom: '1rem',
          background: 'white'
        }}>
          <div>
            <h3 style={{ color: '#1a1a2e', margin: 0 }}>{item.name}</h3>
            <p style={{ color: '#666', margin: '0.25rem 0' }}>
              Cantidad: {item.quantity}
            </p>
            <p style={{ color: '#00a8cc', fontWeight: 'bold', margin: 0 }}>
              ${(item.price * item.quantity).toLocaleString('es-CL')}
            </p>
          </div>
          <button
            onClick={() => removeFromCart(item.id)}
            style={{
              background: '#ff4444',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Eliminar
          </button>
        </div>
      ))}
      <div style={{
        borderTop: '2px solid #1a1a2e',
        paddingTop: '1rem',
        textAlign: 'right'
      }}>
        <h2 style={{ color: '#1a1a2e' }}>
          Total: ${getTotal().toLocaleString('es-CL')}
        </h2>
        <button
          onClick={handleWhatsApp}
          style={{
            background: '#25D366',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginLeft: 'auto'
          }}
        >
          📱 Pedir por WhatsApp
        </button>
      </div>
    </div>
  )
}

export default Cart