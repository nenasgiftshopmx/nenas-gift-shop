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
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { Nota, Cliente, Producto } from '@/types';

// ==================== NOTAS ====================
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

export async function createNota(nota: Omit<Nota, 'id'>): Promise<string> {
  const docRef = await addDoc(notasRef, {
    ...nota,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateNota(id: string, data: Partial<Nota>): Promise<void> {
  const docRef = doc(db, 'notas', id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteNota(id: string): Promise<void> {
  const docRef = doc(db, 'notas', id);
  await deleteDoc(docRef);
}

// ==================== FOTOS DE PRODUCTOS EN NOTAS ====================
// 🆕 Subir foto de referencia para un producto
export async function uploadProductoFoto(file: File, notaId: string, itemIndex: number): Promise<string> {
  try {
    const timestamp = Date.now();
    const fileName = `${notaId}_item${itemIndex}_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `notas/${notaId}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    return url;
  } catch (error) {
    console.error('Error uploading foto:', error);
    throw error;
  }
}

// 🆕 Eliminar foto
export async function deleteFoto(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting foto:', error);
    // No throw - si falla la eliminación, no es crítico
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

// 🆕 BUSCAR CLIENTE POR NOMBRE O TELÉFONO (evitar duplicados)
export async function findClienteByNameOrPhone(nombre: string, telefono: string): Promise<Cliente | null> {
  try {
    // Primero buscar por teléfono (más único)
    if (telefono && telefono.trim()) {
      const qPhone = query(clientesRef, where('telefono', '==', telefono.trim()));
      const snapshotPhone = await getDocs(qPhone);
      if (!snapshotPhone.empty) {
        const doc = snapshotPhone.docs[0];
        return { id: doc.id, ...doc.data() } as Cliente;
      }
    }
    
    // Si no encuentra por teléfono, buscar por nombre exacto
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

// 🆕 CREAR O ACTUALIZAR CLIENTE (sincronización automática)
export async function upsertCliente(clienteData: Partial<Cliente>): Promise<string> {
  try {
    const { nombre = '', telefono = '' } = clienteData;
    
    // Buscar si ya existe
    const existente = await findClienteByNameOrPhone(nombre, telefono);
    
    if (existente) {
      // Actualizar datos si existen
      await updateCliente(existente.id!, clienteData);
      return existente.id!;
    } else {
      // Crear nuevo
      return await createCliente({
        nombre: nombre || '',
        telefono: telefono || '',
        email: clienteData.email || '',
        direccion: clienteData.direccion || '',
        totalPedidos: 0,
        totalGastado: 0,
      } as Omit<Cliente, 'id'>);
    }
  } catch (error) {
    console.error('Error en upsertCliente:', error);
    throw error;
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

// 🆕 BUSCAR PRODUCTO POR NOMBRE (evitar duplicados)
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

// 🆕 CREAR O ACTUALIZAR PRODUCTO (sincronización automática)
export async function upsertProducto(productoData: Partial<Producto>): Promise<string> {
  try {
    const { nombre = '' } = productoData;
    
    // Buscar si ya existe
    const existente = await findProductoByName(nombre);
    
    if (existente) {
      // Actualizar precio si cambió
      if (productoData.precio && productoData.precio !== existente.precio) {
        await updateProducto(existente.id!, { precio: productoData.precio });
      }
      return existente.id!;
    } else {
      // Crear nuevo
      return await createProducto({
        nombre: nombre || '',
        descripcion: productoData.descripcion || '',
        precio: productoData.precio || 0,
        categoria: productoData.categoria || 'General',
        stock: productoData.stock || 0,
        imagen: productoData.imagen || '',
        activo: true,
      } as Omit<Producto, 'id'>);
    }
  } catch (error) {
    console.error('Error en upsertProducto:', error);
    throw error;
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
// 🆕 Función helper para enviar email (requiere backend o servicio)
// Por ahora solo abre el cliente de email con el contenido pre-llenado
export function sendEmailToCliente(cliente: Cliente, subject: string, body: string): void {
  const mailtoLink = `mailto:${cliente.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}
