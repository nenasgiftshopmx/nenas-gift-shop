'use client';

import { useState, useEffect } from 'react';
import { getNotas, createNota, updateNota, deleteNota as deleteNotaFB, getClientes, getProductos, upsertCliente, upsertProducto } from '@/lib/firestore';
import { Nota, NotaItem, EntregaFecha, Cliente, Producto } from '@/types';
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
  // 🆕 ESTADOS PARA CLIENTES Y PRODUCTOS
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form' | 'preview'>('list');
  const [editNota, setEditNota] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const { isDesktop } = useWidth();

  useEffect(() => { loadData(); }, []);

  // 🆕 CARGAR TODOS LOS DATOS (notas, clientes, productos)
  const loadData = async () => {
    try {
      const [notasData, clientesData, productosData] = await Promise.all([
        getNotas(),
        getClientes(),
        getProductos(),
      ]);
      setNotas(notasData);
      setClientes(clientesData);
      setProductos(productosData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => { setEditNota(emptyNota()); setView('form'); };
  const handleEdit = (n: Nota) => { setEditNota({ ...n }); setView('form'); };

  // 🆕 GUARDAR CON SINCRONIZACIÓN AUTOMÁTICA
  const handleSave = async () => {
    if (!editNota) return;
    setSaving(true);
    try {
      // 1. Sincronizar cliente si hay datos
      if (editNota.nombre && editNota.nombre.trim()) {
        await upsertCliente({
          nombre: editNota.nombre.trim(),
          telefono: editNota.telefono?.trim() || '',
          email: '',
          direccion: '',
        });
      }

      // 2. Sincronizar productos de los items
      if (editNota.items && Array.isArray(editNota.items)) {
        for (const item of editNota.items) {
          if (item.articulo && item.articulo.trim()) {
            await upsertProducto({
              nombre: item.articulo.trim(),
              precio: parseFloat(item.precio) || 0,
              descripcion: '',
              categoria: 'General',
              stock: 0,
            });
          }
        }
      }

      // 3. Guardar la nota
      if (editNota.id) {
        const { id, ...data } = editNota;
        await updateNota(id, data);
      } else {
        await createNota(editNota);
      }

      // 4. Recargar todo
      await loadData();
      setView('list');
      setEditNota(null);
      setShowNuevoCliente(false);
    } catch (e) {
      console.error('Error saving:', e);
      alert('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta nota?')) return;
    try {
      await deleteNotaFB(id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const updateField = (f: string, v: any) => setEditNota((p: any) => ({ ...p, [f]: v }));

  // 🆕 SELECCIONAR CLIENTE EXISTENTE
  const selectCliente = (cliente: Cliente) => {
    setEditNota((p: any) => ({
      ...p,
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
    }));
    setShowNuevoCliente(false);
  };

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

  // 🆕 AUTOCOMPLETAR PRODUCTO
  const selectProducto = (idx: number, producto: Producto) => {
    updateItem(idx, 'articulo', producto.nombre);
    if (producto.precio) {
      updateItem(idx, 'precio', String(producto.precio));
    }
  };

  const addItem = () => setEditNota((p: any) => ({ ...p, items: [...p.items, { cantidad: '', articulo: '', precio: '', importe: '', entrega: 1 }] }));
  const removeItem = (idx: number) => {
    if (editNota.items.length <= 1) return;
    setEditNota((p: any) => {
      const items = p.items.filter((_: any, i: number) => i !== idx);
      const t = items.reduce((s: number, i: NotaItem) => s + (parseFloat(i.importe) || 0), 0);
      return { ...p, items, total: t > 0 ? String(t) : '' };
    });
  };

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

  // 🆕 IMPRESIÓN MEJORADA CON LOGO
  const printNota = () => {
    const el = document.getElementById('nota-print');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>${editNota.folio}</title>
          <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,700;1,600&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Nunito', sans-serif; padding: 10mm; }
            @page { size: letter; margin: 0; }
            @media print {
              body { padding: 5mm; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${el.innerHTML}
        </body>
      </html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
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

  // ===== PREVIEW ===== (con diseño mejorado que replica la nota física)
  if (view === 'preview' && editNota) {
    const n = editNota;
    const rest = calcRest(n);
    const filled = n.items.filter((i: NotaItem) => i.articulo);
    const byEnt: Record<number, NotaItem[]> = {};
    filled.forEach((it: NotaItem) => { const k = it.entrega || 1; if (!byEnt[k]) byEnt[k] = []; byEnt[k].push(it); });

    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4 no-print">
          <button onClick={() => setView('form')} className={btnSecCls}>← Editar</button>
          <div className="flex gap-2 flex-wrap">
            <button onClick={printNota} className={btnSecCls}>🖨️ Imprimir</button>
            <button onClick={() => shareWA(n)} className={`${btnCls} text-sm`} style={{ background: '#25D366' }}>💬 WhatsApp</button>
            <button onClick={handleSave} disabled={saving} className={`${btnCls} text-sm`} style={{ background: '#22C55E' }}>{saving ? '⏳' : '💾'} Guardar</button>
          </div>
        </div>

        {/* NOTA IMPRIMIBLE - Diseño mejorado */}
        <div id="nota-print" className="bg-white border-2 rounded-lg overflow-hidden mx-auto" style={{ borderColor: '#1a2744', maxWidth: '210mm', fontFamily: 'Nunito, sans-serif' }}>
          {/* Header superior con logo y fecha */}
          <div className="flex items-stretch" style={{ borderBottom: '2px solid #1a2744' }}>
            <div className="px-4 py-2 font-extrabold text-sm text-white flex items-center" style={{ background: '#1a2744' }}>NOTA DE VENTA</div>
            <div className="flex items-center ml-auto">
              {[['DÍA', n.dia], ['MES', n.mes], ['AÑO', n.anio]].map(([l, v]: string[]) => (
                <div key={l} className="px-3 py-1.5 text-center" style={{ borderLeft: '1.5px solid #1a2744' }}>
                  <div className="text-[9px] font-bold" style={{ color: '#1a2744' }}>{l}</div>
                  <div className="text-base font-extrabold" style={{ color: '#1a2744' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sección de info con logo */}
          <div className="p-4 flex gap-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <div className="text-center" style={{ width: '100px', flexShrink: 0 }}>
              {/* Logo circular de Nenas */}
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#1a2744', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: '8px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', lineHeight: '1' }}>🎀</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'white', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', marginTop: '2px' }}>N</div>
                </div>
              </div>
              <div className="text-[10px] font-extrabold tracking-wider" style={{ color: '#1a2744' }}>GIFT SHOP</div>
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-600 mb-1">📍 Calle: Av. Del Trabajo #41 Plaza Valle</div>
              <div className="text-xs text-gray-600 mb-2">Dorado H. Matamoros, Tamps.</div>
              <div className="text-xs text-gray-600 mb-3">📞 (868) 162-7939</div>
              <div className="border-2 rounded p-2 mb-2" style={{ borderColor: '#1a2744' }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold" style={{ color: '#1a2744' }}>NOMBRE:</span>
                  <span className="text-sm font-bold">{n.nombre}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold" style={{ color: '#1a2744' }}>TELÉFONO:</span>
                  <span className="text-sm">{n.telefono}</span>
                </div>
              </div>
              {n.evento && (
                <div className="text-xs text-gray-500 italic">📝 Evento: {n.evento}</div>
              )}
            </div>
          </div>

          {/* Checkboxes de canal */}
          <div className="px-4 py-2 flex gap-4 items-center" style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['FB', 'IG', 'WA', 'Local'].map(c => (
              <label key={c} className="flex items-center gap-1.5 text-xs font-semibold">
                <div style={{ width: '14px', height: '14px', border: '2px solid #1a2744', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: n.canalVenta === c ? '#1a2744' : 'white' }}>
                  {n.canalVenta === c && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
                </div>
                {c}
              </label>
            ))}
          </div>

          {/* Tabla de artículos */}
          <table className="w-full border-collapse" style={{ fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#1a2744', color: 'white' }}>
                <th className="px-3 py-2 text-left font-bold" style={{ width: '60px' }}>CANT.</th>
                <th className="px-3 py-2 text-left font-bold">ARTÍCULO</th>
                <th className="px-3 py-2 text-center font-bold" style={{ width: '80px' }}>PRECIO</th>
                <th className="px-3 py-2 text-center font-bold" style={{ width: '90px' }}>IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {filled.map((it: NotaItem, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td className="px-3 py-1.5 text-center font-semibold">{it.cantidad}</td>
                  <td className="px-3 py-1.5">{it.articulo}</td>
                  <td className="px-3 py-1.5 text-center">{it.precio && `$${parseFloat(it.precio).toLocaleString()}`}</td>
                  <td className="px-3 py-1.5 text-center font-bold">{it.importe && `$${parseFloat(it.importe).toLocaleString()}`}</td>
                </tr>
              ))}
              {/* Filas vacías para matching */}
              {[...Array(Math.max(0, 10 - filled.length))].map((_, i) => (
                <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td className="px-3 py-1.5">&nbsp;</td>
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Entregas y Total */}
          <div className="p-4" style={{ borderTop: '2px solid #1a2744' }}>
            {/* Fechas de entrega */}
            {n.entregas && n.entregas.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-bold mb-2" style={{ color: '#1a2744' }}>Fecha de entrega:</div>
                <div className="flex flex-wrap gap-2">
                  {n.entregas.map((ent: EntregaFecha, ei: number) => {
                    const col = entregaColors[ei];
                    return (
                      <div key={ei} className="px-3 py-1.5 rounded-md text-sm font-bold" style={{ background: col.bg, color: col.text, border: `1.5px solid ${col.border}` }}>
                        {ent.dia && ent.mes ? `${ent.dia} ${meses[parseInt(ent.mes)-1]}` : 'Por definir'}
                        {ent.label && ` - ${ent.label}`}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Total y anticipos */}
            <div className="flex justify-end mb-3">
              <div className="px-5 py-2 rounded-lg font-extrabold text-white text-lg" style={{ background: '#E91E8C' }}>
                TOTAL: ${parseFloat(n.total || '0').toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="px-3 py-2 rounded text-center" style={{ background: '#1a2744', color: 'white' }}>
                <div className="text-xs font-bold mb-1">ANTICIPO:</div>
                <div className="font-extrabold">{n.anticipo1 ? `$${parseFloat(n.anticipo1).toLocaleString()}` : '$0'}</div>
              </div>
              <div className="px-3 py-2 rounded text-center" style={{ background: '#1a2744', color: 'white' }}>
                <div className="text-xs font-bold mb-1">ANTICIPO:</div>
                <div className="font-extrabold">-</div>
              </div>
              <div className="px-3 py-2 rounded text-center" style={{ background: '#1a2744', color: 'white' }}>
                <div className="text-xs font-bold mb-1">RESTANTE:</div>
                <div className="font-extrabold">${rest.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 text-center" style={{ background: '#fef3f8', borderTop: '1px solid #ffc0e0' }}>
            <div className="text-[10px] text-gray-600 mb-1">
              Las compras son finales, no hay devoluciones de anticipo por cancelación.
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
              <span>📷 @nenasgiftshop</span>
              <span>📘 NENAS Gift Shop</span>
            </div>
            <div className="text-sm font-display italic mt-1" style={{ color: '#E91E8C' }}>Gracias por tu preferencia ✨</div>
          </div>
        </div>
      </div>
    );
  }

  // ===== FORM ===== (con selección de clientes y productos)
  if (view === 'form' && editNota) {
    const n = editNota;
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <button onClick={() => { setView('list'); setEditNota(null); setShowNuevoCliente(false); }} className={btnSecCls}>← Volver</button>
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

        {/* 🆕 CLIENTE CON DROPDOWN */}
        <div className={cardCls}>
          <div className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
            <span>👤 Cliente</span>
            {!showNuevoCliente && clientes.length > 0 && (
              <button onClick={() => setShowNuevoCliente(!showNuevoCliente)} className="text-xs font-semibold text-nenas-600 bg-nenas-50 px-3 py-1 rounded-lg border border-nenas-200">
                {showNuevoCliente ? 'Seleccionar existente' : '+ Nuevo cliente'}
              </button>
            )}
          </div>

          {/* Dropdown de clientes existentes */}
          {!showNuevoCliente && clientes.length > 0 && (
            <div className="mb-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Seleccionar Cliente</label>
              <div className="relative">
                <select 
                  onChange={(e) => {
                    if (e.target.value === 'nuevo') {
                      setShowNuevoCliente(true);
                    } else {
                      const cliente = clientes.find(c => c.id === e.target.value);
                      if (cliente) selectCliente(cliente);
                    }
                  }}
                  className={inputCls}
                  value=""
                >
                  <option value="">-- Buscar cliente existente --</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} {cliente.telefono && `- ${cliente.telefono}`}
                    </option>
                  ))}
                  <option value="nuevo">+ Agregar nuevo cliente</option>
                </select>
              </div>
            </div>
          )}

          {/* Campos de cliente */}
          <div className="mb-2.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nombre</label>
            <input value={n.nombre} onChange={e => updateField('nombre', e.target.value)} placeholder="Nombre del cliente" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Teléfono</label>
              <input value={n.telefono} onChange={e => updateField('telefono', e.target.value)} placeholder="(868) 000-0000" className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Evento</label>
              <input value={n.evento} onChange={e => updateField('evento', e.target.value)} placeholder="Opcional" className={inputCls} />
            </div>
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
                <div><label className="text-[10px] font-bold text-gray-400 block mb-0.5">Mes</label><input value={ent.mes} onChange={e => updateEntrega(idx, 'mes', e.target.value)} placeholder="04" className={`${inputSmCls} bg-white`} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 block mb-0.5">Año</label><input value={ent.anio} onChange={e => updateEntrega(idx, 'anio', e.target.value)} placeholder="2026" className={`${inputSmCls} bg-white`} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 block mb-0.5">Desc.</label><input value={ent.label} onChange={e => updateEntrega(idx, 'label', e.target.value)} placeholder="Ej: Invitaciones" className={`${inputSmCls} bg-white text-left`} /></div>
              </div>
            </div>
          ); })}
        </div>

        {/* 🆕 ITEMS CON AUTOCOMPLETADO */}
        <div className={cardCls}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-gray-800">📦 Artículos</span>
            <button onClick={addItem} className="bg-nenas-50 border border-nenas-200 rounded-lg px-3 py-1 text-xs font-bold text-nenas-600 cursor-pointer font-body">+ Agregar</button>
          </div>
          {n.entregas.length > 1 && <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">💡 Asigna cada artículo a su fecha de entrega</div>}
          {n.items.map((item: NotaItem, idx: number) => (
            <div key={idx} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 mb-2">
              <div className="grid gap-1.5 items-center mb-2" style={{ gridTemplateColumns: '50px 1fr 60px 60px 24px' }}>
                <input value={item.cantidad} onChange={e => updateItem(idx, 'cantidad', e.target.value)} placeholder="Cnt" type="number" className={inputSmCls} />
                
                {/* 🆕 CAMPO CON DATALIST PARA AUTOCOMPLETADO */}
                <div className="relative">
                  <input 
                    value={item.articulo} 
                    onChange={e => updateItem(idx, 'articulo', e.target.value)} 
                    placeholder="Artículo (empieza a escribir)" 
                    className={`${inputSmCls} text-left`}
                    list={`productos-${idx}`}
                  />
                  <datalist id={`productos-${idx}`}>
                    {productos.map(prod => (
                      <option key={prod.id} value={prod.nombre}>{prod.nombre} - ${prod.precio}</option>
                    ))}
                  </datalist>
                </div>

                <input value={item.precio} onChange={e => updateItem(idx, 'precio', e.target.value)} placeholder="$" type="number" className={inputSmCls} />
                <div className="p-2 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 text-center">{item.importe ? `$${parseFloat(item.importe).toLocaleString()}` : '—'}</div>
                <button onClick={() => removeItem(idx)} className="bg-transparent border-none cursor-pointer text-gray-300 text-base">×</button>
              </div>

              {/* Botones rápidos de productos frecuentes */}
              {productos.length > 0 && item.articulo === '' && (
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-[10px] text-gray-400 font-semibold w-full mb-1">Productos frecuentes:</span>
                  {productos.slice(0, 5).map(prod => (
                    <button 
                      key={prod.id}
                      onClick={() => selectProducto(idx, prod)}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-white border border-gray-200 hover:border-nenas-400 hover:bg-nenas-50 transition-all"
                    >
                      {prod.nombre}
                    </button>
                  ))}
                </div>
              )}

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
