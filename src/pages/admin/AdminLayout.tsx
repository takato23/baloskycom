import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Settings, LayoutDashboard, Target, Package, Users, UserCircle, MessageSquare, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  if (!isAuthenticated) return null;

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Resumen', end: true },
    { to: '/admin/campaigns', icon: Target, label: 'Misiones' },
    { to: '/admin/products', icon: Package, label: 'Productos' },
    { to: '/admin/memberships', icon: Users, label: 'Membresías' },
    { to: '/admin/users', icon: UserCircle, label: 'Usuarios' },
    { to: '/admin/messages', icon: MessageSquare, label: 'Mensajes' },
    { to: '/admin/settings', icon: Settings, label: 'Configuración' },
  ];

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 pb-16 px-4 sm:px-0">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="sticky top-24 space-y-2">
          <div className="flex items-center justify-between mb-6 px-4">
            <h2 className="text-xl font-display font-bold text-white">Admin Panel</h2>
            <button onClick={handleLogout} className="text-zinc-500 hover:text-red-400 transition-colors" title="Cerrar sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
                  isActive 
                    ? "bg-violet-600/10 text-violet-400" 
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
