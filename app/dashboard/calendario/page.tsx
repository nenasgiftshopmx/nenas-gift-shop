'use client';

import { useState, useEffect, useMemo } from 'react';
import { getNotas } from '@/lib/firestore';
import { Nota, Delivery, NotaItem, EntregaFecha } from '@/types';
import { useWidth } from '@/hooks/useWidth';

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const entregaColors = [
  { bg:'#FFF0F5', border:'#FFB6D9', text:'#D6006E', dot:'#E91E8C' },
  { bg:'#EEF0FF', border:'#B6C4FE', text:'#2B3F8E', dot:'#3B4FA0' },
  { bg:'#EDFCF2', border:'#A3E4BC', text:'#14633A', dot:'#1A8A4A' },
];

const StatusBadge = ({ status }: { status: string }) => {
  const c: Record<string, { l: string; bg: string; c: string }> = {
    pending: { l: 'Pendiente', bg: '#FFF3CD', c: '#856404' },
    confirmed: { l: 'Confirmado', bg: '#D1E7DD', c: '#0F5132' },
    preparing: { l: 'Preparando', bg: '#E0CFFC', c: '#432874' },
    delivered: { l: 'Entregado', bg: '#CFE2FF', c: '#084298' },
  };
  const cfg = c[status] || c.pending;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.c }}><span className="w-1 h-1 rounded-full" style={{ background: cfg.c }}/>{cfg.l}</span>;
};

export default function CalendarioPage() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { isDesktop } = useWidth();

  useEffect(() => { loadNotas(); }, []);
  const loadNotas = async () => { try { setNotas(await getNotas()); } catch (e) { console.error(e); } finally { setLoading(false); } };

  const allDeliveries = useMemo<Delivery[]>(() => {
    const delivs: Delivery[] = [];
    notas.forEach(n => {
      n.entregas?.forEach((ent: EntregaFecha, ei: number) => {
        if (!ent.dia || !ent.mes) return;
        const items = n.items?.filter((it: NotaItem) => it.entrega === ei + 1 && it.articulo) || [];
        delivs.push({
          day: parseInt(ent.dia), month: parseInt(ent.mes) - 1, year: parseInt(ent.anio || '2026'),
          label: ent.label, folio: n.folio, client: n.nombre, items, status: n.status, colorIdx: ei, notaId: n.id,
        });
      });
    });
    return delivs;
  }, [notas]);

  const getForDay = (d: number, m: number, y: number) => allDeliveries.filter(dl => dl.day === d && dl.month === m && dl.year === y);

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const calDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i);

  const selectedDeliveries = selectedDay ? getForDay(selectedDay, calMonth, calYear) : [];

  // Upcoming 14 days
  const upcoming = useMemo<(Delivery & { date: Date })[]>(() => {
    const list: (Delivery & { date: Date })[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      getForDay(d.getDate(), d.getMonth(), d.getFullYear()).forEach(dl => list.push({ ...dl, date: new Date(d) }));
    }
    return list;
  }, [allDeliveries]);

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); setSelectedDay(null); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); setSelectedDay(null); };

  if (loading) {
    return <div className="text-center py-20 text-gray-400"><div className="text-4xl mb-3 animate-bounce">📅</div><p className="text-sm">Cargando calendario...</p></div>;
  }

  return (
    <div>
      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <button onClick={prevMonth} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-500 cursor-pointer font-body text-sm">‹</button>
          <h3 className="font-display text-xl font-bold text-gray-800 m-0">{meses[calMonth]} {calYear}</h3>
          <button onClick={nextMonth} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-500 cursor-pointer font-body text-sm">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {dias.map(d => <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1.5">{d}</div>)}
          {calDays.map((day, idx) => {
            if (!day) return <div key={`e${idx}`} />;
            const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
            const delivs = getForDay(day, calMonth, calYear);
            const isSel = selectedDay === day;
            return (
              <div key={idx} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                className="text-center py-2 px-1 rounded-xl cursor-pointer transition-all min-h-[44px]"
                style={{
                  background: isSel ? 'linear-gradient(135deg, #FF69B4, #E91E8C)' : isToday ? '#FFF0F5' : '#FAFAFA',
                  color: isSel ? 'white' : isToday ? '#E91E8C' : '#2D2D2D',
                  fontWeight: isToday || isSel ? 800 : 500,
                  fontSize: '13px',
                  border: isToday && !isSel ? '2px solid #E91E8C' : '2px solid transparent',
                }}>
                {day}
                {delivs.length > 0 && (
                  <div className="flex justify-center gap-0.5 mt-1">
                    {delivs.slice(0, 3).map((d, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: isSel ? 'white' : entregaColors[d.colorIdx]?.dot || '#E91E8C' }} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay !== null && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm" style={selectedDeliveries.length > 0 ? { background: 'linear-gradient(135deg, #FFF8E1, #FFFDE7)', borderColor: '#FFE082' } : {}}>
          <h3 className="text-sm font-bold text-gray-800 mb-3">
            {selectedDeliveries.length > 0 ? `📦 Entregas del ${selectedDay} ${meses[calMonth]}` : `✨ ${selectedDay} ${meses[calMonth]} — Sin entregas`}
          </h3>
          {selectedDeliveries.map((d, i) => {
            const col = entregaColors[d.colorIdx] || entregaColors[0];
            return (
              <div key={i} className="bg-white rounded-xl p-3 mb-2" style={{ border: `1.5px solid ${col.border}` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-extrabold" style={{ background: col.dot }}>{d.colorIdx + 1}</span>
                  <span className="text-sm font-bold text-gray-800">{d.client}</span>
                  <span className="text-xs text-gray-400">{d.folio}</span>
                  <span className="ml-auto"><StatusBadge status={d.status} /></span>
                </div>
                {d.label && <div className="text-xs font-semibold mb-1" style={{ color: col.text }}>🏷️ {d.label}</div>}
                {d.items.map((it: NotaItem, j: number) => <div key={j} className="text-xs text-gray-500 py-0.5">• {it.cantidad}x {it.articulo}</div>)}
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming 14 days */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">📅 Próximas Entregas (14 días)</h3>
          {upcoming.map((d, i) => {
            const col = entregaColors[d.colorIdx] || entregaColors[0];
            return (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-50 mb-1.5">
                <div className="w-10 text-center">
                  <div className="text-lg font-extrabold" style={{ color: '#E91E8C' }}>{d.day}</div>
                  <div className="text-[10px] text-gray-400">{meses[d.month]?.slice(0, 3)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800">{d.client}</div>
                  <div className="text-xs text-gray-400">{d.label || 'Entrega general'} · {d.items.length} art.</div>
                </div>
                <StatusBadge status={d.status} />
              </div>
            );
          })}
        </div>
      )}

      {upcoming.length === 0 && !selectedDay && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 shadow-sm">
          <div className="text-3xl mb-2">📅</div>
          <p className="text-sm">No hay entregas próximas. Las entregas de tus notas aparecerán aquí automáticamente.</p>
        </div>
      )}
    </div>
  );
}
