'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWidth } from '@/hooks/useWidth';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠', mobileLabel: 'Inicio' },
  { href: '/dashboard/notas', label: 'Notas de Venta', icon: '📋', mobileLabel: 'Notas' },
  { href: '/dashboard/calendario', label: 'Calendario', icon: '📅', mobileLabel: 'Calendario' },
  { href: '/dashboard/catalogo', label: 'Catálogo', icon: '📦', mobileLabel: 'Catálogo' },
  { href: '/dashboard/clientes', label: 'Clientes', icon: '👥', mobileLabel: 'Clientes' },
  { href: '/dashboard/reportes', label: 'Reportes', icon: '📊', mobileLabel: 'Reportes' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDesktop } = useWidth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFF0F5' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🎀</div>
          <p className="text-gray-400 font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const currentTitle = navItems.find(n => pathname === n.href)?.label
    || navItems.find(n => pathname.startsWith(n.href) && n.href !== '/dashboard')?.label
    || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ===== DESKTOP SIDEBAR ===== */}
      {isDesktop && (
        <aside className="w-56 bg-white border-r border-gray-100 fixed top-0 bottom-0 left-0 z-40 flex flex-col">
          <div className="p-5 flex items-center gap-3 border-b border-gray-50">
            <span className="text-3xl">🎀</span>
            <div>
              <div className="font-display text-lg font-bold text-gray-800">Nenas</div>
              <div className="text-[10px] font-bold text-gray-300 tracking-[0.15em]">GIFT SHOP</div>
            </div>
          </div>
          <nav className="p-2 flex-1">
            {navItems.map(item => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all mb-0.5 no-underline ${
                    active
                      ? 'bg-nenas-50 text-nenas-600 font-bold'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}>
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-gray-50">
            <button onClick={logout}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-50 transition-all border-none bg-transparent cursor-pointer font-body">
              🚪 Cerrar Sesión
            </button>
          </div>
        </aside>
      )}

      {/* ===== MOBILE SIDEBAR OVERLAY ===== */}
      {!isDesktop && sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed top-0 bottom-0 left-0 w-64 bg-white z-50 shadow-xl flex flex-col">
            <div className="p-5 flex items-center gap-3 border-b border-gray-50">
              <span className="text-3xl">🎀</span>
              <div>
                <div className="font-display text-lg font-bold text-gray-800">Nenas</div>
                <div className="text-[10px] font-bold text-gray-300 tracking-[0.15em]">GIFT SHOP</div>
              </div>
              <button onClick={() => setSidebarOpen(false)}
                className="ml-auto text-gray-400 bg-transparent border-none text-lg cursor-pointer">✕</button>
            </div>
            <nav className="p-2 flex-1">
              {navItems.map(item => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold no-underline mb-0.5 ${
                      active ? 'bg-nenas-50 text-nenas-600 font-bold' : 'text-gray-500'
                    }`}>
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-gray-50">
              <button onClick={() => { logout(); setSidebarOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-gray-400 border-none bg-transparent cursor-pointer font-body">
                🚪 Cerrar Sesión
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className={`flex-1 ${isDesktop ? 'ml-56' : ''} ${!isDesktop ? 'pb-20' : ''}`}>
        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {!isDesktop && (
              <button onClick={() => setSidebarOpen(true)}
                className="bg-transparent border-none text-gray-600 cursor-pointer text-xl p-1">
                ☰
              </button>
            )}
            <h1 className="text-lg font-bold text-gray-800 m-0">{currentTitle}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #FF69B4, #E91E8C)' }}>
              N
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className={`${isDesktop ? 'p-6' : 'p-4'} max-w-6xl mx-auto`}>
          {children}
        </div>
      </main>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      {!isDesktop && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-1.5 z-30 bottom-nav">
          {navItems.slice(0, 5).map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] no-underline transition-all ${
                  active ? 'text-nenas-600 font-bold' : 'text-gray-400'
                }`}>
                <span className="text-lg">{item.icon}</span>
                {item.mobileLabel}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
