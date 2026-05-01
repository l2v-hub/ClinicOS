import { Outlet, NavLink } from 'react-router-dom'

export function Layout() {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/patients', label: 'Patients' },
    { path: '/appointments', label: 'Appointments' },
    { path: '/calendar', label: 'Calendar' },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>ClinicOS</h1>
        </div>
        <nav className="app-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-user">
          <div className="app-avatar">DR</div>
          <div>
            <div style={{ fontWeight: 600 }}>Dr. Jane Smith</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
              Administrator
            </div>
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>
          © {new Date().getFullYear()} ClinicOS. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

export default Layout
