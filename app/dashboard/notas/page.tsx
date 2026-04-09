'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  getNotas, 
  createNota, 
  updateNota, 
  deleteNota,
  getClientes, 
  getProductos, 
  findClienteByNameOrPhone, 
  findProductoByName, 
  createCliente, 
  createProducto, 
  uploadProductoFoto, 
  deleteFoto
} from '@/lib/firestore';
import { Nota, NotaItem, EntregaFecha, Cliente, Producto } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useWidth } from '@/hooks/useWidth';
import HistorialAuditoria from '@/components/HistorialAuditoria';

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
    folio: genFolio(), 
    dia: String(t.getDate()), 
    mes: String(t.getMonth() + 1).padStart(2, '0'), 
    anio: String(t.getFullYear()),
    nombre: '', telefono: '', evento: '', canalVenta: 'WA',
    items: [
      { cantidad: '', articulo: '', precio: '', importe: '', entrega: 1, detalles: '', fotos: [] },
      { cantidad: '', articulo: '', precio: '', importe: '', entrega: 1, detalles: '', fotos: [] },
      { cantidad: '', articulo: '', precio: '', importe: '', entrega: 1, detalles: '', fotos: [] },
    ],
    notas: '', 
    entregas: [{ dia: '', mes: '', anio: String(t.getFullYear()), label: '' }],
    total: '', anticipo1: '', status: 'pending',
    asignadaA: '',
    asignadaNombre: '',
  };
};

