'use client';

import { useState, useEffect } from 'react';
import { getClientes, createCliente, deleteCliente } from '@/lib/firestore';
import { Cliente } from '@/types';
import { useWidth } from '@/hooks/useWidth';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', direccion: '' });
  const [saving, setSaving] = useState(false);
  const { isDesktop } = useWidth();

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { setClientes(await getClientes()); } catch (e) { console.error(e); } finally { setLoading(false); } };

  const handleSave = async () => {
    if (!form.nombre) return alert('El nombre es requerido');
    setSaving(true);
    try {
      await createCliente({ nombre: form.nombre, telefono: form.telefono, email: form.email, direccion: form.direccion, totalPedidos: 0, totalGastado: 0 });
      await loadData();
      setShowForm(false);
      setForm({ nombre: '', telefono: '', email: '', direccion: '' });
    } catch (e) { console.error(e); alert('Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar cliente?')) return;
    try { await deleteCliente(id); await loadData(); } catch (e) { console.error(e); }
  };

  const filtered = clientes.filter(c => c.nombre?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));
  const inputCls = "w-full p-2.5 rounded-lg border-2 border-gray-100 text-sm outline-none bg-gray-50 font-body";

  return (
    <div>
      <div className="flex flex-wrap gap-2.5 mb-4">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2 flex-1 min-w-[180px]">
          <span className="text-gray-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." className="border-none outline-none text-sm w-full bg-transparent font-body" />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-none text-white text-sm font-bold cursor-pointer font-body" style={{ background: 'linear-gradient(135deg, #FF69B4, #E91E8C)', boxShadow: '0 3px 12px rgba(233,30,140,0.25)' }}>
          ＋ Cliente
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">👤 Nuevo Cliente</h3>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr' }}>
            <div><label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Nombre</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" className={inputCls} /></div>
            <div><label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Teléfono</label><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="(868) 000-0000" className={inputCls} /></div>
            <div><label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@ejemplo.com" className={inputCls} /></div>
            <div><label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Dirección</label><input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección (opcional)" className={inputCls} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-500 text-sm font-semibold cursor-pointer font-body">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg border-none text-white text-sm font-bold cursor-pointer font-body" style={{ background: 'linear-gradient(135deg, #FF69B4, #E91E8C)' }}>{saving ? '⏳' : '💾'} Guardar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3 animate-bounce">👥</div><p className="text-sm">Cargando clientes...</p></div>
      ) : clientes.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">👥</div><p className="text-sm">No hay clientes. ¡Agrega el primero!</p></div>
      ) : (
        <div className={`grid gap-3 ${isDesktop ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm card-hover transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-base"
                  style={{ background: `linear-gradient(135deg, hsl(${(c.id?.charCodeAt(0) || 0) * 3}, 70%, 78%), hsl(${(c.id?.charCodeAt(0) || 0) * 3}, 70%, 65%))` }}>
                  {c.nombre?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-800 m-0 truncate">{c.nombre}</h4>
                  <p className="text-xs text-gray-400 m-0">{c.email || c.telefono}</p>
                </div>
              </div>
              <div className="flex justify-between py-2.5 border-t border-gray-50">
                <div className="text-center"><div className="text-base font-bold">{c.totalPedidos || 0}</div><div className="text-[10px] text-gray-400">Pedidos</div></div>
                <div className="text-center"><div className="text-base font-bold" style={{ color: '#E91E8C' }}>${(c.totalGastado || 0).toLocaleString()}</div><div className="text-[10px] text-gray-400">Total</div></div>
              </div>
              <div className="flex gap-2 mt-2">
                {c.telefono && <a href={`tel:${c.telefono}`} className="flex-1 py-2 rounded-lg border border-gray-100 text-center text-xs font-semibold text-gray-500 no-underline">📞 Llamar</a>}
                {c.telefono && <a href={`https://wa.me/52${c.telefono.replace(/[^0-9]/g, '')}`} target="_blank" className="flex-1 py-2 rounded-lg border-none text-center text-xs font-semibold text-white no-underline" style={{ background: '#25D366' }}>💬 WhatsApp</a>}
              </div>
              <button onClick={() => c.id && handleDelete(c.id)} className="mt-2 w-full py-1.5 rounded-lg border border-red-100 bg-white text-red-400 text-xs font-semibold cursor-pointer font-body">🗑️ Eliminar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
