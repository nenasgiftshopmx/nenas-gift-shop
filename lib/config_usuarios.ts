// Configuración de usuarios del sistema

export const USUARIOS_SISTEMA = {
  tere: {
    email: 'tere@nenasgiftshop.com',
    nombre: 'Tere',
    rol: 'admin' as const,
    color: '#9333EA', // Morado
    password: 'Nenas2026!', // Cambiar en producción
  },
  cinthia: {
    email: 'cinthia@nenasgiftshop.com',
    nombre: 'Cinthia',
    rol: 'admin' as const,
    color: '#10B981', // Verde
    password: 'Nenas2026!', // Cambiar en producción
  },
  veronica: {
    email: 'veronica@nenasgiftshop.com',
    nombre: 'Verónica',
    rol: 'colaboradora' as const,
    color: '#F59E0B', // Naranja
    password: 'Nenas2026!', // Cambiar en producción
  },
  empleada: {
    email: 'empleada@nenasgiftshop.com',
    nombre: 'Empleada',
    rol: 'solo_lectura' as const,
    color: '#6B7280', // Gris
    password: 'Nenas2026!', // Cambiar en producción
  },
};

// Colores para asignaciones en calendario
export const COLORES_ASIGNACION = {
  'tere@nenasgiftshop.com': '#9333EA',
  'cinthia@nenasgiftshop.com': '#10B981',
  'veronica@nenasgiftshop.com': '#F59E0B',
  'sin_asignar': '#E5E7EB',
};

// Permisos por rol
export const PERMISOS = {
  admin: {
    crear_notas: true,
    editar_notas: true,
    eliminar_notas: true,
    asignar_notas: true,
    ver_calendario_general: true,
    ver_calendario_personal: true,
    ver_auditoria_completa: true,
    gestionar_usuarios: true,
  },
  colaboradora: {
    crear_notas: true,
    editar_notas: true,
    eliminar_notas: true,
    asignar_notas: true,
    ver_calendario_general: true,
    ver_calendario_personal: false,
    ver_auditoria_completa: false, // Solo ve sus acciones
    gestionar_usuarios: false,
  },
  solo_lectura: {
    crear_notas: false,
    editar_notas: false,
    eliminar_notas: false,
    asignar_notas: false,
    ver_calendario_general: true,
    ver_calendario_personal: false,
    ver_auditoria_completa: false,
    gestionar_usuarios: false,
  },
};