export default function NotasPage() {
  const auth = useAuth();
  const usuarioActual = auth?.usuarioActual || null;
  const puedeCrearNotas = auth?.puedeCrearNotas ?? true;
  const puedeEditarNotas = auth?.puedeEditarNotas ?? true;
  const puedeEliminarNotas = auth?.puedeEliminarNotas ?? true;
  const puedeAsignarNotas = auth?.puedeAsignarNotas ?? true;
  const puedeVerAuditoriaCompleta = auth?.puedeVerAuditoriaCompleta ?? false;
  
  const [notas, setNotas] = useState<Nota[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form' | 'preview'>('list');
  const [editNota, setEditNota] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [uploadingFoto, setUploadingFoto] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const cameraInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialNotaId, setHistorialNotaId] = useState<string | null>(null);
  
  const { isDesktop } = useWidth();

  useEffect(() => { loadData(); }, []);

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

  const handleNew = () => { 
    if (!puedeCrearNotas) { alert('No tienes permisos para crear notas'); return; }
    setEditNota(emptyNota()); 
    setView('form'); 
  };
  
  const handleEdit = (n: Nota) => { 
    if (!puedeEditarNotas) { alert('No tienes permisos para editar notas'); return; }
    setEditNota({ ...n }); 
    setView('form'); 
  };

  const handleSave = async () => {
    if (!editNota) return;
    setSaving(true);
    
    try {
      const usuario = usuarioActual ? {
        email: usuarioActual.email,
        nombre: usuarioActual.nombre,
      } : { email: 'system', nombre: 'Sistema' };
      
      let notaId = editNota.id;
      if (notaId) {
        await updateNota(notaId, editNota, usuario);
      } else {
        notaId = await createNota(editNota, usuario);
        setEditNota((p: any) => ({ ...p, id: notaId }));
      }
      
      if (editNota.nombre && editNota.nombre.trim()) {
        const existente = await findClienteByNameOrPhone(editNota.nombre, editNota.telefono || '');
        if (!existente && window.confirm(`¿Agregar "${editNota.nombre}" a clientes?`)) {
          await createCliente({
            nombre: editNota.nombre.trim(),
            telefono: editNota.telefono?.trim() || '',
            email: '', direccion: '',
            totalPedidos: 1,
            totalGastado: parseFloat(editNota.total || '0'),
          });
        }
      }
      
      const productosNuevos: string[] = [];
      const productosData: any[] = [];
      if (editNota.items) {
        for (const item of editNota.items) {
          if (item.articulo?.trim()) {
            const existe = await findProductoByName(item.articulo);
            if (!existe) {
              productosNuevos.push(item.articulo);
              productosData.push(item);
            }
          }
        }
      }
      
      if (productosNuevos.length > 0 && window.confirm(`¿Agregar productos?\n\n${productosNuevos.join('\n')}`)) {
        for (const item of productosData) {
          await createProducto({
            nombre: item.articulo.trim(),
            precio: parseFloat(item.precio) || 0,
            categoria: 'General',
            descripcion: item.detalles || '',
            stock: 0, activo: true,
          });
        }
      }
      
      await loadData();
      setView('list');
      setEditNota(null);
    } catch (e) {
      console.error(e);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!puedeEliminarNotas) { alert('No tienes permisos'); return; }
    if (!usuarioActual) return;
    const motivo = prompt('¿Motivo?');
    if (motivo === null) return;
    try {
      await deleteNota(id, { email: usuarioActual.email, nombre: usuarioActual.nombre }, motivo || undefined);
      await loadData();
    } catch (e) { console.error(e); }
  };

  const verHistorial = (notaId: string) => {
    setHistorialNotaId(notaId);
    setShowHistorial(true);
  };

  const updateField = (f: string, v: any) => setEditNota((p: any) => ({ ...p, [f]: v }));
  const selectCliente = (c: Cliente) => setEditNota((p: any) => ({ ...p, nombre: c.nombre, telefono: c.telefono || '' }));
  
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

  const selectProducto = (idx: number, p: Producto) => {
    updateItem(idx, 'articulo', p.nombre);
    if (p.precio) updateItem(idx, 'precio', String(p.precio));
  };

  const handleFileSelect = async (idx: number, files: FileList | null) => {
    if (!files || !editNota.id) { if (!editNota.id) alert('Guarda la nota primero'); return; }
    setUploadingFoto(`item-${idx}`);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        urls.push(await uploadProductoFoto(files[i], editNota.id, idx));
      }
      setEditNota((p: any) => {
        const items = [...p.items];
        items[idx] = { ...items[idx], fotos: [...(items[idx].fotos || []), ...urls] };
        return { ...p, items };
      });
    } catch (e) { alert('Error al subir foto'); }
    finally { setUploadingFoto(null); }
  };

  const handleDeleteFoto = async (idx: number, url: string) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await deleteFoto(url);
      setEditNota((p: any) => {
        const items = [...p.items];
        items[idx] = { ...items[idx], fotos: (items[idx].fotos || []).filter((f: string) => f !== url) };
        return { ...p, items };
      });
    } catch (e) { console.error(e); }
  };

  const downloadFoto = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url; a.download = name; a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const addItem = () => setEditNota((p: any) => ({ ...p, items: [...p.items, { cantidad: '', articulo: '', precio: '', importe: '', entrega: 1, detalles: '', fotos: [] }] }));
  const removeItem = (i: number) => setEditNota((p: any) => ({ ...p, items: p.items.filter((_: any, idx: number) => idx !== i) }));
  
  const updateEntrega = (i: number, f: string, v: string) => setEditNota((p: any) => { 
    const e = [...p.entregas]; e[i] = { ...e[i], [f]: v }; return { ...p, entregas: e }; 
  });
  const addEntrega = () => setEditNota((p: any) => ({ ...p, entregas: [...p.entregas, { dia: '', mes: '', anio: '2026', label: '' }] }));
  const removeEntrega = (i: number) => setEditNota((p: any) => ({ ...p, entregas: p.entregas.filter((_: any, idx: number) => idx !== i) }));

  const calcRest = (n: any) => Math.max(0, (parseFloat(n?.total) || 0) - (parseFloat(n?.anticipo1) || 0));

  const inputCls = "w-full p-2.5 rounded-lg border-2 border-gray-100 text-sm outline-none bg-gray-50 font-body focus:border-nenas-600";
  const inputSmCls = "w-full p-2 rounded-lg border border-gray-100 text-sm outline-none bg-gray-50 text-center font-body focus:border-nenas-600";
  const cardCls = "bg-white rounded-2xl border border-gray-100 p-4 mb-3.5 shadow-sm";
  const btnCls = "inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-none text-white text-sm font-bold cursor-pointer font-body";
  const btnSecCls = "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-500 text-sm font-semibold cursor-pointer font-body";

  // LISTA
  if (view === 'list') {
    const filtered = notas.filter(n => n.nombre?.toLowerCase().includes(search.toLowerCase()) || n.folio?.toLowerCase().includes(search.toLowerCase()));
    
    return (
      <div className="p-4">
        {showHistorial && historialNotaId && (
          <HistorialAuditoria notaId={historialNotaId} onClose={() => setShowHistorial(false)} />
        )}
        
        <div className="flex flex-wrap gap-2.5 mb-4">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2 flex-1 min-w-[180px]">
            <span className="text-gray-400">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="border-none outline-none text-sm w-full bg-transparent font-body" />
          </div>
          {puedeCrearNotas && (
            <button onClick={handleNew} className={btnCls} style={{ background: 'linear-gradient(135deg, #FF69B4, #E91E8C)' }}>
              ＋ Nueva Nota
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16"><div className="text-4xl mb-3 animate-bounce">📋</div><p className="text-sm text-gray-400 font-body">Cargando...</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => (
              <div key={n.id} className={`${cardCls} cursor-pointer hover:shadow-md transition-shadow`} onClick={() => puedeEditarNotas && handleEdit(n)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-extrabold font-body" style={{ color: '#E91E8C' }}>{n.folio}</span>
                      <StatusBadge status={n.status} />
                      {n.asignadaNombre && (
                        <span className="text-xs font-bold px-2 py-1 rounded font-body" style={{ 
                          background: n.asignadaA === 'tere@nenasgiftshop.com' ? '#F3E8FF' : '#D1FAE5',
                          color: n.asignadaA === 'tere@nenasgiftshop.com' ? '#9333EA' : '#10B981'
                        }}>
                          👤 {n.asignadaNombre}
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold font-body text-gray-800">{n.nombre}</div>
                    <div className="text-xs text-gray-400 font-body">${parseFloat(n.total || '0').toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  {puedeVerAuditoriaCompleta && n.id && (
                    <button onClick={() => verHistorial(n.id!)} className={btnSecCls}>📜 Historial</button>
                  )}
                  {puedeEliminarNotas && n.id && (
                    <button onClick={() => handleDelete(n.id!)} className={`${btnSecCls} text-red-400`}>🗑️</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // FORM
  if (view === 'form' && editNota) {
    const n = editNota;
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex justify-between mb-4">
          <button onClick={() => { setView('list'); setEditNota(null); }} className={btnSecCls}>← Volver</button>
          <button onClick={handleSave} disabled={saving} className={btnCls} style={{ background: '#E91E8C' }}>
            {saving ? '⏳ Guardando...' : '💾 Guardar'}
          </button>
        </div>

        {puedeAsignarNotas && (
          <div className={cardCls}>
            <div className="text-sm font-bold mb-3 font-body text-gray-700">👤 Asignada a:</div>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: '', label: 'Sin asignar' },
                { value: 'tere@nenasgiftshop.com', label: 'Tere' },
                { value: 'cinthia@nenasgiftshop.com', label: 'Cinthia' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { updateField('asignadaA', opt.value); updateField('asignadaNombre', opt.label); }}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm font-body transition-all ${
                    n.asignadaA === opt.value 
                      ? 'bg-nenas-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={cardCls}>
          <div className="text-sm font-bold mb-3 font-body text-gray-700">👤 Cliente</div>
          {clientes.length > 0 && (
            <select 
              onChange={e => { const c = clientes.find(cl => cl.id === e.target.value); if (c) selectCliente(c); }} 
              className={inputCls + " mb-2"}
            >
              <option value="">-- Seleccionar cliente existente --</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.telefono && `(${c.telefono})`}</option>)}
            </select>
          )}
          <input value={n.nombre} onChange={e => updateField('nombre', e.target.value)} placeholder="Nombre del cliente" className={inputCls + " mb-2"} />
          <input value={n.telefono} onChange={e => updateField('telefono', e.target.value)} placeholder="Teléfono" className={inputCls} />
        </div>

        {/* Fechas de Entrega PRIMERO */}
        <div className={cardCls}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold font-body text-gray-700">🚚 Fechas de Entrega</span>
            {n.entregas.length < 3 && (
              <button onClick={addEntrega} className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg font-semibold font-body hover:bg-purple-100">+ Agregar</button>
            )}
          </div>
          {n.entregas.map((ent: EntregaFecha, ei: number) => {
            const cfg = entregaColors[ei] || entregaColors[0];
            return (
              <div key={ei} className="p-3 rounded-xl mb-2 border-2" style={{ background: cfg.bg, borderColor: cfg.border }}>
                <div className="flex gap-2 items-center mb-2">
                  <span className="text-xs font-bold font-body" style={{ color: cfg.text }}>Entrega {ei + 1}:</span>
                  {n.entregas.length > 1 && (
                    <button onClick={() => removeEntrega(ei)} className="ml-auto text-gray-400 hover:text-red-500 text-lg">×</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input value={ent.dia} onChange={e => updateEntrega(ei, 'dia', e.target.value)} placeholder="Día" className={inputSmCls} />
                  <select value={ent.mes} onChange={e => updateEntrega(ei, 'mes', e.target.value)} className={inputSmCls}>
                    <option value="">Mes</option>
                    {meses.map((m, mi) => <option key={mi} value={String(mi + 1).padStart(2, '0')}>{m}</option>)}
                  </select>
                  <input value={ent.anio} onChange={e => updateEntrega(ei, 'anio', e.target.value)} placeholder="Año" className={inputSmCls} />
                </div>
                <input 
                  value={ent.label || ''} 
                  onChange={e => updateEntrega(ei, 'label', e.target.value)} 
                  placeholder="Etiqueta (ej: Mañana, Tarde...)" 
                  className={inputCls} 
                />
              </div>
            );
          })}
        </div>

        {/* Productos CON selector de entrega */}
        <div className={cardCls}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold font-body text-gray-700">📦 Artículos</span>
            <button onClick={addItem} className="text-xs bg-nenas-50 text-nenas-600 px-3 py-1.5 rounded-lg font-semibold font-body hover:bg-nenas-100">+ Agregar</button>
          </div>
          {n.items.map((item: NotaItem, i: number) => {
            const entIdx = (item.entrega || 1) - 1;
            const cfg = entregaColors[entIdx] || entregaColors[0];
            return (
              <div key={i} className="p-3 rounded-xl mb-3 border-2" style={{ background: cfg.bg, borderColor: cfg.border }}>
                <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '50px 1fr 70px 80px 70px 30px' }}>
                  <input value={item.cantidad} onChange={e => updateItem(i, 'cantidad', e.target.value)} placeholder="Cnt" className={inputSmCls} />
                  <input 
                    value={item.articulo} 
                    onChange={e => updateItem(i, 'articulo', e.target.value)} 
                    placeholder="Producto" 
                    list={`productos-${i}`} 
                    className={inputSmCls + " text-left pl-3"} 
                  />
                  <datalist id={`productos-${i}`}>
                    {productos.map(p => <option key={p.id} value={p.nombre} />)}
                  </datalist>
                  <input value={item.precio} onChange={e => updateItem(i, 'precio', e.target.value)} placeholder="$" className={inputSmCls} />
                  <div className="p-2 bg-white rounded text-xs font-bold text-center font-body" style={{ color: cfg.text }}>
                    {item.importe ? `$${parseFloat(item.importe).toLocaleString()}` : '—'}
                  </div>
                  <select value={item.entrega || 1} onChange={e => updateItem(i, 'entrega', parseInt(e.target.value))} className="p-1 rounded text-xs border font-bold text-center" style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.text }}>
                    {n.entregas.map((_: any, ei: number) => (
                      <option key={ei} value={ei + 1}>E{ei + 1}</option>
                    ))}
                  </select>
                  {n.items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 text-xl leading-none">×</button>
                  )}
                </div>
                
                <textarea 
                  value={item.detalles || ''} 
                  onChange={e => updateItem(i, 'detalles', e.target.value)} 
                  placeholder="📝 Especificaciones (color, tamaño, personalización...)" 
                  rows={2} 
                  className="w-full p-2 rounded-lg text-xs border-2 mb-2 font-body outline-none focus:border-nenas-400" 
                  style={{ borderColor: cfg.border }}
                />
                
                {n.id && (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <button 
                        onClick={() => fileInputRefs.current[`file-${i}`]?.click()} 
                        disabled={uploadingFoto === `item-${i}`} 
                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-semibold font-body hover:bg-blue-100 disabled:opacity-50"
                      >
                        {uploadingFoto === `item-${i}` ? '⏳' : '📁 Fotos'}
                      </button>
                      <button 
                        onClick={() => cameraInputRefs.current[`cam-${i}`]?.click()} 
                        disabled={uploadingFoto === `item-${i}`} 
                        className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg font-semibold font-body hover:bg-green-100 disabled:opacity-50"
                      >
                        📷
                      </button>
                    </div>
                    <input 
                      ref={el => fileInputRefs.current[`file-${i}`] = el} 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={e => handleFileSelect(i, e.target.files)} 
                    />
                    <input 
                      ref={el => cameraInputRefs.current[`cam-${i}`] = el} 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      className="hidden" 
                      onChange={e => handleFileSelect(i, e.target.files)} 
                    />
                    
                    {item.fotos && item.fotos.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {item.fotos.map((foto: string, fi: number) => (
                          <div key={fi} className="relative group">
                            <img src={foto} className="w-16 h-16 object-cover rounded-lg border-2" style={{ borderColor: cfg.border }} alt="" />
                            <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                              <button onClick={() => downloadFoto(foto, `foto-${fi + 1}.jpg`)} className="text-white text-lg">⬇️</button>
                              <button onClick={() => handleDeleteFoto(i, foto)} className="text-red-400 text-lg">🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!n.id && (
                  <div className="text-xs text-gray-500 font-body mt-2">💡 Guarda la nota para subir fotos</div>
                )}
              </div>
            );
          })}
          
          <div className="bg-gradient-to-r from-nenas-50 to-pink-50 p-3 rounded-xl mt-3 border border-nenas-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold font-body text-gray-700">💰 Total:</span>
              <span className="text-2xl font-extrabold font-body text-nenas-600">
                ${parseFloat(n.total || '0').toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <div className="text-sm font-bold mb-3 font-body text-gray-700">💳 Información de Pago</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-body mb-1 block">Total</label>
              <input value={n.total} onChange={e => updateField('total', e.target.value)} placeholder="0.00" className={inputSmCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-body mb-1 block">Anticipo</label>
              <input value={n.anticipo1} onChange={e => updateField('anticipo1', e.target.value)} placeholder="0.00" className={inputSmCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-body mb-1 block">Restante</label>
              <div className="p-2 rounded-lg bg-blue-50 text-center font-bold text-sm font-body text-blue-600">
                ${calcRest(n).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <div className="text-sm font-bold mb-3 font-body text-gray-700">📝 Notas Adicionales</div>
          <textarea 
            value={n.notas || ''} 
            onChange={e => updateField('notas', e.target.value)} 
            placeholder="Instrucciones especiales, detalles del pedido..." 
            rows={3} 
            className="w-full p-3 rounded-lg border-2 border-gray-100 text-sm font-body outline-none focus:border-nenas-400" 
          />
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className={btnCls} style={{ background: 'linear-gradient(135deg, #E91E8C, #FF69B4)', fontSize: '16px', padding: '12px 32px' }}>
            {saving ? '⏳ Guardando...' : '💾 Guardar Nota'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
