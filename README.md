# Reservas de salas

Sistema mínimo pero sólido para reservar salas de reunión **sin solapamientos**, también cuando dos personas reservan el mismo hueco a la vez.

- **API:** NestJS 12 (Express) + TypeORM + PostgreSQL 17, bajo `/api/v1`, autenticación con JWT (Bearer).
- **Web:** React 19 + Vite + Tailwind CSS 4, responsive desde 320 px, modo claro/oscuro.
- **Monorepo:** pnpm workspaces (`apps/api`, `apps/web`). Solo la base de datos corre en Docker.

---

## Cómo levantarlo desde cero

**Requisitos:** Node 22+, pnpm (`corepack enable`), Docker.

```bash
pnpm bootstrap   # crea los .env, instala dependencias, levanta Postgres y crea los usuarios de prueba
pnpm dev         # levanta Postgres (si no está) + API + web en paralelo
```

| Qué | URL |
|-----|-----|
| Web | http://localhost:5173 |
| API | http://localhost:3000/api/v1 |
| Documentación de la API (Swagger) | http://localhost:3000/docs |
| Postgres | `localhost:5440` (usuario/clave/BD: `reservas`) |

Detalles:

- `pnpm bootstrap` solo crea `apps/api/.env` y `apps/web/.env` si no existen, a partir de sus `.env.example`, con un `JWT_SECRET` aleatorio. Es seguro repetirlo.
- Las **migraciones se ejecutan solas** al arrancar la API. El seed es idempotente.
- Las variables de entorno de la API se **validan con Joi**: si falta alguna o es inválida, la API no arranca y lista todos los problemas.
- La web lee la URL del backend de `VITE_API_URL` (`apps/web/.env`).

Otros comandos:

```bash
pnpm test        # tests unitarios de api y web
pnpm test:e2e    # tests e2e de la API contra Postgres (usa una BD aparte: reservas_test)
pnpm lint
pnpm build
pnpm db:down     # para Postgres (los datos quedan en ./data_postgres)
```

## Usuarios de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| admin | `admin@demo.com` | `Admin1234!` |
| member | `member@demo.com` | `Member1234!` |

El registro público siempre crea usuarios `member`. Al empezar no hay salas: entra como admin y créalas en **Salas**.

## Qué hace

- **Usuarios y acceso:** registro e inicio de sesión con email y contraseña. Las contraseñas se guardan con hash argon2id. Hay dos roles: `admin` y `member`.
- **Salas (admin):** crear, editar, desactivar y reactivar. Cada sala tiene nombre, capacidad, ubicación, **zona horaria** y estado activo/inactivo.
- **Reservas:**
  - Crear una reserva (sala, fecha, hora de inicio, hora de fin y título).
  - Ver mis reservas, separadas en próximas y pasadas.
  - Cancelar una reserva propia que no haya empezado. El admin puede cancelar las de cualquiera.
- **Disponibilidad:** eliges un día y ves, por sala, los horarios ocupados (franja visual y lista), con filtro de capacidad mínima.

## Reglas de negocio (sección 4)

Todas están en el backend. El front repite las de tiempo solo para avisar antes de enviar.

| Regla | Dónde | Respuesta |
|-------|-------|-----------|
| Sin solapes en la misma sala; `10:00–11:00` y `11:00–12:00` **no** se solapan | Comprobación en el servicio + restricción `EXCLUDE` en Postgres | `409 ROOM_OVERLAP` con la franja que choca |
| Fin posterior al inicio | Función pura `checkTimeRules` + `CHECK` en BD | `422 END_BEFORE_START` |
| No reservar en el pasado (empezar «ahora» cuenta como pasado) | `checkTimeRules` con el reloj del servidor | `422 IN_THE_PAST` |
| Duración entre 15 min y 4 h, ambos incluidos | `checkTimeRules` + `CHECK` en BD | `422 DURATION_OUT_OF_RANGE` |
| Una sala desactivada no acepta reservas nuevas | Servicio, dentro de la transacción | `422 ROOM_INACTIVE` |
| Cancelar solo antes de que empiece (vale también para el admin) | Servicio | `422 ALREADY_STARTED` |

