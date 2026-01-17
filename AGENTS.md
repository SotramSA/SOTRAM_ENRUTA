# AGENTS.md

Este archivo contiene las directrices y comandos para agentes de codificación que trabajan en este repositorio.

## Comandos de Build/Lint/Test

### Desarrollo
- `npm run dev` - Inicia servidor de desarrollo con Turbopack
- `npm run dev:local` - Inicia servidor con base de datos local (PowerShell)

### Build y Producción
- `npm run build` - Compila la aplicación para producción
- `npm run start` - Inicia servidor de producción

### Calidad de Código
- `npm run lint` - Ejecuta ESLint para verificar calidad de código
- **No hay comandos de prueba configurados** - Este proyecto no tiene tests actualmente

### Base de Datos
- `npm run prisma:generate` - Genera cliente Prisma
- `npm run prisma:migrate` - Ejecuta migraciones de base de datos
- `npm run prisma:studio` - Abre Prisma Studio
- `npm run db:test` - Prueba conexión local a base de datos
- `npm run db:test-remote` - Prueba conexión remota a base de datos
- `npm run db:tunnel` - Inicia túnel SSH para base de datos remota

### Seeders
- `npm run seed` - Puebla base de datos con vehículos y conductores
- `npm run seed:rutas` - Puebla base de datos con rutas

## Guías de Estilo de Código

### Imports y Estructura
- Usar imports absolutos con alias `@/*` para archivos del proyecto
- Imports de librerías externas al principio, luego imports relativos
- Separar imports de React, librerías externas, y locales con líneas en blanco

```typescript
// React y librerías externas
import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

// Imports locales con alias
import { loginSchema } from '@/src/lib/zod';
import { loginAction } from '@/actions/auth_action';
```

### TypeScript y Tipado
- Usar TypeScript estricto (configurado en tsconfig.json)
- Definir interfaces para todos los objetos complejos
- Usar `z.infer<typeof schema>` para tipos de formularios
- Evitar `any` - usar `unknown` o tipado específico

### Nomenclatura
- **Componentes**: PascalCase (ej: `LoginForm`, `SelectComponent`)
- **Funciones**: camelCase (ej: `formatDate`, `getSessionUser`)
- **Variables**: camelCase, descriptivas en español
- **Constantes**: UPPER_SNAKE_CASE para valores fijos
- **Interfaces**: PascalCase con prefijo `I` opcional (ej: `SessionUser`)

### Formularios y Validación
- Usar React Hook Form con Zod para validación
- Estructura estándar para formularios:

```typescript
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { /* valores iniciales */ }
});

async function onSubmit(values: z.infer<typeof schema>) {
  startTransition(async () => {
    // lógica del formulario
  });
}
```

### Manejo de Estados
- Usar `useState` para estados simples
- Usar `useTransition` para operaciones asíncronas con loading states
- Para estado global, usar Zustand (configurado en `src/store.ts`)

### Manejo de Errores
- Usar try-catch en operaciones asíncronas
- Mostrar errores al usuario con estados específicos
- Loggear errores en consola con contexto

```typescript
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  console.error('Error en operación:', error);
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Error desconocido' 
  };
}
```

### Estilos y UI
- Usar Tailwind CSS para estilos
- Componentes UI con shadcn/ui (Radix UI + Tailwind)
- Usar la utilidad `cn()` para combinar clases de CSS
- Mantener consistencia con colores y espaciados

### Base de Datos
- Usar Prisma ORM con PostgreSQL
- Modelos en singular (ej: `Usuario`, `Ruta`)
- Campos booleanos para permisos con prefijo `tabla`
- Manejar conexiones con try-catch y reintentos

### Autenticación y Sesión
- Usar cookies para manejo de sesión
- JWT para tokens de autenticación
- Interface `SessionUser` para datos de usuario
- Middleware para protección de rutas

### Estructura de Archivos
```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes UI reutilizables
│   └── login/          # Componentes específicos
├── lib/                # Utilidades y helpers
├── types/              # Definiciones de tipos
└── store.ts            # Estado global
```

### Fetch y API
- Usar la utilidad `safeFetch()` para llamadas fetch robustas
- Incluir headers apropiados y manejo de errores
- Usar `credentials: 'include'` para cookies

### Comentarios y Documentación
- Comentarios en español para funciones complejas
- Documentar interfaces y tipos importantes
- Mantener comentarios breves y relevantes

### Configuración ESLint
- Configuración basada en `next/core-web-vitals`
- Reglas importantes como advertencias:
  - `@typescript-eslint/no-explicit-any`: warn
  - `@typescript-eslint/no-unused-vars`: warn
  - `react-hooks/exhaustive-deps`: warn

### Notas Específicas del Proyecto
- Este es un sistema de gestión de rutas ("en_ruta")
- Maneja permisos por tabla para usuarios
- Usa zona horaria local para fechas (funciones específicas en utils.ts)
- Tiene sistema de turnos y programación de rutas
- Soporta modo de hora simulada para pruebas

### Buenas Prácticas Adicionales
- Mantener componentes pequeños y enfocados
- Usar forwardRef para componentes UI personalizados
- Separar lógica de negocio de componentes de presentación
- Usar constantes para valores repetitivos
- Validar datos de entrada en todo el sistema