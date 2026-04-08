'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getNotas } from '@/lib/firestore';
import { Nota, Delivery } from '@/types';
import { useWidth } from '@/hooks/useWidth';

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: 'Pendiente', bg: '#FFF3CD', color: '#856404' },
    confirmed: { label: 'Confirmado', bg: '#D1E7DD', color: '#0F5132' },
    preparing: { label: 'Preparando', bg: '#E0CFFC', color: '#432874' },
    delivered: { label: 'Entregado', bg: '#CFE2FF', color: '#084298' },
  };
  const c = config[status] || config.pending;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
};

export default function DashboardPage() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { isDesktop } = useWidth();

  useEffect(() => {
    loadNotas();
  }, []);

  const loadNotas = async () => {
    try {
      const data = await getNotas();
      setNotas(data);
    } catch (err) {
      console.error('Error loading notas:', err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Compute deliveries for today
  const todayDeliveries: Delivery[] = [];
  notas.forEach(n => {
    n.entregas?.forEach((ent, ei) => {
      if (!ent.dia || !ent.mes) return;
      if (parseInt(ent.dia) === todayDay && parseInt(ent.mes) - 1 === todayMonth && parseInt(ent.anio) === todayYear) {
        const items = n.items?.filter(it => it.entrega === ei + 1 && it.articulo) || [];
        todayDeliveries.push({
          day: todayDay, month: todayMonth, year: todayYear,
          label: ent.label, folio: n.folio, client: n.nombre,
          items, status: n.status, colorIdx: ei, notaId: n.id,
        });
      }
    });
  });

  const totalVentas = notas.reduce((s, n) => s + (parseFloat(n.total) || 0), 0);
  const pendingCount = notas.filter(n => n.status === 'pending' || n.status === 'confirmed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🎀</div>
          <p className="text-gray-400 text-sm font-semibold">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className={`grid gap-3 mb-5 ${isDesktop ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {[
          { icon: '💰', label: 'Ventas Total', value: `$${totalVentas.toLocaleString()}`, color: '#E91E8C' },
          { icon: '📋', label: 'Notas Activas', value: pendingCount, color: '#3B4FA0' },
          { icon: '🚚', label: 'Entregas Hoy', value: todayDeliveries.length, color: '#1A8A4A' },
          { icon: '👥', label: 'Total Notas', value: notas.length, color: '#D97706' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-400 font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today's Deliveries Alert */}
      {todayDeliveries.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-amber-200 p-4 mb-5"
          style={{ background: 'linear-gradient(135deg, #FFF8E1, #FFFDE7)' }}>
          <h3 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">⚡ Entregas para Hoy</h3>
          {todayDeliveries.map((d, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-amber-100 mb-2 cursor-pointer"
              onClick={() => router.push('/dashboard/notas')}>
              <span className="text-xl">📦</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-800">{d.client}</div>
                <div className="text-xs text-gray-400">{d.folio} · {d.label || 'Entrega general'} · {d.items.length} art.</div>
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </div>
      )}

      {/* Recent Notas */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-gray-800 m-0">Últimas Notas</h3>
          <button onClick={() => router.push('/dashboard/notas')}
            className="text-xs font-semibold text-nenas-600 bg-transparent border-none cursor-pointer">
            Ver todas →
          </button>
        </div>
        {notas.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm">No hay notas aún. ¡Crea la primera!</p>
          </div>
        ) : (
          notas.slice(0, 5).map(n => (
            <div key={n.folio} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 mb-2 cursor-pointer hover:bg-gray-50 transition-all"
              onClick={() => router.push('/dashboard/notas')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs"
                style={{ background: '#FFF0F5', color: '#E91E8C' }}>
                {n.folio?.slice(-4)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-800 truncate">{n.nombre}</div>
                <div className="text-xs text-gray-400">{n.entregas?.length || 0} entrega(s) · ${parseFloat(n.total || '0').toLocaleString()}</div>
              </div>
              <StatusBadge status={n.status} />
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className={`grid gap-3 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {[
          { label: 'Nueva Nota', icon: '📝', href: '/dashboard/notas' },
          { label: 'Calendario', icon: '📅', href: '/dashboard/calendario' },
          { label: 'Catálogo', icon: '📦', href: '/dashboard/catalogo' },
          { label: 'Clientes', icon: '👥', href: '/dashboard/clientes' },
        ].map(a => (
          <button key={a.label} onClick={() => router.push(a.href)}
            className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer w-full text-left hover:shadow-md transition-all font-body">
            <span className="text-2xl">{a.icon}</span>
            <span className="text-sm font-semibold text-gray-600">{a.label}</span>
            <span className="ml-auto text-gray-300">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
