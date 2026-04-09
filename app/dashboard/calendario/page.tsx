'use client';

import { useState, useEffect } from 'react';
import { getNotas } from '@/lib/firestore';
import { Nota, NotaItem } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface Entrega {
  fecha: Date;
  folio: string;
  cliente: string;
  items: NotaItem[];
  asignadaA?: string;
  asignadaNombre?: string;
  notaId?: string;
}

export default function CalendarioPage() {
  const { esAdmin } = useAuth();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'tere' | 'cinthia'>('todas');
  const [mesActual, setMesActual] = useState(new Date());

  useEffect(() => { loadNotas(); }, []);

  const loadNotas = async () => {
    try {
      const data = await getNotas();
      setNotas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getEntregas = (): Entrega[] => {
    const entregas: Entrega[] = [];
    
    notas.forEach(nota => {
      if (!nota.entregas || !Array.isArray(nota.entregas)) return;
      
      nota.entregas.forEach((entrega, idx) => {
        if (!entrega.dia || !entrega.mes || !entrega.anio) return;
        
        const itemsDeEstaEntrega = nota.items?.filter(item => item.entrega === idx + 1) || [];
        if (itemsDeEstaEntrega.length === 0) return;
        
        const fecha = new Date(
          parseInt(entrega.anio),
          parseInt(entrega.mes) - 1,
          parseInt(entrega.dia)
        );
        
        if (isNaN(fecha.getTime())) return;
        
        entregas.push({
          fecha,
          folio: nota.folio,
          cliente: nota.nombre,
          items: itemsDeEstaEntrega,
          asignadaA: nota.asignadaA,
          asignadaNombre: nota.asignadaNombre,
          notaId: nota.id,
        });
      });
    });
    
    return entregas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  };

  const entregasFiltradas = getEntregas().filter(e => {
    if (filtro === 'todas') return true;
    if (filtro === 'tere') return e.asignadaA === 'tere@nenasgiftshop.com';
    if (filtro === 'cinthia') return e.asignadaA === 'cinthia@nenasgiftshop.com';
    return true;
  });

  const entregasPorDia: Record<string, Entrega[]> = {};
  entregasFiltradas.forEach(e => {
    const key = e.fecha.toISOString().split('T')[0];
    if (!entregasPorDia[key]) entregasPorDia[key] = [];
    entregasPorDia[key].push(e);
  });

  const diasDelMes: Date[] = [];
  const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
  const ultimoDia = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
  
  for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    diasDelMes.push(new Date(d));
  }

  const mesAnterior = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1));
  };

  const mesSiguiente = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1));
  };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 animate-bounce">📅</div>
        <p className="text-sm text-gray-400 font-body">Cargando calendario...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header con filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={mesAnterior} className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600">
              ←
            </button>
            <h2 className="text-xl font-bold text-gray-800 font-body">
              {meses[mesActual.getMonth()]} {mesActual.getFullYear()}
            </h2>
            <button onClick={mesSiguiente} className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600">
              →
            </button>
          </div>
          
          {esAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => setFiltro('todas')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filtro === 'todas'
                    ? 'bg-gray-800 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📋 Todas
              </button>
              <button
                onClick={() => setFiltro('tere')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filtro === 'tere'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                }`}
              >
                👤 Tere
              </button>
              <button
                onClick={() => setFiltro('cinthia')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filtro === 'cinthia'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                👤 Cinthia
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-2 mb-3">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dia => (
            <div key={dia} className="text-center text-xs font-bold text-gray-400 py-2">
              {dia}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Espacios vacíos antes del primer día */}
          {Array.from({ length: primerDia.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Días del mes */}
          {diasDelMes.map(dia => {
            const key = dia.toISOString().split('T')[0];
            const entregasDelDia = entregasPorDia[key] || [];
            const esHoy = dia.getTime() === hoy.getTime();
            const esPasado = dia < hoy;

            return (
              <div
                key={key}
                className={`aspect-square rounded-xl border-2 p-2 transition-all ${
                  esHoy
                    ? 'border-nenas-600 bg-nenas-50'
                    : esPasado
                    ? 'border-gray-100 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`text-xs font-bold mb-1 ${
                  esHoy ? 'text-nenas-600' : esPasado ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  {dia.getDate()}
                </div>

                {entregasDelDia.length > 0 && (
                  <div className="space-y-1">
                    {entregasDelDia.slice(0, 3).map((entrega, idx) => {
                      const color = entrega.asignadaA === 'tere@nenasgiftshop.com' 
                        ? 'bg-purple-100 text-purple-700'
                        : entrega.asignadaA === 'cinthia@nenasgiftshop.com'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700';
                      
                      return (
                        <div
                          key={idx}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold truncate ${color}`}
                          title={`${entrega.folio} - ${entrega.cliente}`}
                        >
                          {entrega.folio}
                        </div>
                      );
                    })}
                    {entregasDelDia.length > 3 && (
                      <div className="text-[9px] text-gray-400 font-bold text-center">
                        +{entregasDelDia.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de entregas del mes */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 font-body">
          📋 Entregas de {meses[mesActual.getMonth()]}
        </h3>

        {entregasFiltradas.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">No hay entregas programadas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entregasFiltradas.map((entrega, idx) => {
              const color = entrega.asignadaA === 'tere@nenasgiftshop.com' 
                ? { bg: '#F3E8FF', border: '#9333EA', text: '#9333EA' }
                : entrega.asignadaA === 'cinthia@nenasgiftshop.com'
                ? { bg: '#D1FAE5', border: '#10B981', text: '#10B981' }
                : { bg: '#F3F4F6', border: '#9CA3AF', text: '#6B7280' };

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border-2"
                  style={{ background: color.bg, borderColor: color.border }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-sm" style={{ color: color.text }}>
                        {entrega.folio}
                      </span>
                      <span className="text-gray-600 text-sm ml-2">
                        {entrega.fecha.toLocaleDateString('es-MX', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                    </div>
                    {entrega.asignadaNombre && (
                      <span className="text-xs font-bold px-2 py-1 rounded" style={{ 
                        background: color.bg, 
                        color: color.text,
                        border: `1px solid ${color.border}`
                      }}>
                        👤 {entrega.asignadaNombre}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gray-800 mb-2">
                    {entrega.cliente}
                  </div>
                  <div className="text-xs text-gray-600">
                    {entrega.items.map((item, i) => (
                      <div key={i}>
                        • {item.cantidad}x {item.articulo}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
