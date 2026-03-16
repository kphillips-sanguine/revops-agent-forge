import { useAuthStore } from '../../stores/authStore';
import { User, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <header className="h-14 bg-header-bg border-b border-card-border flex items-center justify-between px-6">
      <div />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-200">
            {initials || <User className="w-4 h-4" />}
          </div>
          {user && (
            <span className="hidden sm:inline">{user.name}</span>
          )}
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-56 bg-card-bg border border-card-border rounded-lg shadow-lg z-50 py-1">
              <div className="px-4 py-3 border-b border-card-border">
                <p className="text-sm font-medium text-gray-200">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <p className="text-xs text-gray-600 mt-1 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-sidebar-hover hover:text-gray-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
