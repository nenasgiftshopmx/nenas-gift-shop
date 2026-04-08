// ==================== NOTAS DE VENTA ====================
export interface NotaItem {
  cantidad: string;
  articulo: string;
  precio: string;
  importe: string;
  entrega: number; // 1, 2, or 3
}

export interface EntregaFecha {
  dia: string;
  mes: string;
  anio: string;
  label: string; // e.g. "Invitaciones", "Centros de mesa"
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
  entregas: EntregaFecha[]; // up to 3
  total: string;
  anticipo1: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';
  createdAt?: any;
  updatedAt?: any;
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
  precioMayoreo?: number;
  stock: number;
  descripcion?: string;
  imagen?: string; // Firebase Storage URL
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
  rol: 'admin' | 'colaboradora';
  activo: boolean;
}

// ==================== DELIVERY (computed for calendar) ====================
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
}
