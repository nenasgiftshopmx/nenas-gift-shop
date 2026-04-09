import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinary';
import { Nota, Cliente, Producto, AuditLog } from '@/types';

// ==================== AUDITORÍA ====================
const auditLogsRef = collection(db, 'audit_logs');

export async function registrarAuditoria(log: Omit<AuditLog, 'id' | 'fecha'>): Promise<void> {
  try {
    await addDoc(auditLogsRef, {
      ...log,
      fecha: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error registrando auditoría:', error);
    // No lanzar error para no bloquear la operación principal
  }
}

export async function getAuditoriaDeNota(notaId: string): Promise<AuditLog[]> {
  try {
    const q = query(auditLogsRef, where('notaId', '==', notaId), orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
  } catch (error) {
    console.error('Error obteniendo auditoría:', error);
    return [];
  }
}

export async function getAuditoriaDeUsuario(usuarioEmail: string): Promise<AuditLog[]> {
  try {
    const q = query(auditLogsRef, where('usuario', '==', usuarioEmail), orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
  } catch (error) {
    console.error('Error obteniendo auditoría de usuario:', error);
    return [];
  }
}

export async function getAuditoriaCompleta(): Promise<AuditLog[]> {
  try {
    const q = query(auditLogsRef, orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
  } catch (error) {
    console.error('Error obteniendo auditoría completa:', error);
    return [];
  }
}

// ==================== NOTAS CON AUDITORÍA ====================
const notasRef = collection(db, 'notas');

export async function getNotas(): Promise<Nota[]> {
  const q = query(notasRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Nota));
}

export async function getNota(id: string): Promise<Nota | null> {
  const docRef = doc(db, 'notas', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Nota;
}

export async function createNota(
  nota: Omit<Nota, 'id'>, 
  usuario: { email: string; nombre: string }
): Promise<string> {
  const notaConAudit = {
    ...nota,
    creadaPor: usuario.email,
    creadaPorNombre: usuario.nombre,
    ultimaModificacionPor: usuario.email,
    ultimaModificacionNombre: usuario.nombre,
    ultimaModificacionFecha: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(notasRef, notaConAudit);
  
  // Registrar en auditoría
  await registrarAuditoria({
    notaId: docRef.id,
    notaFolio: nota.folio,
    accion: 'crear',
    usuario: usuario.email,
    usuarioNombre: usuario.nombre,
    detalles: `Nota creada para cliente: ${nota.nombre}`,
  });
  
  return docRef.id;
}

export async function updateNota(
  id: string, 
  data: Partial<Nota>,
  usuario: { email: string; nombre: string },
  cambiosDetalle?: string
): Promise<void> {
  const notaAnterior = await getNota(id);
  
  const dataConAudit = {
    ...data,
    ultimaModificacionPor: usuario.email,
    ultimaModificacionNombre: usuario.nombre,
    ultimaModificacionFecha: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = doc(db, 'notas', id);
  await updateDoc(docRef, dataConAudit);
  
  // Registrar en auditoría
  const cambios: any[] = [];
  if (notaAnterior) {
    // Detectar cambios importantes
    if (data.total && data.total !== notaAnterior.total) {
      cambios.push({ campo: 'Total', antes: notaAnterior.total, despues: data.total });
    }
    if (data.status && data.status !== notaAnterior.status) {
      cambios.push({ campo: 'Estado', antes: notaAnterior.status, despues: data.status });
    }
    if (data.asignadaA && data.asignadaA !== notaAnterior.asignadaA) {
      cambios.push({ 
        campo: 'Asignación', 
        antes: notaAnterior.asignadaNombre || 'Sin asignar', 
        despues: data.asignadaNombre || 'Sin asignar' 
      });
    }
  }
  
  const auditLog: any = {
    notaId: id,
    notaFolio: notaAnterior?.folio || '',
    accion: 'editar',
    usuario: usuario.email,
    usuarioNombre: usuario.nombre,
    detalles: cambiosDetalle || 'Nota editada',
  };
  
  if (cambios.length > 0) {
    auditLog.cambios = cambios;
  }
  
  await registrarAuditoria(auditLog);
}

export async function deleteNota(
  id: string,
  usuario: { email: string; nombre: string },
  motivo?: string
): Promise<void> {
  const nota = await getNota(id);
  
  if (nota) {
    await registrarAuditoria({
      notaId: id,
      notaFolio: nota.folio,
      accion: 'eliminar',
      usuario: usuario.email,
      usuarioNombre: usuario.nombre,
      detalles: motivo || 'Nota eliminada',
    });
  }
  
  const docRef = doc(db, 'notas', id);
  await deleteDoc(docRef);
}

export async function asignarNota(
  notaId: string,
  asignadaA: string,
  asignadaNombre: string,
  usuario: { email: string; nombre: string }
): Promise<void> {
  await updateNota(
    notaId,
    { asignadaA, asignadaNombre },
    usuario,
    `Asignada a ${asignadaNombre}`
  );
}

// ==================== FOTOS ====================
export async function uploadProductoFoto(file: File, notaId: string, itemIndex: number): Promise<string> {
  try {
    const url = await uploadToCloudinary(file, notaId, itemIndex);
    return url;
  } catch (error) {
    console.error('Error uploading foto:', error);
    throw error;
  }
}

export async function deleteFoto(url: string): Promise<void> {
  try {
    await deleteFromCloudinary(url);
  } catch (error) {
    console.error('Error deleting foto:', error);
  }
}

// ==================== CLIENTES ====================
const clientesRef = collection(db, 'clientes');

export async function getClientes(): Promise<Cliente[]> {
  const q = query(clientesRef, orderBy('nombre'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const docRef = doc(db, 'clientes', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Cliente;
}

export async function findClienteByNameOrPhone(nombre: string, telefono: string): Promise<Cliente | null> {
  try {
    if (telefono && telefono.trim()) {
      const qPhone = query(clientesRef, where('telefono', '==', telefono.trim()));
      const snapshotPhone = await getDocs(qPhone);
      if (!snapshotPhone.empty) {
        const doc = snapshotPhone.docs[0];
        return { id: doc.id, ...doc.data() } as Cliente;
      }
    }
    
    if (nombre && nombre.trim()) {
      const qName = query(clientesRef, where('nombre', '==', nombre.trim()));
      const snapshotName = await getDocs(qName);
      if (!snapshotName.empty) {
        const doc = snapshotName.docs[0];
        return { id: doc.id, ...doc.data() } as Cliente;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error buscando cliente:', error);
    return null;
  }
}

export async function createCliente(cliente: Omit<Cliente, 'id'>): Promise<string> {
  const docRef = await addDoc(clientesRef, {
    ...cliente,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCliente(id: string, data: Partial<Cliente>): Promise<void> {
  const docRef = doc(db, 'clientes', id);
  await updateDoc(docRef, data);
}

export async function deleteCliente(id: string): Promise<void> {
  const docRef = doc(db, 'clientes', id);
  await deleteDoc(docRef);
}

// ==================== PRODUCTOS ====================
const productosRef = collection(db, 'productos');

export async function getProductos(): Promise<Producto[]> {
  const q = query(productosRef, orderBy('nombre'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto));
}

export async function getProducto(id: string): Promise<Producto | null> {
  const docRef = doc(db, 'productos', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Producto;
}

export async function findProductoByName(nombre: string): Promise<Producto | null> {
  try {
    if (!nombre || !nombre.trim()) return null;
    
    const q = query(productosRef, where('nombre', '==', nombre.trim()));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Producto;
    }
    
    return null;
  } catch (error) {
    console.error('Error buscando producto:', error);
    return null;
  }
}

export async function createProducto(producto: Omit<Producto, 'id'>): Promise<string> {
  const docRef = await addDoc(productosRef, {
    ...producto,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateProducto(id: string, data: Partial<Producto>): Promise<void> {
  const docRef = doc(db, 'productos', id);
  await updateDoc(docRef, data);
}

export async function deleteProducto(id: string): Promise<void> {
  const docRef = doc(db, 'productos', id);
  await deleteDoc(docRef);
}

// ==================== EMAIL ====================
export function sendEmailToCliente(cliente: Cliente, subject: string, body: string): void {
  const mailtoLink = `mailto:${cliente.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}