### ¿Qué pasa si dos personas reservan el mismo horario a la vez?

Es la decisión técnica central. Comprobar primero si hay solape y luego insertar tiene una condición de carrera: las dos peticiones ven el hueco libre y las dos insertan.

La garantía está en la base de datos, que es lo único que no se puede saltar:

```sql
period tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (room_id WITH =, period WITH &&) WHERE (status = 'active')
```

- `'[)'` es un intervalo semiabierto: dos reservas pegadas no chocan.
- `WHERE status = 'active'`: una reserva cancelada libera el hueco.
- El servicio comprueba el solape antes de insertar para devolver un mensaje claro («La sala ya está reservada de 10:00 a 11:00.»). Si dos peticiones pasan esa comprobación a la vez, Postgres rechaza la segunda con `23P01` y la API lo traduce al mismo `409`.
- La sala se lee con `FOR SHARE` dentro de la transacción, así que desactivarla a la vez espera a que termine la reserva en curso.

Hay un test e2e que lanza **10 reservas idénticas en paralelo** y comprueba que hay exactamente un `201`, nueve `409` y una sola fila en la base de datos.

## Errores de la API

Todas las respuestas de error tienen el mismo formato, y el front muestra siempre `message`:

```json
{ "error": { "code": "ROOM_OVERLAP", "message": "La sala ya está reservada de 10:00 a 11:00." } }
{ "error": { "code": "VALIDATION_ERROR", "message": "Revisa los datos enviados.",
             "details": [{ "field": "email", "message": "Introduce un email válido." }] } }
```

| Código | Cuándo |
|--------|--------|
| 200 / 201 | Lectura o actualización correcta / recurso creado |
| 400 | Datos mal formados o validación de campos (`details` indica qué campo falla); id con formato inválido |
| 401 | Sin token, token inválido o caducado, credenciales incorrectas |
| 403 | Rol insuficiente o reserva de otro usuario |
| 404 | La sala o la reserva no existen |
| 409 | Conflicto con el estado actual: solape, email ya registrado, reserva ya cancelada |
| 422 | Datos bien formados que rompen una regla de negocio |
| 500 | Error inesperado (se registra en el log, sin filtrar detalles internos) |

## Endpoints (`/api/v1`)

| Método y ruta | Acceso |
|---------------|--------|
| `POST /auth/register` · `POST /auth/login` | público |
| `GET /auth/me` | autenticado |
| `GET /rooms?includeInactive=true` | autenticado (los members solo ven salas activas) |
| `POST /rooms` · `PATCH /rooms/:id` | admin |
| `GET /availability?date=YYYY-MM-DD&minCapacity=8` | autenticado |
| `POST /reservations` · `GET /reservations/me` | autenticado |
| `POST /reservations/:id/cancel` | dueño o admin |

El detalle de cada endpoint (cuerpos y respuestas) está en Swagger (`/docs`).

## Decisiones técnicas

- **PostgreSQL y no SQLite:** permite la restricción `EXCLUDE`, de modo que la garantía contra solapes está en el esquema y no solo en el código.
- **Modelo de tiempo:**
  - Los instantes se guardan como `timestamptz` (UTC) con intervalos semiabiertos `[inicio, fin)` en todo el sistema.
  - El usuario envía fecha y horas en la **hora local de la sala** y la API la convierte con la zona IANA de la sala, así el front no hace cuentas de zonas horarias.
  - El «día» de la disponibilidad es el de cada sala.
  - «Ahora» lo da un `Clock` inyectable, para que las reglas se puedan probar.
- **Reglas como función pura** (`reservation-rules.ts`): se testean sin base de datos ni reloj. Las mismas reglas están como `CHECK` en la base de datos.
- **Autenticación:**
  - JWT como `Authorization: Bearer`, con `@nestjs/jwt` y guards propios.
  - Un `AuthGuard` global exige token salvo en las rutas `@Public()` y recarga el usuario en cada petición, para que un rol cambiado o un usuario borrado no sigan valiendo. `@Roles('admin')` devuelve 403.
  - El login responde igual cuando el email no existe y cuando la contraseña está mal, también en tiempo de respuesta.
  - La caducidad se configura con `JWT_EXPIRES_IN` (8 h).
