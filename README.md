# Salon

App full-stack para una agenda de salon de belleza.

## Como funciona

La app tiene tres partes:

- Frontend: React muestra la agenda y captura el formulario.
- Backend/API: rutas de Next.js reciben peticiones HTTP.
- Base de datos: PostgreSQL guarda clientes, servicios y citas.

Flujo principal:

```text
Formulario -> /api/appointments -> PostgreSQL -> /api/dashboard -> Pantalla
```

## Disco D

El proyecto esta preparado para trabajar en `D:\salon`:

- dependencias en `D:\salon\node_modules`
- cache npm en `D:\salon\.npm-cache`
- temporales de scripts en `D:\salon\.tmp`

## Configurar PostgreSQL

1. Crea una base de datos llamada `salon` en PostgreSQL.
2. Copia `.env.example` a `.env`.
3. Ajusta `DATABASE_URL` con tu usuario, password, host, puerto y base.

Ejemplo:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/salon"
```

La app crea las tablas automaticamente al consultar la API. Tambien deje el SQL en `database/schema.sql` para estudiarlo.

## Ejecutar

```powershell
npm.cmd run dev
```

Luego abre:

```text
http://localhost:3000
```
