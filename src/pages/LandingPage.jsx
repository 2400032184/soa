import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconArrowRight, IconLifeBuoy } from '../components/icons'
import { homeFor } from '../utils/nav'
import homepage from '../assets/homepage.jpeg'

export default function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="public-experience public-home">
      <header className="public-navbar">
        <Link className="brand public-brand" to="/">
          <span className="brand-logo public-brand-logo"><IconLifeBuoy size={19} /></span>
          <span className="brand-name public-brand-name">Resolve<span>Now</span></span>
        </Link>
        {user ? (
          <Link className="public-button public-button-primary" to={homeFor(user.role)}>
            Go to dashboard <IconArrowRight size={16} />
          </Link>
        ) : (
          <button type="button" className="public-button public-button-primary" onClick={() => navigate('/access')}>
            Get started <IconArrowRight size={16} />
          </button>
        )}
      </header>
      <main
        className="premium-home-hero"
        style={{ '--home-artwork': `url("${homepage}")` }}
      >
        <div className="home-artwork-wash" />
        <section className="home-hero-copy" aria-label="Enter ResolveNow">
          <h1 className="home-hero-accessible-title">Issue escalation and service management, with care.</h1>
        </section>
        <span className="home-hero-index">01 <i /> SERVICE, WITH CARE</span>
      </main>
    </div>
  )
}
