import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useCart } from '../context/CartContext'

const fmt = (n) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n)

function Home() {
  const { addToCart } = useCart()
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProductos = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('id')
      if (!error) setProductos(data)
      setLoading(false)
    }
    fetchProductos()
  }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
      Cargando productos...
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: '#1a237e', marginBottom: '0.5rem' }}>
        Nuestros Productos
      </h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem' }}>
        Cloro en tabletas de alta calidad para tu piscina
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
        {productos.map(p => (
          <div key={p.id} style={{ background: 'white', borderRadius: 14, border: '1px solid #e8eaf6', overflow: 'hidden' }}>
            <div style={{ background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
              <img src={p.imagen_url} alt={p.nombre} style={{ maxHeight: 130, maxWidth: '90%', objectFit: 'contain' }} />
            </div>
            <div style={{ padding: '1rem' }}>
              {p.badge && (
                <div style={{ display: 'inline-block', background: p.badge === 'Oferta' ? '#e53935' : '#1565c0', color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, marginBottom: 6 }}>
                  {p.badge}
                </div>
              )}
              <div style={{ fontWeight: 600, color: '#1a237e', marginBottom: 4 }}>{p.nombre}</div>
              <div style={{ color: '#666', fontSize: '0.82rem', marginBottom: 10, lineHeight: 1.5 }}>{p.descripcion}</div>
              <div>
                <span style={{ color: '#0d47a1', fontWeight: 700, fontSize: '1.15rem' }}>{fmt(p.precio)}</span>
                {p.precio_antes && <span style={{ color: '#999', fontSize: '0.8rem', textDecoration: 'line-through', marginLeft: 6 }}>{fmt(p.precio_antes)}</span>}
              </div>
              <button onClick={() => addToCart(p)} style={{ background: '#0d47a1', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, width: '100%', marginTop: 10, fontSize: '0.9rem' }}>
                + Agregar al carrito
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Home