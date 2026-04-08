'use client';

import { useState, useEffect } from 'react';
import { getNotas, createNota, updateNota, deleteNota as deleteNotaFB } from '@/lib/firestore';
import { Nota, NotaItem, EntregaFecha } from '@/types';
import { useWidth } from '@/hooks/useWidth';

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
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
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: cfg.bg, color: cfg.c }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.c }}/>{cfg.l}</span>;
};

const genFolio = () => 'NV-' + String(Math.floor(Math.random() * 9000) + 1000);
const fmtEntLabel = (ent: EntregaFecha, idx: number) => {
  if (!ent.dia && !ent.mes) return `Entrega ${idx + 1}`;
  return `${ent.dia} ${ent.mes ? meses[parseInt(ent.mes) - 1] || '' : ''}`;
};

const emptyNota = (): Omit<Nota, 'id'> => {
  const t = new Date();
  return {
    folio: genFolio(), dia: String(t.getDate()), mes: String(t.getMonth() + 1).padStart(2, '0'), anio: String(t.getFullYear()),
    nombre: '', telefono: '', evento: '', canalVenta: 'WA',
    items: [
      { cantidad: '', articulo: '', precio: '', importe: '', entrega: 1 },
      { cantidad: '', articulo: '', precio: '', importe: '', entrega: 1 },
      { cantidad: '', articulo: '', precio: '', importe: '', entrega: 1 },
    ],
    notas: '', entregas: [{ dia: '', mes: '', anio: String(t.getFullYear()), label: '' }],
    total: '', anticipo1: '', status: 'pending',
  };
};

