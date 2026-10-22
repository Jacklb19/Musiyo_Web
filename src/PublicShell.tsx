import { exhibitionCopy as ui } from './exhibition-copy'

import { useEffect, useRef, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Arrow, SearchIcon } from './exhibition-ui'

function Header() {
  const location = useLocation()
  const menuButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.close() }, [location.pathname, location.search])
  function close() { dialog.current?.close(); menuButton.current?.focus() }
  return <header className="site-header">
    <Link className="brand" to="/" aria-label="Musiyo Bëtsknaté, inicio"><span>{ui.brandName}<span className="brand-dot">.</span></span><small>{ui.brandSubtitle}</small></Link>
    <nav className="desktop-nav" aria-label={ui.mainNavigation}><NavLink to="/" end>{ui.discover}</NavLink><NavLink to="/catalogo">{ui.collection}</NavLink><NavLink className="visit-3d-link" to="/recorrido" end>{ui.museum3d}</NavLink><NavLink to="/recorrido/texto">{ui.textRooms}</NavLink></nav>
    <div className="header-actions"><Link className="circle search-link" to="/catalogo?buscar=1" aria-label={ui.searchMuseum}><SearchIcon/></Link><Link className="pill header-visit visit-3d-link" to="/recorrido">{ui.enterMuseum} <Arrow/></Link><Link className="pill header-visit visit-text-link" to="/recorrido/texto">{ui.walkRooms} <Arrow/></Link><button ref={menuButton} className="circle menu-toggle" aria-label={ui.openMenu} onClick={() => dialog.current?.showModal()}><span className="menu-lines"/></button></div>
    <dialog ref={dialog} className="mobile-menu" aria-labelledby="menu-title"><div className="menu-heading"><p id="menu-title" className="eyebrow">{ui.museumName}</p><button className="circle" onClick={close} aria-label={ui.closeMenu}>×</button></div><nav aria-label={ui.mobileNavigation}><Link to="/">{ui.discover} <Arrow/></Link><Link to="/catalogo">{ui.collection} <Arrow/></Link><Link className="visit-3d-link" to="/recorrido">{ui.museum3d} <Arrow/></Link><Link to="/recorrido/texto">{ui.textRooms} <Arrow/></Link></nav><p>{ui.visitModes}</p></dialog>
  </header>
}

function Footer() {
  return <footer className="site-footer"><div className="footer-top"><Link className="brand" to="/"><span>{ui.brandName}<span className="brand-dot">.</span></span><small>{ui.brandSubtitle}</small></Link><p>{ui.museumSubtitle}<br/>{ui.carnivalSubtitle}</p><Link className="underlined" to="/creditos">{ui.creditsSources} <Arrow/></Link></div><div className="footer-bottom"><nav aria-label={ui.museumInformation}><Link to="/acerca">{ui.about}</Link><Link to="/privacidad">{ui.privacy}</Link><Link to="/validador">{ui.validators}</Link><Link to="/guia">{ui.guide}</Link></nav><span>{ui.sourcesNotice}</span></div></footer>
}

export function PublicShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  return <div className={`app ${location.pathname === '/' ? 'is-home' : location.pathname.startsWith('/recorrido') ? 'is-visit' : 'is-reading'}`}>
    <a className="skip-link" href="#main-content">{ui.skipContent}</a>
    <Header/><main id="main-content" tabIndex={-1}>{children}</main><Footer/>
  </div>
}
