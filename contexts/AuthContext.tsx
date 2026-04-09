'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Configuración de usuarios
const USUARIOS_SISTEMA = {
  'tere@nenasgiftshop.com': {
    nombre: 'Tere',
    rol: 'admin' as const,
    color: '#9333EA',
  },
  'cinthia@nenasgiftshop.com': {
    nombre: 'Cinthia',
    rol: 'admin' as const,
    color: '#10B981',
  },
  'veronica@nenasgiftshop.com': {
    nombre: 'Verónica',
    rol: 'colaboradora' as const,
    color: '#F59E0B',
  },
  'empleada@nenasgiftshop.com': {
    nombre: 'Empleada',
    rol: 'solo_lectura' as const,
    color: '#6B7280',
  },
};

const PERMISOS = {
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
    ver_auditoria_completa: false,
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

interface UsuarioActual {
  uid: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'colaboradora' | 'solo_lectura';
  color: string;
  permisos: typeof PERMISOS.admin;
}

interface AuthContextType {
  user: User | null;
  usuarioActual: UsuarioActual | null;
  loading: boolean;
  puedeCrearNotas: boolean;
  puedeEditarNotas: boolean;
  puedeEliminarNotas: boolean;
  puedeAsignarNotas: boolean;
  puedeVerAuditoriaCompleta: boolean;
  esAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  usuarioActual: null,
  loading: true,
  puedeCrearNotas: false,
  puedeEditarNotas: false,
  puedeEliminarNotas: false,
  puedeAsignarNotas: false,
  puedeVerAuditoriaCompleta: false,
  esAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActual | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser?.email) {
        const email = firebaseUser.email.toLowerCase();
        const userData = USUARIOS_SISTEMA[email as keyof typeof USUARIOS_SISTEMA];
        
        if (userData) {
          setUsuarioActual({
            uid: firebaseUser.uid,
            email: email,
            nombre: userData.nombre,
            rol: userData.rol,
            color: userData.color,
            permisos: PERMISOS[userData.rol],
          });
        } else {
          // Usuario no reconocido - dar permisos de solo lectura por seguridad
          console.warn('Usuario no configurado:', email);
          setUsuarioActual({
            uid: firebaseUser.uid,
            email: email,
            nombre: email.split('@')[0],
            rol: 'solo_lectura',
            color: '#6B7280',
            permisos: PERMISOS.solo_lectura,
          });
        }
      } else {
        setUsuarioActual(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const permisos = usuarioActual?.permisos || PERMISOS.solo_lectura;

  const contextValue = {
    user,
    usuarioActual,
    loading,
    puedeCrearNotas: permisos.crear_notas,
    puedeEditarNotas: permisos.editar_notas,
    puedeEliminarNotas: permisos.eliminar_notas,
    puedeAsignarNotas: permisos.asignar_notas,
    puedeVerAuditoriaCompleta: permisos.ver_auditoria_completa,
    esAdmin: usuarioActual?.rol === 'admin',
  };

  // Debug en desarrollo
  if (typeof window !== 'undefined' && usuarioActual) {
    console.log('👤 Usuario actual:', usuarioActual.nombre, '| Rol:', usuarioActual.rol);
    console.log('✅ Permisos:', {
      crear: contextValue.puedeCrearNotas,
      editar: contextValue.puedeEditarNotas,
      eliminar: contextValue.puedeEliminarNotas,
    });
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
