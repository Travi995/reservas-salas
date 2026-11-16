import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const DESCRIPTION = `
API para **reservar salas de reunión sin solapamientos**, también cuando dos personas piden el mismo hueco a la vez.

## Cómo probarla desde aquí

1. Abre **auth → POST /auth/login** y pulsa *Try it out* con uno de los usuarios de prueba:
   - admin: \`admin@demo.com\` / \`Admin1234!\`
   - member: \`member@demo.com\` / \`Member1234!\`
2. Copia el \`accessToken\` de la respuesta.
3. Pulsa **Authorize** (arriba a la derecha), pega el token (sin escribir \`Bearer\`) y confirma.
4. Ya puedes llamar al resto de endpoints. Como admin, crea antes una sala con **POST /rooms**.

## Reglas de negocio

| Regla | Respuesta |
|-------|-----------|
| Dos reservas no pueden solaparse en la misma sala. \`10:00–11:00\` y \`11:00–12:00\` **no** se solapan | \`409 ROOM_OVERLAP\` |
| La hora de fin es posterior a la de inicio | \`422 END_BEFORE_START\` |
| No se reserva en el pasado (empezar «ahora» cuenta como pasado) | \`422 IN_THE_PAST\` |
| Duración entre 15 minutos y 4 horas | \`422 DURATION_OUT_OF_RANGE\` |
| Una sala desactivada no acepta reservas nuevas | \`422 ROOM_INACTIVE\` |
| Solo se cancela antes de que empiece (también el admin) | \`422 ALREADY_STARTED\` |

La validación vive en el backend. La garantía contra solapes la da la base de datos (restricción \`EXCLUDE\` de Postgres), no solo el código.

## Fechas y zonas horarias

- Al **enviar**, \`date\` (\`AAAA-MM-DD\`), \`startTime\` y \`endTime\` (\`HH:mm\`) son la **hora local de la sala**, tal como las escribe el usuario. La API usa la zona IANA de la sala (\`timezone\`) para convertirlas.
- Al **recibir**, \`startsAt\` y \`endsAt\` son instantes en **UTC** (ISO 8601). Muéstralos en la zona de la sala.
- Los intervalos son semiabiertos \`[inicio, fin)\` en todo el sistema.

## Errores

Todos los errores tienen el mismo formato y \`message\` se puede mostrar tal cual al usuario:

\`\`\`json
{ "error": { "code": "VALIDATION_ERROR", "message": "Revisa los datos enviados.",
             "details": [{ "field": "email", "message": "Introduce un email válido." }] } }
\`\`\`

| Estado | Cuándo |
|--------|--------|
| 400 | Datos mal formados (\`details\` indica el campo) |
| 401 | Sin token, token inválido o caducado, credenciales incorrectas |
| 403 | Rol insuficiente o reserva de otra persona |
| 404 | La sala o la reserva no existen |
| 409 | Conflicto con el estado actual (solape, email repetido, ya cancelada…) |
| 422 | Datos bien formados que rompen una regla de negocio |
| 429 | Demasiados intentos de login o registro desde la misma IP |
| 500 | Error inesperado (sin detalles internos; el \`X-Request-Id\` permite buscarlo en el log) |

## Paginación

Los listados de reservas responden \`{ items, meta }\`. \`pageSize\` va de 1 a 100 (por defecto 10) y \`page\` empieza en 1.

## Trazabilidad

Cada respuesta incluye la cabecera \`X-Request-Id\`. Si envías la tuya (alfanumérica, hasta 64 caracteres) se reutiliza.
`.trim();

/** Swagger UI at /docs. A development aid: callers decide not to mount it in production. */
export function setupSwagger(app: INestApplication) {
  const document = new DocumentBuilder()
    .setTitle('Reservas de salas')
    .setDescription(DESCRIPTION)
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token JWT que devuelve `POST /auth/login` o `POST /auth/register`. Pégalo sin el prefijo `Bearer`.',
      },
      'bearer',
    )
    .addTag(
      'auth',
      'Registro e inicio de sesión. El registro público siempre crea `member`.',
    )
    .addTag(
      'rooms',
      'Salas de reunión. Crear y editar es solo para `admin`; desactivar es un `PATCH` con `isActive: false`.',
    )
    .addTag(
      'reservations',
      'Crear, listar y cancelar reservas, incluidas las series semanales.',
    )
    .addTag(
      'availability',
      'Qué horarios están ocupados: vista de un día por sala y calendario semanal de una sala.',
    )
    .addTag(
      'observability',
      'Estado del servicio (`/health`) y métricas básicas (`/metrics`, solo admin).',
    )
    .build();

  SwaggerModule.setup(
    'docs',
    app,
    () => SwaggerModule.createDocument(app, document),
    {
      customSiteTitle: 'Reservas de salas · API',
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        displayRequestDuration: true,
        docExpansion: 'list',
      },
    },
  );
}
