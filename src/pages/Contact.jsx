function Contact() {
  const handleWhatsApp = () => {
    const phone = '56912345678'
    const message = 'Hola! Me gustaría obtener más información sobre sus productos.'
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#1a1a2e', marginBottom: '0.5rem' }}>Contáctanos</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Estamos disponibles para responder tus consultas
      </p>

      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ color: '#1a1a2e', marginBottom: '1rem' }}>📍 Información de contacto</h3>
        <p>📞 <strong>Teléfono:</strong> +56 9 1234 5678</p>
        <p>📧 <strong>Email:</strong> ventas@cloroentabletas.cl</p>
        <p>🕒 <strong>Horario:</strong> Lunes a Viernes 9:00 - 18:00</p>
        <p>📦 <strong>Despacho:</strong> Todo Chile</p>
      </div>

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
          width: '100%'
        }}
      >
        💬 Escribir por WhatsApp
      </button>
    </div>
  )
}

export default Contact