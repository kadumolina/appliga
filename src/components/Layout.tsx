import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Trophy, Users, LayoutDashboard, Calendar, Menu, X, LogIn, LogOut, ChevronDown, Check, Shield, HelpCircle, Clock, Dumbbell, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/AppContext';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { 
    currentUser, signIn, logOut, 
    workspaces, activeWorkspaceId, switchWorkspace, 
    invites, acceptInvite, isAdmin
  } = useAppStore();

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Torneios', path: '/tournaments', icon: Calendar },
    { name: 'Atletas', path: '/players', icon: Users },
    { name: 'Ranking Geral', path: '/rankings', icon: Trophy },
    { name: 'Aluguel de Quadras', path: '/court-rental', icon: Clock },
    { name: 'Grade de Aulas', path: '/class-schedule', icon: Dumbbell },
    { name: 'Financeiro', path: '/finance', icon: Wallet },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Painel Master', path: '/admin', icon: Shield });
  }

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden bg-black text-white p-4 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center gap-2">
          <Trophy className="text-green-500 w-6 h-6" />
          <span className="font-black italic uppercase text-lg tracking-tighter">RankUP</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Desktop / Mobile Overlay */}
      <div className={cn(
        "fixed inset-0 z-50 transform md:transform-none md:relative md:w-72 bg-black text-white transition-transform duration-200 ease-in-out flex flex-col print:hidden md:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <div className="bg-green-500 p-2 rounded-lg">
            <Trophy className="text-black w-6 h-6" />
          </div>
          <span className="font-black italic uppercase text-2xl tracking-tighter leading-tight">RankUP</span>
        </div>

        {currentUser && (
          <div className="px-4 mb-4 relative">
            <button 
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full flex items-center justify-between bg-gray-900 border border-gray-700 p-3 rounded-xl hover:border-gray-500 transition-colors"
            >
              <div className="flex flex-col items-start truncate overflow-hidden">
                <span className="text-xs text-gray-400">Espaço de Trabalho</span>
                <span className="font-bold truncate max-w-[180px]">{activeWorkspace?.ownerEmail || 'Carregando...'}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {workspaceMenuOpen && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  {workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => { switchWorkspace(ws.id); setWorkspaceMenuOpen(false); }}
                      className="w-full text-left p-3 hover:bg-gray-700 flex items-center justify-between transition-colors border-b border-gray-700 last:border-0"
                    >
                      <div className="truncate flex-1 pr-2">
                        <div className="font-semibold text-sm truncate">{ws.ownerEmail}</div>
                        <div className="text-xs text-gray-400">Papel: {isAdmin && !ws.roles[currentUser.uid] ? 'admin' : ws.roles[currentUser.uid]}</div>
                      </div>
                      {ws.id === activeWorkspaceId && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
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
          <div className="mb-4 text-xs text-gray-400 px-2 flex flex-col gap-1">
            <span className="font-bold text-gray-300 flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Suporte & Dúvidas</span>
            <span>Dúvidas e sugestões:</span>
            <a href="mailto:rankup.atendimento@gmail.com" className="text-green-400 hover:underline break-all">rankup.atendimento@gmail.com</a>
          </div>

          {invites.length > 0 && (
            <div className="mb-4 bg-gray-900 border border-green-500/30 rounded-xl p-3">
              <div className="text-xs font-bold text-green-400 mb-2 uppercase tracking-wider">Convites Pendentes ({invites.length})</div>
              <div className="space-y-2">
                {invites.map(inv => (
                  <div key={inv.id} className="bg-gray-800 p-2 rounded-lg text-sm flex flex-col gap-2">
                    <div className="truncate"><span className="text-gray-400">De:</span> {inv.workspaceOwnerEmail}</div>
                    <button 
                      onClick={() => acceptInvite(inv)}
                      className="bg-green-500 text-black font-bold py-1 px-2 rounded-md hover:bg-green-400"
                    >
                      Aceitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentUser ? (
            <div className="flex flex-col gap-2 border-t border-gray-800 pt-4 mt-4">
              <div className="px-2">
                <div className="text-xs text-gray-500">Usuário Logado</div>
                <div className="text-sm truncate text-gray-300 font-medium">{currentUser.displayName || currentUser.email}</div>
                {currentUser.displayName && <div className="text-xs truncate text-gray-500">{currentUser.email}</div>}
              </div>
              <button 
                onClick={logOut}
                className="flex items-center gap-3 px-4 py-3 mt-2 text-red-400 hover:bg-gray-800 hover:text-red-300 rounded-xl transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="flex items-center gap-3 px-4 py-3 text-green-400 hover:bg-gray-800 hover:text-green-300 rounded-xl transition-colors w-full text-left font-bold"
            >
              <LogIn className="w-5 h-5" />
              Entrar (Google)
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto relative">
        {activeWorkspace?.status === 'inactive' && !isAdmin && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center">
            <Shield className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Conta Suspensa</h2>
            <p className="text-gray-600 max-w-md">Esta conta foi temporariamente desativada pelo administrador. Entre em contato com o suporte para mais informações.</p>
            <a href="mailto:rankup.atendimento@gmail.com" className="mt-6 bg-black text-white px-6 py-2 rounded-lg font-bold">Falar com Suporte</a>
          </div>
        )}
        {activeWorkspace?.status === 'inactive' && isAdmin && (
          <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-xl mb-6 font-medium flex items-center gap-2">
            <Shield className="w-5 h-5" /> Você está visualizando uma conta inativa.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
