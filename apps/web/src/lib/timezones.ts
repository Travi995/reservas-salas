/** Office time zones offered when creating a room (IANA ids; labels are user-facing, in Spanish). */
export const DEFAULT_TIME_ZONE = 'America/Argentina/Buenos_Aires'

export const TIME_ZONE_OPTIONS = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires', description: 'UTC−3' },
  { value: 'America/Montevideo', label: 'Montevideo', description: 'UTC−3' },
  { value: 'America/Sao_Paulo', label: 'São Paulo', description: 'UTC−3' },
  { value: 'America/Santiago', label: 'Santiago de Chile', description: 'UTC−4/−3' },
  { value: 'America/Bogota', label: 'Bogotá', description: 'UTC−5' },
  { value: 'America/Lima', label: 'Lima', description: 'UTC−5' },
  { value: 'America/Mexico_City', label: 'Ciudad de México', description: 'UTC−6' },
  { value: 'America/Havana', label: 'La Habana', description: 'UTC−5/−4' },
  { value: 'America/New_York', label: 'Nueva York', description: 'UTC−5/−4' },
  { value: 'Europe/London', label: 'Londres', description: 'UTC+0/+1' },
  { value: 'Europe/Madrid', label: 'Madrid', description: 'UTC+1/+2' },
  { value: 'UTC', label: 'UTC', description: 'UTC+0' },
]