- **Email único y en minúsculas, garantizado por la BD:** `UNIQUE` + `CHECK (email = lower(email))`. Dos registros simultáneos con el mismo email terminan en `409`.
- **Cancelar es un cambio de estado** (`POST /reservations/:id/cancel`), no un borrado: el historial se conserva. Dos cancelaciones a la vez se resuelven con un `UPDATE ... WHERE status = 'active'`.
- **Backend por módulos:** `src/modules/{auth,users,rooms,reservations,availability}`, cada uno con sus `entities`, `dtos`, `decorators`, `guards` e `interfaces`. Lo compartido va en `src/common` (excepciones, filtro global, pipes, utilidades de tiempo) y la configuración en `src/config`.
- **Migraciones explícitas** (`synchronize: false`): se escriben a mano porque TypeORM no genera la restricción `EXCLUDE`, y se ejecutan al arrancar.
- **Front sencillo a propósito:**
  - Solo `fetch` y un hook `useAsync`; sin librerías de estado ni de fechas, solo `Intl`.
  - react-hook-form para formularios, con cada error debajo de su campo.
  - sonner para las alertas globales.
  - Desplegable y calendario propios, accesibles con teclado.
- **Sistema de diseño con tokens:** colores semánticos (blancos y verdes con un matiz azul), breakpoints mobile-first desde 320 px, tema claro/oscuro y animaciones con `motion` que respetan `prefers-reduced-motion`.
- **Convención:** código, comentarios y tests en inglés; textos para el usuario en español.

## Tests

- **API, unitarios** (`pnpm test`):
  - reglas de la sección 4, con los bordes de 15 min, 4 h, empezar justo ahora y reservas pegadas;
  - conversión de zonas horarias, incluido el horario de verano;
  - formato de errores, validación y entorno.
- **API, e2e** (`pnpm test:e2e`), contra Postgres real:
  - auth, salas, reservas, disponibilidad y permisos;
  - **concurrencia**;
  - códigos HTTP y mensajes.
- **Web** (`pnpm test`):
  - cliente de la API (Bearer, errores, 401);
  - validaciones de tiempo en el front;
  - formularios;
  - desplegable y calendario (teclado y accesibilidad).

## Supuestos

Decisiones tomadas donde el enunciado no lo especifica:

- Las reglas de la sección 4 aplican a todos los roles, también al admin.
- Al desactivar una sala, sus **reservas futuras se mantienen**: solo se bloquean las nuevas. El admin puede cancelarlas una a una.
- «El admin puede cancelar cualquiera» significa de cualquier usuario, pero solo si no ha empezado.
- Una reserva no puede cruzar la medianoche: inicio y fin son del mismo día de la sala.
- «Próximas» incluye las reservas en curso. «Pasadas» incluye las terminadas y las canceladas.

## Qué quedó fuera / qué haría con más tiempo

- **Sesiones:** refresh tokens y revocación (lista de tokens revocados o sesiones en BD). Hoy el JWT dura 8 h y cerrar sesión borra el token en el cliente.
- **Token en cookie `httpOnly`** en lugar de `localStorage`, para reducir la exposición a XSS. Se eligió Bearer por simplicidad.
- **Opcionales del enunciado no hechos:** paginación y búsqueda en un listado de reservas para el admin, reservas recurrentes y vista de calendario semanal.
- **Editar reservas:** hoy solo se crean y se cancelan.
- **Límite de peticiones** en login y registro (`@nestjs/throttler`).
- **Observabilidad:** logs estructurados con id de petición y métricas.
- **CI** con GitHub Actions que corra lint y tests (unitarios + e2e con un servicio de Postgres).
- **Despliegue:** la API y la web estáticas detrás de **Caddy** como proxy inverso con HTTPS automático. No se incluye su configuración porque depende del destino.
- **Rendimiento del front:** cargar `motion` con `LazyMotion` para reducir unos 145 kB del bundle.
