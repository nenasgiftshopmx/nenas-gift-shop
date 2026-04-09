'use client';

import { useMemo, useState } from 'react';
import { Nota, Delivery, NotaItem, EntregaFecha } from '@/types';

interface Props {
  notas: Nota[];
  onNotaClick?: (notaId: string) => void;
}

const entregaColors = [
  { bg:'#FFF0F5', border:'#FFB6D9', text:'#D6006E', dot:'#E91E8C' },
  { bg:'#EEF0FF', border:'#B6C4FE', text:'#2B3F8E', dot:'#3B4FA0' },
  { bg:'#EDFCF2', border:'#A3E4BC', text:'#14633A', dot:'#1A8A4A' },
];

const StatusBadge = ({ status }: { status: string }) => {
  const c: Record<string, { l: string; bg: string; c: string }> = {
    pending: { l:'Pendiente', bg:'#FFF3CD', c:'#856404' },
    confirmed: { l:'Confirmado', bg:'#D1E7DD', c:'#0F5132' },
    preparing: { l:'Preparando', bg:'#E0CFFC', c:'#432874' },
    delivered: { l:'Entregado', bg:'#CFE2FF', c:'#084298' },
  };
  const cfg = c[status] || c.pending;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.c }}><span className="w-1 h-1 rounded-full" style={{ background: cfg.c }}/>{cfg.l}</span>;
};

export default function TrabajosPendientes({ notas, onNotaClick }: Props) {
  const [filtro, setFiltro] = useState<'hoy' | 'semana' | '15dias' | '30dias'>('15dias');

  const allDeliveries = useMemo<(Delivery & { date: Date })[]>(() => {
    const delivs: (Delivery & { date: Date })[] = [];
    notas.forEach(n => {
      // Solo incluir notas pendientes o confirmadas
      if (n.status === 'delivered' || n.status === 'cancelled') return;
      
      n.entregas?.forEach((ent: EntregaFecha, ei: number) => {
        if (!ent.dia || !ent.mes) return;
        const day = parseInt(ent.dia);
        const month = parseInt(ent.mes) - 1;
        const year = parseInt(ent.anio || '2026');
        const date = new Date(year, month, day);
        
        const items = n.items?.filter((it: NotaItem) => it.entrega === ei + 1 && it.articulo) || [];
        delivs.push({
          day, month, year,
          label: ent.label,
          folio: n.folio,
          client: n.nombre,
          items,
          status: n.status,
          colorIdx: ei,
          notaId: n.id,
          date,
        });
      });
    });
    return delivs.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [notas]);

  const filteredDeliveries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const limits: Record<typeof filtro, number> = {
      hoy: 0,
      semana: 7,
      '15dias': 15,
      '30dias': 30,
    };
    
    const limit = limits[filtro];
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + limit);
    
    return allDeliveries.filter(d => {
      const delivDate = new Date(d.date);
      delivDate.setHours(0, 0, 0, 0);
      
      if (filtro === 'hoy') {
        return delivDate.getTime() === today.getTime();
      }
      return delivDate >= today && delivDate <= maxDate;
    });
  }, [allDeliveries, filtro]);

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-gray-800 m-0">📦 Trabajos Pendientes</h3>
        <div className="flex gap-1">
          {[
            { key: 'hoy' as const, label: 'Hoy' },
            { key: 'semana' as const, label: '7d' },
            { key: '15dias' as const, label: '15d' },
            { key: '30dias' as const, label: '30d' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                filtro === f.key
                  ? 'bg-nenas-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filteredDeliveries.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">✨</div>
          <p className="text-sm">
            {filtro === 'hoy' && 'No hay entregas para hoy'}
            {filtro === 'semana' && 'No hay entregas esta semana'}
            {filtro === '15dias' && 'No hay entregas próximos 15 días'}
            {filtro === '30dias' && 'No hay entregas próximos 30 días'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDeliveries.map((d, i) => {
            const col = entregaColors[d.colorIdx] || entregaColors[0];
            const isToday = d.date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={i}
                onClick={() => onNotaClick && d.notaId && onNotaClick(d.notaId)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer hover:shadow-md transition-all ${
                  isToday ? 'bg-amber-50 border-amber-200' : 'border-gray-100'
                }`}
              >
                <div className="w-12 text-center flex-shrink-0">
                  <div className="text-lg font-extrabold" style={{ color: col.dot }}>{d.day}</div>
                  <div className="text-[10px] text-gray-400">{meses[d.month]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800 truncate">{d.client}</div>
                  <div className="text-xs text-gray-400">
                    {d.folio} · {d.label || 'Entrega general'} · {d.items.length} art.
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
