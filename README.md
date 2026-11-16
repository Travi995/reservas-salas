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

### Opcionales implementados

- **Paginación y búsqueda** en el listado de reservas del admin (y paginación en «Mis reservas»).
- **Zonas horarias:** cada sala tiene su zona IANA; las horas se introducen y se muestran en el horario de la sala.
- **Reservas recurrentes:** «repetir cada semana» durante 2 a 12 semanas, mismo día y horario. Es **todo o nada**: si alguna fecha choca no se crea ninguna, y el `409` dice qué fechas y con qué franja.
- **Calendario semanal** (`/calendario`): una sala, de lunes a domingo, en su horario. Pulsas un hueco libre para reservar (con la hora ya rellena) y una reserva tuya para cancelarla. Se navega por semanas, y en móvil la rejilla se desplaza dentro de su tarjeta.
- **Logs y métricas básicas:**
  - Una línea de log por petición (método, ruta sin query string, status, duración y usuario) en formato legible o JSON (`LOG_FORMAT=json`).
  - Cada respuesta lleva un `X-Request-Id` (se reutiliza el del cliente o proxy si es seguro). El mismo id aparece en el log del error 500, así se puede llegar del aviso de un usuario a la traza.
  - `GET /health` (comprueba la BD) y `GET /metrics` (admin): peticiones por clase de status y latencia media y máxima por ruta.

## Reglas de negocio (sección 4)

Todas están en el backend. El front repite las de tiempo solo para avisar antes de enviar.

| Regla | Dónde | Respuesta |
|-------|-------|-----------|
| Sin solapes en la misma sala; `10:00–11:00` y `11:00–12:00` **no** se solapan | Comprobación en el servicio + restricción `EXCLUDE` en Postgres | `409 ROOM_OVERLAP` con la franja que choca |
| Fin posterior al inicio | Función pura `checkTimeRules` + `CHECK` en BD | `422 END_BEFORE_START` |
| No reservar en el pasado (empezar «ahora» cuenta como pasado) | `checkTimeRules` con el reloj del servidor | `422 IN_THE_PAST` |
| Duración entre 15 min y 4 h, ambos incluidos | `checkTimeRules` + `CHECK` en BD | `422 DURATION_OUT_OF_RANGE` |
| Una sala desactivada no acepta reservas nuevas | Servicio, dentro de la transacción | `422 ROOM_INACTIVE` |
| Reservas recurrentes: cada ocurrencia cumple todo lo anterior | Mismas comprobaciones por fecha, en una sola transacción | `409 ROOM_OVERLAP` con todas las fechas que chocan; no se crea ninguna |
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
| `GET /availability/week?roomId=…&date=YYYY-MM-DD` | autenticado (semana de lunes a domingo que contiene `date`) |
| `POST /reservations` | autenticado |
| `POST /reservations/recurring` (mismo cuerpo + `weeks: 2–12`) | autenticado |
| `GET /reservations/me?scope=upcoming\|past&page=1&pageSize=10` | autenticado |
| `GET /reservations?page&pageSize&search&status&scope&roomId` | admin |
| `POST /reservations/:id/cancel` | dueño o admin |
| `GET /health` | público |
| `GET /metrics` | admin |

El detalle de cada endpoint (cuerpos y respuestas) está en Swagger (`/docs`).

Los listados paginados responden `{ items, meta: { page, pageSize, totalItems, totalPages } }`. `pageSize` va de 1 a 100 (por defecto 10) y `page` de 1 a 100 000, para que el `OFFSET` nunca desborde.

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
- **Paginación en el servidor:**
  - Los listados de reservas (las mías y la del admin) se filtran, ordenan y paginan en la BD con `LIMIT/OFFSET` + `COUNT`; el front solo pide una página y pinta el `meta` que recibe.
  - Orden estable con desempate por `id`, para que no se repitan ni salten filas entre páginas.
  - La búsqueda del admin es `unaccent(...) ILIKE unaccent(...)` sobre título, sala, nombre y email del usuario, escapando `%` y `_`: «reunion» encuentra «Reunión» y «nunez» encuentra «Ñúñez» (extensión `unaccent`, en una migración). El front la envía con *debounce* (300 ms).
  - «Próximas»/«Pasadas» se separan **solo por fecha** (`ends_at` frente a ahora), independiente del estado: así el filtro admin «Canceladas + Próximas» funciona.
  - El estado de los listados (pestaña, página, búsqueda y filtros) vive en la **URL** (`?tab=past&page=2`, `?q=…&status=…&page=…`): recargar, ir atrás o compartir el enlace lo conserva. Cambiar un filtro vuelve a la página 1.
