'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, error, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  if (user) {
    router.push('/dashboard');
    return null;
  }

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (e) {
      // Error handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5"
      style={{ background: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4F0 30%, #FFDBE8 60%, #FFC0D6 100%)' }}>
      <div className="bg-white rounded-3xl p-10 sm:p-12 shadow-xl max-w-md w-full text-center"
        style={{ boxShadow: '0 20px 60px rgba(255, 105, 180, 0.15), 0 4px 20px rgba(0,0,0,0.06)' }}>
        
        <div className="text-5xl mb-2">🎀</div>
        <h1 className="font-display text-3xl font-bold text-gray-800 mb-1">Nenas Gift Shop</h1>
        <p className="text-gray-400 text-sm mb-8">Panel de Administración</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="text-left mb-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full p-3.5 rounded-xl border-2 border-gray-100 text-sm outline-none bg-gray-50 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div className="text-left mb-6">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full p-3.5 rounded-xl border-2 border-gray-100 text-sm outline-none bg-gray-50 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full p-3.5 rounded-xl border-none text-white text-base font-bold cursor-pointer btn-primary transition-all disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #FF69B4, #E91E8C)',
            boxShadow: '0 4px 15px rgba(233, 30, 140, 0.35)',
          }}
        >
          {loading ? '⏳ Verificando...' : 'Iniciar Sesión'}
        </button>

        <p className="text-gray-300 text-xs mt-6">
          Conectado a Firebase · Vercel · GitHub
        </p>
      </div>
    </div>
  );
}
