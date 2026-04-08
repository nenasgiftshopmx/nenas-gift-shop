'use client';

import { useState, useEffect, useMemo } from 'react';
import { getNotas } from '@/lib/firestore';
import { Nota } from '@/types';
import { useWidth } from '@/hooks/useWidth';

const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function ReportesPage() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDesktop } = useWidth();

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { setNotas(await getNotas()); } catch (e) { console.error(e); } finally { setLoading(false); } };

  const stats = useMemo(() => {
    const totalVentas = notas.reduce((s, n) => s + (parseFloat(n.total) || 0), 0);
    const totalAnticipos = notas.reduce((s, n) => s + (parseFloat(n.anticipo1) || 0), 0);
    const totalPendiente = totalVentas - totalAnticipos;
    const delivered = notas.filter(n => n.status === 'delivered').length;
    const pending = notas.filter(n => n.status === 'pending' || n.status === 'confirmed').length;

    // By month
    const byMonth: Record<string, number> = {};
    notas.forEach(n => {
      const key = `${n.anio}-${n.mes}`;
      byMonth[key] = (byMonth[key] || 0) + (parseFloat(n.total) || 0);
    });

    // By canal
    const byCanal: Record<string, number> = {};
    notas.forEach(n => {
      byCanal[n.canalVenta] = (byCanal[n.canalVenta] || 0) + 1;
    });

    // Top clients
    const byClient: Record<string, { name: string; total: number; count: number }> = {};
    notas.forEach(n => {
      if (!n.nombre) return;
      if (!byClient[n.nombre]) byClient[n.nombre] = { name: n.nombre, total: 0, count: 0 };
      byClient[n.nombre].total += parseFloat(n.total) || 0;
      byClient[n.nombre].count += 1;
    });
    const topClients = Object.values(byClient).sort((a, b) => b.total - a.total).slice(0, 5);

    return { totalVentas, totalAnticipos, totalPendiente, delivered, pending, byMonth, byCanal, topClients, total: notas.length };
  }, [notas]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400"><div className="text-4xl mb-3 animate-bounce">📊</div><p className="text-sm">Cargando reportes...</p></div>;
  }

  // Bar chart data
  const monthKeys = Object.keys(stats.byMonth).sort().slice(-6);
  const monthValues = monthKeys.map(k => stats.byMonth[k]);
  const maxBar = Math.max(...monthValues, 1);

  // Canal data
  const canalColors: Record<string, string> = { WA: '#25D366', IG: '#E1306C', FB: '#1877F2', Local: '#F59E0B' };
  const totalCanal = Object.values(stats.byCanal).reduce((s, v) => s + v, 0) || 1;

  return (
    <div>
      {/* Top Stats */}
      <div className={`grid gap-3 mb-5 ${isDesktop ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {[
          { icon: '💰', label: 'Total Ventas', value: `$${stats.totalVentas.toLocaleString()}`, color: '#E91E8C' },
          { icon: '✅', label: 'Cobrado', value: `$${stats.totalAnticipos.toLocaleString()}`, color: '#22C55E' },
          { icon: '⏳', label: 'Por Cobrar', value: `$${stats.totalPendiente.toLocaleString()}`, color: '#3B4FA0' },
          { icon: '📋', label: 'Total Notas', value: stats.total, color: '#D97706' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-400 font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-3">📌 Estado de Notas</h3>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Pendientes', value: stats.pending, color: '#856404', bg: '#FFF3CD' },
            { label: 'Entregadas', value: stats.delivered, color: '#084298', bg: '#CFE2FF' },
            { label: 'Total', value: stats.total, color: '#E91E8C', bg: '#FFF0F5' },
          ].map(s => (
            <div key={s.label} className="flex-1 min-w-[100px] rounded-xl p-3 text-center" style={{ background: s.bg }}>
              <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs font-semibold" style={{ color: s.color, opacity: 0.7 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-4">📊 Ventas por Mes</h3>
        {monthKeys.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Sin datos suficientes aún</div>
        ) : (
          <div className="flex items-end gap-4 h-44 px-2">
            {monthKeys.map((key, i) => {
              const val = monthValues[i];
              const parts = key.split('-');
              const label = meses[parseInt(parts[1]) - 1] || parts[1];
              return (
                <div key={key} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-gray-700">${(val / 1000).toFixed(0)}k</span>
                  <div className="w-full max-w-[50px] rounded-t-lg" style={{
                    height: `${(val / maxBar) * 130}px`,
                    background: 'linear-gradient(180deg, #FF69B4, #E91E8C)',
                    minHeight: '8px',
                    transition: 'height 0.5s ease',
                  }} />
                  <span className="text-xs font-semibold text-gray-500">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Canal Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">📱 Ventas por Canal</h3>
          {Object.keys(stats.byCanal).length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">Sin datos</div>
          ) : (
            Object.entries(stats.byCanal).sort((a, b) => b[1] - a[1]).map(([canal, count]) => {
              const pct = Math.round((count / totalCanal) * 100);
              const color = canalColors[canal] || '#999';
              return (
                <div key={canal} className="mb-3">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-600">{canal}</span>
                    <span className="text-sm font-bold" style={{ color }}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">🏆 Top Clientes</h3>
          {stats.topClients.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">Sin datos</div>
          ) : (
            stats.topClients.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-xs font-extrabold w-5" style={{ color: '#E91E8C' }}>#{i + 1}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: `hsl(${i * 60 + 330}, 70%, 65%)` }}>
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800 truncate">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.count} nota(s)</div>
                </div>
                <div className="text-sm font-extrabold" style={{ color: '#E91E8C' }}>${c.total.toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
