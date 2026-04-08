# 🎀 Nenas Gift Shop — Admin Panel v3

Sistema de administración completo para Nenas Gift Shop.

## 🛠️ Stack Técnico

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Base de Datos:** Firebase Firestore
- **Autenticación:** Firebase Auth (Email/Password)
- **Hosting:** Vercel (auto-deploy desde GitHub)
- **Repositorio:** GitHub (nenasgiftshopmx)

## 📱 Funcionalidades

- ✅ **Dashboard** — Estadísticas, alertas de entregas del día, acciones rápidas
- ✅ **Notas de Venta** — Crear, editar, eliminar. Hasta 3 fechas de entrega por nota
- ✅ **Calendario** — Visualiza entregas por día, próximas 14 días
- ✅ **Catálogo** — Gestión de productos con precios y stock
- ✅ **Clientes** — Base de clientes con WhatsApp y llamada directa
- ✅ **Reportes** — Ventas por mes, por canal, top clientes
- ✅ **Vista Previa de Nota** — Formato imprimible estilo nota física
- ✅ **Compartir por WhatsApp** — Envía nota formateada al cliente
- ✅ **Responsive** — PC (sidebar), Tablet/Móvil (bottom nav)
- ✅ **PWA Ready** — Se puede instalar como app en el celular

## 🚀 Setup Inicial

### 1. Clonar e instalar

```bash
cd C:\Users\DELL
git clone https://github.com/nenasgiftshopmx/nenas-gift-shop.git nenas-admin-v3
cd nenas-admin-v3
npm install
```

### 2. Ejecutar en desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

### 3. Deploy a Vercel

El proyecto se despliega automáticamente con cada push a GitHub:

```bash
git add .
git commit -m "Nenas Admin v3 - App completa"
git push origin main
```

URL: https://nenas-gift-shop.vercel.app

## 🔐 Firebase

El proyecto está conectado a:
- **Project:** nenas-admin
- **Project ID:** nenas-admin
- **Auth:** Email/Password habilitado
- **Firestore:** Colecciones: notas, clientes, productos

### Colecciones Firestore

```
/notas          → Notas de venta con items y entregas
/clientes       → Base de clientes
/productos      → Catálogo de productos
```

## 📁 Estructura

```
nenas-admin-v3/
├── app/
│   ├── layout.tsx              (Layout raíz + AuthProvider)
│   ├── page.tsx                (Login)
│   ├── globals.css             (Estilos globales)
│   └── dashboard/
│       ├── layout.tsx          (Layout con sidebar/bottom nav)
│       ├── page.tsx            (Dashboard/Home)
│       ├── notas/page.tsx      (Notas de venta - CRUD completo)
│       ├── calendario/page.tsx (Calendario con entregas)
│       ├── catalogo/page.tsx   (Gestión de productos)
│       ├── clientes/page.tsx   (Gestión de clientes)
│       └── reportes/page.tsx   (Reportes y analytics)
├── lib/
│   ├── firebase.ts             (Config Firebase)
│   └── firestore.ts            (CRUD helpers)
├── types/
│   └── index.ts                (TypeScript types)
├── hooks/
│   ├── useAuth.tsx             (Auth context + hook)
│   └── useWidth.ts             (Responsive hook)
├── public/
│   └── manifest.json           (PWA manifest)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── postcss.config.mjs
```

## 💡 Próximas mejoras posibles

- [ ] Generación de PDF de notas con logo
- [ ] Notificaciones push de entregas
- [ ] Fotos de productos en Firebase Storage
- [ ] Dark mode
- [ ] Roles de usuario (admin/colaboradora)
- [ ] Búsqueda avanzada con filtros
- [ ] Export a Excel de reportes

---

Hecho con 🎀 por Claude (Opus 4.6)
