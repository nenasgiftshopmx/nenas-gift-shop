'use client';

import { useState, useEffect } from 'react';
import { getAuditoriaDeNota } from '@/lib/firestore';
import { AuditLog } from '@/types';

interface Props {
  notaId: string;
  onClose: () => void;
}

const ICONOS_ACCION = {
  crear: '📝',
  editar: '✏️',
  eliminar: '🗑️',
  asignar: '👤',
  cambiar_estado: '🔄',
};

const LABELS_ACCION = {
  crear: 'Creada',
  editar: 'Editada',
  eliminar: 'Eliminada',
  asignar: 'Asignada',
  cambiar_estado: 'Estado cambiado',
};

export default function HistorialAuditoria({ notaId, onClose }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistorial();
  }, [notaId]);

  const loadHistorial = async () => {
    try {
      const data = await getAuditoriaDeNota(notaId);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: any) => {
    if (!fecha) return '';
    const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">📜 Historial de la Nota</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2 animate-bounce">⏳</div>
              <p className="text-sm">Cargando historial...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm">No hay historial registrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{ICONOS_ACCION[log.accion]}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800">
                          {LABELS_ACCION[log.accion]}
                        </span>
                        <span className="text-xs text-gray-400">por</span>
                        <span
                          className="text-sm font-semibold px-2 py-0.5 rounded"
                          style={{
                            background:
                              log.usuario === 'tere@nenasgiftshop.com'
                                ? '#F3E8FF'
                                : log.usuario === 'cinthia@nenasgiftshop.com'
                                ? '#D1FAE5'
                                : log.usuario === 'veronica@nenasgiftshop.com'
                                ? '#FEF3C7'
                                : '#F3F4F6',
                            color:
                              log.usuario === 'tere@nenasgiftshop.com'
                                ? '#9333EA'
                                : log.usuario === 'cinthia@nenasgiftshop.com'
                                ? '#10B981'
                                : log.usuario === 'veronica@nenasgiftshop.com'
                                ? '#F59E0B'
                                : '#6B7280',
                          }}
                        >
                          {log.usuarioNombre}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        {formatFecha(log.fecha)}
                      </div>

                      <div className="text-sm text-gray-700">{log.detalles}</div>

                      {log.cambios && log.cambios.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {log.cambios.map((cambio, i) => (
                            <div
                              key={i}
                              className="text-xs bg-white rounded px-2 py-1 border border-gray-200"
                            >
                              <span className="font-semibold">{cambio.campo}:</span>{' '}
                              <span className="text-red-600">{cambio.antes}</span> →{' '}
                              <span className="text-green-600">{cambio.despues}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