- **Robustez de la API:** un byte nulo (`\u0000`) en cualquier texto se rechaza con `400` antes de llegar a Postgres. Los errores de validación dicen primero el problema de tipo («debe ser un número entero») y los campos no permitidos se explican en español.
- **Cancelar sin sorpresas:**
  - El diálogo explica que la sala queda libre y que no se puede deshacer, con opciones claras: «Sí, cancelar reserva» y «No, mantenerla».
  - Cada botón tiene un `aria-label` con la reserva.
  - Si la reserva ya estaba cancelada (por otra pestaña o por un reintento), el diálogo se cierra y la lista se refresca.
- **Errores de carga recuperables:** los listados muestran «Reintentar» y vuelven a cargar solos al recuperar la conexión. Si el solape es con una reserva propia (p. ej. un reintento tras perder la respuesta), el 409 lo dice: «Ya tienes una reserva en esta sala…».
- **Zona horaria visible:** las horas se muestran en la zona de la sala y, si no coincide con la del navegador, se indica («hora de Buenos Aires»).
  - `GET /rooms` y la disponibilidad no se paginan: el número de salas es pequeño y la pantalla las necesita todas.
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
  - formato de errores, validación y entorno;
  - fechas de una serie semanal y de la semana (lunes a domingo), métricas y request id.
- **API, e2e** (`pnpm test:e2e`), contra Postgres real:
  - auth, salas, reservas, disponibilidad y permisos;
  - paginación, búsqueda y filtros de los listados;
  - reservas recurrentes (todo o nada, todas las fechas que chocan, reglas por ocurrencia);
  - calendario semanal (día local de cada reserva, salas desactivadas);
  - `X-Request-Id`, `/health` y `/metrics`;
  - **concurrencia**, también entre dos series que compiten por la misma semana;
  - códigos HTTP y mensajes.
- **Web** (`pnpm test`):
  - cliente de la API (Bearer, errores, 401, query de paginación);
  - componente de paginación;
  - validaciones de tiempo en el front, fechas de la serie y posición de las reservas en el calendario;
  - formularios;
  - desplegable y calendario (teclado y accesibilidad).

## Supuestos

Decisiones tomadas donde el enunciado no lo especifica:

- Las reglas de la sección 4 aplican a todos los roles, también al admin.
- Al desactivar una sala, sus **reservas futuras se mantienen**: solo se bloquean las nuevas. El admin puede cancelarlas una a una.
- «El admin puede cancelar cualquiera» significa de cualquier usuario, pero solo si no ha empezado.
- Una reserva no puede cruzar la medianoche: inicio y fin son del mismo día de la sala.
- Una serie recurrente es semanal y se valida entera: si una sola fecha choca o rompe una regla, no se crea ninguna. Las semanas de una serie mantienen la hora de pared de la sala aunque haya un cambio de horario de verano en medio.
- «Próximas» incluye las reservas en curso y las canceladas que aún no han pasado (marcadas como canceladas). «Pasadas» son las ya terminadas.

## Qué quedó fuera / qué haría con más tiempo

- **Sesiones:** refresh tokens y revocación (lista de tokens revocados o sesiones en BD). Hoy el JWT dura 8 h y cerrar sesión borra el token en el cliente.
- **Token en cookie `httpOnly`** en lugar de `localStorage`, para reducir la exposición a XSS. Se eligió Bearer por simplicidad.
- **Opcionales del enunciado no hechos:** CI y deploy por URL (ver abajo).
- **Series recurrentes:** hoy cada ocurrencia se cancela por separado; con más tiempo, «cancelar el resto de la serie» usando `series_id`, y otras frecuencias (diaria, cada 2 semanas).
- **Paginación por cursor** (keyset sobre `starts_at, id`) si el volumen creciera mucho: `OFFSET` se degrada en páginas profundas. Y un índice trigram (`pg_trgm`) sobre `unaccent(...)` para la búsqueda.
- **Editar reservas:** hoy solo se crean y se cancelan.
- **Límite de peticiones** en login y registro (`@nestjs/throttler`).
- **Observabilidad:** las métricas viven en memoria del proceso y se pierden al reiniciar. Con más tiempo, exportarlas a Prometheus u OpenTelemetry y mandar los logs JSON a un colector.
- **CI** con GitHub Actions que corra lint y tests (unitarios + e2e con un servicio de Postgres).
- **Despliegue:** la API y la web estáticas detrás de **Caddy** como proxy inverso con HTTPS automático. No se incluye su configuración porque depende del destino.
- **Rendimiento del front:** cargar `motion` con `LazyMotion` para reducir unos 145 kB del bundle.
