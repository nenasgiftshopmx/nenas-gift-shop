// ==================== NOTAS DE VENTA ====================
export interface NotaItem {
  cantidad: string;
  articulo: string;
  precio: string;
  importe: string;
  entrega: number; // 1, 2, or 3
  detalles?: string;
  fotos?: string[];
}

export interface EntregaFecha {
  dia: string;
  mes: string;
  anio: string;
  label: string;
}

// 🆕 REGISTRO DE AUDITORÍA
export interface AuditLog {
  id?: string;
  notaId: string;
  notaFolio: string;
  accion: 'crear' | 'editar' | 'eliminar' | 'asignar' | 'cambiar_estado';
  usuario: string; // email del usuario
  usuarioNombre: string; // nombre para mostrar
  fecha: any; // Timestamp
  detalles: string; // descripción de lo que cambió
  cambios?: {
    campo: string;
    antes: any;
    despues: any;
  }[];
}

export interface Nota {
  id?: string;
  folio: string;
  dia: string;
  mes: string;
  anio: string;
  nombre: string;
  telefono: string;
  evento: string;
  canalVenta: 'FB' | 'IG' | 'WA' | 'Local';
  items: NotaItem[];
  notas: string;
  entregas: EntregaFecha[];
  total: string;
  anticipo1: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';
  
  // 🆕 CAMPOS NUEVOS
  asignadaA?: string; // email del responsable (tere@, cinthia@, etc)
  asignadaNombre?: string; // nombre para mostrar
  creadaPor?: string; // email
  creadaPorNombre?: string; // nombre
  
  createdAt?: any;
  updatedAt?: any;
  ultimaModificacionPor?: string;
  ultimaModificacionNombre?: string;
  ultimaModificacionFecha?: any;
}

// ==================== CLIENTES ====================
export interface Cliente {
  id?: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion?: string;
  totalPedidos: number;
  totalGastado: number;
  ultimoPedido?: string;
  createdAt?: any;
}

// ==================== PRODUCTOS ====================
export interface Producto {
  id?: string;
  nombre: string;
  categoria: string;
  precio: number;
  precioDocena?: number;
  cantidadDocena?: number;
  precioMedioMayoreo?: number;
  cantidadMedioMayoreo?: number;
  precioMayoreo?: number;
  cantidadMayoreo?: number;
  stock: number;
  descripcion?: string;
  imagen?: string;
  activo: boolean;
  createdAt?: any;
}

// ==================== CATEGORÍAS ====================
export interface Categoria {
  id?: string;
  nombre: string;
  descripcion?: string;
  orden: number;
}

// ==================== USUARIO ====================
export interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'colaboradora' | 'solo_lectura';
  activo: boolean;
  color?: string; // para calendario
}

// ==================== DELIVERY ====================
export interface Delivery {
  day: number;
  month: number;
  year: number;
  label: string;
  folio: string;
  client: string;
  items: NotaItem[];
  status: string;
  colorIdx: number;
  notaId?: string;
  asignadaA?: string;
  asignadaNombre?: string;
}
