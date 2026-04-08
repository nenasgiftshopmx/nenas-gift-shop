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

// ==================== CLIENTES ====================
const clientesRef = collection(db, 'clientes');

export async function getClientes(): Promise<Cliente[]> {
  const q = query(clientesRef, orderBy('nombre'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
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
