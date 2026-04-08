'use client';

import { useState, useEffect } from 'react';
import { getProductos, createProducto, deleteProducto } from '@/lib/firestore';
import { Producto } from '@/types';
import { useWidth } from '@/hooks/useWidth';

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', categoria: '', precio: '', stock: '', descripcion: '' });
  const [saving, setSaving] = useState(false);
  const { isDesktop } = useWidth();

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { setProductos(await getProductos()); } catch (e) { console.error(e); } finally { setLoading(false); } };

  const handleSave = async () => {
    if (!form.nombre || !form.precio) return alert('Nombre y precio son requeridos');
    setSaving(true);
    try {
      await createProducto({
        nombre: form.nombre, categoria: form.categoria, precio: parseFloat(form.precio),
        stock: parseInt(form.stock) || 0, descripcion: form.descripcion, activo: true,
      });
      await loadData();
      setShowForm(false);
      setForm({ nombre: '', categoria: '', precio: '', stock: '', descripcion: '' });
    } catch (e) { console.error(e); alert('Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar producto?')) return;
    try { await deleteProducto(id); await loadData(); } catch (e) { console.error(e); }
  };

  const filtered = productos.filter(p => p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.categoria?.toLowerCase().includes(search.toLowerCase()));
  const inputCls = "w-full p-2.5 rounded-lg border-2 border-gray-100 text-sm outline-none bg-gray-50 font-body";

  return (
    <div>
      <div className="flex flex-wrap gap-2.5 mb-4">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2 flex-1 min-w-[180px]">
          <span className="text-gray-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..." className="border-none outline-none text-sm w-full bg-transparent font-body" />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-none text-white text-sm font-bold cursor-pointer font-body" style={{ background: 'linear-gradient(135deg, #FF69B4, #E91E8C)', boxShadow: '0 3px 12px rgba(233,30,140,0.25)' }}>
          ＋ Producto
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">📦 Nuevo Producto</h3>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr' }}>
            <div><label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Nombre</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del producto" className={inputCls} /></div>
            <div><label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Categoría</label><input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ej: Flores, Peluches" className={inputCls} /></div>
            <div><label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Precio</label><input value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="$0" type="number" className={inputCls} /></div>
            <div><label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Stock</label><input value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" type="number" className={inputCls} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-500 text-sm font-semibold cursor-pointer font-body">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg border-none text-white text-sm font-bold cursor-pointer font-body" style={{ background: 'linear-gradient(135deg, #FF69B4, #E91E8C)' }}>{saving ? '⏳' : '💾'} Guardar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3 animate-bounce">📦</div><p className="text-sm">Cargando catálogo...</p></div>
      ) : productos.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">📦</div><p className="text-sm">No hay productos. ¡Agrega el primero!</p></div>
      ) : (
        <div className={`grid gap-3 ${isDesktop ? 'grid-cols-3 lg:grid-cols-4' : 'grid-cols-2'}`}>
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm card-hover transition-all cursor-pointer">
              <div className="h-24 flex items-center justify-center text-4xl" style={{ background: 'linear-gradient(135deg, #FFF5F9, #FFE8F0)' }}>
                {p.categoria === 'Flores' ? '🌹' : p.categoria === 'Peluches' ? '🧸' : p.categoria === 'Chocolates' ? '🍫' : '🎁'}
              </div>
              <div className="p-3">
                <h4 className="text-sm font-bold text-gray-800 m-0 mb-0.5 truncate">{p.nombre}</h4>
                <p className="text-xs text-gray-400 m-0 mb-2">{p.categoria}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-extrabold" style={{ color: '#E91E8C' }}>${p.precio?.toLocaleString()}</span>
                  <span className={`text-xs font-semibold ${(p.stock || 0) <= 5 ? 'text-red-400' : 'text-gray-400'}`}>{p.stock} uds</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); p.id && handleDelete(p.id); }} className="mt-2 w-full py-1.5 rounded-lg border border-red-100 bg-white text-red-400 text-xs font-semibold cursor-pointer font-body">🗑️ Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
