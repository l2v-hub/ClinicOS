import { useState } from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="logo">ClinicOS</h1>
        <span className="subtitle">Clinic Management System</span>
      </div>
      <div className="header-right">
        {user && (
          <div className="user-menu" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
            {menuOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item">Profile</button>
                <button className="dropdown-item">Settings</button>
                <button className="dropdown-item">Logout</button>
              </div>
            )}
          </div>
        )}
        {!user && <button className="login-button">Login</button>}
      </div>
    </header>
  );
};

export default Header;