export default function NotasPage() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form' | 'preview'>('list');
  const [editNota, setEditNota] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const { isDesktop } = useWidth();

  useEffect(() => { loadNotas(); }, []);

  const loadNotas = async () => {
    try { const data = await getNotas(); setNotas(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleNew = () => { setEditNota(emptyNota()); setView('form'); };
  const handleEdit = (n: Nota) => { setEditNota({ ...n }); setView('form'); };

  const handleSave = async () => {
    if (!editNota) return;
    setSaving(true);
    try {
      if (editNota.id) {
        const { id, ...data } = editNota;
        await updateNota(id, data);
      } else {
        await createNota(editNota);
      }
      await loadNotas();
      setView('list');
      setEditNota(null);
    } catch (e) { console.error('Error saving:', e); alert('Error al guardar. Intenta de nuevo.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta nota?')) return;
    try { await deleteNotaFB(id); await loadNotas(); }
    catch (e) { console.error(e); }
  };

  const updateField = (f: string, v: any) => setEditNota((p: any) => ({ ...p, [f]: v }));
  const updateItem = (idx: number, f: string, v: any) => {
    setEditNota((p: any) => {
      const items = [...p.items];
      items[idx] = { ...items[idx], [f]: v };
      if (f === 'cantidad' || f === 'precio') {
        const c = parseFloat(f === 'cantidad' ? v : items[idx].cantidad) || 0;
        const pr = parseFloat(f === 'precio' ? v : items[idx].precio) || 0;
        items[idx].importe = c * pr > 0 ? String(c * pr) : '';
      }
      const total = items.reduce((s: number, i: NotaItem) => s + (parseFloat(i.importe) || 0), 0);
      return { ...p, items, total: total > 0 ? String(total) : p.total };
    });
  };
  const addItem = () => setEditNota((p: any) => ({ ...p, items: [...p.items, { cantidad: '', articulo: '', precio: '', importe: '', entrega: 1 }] }));
  const removeItem = (idx: number) => { if (editNota.items.length <= 1) return; setEditNota((p: any) => { const items = p.items.filter((_: any, i: number) => i !== idx); const t = items.reduce((s: number, i: NotaItem) => s + (parseFloat(i.importe) || 0), 0); return { ...p, items, total: t > 0 ? String(t) : '' }; }); };

  const updateEntrega = (idx: number, f: string, v: string) => setEditNota((p: any) => { const e = [...p.entregas]; e[idx] = { ...e[idx], [f]: v }; return { ...p, entregas: e }; });
  const addEntrega = () => { if (editNota.entregas.length >= 3) return; setEditNota((p: any) => ({ ...p, entregas: [...p.entregas, { dia: '', mes: '', anio: String(new Date().getFullYear()), label: '' }] })); };
  const removeEntrega = (idx: number) => {
    if (editNota.entregas.length <= 1) return;
    const rn = idx + 1;
    setEditNota((p: any) => {
      const e = p.entregas.filter((_: any, i: number) => i !== idx);
      const items = p.items.map((it: NotaItem) => ({ ...it, entrega: it.entrega === rn ? 1 : it.entrega > rn ? it.entrega - 1 : it.entrega }));
      return { ...p, entregas: e, items };
    });
  };

  const calcRest = (n: any) => Math.max(0, (parseFloat(n?.total) || 0) - (parseFloat(n?.anticipo1) || 0));

  const canales = ['FB', 'IG', 'WA', 'Local'];

  // WhatsApp share
  const shareWA = (n: any) => {
    const filled = n.items.filter((i: NotaItem) => i.articulo);
    const byEnt: Record<number, NotaItem[]> = {};
    filled.forEach((it: NotaItem) => { const k = it.entrega || 1; if (!byEnt[k]) byEnt[k] = []; byEnt[k].push(it); });
    let text = `*NENAS GIFT SHOP* 🎀\n📋 ${n.folio}\n📅 ${n.dia}/${n.mes}/${n.anio}\n\n👤 *${n.nombre}*\n📞 ${n.telefono}\n${n.evento ? `🎉 ${n.evento}\n` : ''}\n*ARTÍCULOS:*\n`;
    n.entregas.forEach((ent: EntregaFecha, ei: number) => {
      const items = byEnt[ei + 1];
      if (!items?.length) return;
      text += `\n🚚 *${fmtEntLabel(ent, ei)}${ent.label ? ' — ' + ent.label : ''}*\n`;
      items.forEach((i: NotaItem) => { text += `  • ${i.cantidad}x ${i.articulo} — $${parseFloat(i.importe || '0').toLocaleString()}\n`; });
    });
    text += `\n💰 *TOTAL: $${parseFloat(n.total || '0').toLocaleString()}*`;
    if (n.anticipo1) { text += `\n✅ Anticipo: $${parseFloat(n.anticipo1).toLocaleString()}\n📌 Restante: $${calcRest(n).toLocaleString()}`; }
    text += `\n\n_Las compras son finales. No hay devoluciones de anticipo por cancelación._\n\n📍 Av. Del Trabajo #41 Plaza Valle Dorado\n📞 (868) 162-7939`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const printNota = () => {
    const el = document.getElementById('nota-print');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${editNota.folio}</title><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,700;1,600&display=swap" rel="stylesheet"><style>body{margin:0;padding:20px;font-family:'Nunito',sans-serif}@media print{body{padding:10px}}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const inputCls = "w-full p-2.5 rounded-lg border-2 border-gray-100 text-sm outline-none bg-gray-50 font-body focus:border-nenas-600";
  const inputSmCls = "w-full p-2 rounded-lg border border-gray-100 text-sm outline-none bg-gray-50 text-center font-body focus:border-nenas-600";
  const cardCls = "bg-white rounded-2xl border border-gray-100 p-4 mb-3.5 shadow-sm";
  const btnCls = "inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-none text-white text-sm font-bold cursor-pointer font-body";
  const btnSecCls = "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-500 text-sm font-semibold cursor-pointer font-body";

  // ===== LIST =====
  if (view === 'list') {
    const filtered = notas.filter(n => n.nombre?.toLowerCase().includes(search.toLowerCase()) || n.folio?.toLowerCase().includes(search.toLowerCase()));
    return (
      <div>
        <div className="flex flex-wrap gap-2.5 mb-4">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2 flex-1 min-w-[180px]">
            <span className="text-gray-400">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nota..." className="border-none outline-none text-sm w-full bg-transparent font-body" />
          </div>
          <button onClick={handleNew} className={btnCls} style={{ background: 'linear-gradient(135deg, #FF69B4, #E91E8C)', boxShadow: '0 3px 12px rgba(233,30,140,0.25)' }}>
            ＋ Nueva Nota
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3 animate-bounce">📋</div><p className="text-sm">Cargando notas...</p></div>
        ) : notas.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">📋</div><p className="text-sm">No hay notas. ¡Crea la primera!</p></div>
        ) : filtered.map(n => (
          <div key={n.id || n.folio} className={`${cardCls} cursor-pointer hover:shadow-md transition-all`} onClick={() => handleEdit(n)}>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold" style={{ color: '#E91E8C' }}>{n.folio}</span>
                  <StatusBadge status={n.status} />
                </div>
                <div className="text-base font-bold text-gray-800 mt-1">{n.nombre}</div>
                <div className="text-xs text-gray-400">{n.evento ? `🎉 ${n.evento} · ` : ''}{n.entregas?.length || 0} entrega(s) · {n.items?.filter((i: NotaItem) => i.articulo).length || 0} artículos</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-gray-800">${parseFloat(n.total || '0').toLocaleString()}</div>
                <div className="text-xs text-gray-400">{n.dia}/{n.mes}/{n.anio}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {n.entregas?.map((ent: EntregaFecha, ei: number) => {
                const col = entregaColors[ei];
                return <span key={ei} className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>🚚 {fmtEntLabel(ent, ei)}{ent.label ? ` — ${ent.label}` : ''}</span>;
              })}
            </div>
            <div className="flex gap-2 mt-2.5" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setEditNota({ ...n }); setView('preview'); }} className={btnSecCls}>👁️ Ver</button>
              <button onClick={() => shareWA(n)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border-none text-white text-xs font-bold cursor-pointer" style={{ background: '#25D366' }}>💬 WA</button>
              <button onClick={() => n.id && handleDelete(n.id)} className={`${btnSecCls} text-red-400 border-red-100`}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ===== PREVIEW =====
  if (view === 'preview' && editNota) {
    const n = editNota;
    const rest = calcRest(n);
    const filled = n.items.filter((i: NotaItem) => i.articulo);
    const byEnt: Record<number, NotaItem[]> = {};
    filled.forEach((it: NotaItem) => { const k = it.entrega || 1; if (!byEnt[k]) byEnt[k] = []; byEnt[k].push(it); });
    const navy = '#1a2744';

    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <button onClick={() => setView('form')} className={btnSecCls}>← Editar</button>
          <div className="flex gap-2 flex-wrap">
            <button onClick={printNota} className={btnSecCls}>🖨️ Imprimir</button>
            <button onClick={() => shareWA(n)} className={`${btnCls} text-sm`} style={{ background: '#25D366' }}>💬 WhatsApp</button>
            <button onClick={handleSave} disabled={saving} className={`${btnCls} text-sm`} style={{ background: '#22C55E' }}>{saving ? '⏳' : '💾'} Guardar</button>
          </div>
        </div>
        <div id="nota-print" className="bg-white border-2 rounded overflow-hidden text-sm mx-auto" style={{ borderColor: navy, maxWidth: '640px' }}>
          {/* Top bar */}
          <div className="flex items-stretch" style={{ borderBottom: `2px solid ${navy}` }}>
            <div className="px-3.5 py-2 font-extrabold text-sm text-white flex items-center" style={{ background: navy }}>NOTA DE VENTA</div>
            <div className="flex items-center ml-auto">
              {[['DÍA', n.dia], ['MES', n.mes], ['AÑO', n.anio]].map(([l, v]: string[]) => (
                <div key={l} className="px-3 py-1.5 text-center" style={{ borderLeft: `1.5px solid ${navy}` }}>
                  <div className="text-[9px] font-bold" style={{ color: navy }}>{l}</div>
                  <div className="text-base font-extrabold" style={{ color: navy }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Header */}
          <div className="p-3.5 flex gap-4 border-b border-gray-200">
            <div className="text-center">
              {n.evento && <div className="text-xs text-gray-500 mb-1">🎉 {n.evento}</div>}
              <div className="text-2xl font-extrabold font-display leading-none" style={{ color: '#E91E8C' }}>🎀<br/><span className="italic">Nenas</span></div>
              <div className="text-[11px] font-extrabold tracking-[0.15em] mt-0.5" style={{ color: navy }}>GIFT SHOP</div>
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">📍 Av. Del Trabajo #41 Plaza Valle Dorado H. Matamoros, Tamps.</div>
              <div className="text-xs text-gray-500 mb-2.5">📞 (868) 162-7939</div>
              <div className="border rounded p-2" style={{ borderColor: navy, borderWidth: '1.5px' }}>
                <div className="flex justify-between mb-1"><span className="text-xs font-bold" style={{ color: navy }}>NOMBRE:</span><span className="text-sm font-bold">{n.nombre}</span></div>
                <div className="flex justify-between"><span className="text-xs font-bold" style={{ color: navy }}>TELÉFONO:</span><span className="text-sm text-gray-500">{n.telefono}</span></div>
              </div>
            </div>
          </div>
          {/* Items grouped */}
          {n.entregas.map((ent: EntregaFecha, ei: number) => {
            const items = n.entregas.length === 1 ? filled : (byEnt[ei + 1] || []);
            if (!items.length) return null;
            const col = entregaColors[ei];
            return (
              <div key={ei}>
                {n.entregas.length > 1 && (
                  <div className="px-3.5 py-2 flex items-center gap-2" style={{ background: col.bg, borderTop: `2px solid ${col.border}` }}>
                    <span className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-extrabold" style={{ background: col.dot }}>{ei + 1}</span>
                    <span className="text-xs font-extrabold" style={{ color: col.text }}>🚚 {fmtEntLabel(ent, ei)}</span>
                    {ent.label && <span className="text-xs opacity-70" style={{ color: col.text }}>— {ent.label}</span>}
                  </div>
                )}
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: n.entregas.length === 1 ? navy : '#F8F8F8' }}>
                      {['CANT.', 'ARTÍCULO', 'PRECIO', 'IMPORTE'].map(h => (
                        <th key={h} className="px-2.5 py-1.5 text-[10px] font-bold tracking-wider" style={{ color: n.entregas.length === 1 ? 'white' : '#999', textAlign: h === 'ARTÍCULO' ? 'left' : 'center' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it: NotaItem, i: number) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-2.5 py-1.5 text-center font-semibold">{it.cantidad}</td>
                        <td className="px-2.5 py-1.5">{it.articulo}</td>
                        <td className="px-2.5 py-1.5 text-center">{it.precio ? `$${parseFloat(it.precio).toLocaleString()}` : ''}</td>
                        <td className="px-2.5 py-1.5 text-center font-bold">{it.importe ? `$${parseFloat(it.importe).toLocaleString()}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {n.notas && <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 italic">📝 {n.notas}</div>}
          {/* Footer */}
          <div className="p-3.5" style={{ borderTop: `2px solid ${navy}` }}>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {n.entregas.map((ent: EntregaFecha, ei: number) => { const col = entregaColors[ei]; return <span key={ei} className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>🚚 {fmtEntLabel(ent, ei)}{ent.label ? ` — ${ent.label}` : ''}</span>; })}
            </div>
            <div className="flex justify-end mb-2">
              <div className="px-4 py-1.5 rounded font-extrabold text-white" style={{ background: '#E91E8C' }}>TOTAL: <span className="text-lg">${parseFloat(n.total || '0').toLocaleString()}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between px-2.5 py-1.5 rounded" style={{ background: '#FFF0F5' }}><span className="text-xs font-bold" style={{ color: '#E91E8C' }}>ANTICIPO:</span><span className="text-sm font-extrabold">{n.anticipo1 ? `$${parseFloat(n.anticipo1).toLocaleString()}` : '—'}</span></div>
              <div className="flex justify-between px-2.5 py-1.5 rounded" style={{ background: '#EEF0FF' }}><span className="text-xs font-bold" style={{ color: '#3B4FA0' }}>RESTANTE:</span><span className="text-sm font-extrabold">${rest.toLocaleString()}</span></div>
            </div>
          </div>
          <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 text-center">
            <div className="text-[10px] text-gray-400 mb-1">Las compras son finales, no hay devoluciones de anticipo por cancelación.</div>
            <div className="font-display italic text-sm" style={{ color: '#E91E8C' }}>Gracias por tu preferencia ✨</div>
          </div>
          <div className="px-4 py-1 text-[10px] font-semibold text-white flex justify-between" style={{ background: navy }}><span>{n.folio}</span><span>{new Date().toLocaleDateString('es-MX')}</span></div>
        </div>
      </div>
    );
  }

  // ===== FORM =====
  if (view === 'form' && editNota) {
    const n = editNota;
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <button onClick={() => { setView('list'); setEditNota(null); }} className={btnSecCls}>← Volver</button>
          <div className="flex gap-2">
            <button onClick={() => setView('preview')} className={btnSecCls}>👁️ Preview</button>
            <button onClick={handleSave} disabled={saving} className={btnCls} style={{ background: 'linear-gradient(135deg, #FF69B4, #E91E8C)' }}>{saving ? '⏳ Guardando...' : '💾 Guardar'}</button>
          </div>
        </div>

        {/* Status */}
        <div className={cardCls}>
          <div className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">📌 Estado · <span style={{ color: '#E91E8C' }}>{n.folio}</span></div>
          <div className="flex flex-wrap gap-2">
            {(['pending', 'confirmed', 'preparing', 'delivered'] as const).map(s => (
              <button key={s} onClick={() => updateField('status', s)} className={`px-3 py-2 rounded-lg text-xs font-bold border-2 cursor-pointer font-body transition-all ${n.status === s ? 'border-nenas-600' : 'border-gray-100'}`} style={{ background: n.status === s ? '#FFF0F5' : 'white', color: n.status === s ? '#E91E8C' : '#999' }}>
                <StatusBadge status={s} />
              </button>
            ))}
          </div>
        </div>

        {/* Date & Channel */}
        <div className={cardCls}>
          <div className="text-sm font-bold text-gray-800 mb-3">📅 Fecha y Canal</div>
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {[['Día', 'dia'], ['Mes', 'mes'], ['Año', 'anio']].map(([l, f]) => (
              <div key={f}><label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{l}</label><input value={(n as any)[f]} onChange={e => updateField(f, e.target.value)} className={inputSmCls} /></div>
            ))}
          </div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Canal</label>
          <div className="flex gap-2">
            {canales.map(c => (
              <button key={c} onClick={() => updateField('canalVenta', c)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer font-body border-2 transition-all ${n.canalVenta === c ? 'border-nenas-600 bg-nenas-50 text-nenas-600' : 'border-gray-100 bg-white text-gray-400'}`}>{c}</button>
            ))}
          </div>
        </div>

        {/* Client */}
        <div className={cardCls}>
          <div className="text-sm font-bold text-gray-800 mb-3">👤 Cliente</div>
          <div className="mb-2.5"><label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nombre</label><input value={n.nombre} onChange={e => updateField('nombre', e.target.value)} placeholder="Nombre" className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-2.5">
            <div><label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Teléfono</label><input value={n.telefono} onChange={e => updateField('telefono', e.target.value)} placeholder="(868) 000-0000" className={inputCls} /></div>
            <div><label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Evento</label><input value={n.evento} onChange={e => updateField('evento', e.target.value)} placeholder="Opcional" className={inputCls} /></div>
          </div>
        </div>

        {/* Entregas */}
        <div className={cardCls}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-gray-800">🚚 Fechas de Entrega</span>
            {n.entregas.length < 3 && <button onClick={addEntrega} className="bg-nenas-50 border border-nenas-200 rounded-lg px-3 py-1 text-xs font-bold text-nenas-600 cursor-pointer font-body">+ Fecha</button>}
          </div>
          <p className="text-xs text-gray-400 mb-3">Hasta 3 fechas. Asigna artículos a cada una.</p>
          {n.entregas.map((ent: EntregaFecha, idx: number) => { const col = entregaColors[idx]; return (
            <div key={idx} className="rounded-xl p-3 mb-2" style={{ background: col.bg, border: `1.5px solid ${col.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded flex items-center justify-center text-white text-[11px] font-extrabold" style={{ background: col.dot }}>{idx + 1}</span>
                <span className="text-sm font-bold" style={{ color: col.text }}>Entrega {idx + 1}</span>
                {n.entregas.length > 1 && <button onClick={() => removeEntrega(idx)} className="ml-auto bg-transparent border-none cursor-pointer text-lg opacity-50" style={{ color: col.text }}>×</button>}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <div><label className="text-[10px] font-bold text-gray-400 block mb-0.5">Día</label><input value={ent.dia} onChange={e => updateEntrega(idx, 'dia', e.target.value)} placeholder="22" className={`${inputSmCls} bg-white`} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 block mb-0.5">Mes</label><input value={ent.mes} onChange={e => updateEntrega(idx, 'mes', e.target.value)} placeholder="06" className={`${inputSmCls} bg-white`} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 block mb-0.5">Año</label><input value={ent.anio} onChange={e => updateEntrega(idx, 'anio', e.target.value)} placeholder="2026" className={`${inputSmCls} bg-white`} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 block mb-0.5">Desc.</label><input value={ent.label} onChange={e => updateEntrega(idx, 'label', e.target.value)} placeholder="Ej: Invitaciones" className={`${inputSmCls} bg-white text-left`} /></div>
              </div>
            </div>
          ); })}
        </div>

        {/* Items */}
        <div className={cardCls}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-gray-800">📦 Artículos</span>
            <button onClick={addItem} className="bg-nenas-50 border border-nenas-200 rounded-lg px-3 py-1 text-xs font-bold text-nenas-600 cursor-pointer font-body">+ Agregar</button>
          </div>
          {n.entregas.length > 1 && <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">💡 Asigna cada artículo a su fecha de entrega</div>}
          {n.items.map((item: NotaItem, idx: number) => (
            <div key={idx} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 mb-2">
              <div className="grid gap-1.5 items-center" style={{ gridTemplateColumns: '50px 1fr 60px 60px 24px' }}>
                <input value={item.cantidad} onChange={e => updateItem(idx, 'cantidad', e.target.value)} placeholder="Cnt" type="number" className={inputSmCls} />
                <input value={item.articulo} onChange={e => updateItem(idx, 'articulo', e.target.value)} placeholder="Artículo" className={`${inputSmCls} text-left`} />
                <input value={item.precio} onChange={e => updateItem(idx, 'precio', e.target.value)} placeholder="$" type="number" className={inputSmCls} />
                <div className="p-2 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 text-center">{item.importe ? `$${parseFloat(item.importe).toLocaleString()}` : '—'}</div>
                <button onClick={() => removeItem(idx)} className="bg-transparent border-none cursor-pointer text-gray-300 text-base">×</button>
              </div>
              {n.entregas.length > 1 && (
                <div className="flex gap-1 mt-1.5 items-center flex-wrap">
                  <span className="text-[10px] text-gray-400 font-semibold">Entrega:</span>
                  {n.entregas.map((ent: EntregaFecha, ei: number) => { const col = entregaColors[ei]; const sel = item.entrega === ei + 1; return (
                    <button key={ei} onClick={() => updateItem(idx, 'entrega', ei + 1)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold cursor-pointer font-body" style={{ border: sel ? `2px solid ${col.dot}` : '1.5px solid #E0E0E0', background: sel ? col.bg : 'white', color: sel ? col.text : '#aaa' }}>
                      <span className="w-3 h-3 rounded-sm flex items-center justify-center text-white text-[8px] font-extrabold" style={{ background: sel ? col.dot : '#ddd' }}>{ei + 1}</span>
                      {ent.label || fmtEntLabel(ent, ei)}
                    </button>
                  ); })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Notes & Payment */}
        <div className={cardCls}>
          <div className="text-sm font-bold text-gray-800 mb-3">📝 Notas</div>
          <textarea value={n.notas} onChange={e => updateField('notas', e.target.value)} placeholder="Notas adicionales..." rows={2} className={`${inputCls} resize-y`} />
        </div>
        <div className={cardCls}>
          <div className="text-sm font-bold text-gray-800 mb-3">💰 Pago</div>
          <div className="grid grid-cols-3 gap-2.5">
            <div><label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Total</label><input value={n.total} onChange={e => updateField('total', e.target.value)} placeholder="$0" type="number" className={`${inputSmCls} font-extrabold text-base`} style={{ color: '#E91E8C' }} /></div>
            <div><label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Anticipo</label><input value={n.anticipo1} onChange={e => updateField('anticipo1', e.target.value)} placeholder="$0" type="number" className={inputSmCls} /></div>
            <div><label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Restante</label><div className="p-2 rounded-lg text-base font-extrabold text-center" style={{ background: '#EEF0FF', color: '#3B4FA0' }}>${calcRest(n).toLocaleString()}</div></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => setView('preview')} className={`${btnCls} w-full`} style={{ background: 'white', color: '#E91E8C', border: '2px solid #E91E8C', boxShadow: 'none' }}>👁️ Vista Previa</button>
          <button onClick={handleSave} disabled={saving} className={`${btnCls} w-full`} style={{ background: 'linear-gradient(135deg, #FF69B4, #E91E8C)' }}>{saving ? '⏳' : '💾'} Guardar</button>
        </div>
      </div>
    );
  }

  return null;
}
