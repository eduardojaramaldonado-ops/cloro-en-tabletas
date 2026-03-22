import { Link } from 'react-router-dom'
import { ShoppingCart, Phone } from 'lucide-react'
import { useCart } from '../context/CartContext'

function Navbar() {
  const { getTotalItems } = useCart()

  return (
    <nav style={{
      background: '#1a1a2e',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Link to="/" style={{ color: '#00d4ff', textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold' }}>
        💧 Cloro en Tabletas
      </Link>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <Link to="/contact" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Phone size={18} /> Contacto
        </Link>
        <Link to="/cart" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
          <ShoppingCart size={22} />
          {getTotalItems() > 0 && (
            <span style={{
              background: '#00d4ff',
              color: '#1a1a2e',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>
              {getTotalItems()}
            </span>
          )}
        </Link>
      </div>
    </nav>
  )
}

export default Navbar