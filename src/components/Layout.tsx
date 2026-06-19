import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Trophy, Users, LayoutDashboard, Calendar, Menu, X, LogIn, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/AppContext';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, signIn, logOut } = useAppStore();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Torneios', path: '/tournaments', icon: Calendar },
    { name: 'Atletas', path: '/players', icon: Users },
    { name: 'Ranking Geral', path: '/rankings', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden bg-black text-white p-4 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center gap-2">
          <Trophy className="text-green-500 w-6 h-6" />
          <span className="font-bold text-lg tracking-tight">BEACH TENNIS LIGA</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Desktop / Mobile Overlay */}
      <div className={cn(
        "fixed inset-0 z-50 transform md:transform-none md:relative md:w-64 bg-black text-white transition-transform duration-200 ease-in-out flex flex-col print:hidden",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <div className="bg-green-500 p-2 rounded-lg">
            <Trophy className="text-black w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight leading-tight">BEACH TENNIS<br/>LIGA</span>
        </div>

        <nav className="flex-1 px-4 py-8 md:py-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200",
                isActive 
                  ? "bg-green-500 text-black font-semibold" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {currentUser ? (
            <div className="flex flex-col gap-2">
              <div className="text-sm truncate text-gray-400 px-2">{currentUser.email}</div>
              <button 
                onClick={logOut}
                className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-800 hover:text-red-300 rounded-xl transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="flex items-center gap-3 px-4 py-3 text-green-400 hover:bg-gray-800 hover:text-green-300 rounded-xl transition-colors w-full text-left"
            >
              <LogIn className="w-5 h-5" />
              Entrar (Google)
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
