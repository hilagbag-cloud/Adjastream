import { Home, Search, Library as LibraryIcon, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function BottomNav() {
  return (
    <div className="bg-[#113f2e] border-t border-adja-light-green/50 pb-safe pt-2 px-6 flex justify-between items-center text-xs font-medium text-adja-cream/50 relative">
      <NavLink 
        to="/" 
        end
        className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-adja-yellow' : ''}`}
      >
        <Home size={24} />
        <span>Home</span>
      </NavLink>
      
      <NavLink 
        to="/explorer" 
        className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-adja-yellow' : ''}`}
      >
        <Search size={24} />
        <span>Explorer</span>
      </NavLink>
      
      <NavLink 
        to="/library" 
        className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-adja-yellow' : ''}`}
      >
        <LibraryIcon size={24} />
        <span>Bibliothèque</span>
      </NavLink>
      
      <NavLink 
        to="/profile"
        className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-adja-yellow' : ''}`}
      >
        <User size={24} />
        <span>Profil</span>
      </NavLink>
    </div>
  );
}
