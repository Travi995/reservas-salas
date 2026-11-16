import { Controller, useForm } from 'react-hook-form'
import { Button, Dialog, InputField, Select } from '../../components/ui'
import { api } from '../../lib/api'
import { applyApiError, rules } from '../../lib/forms'
import { DEFAULT_TIME_ZONE, TIME_ZONE_OPTIONS } from '../../lib/timezones'
import type { Room } from '../../lib/types'

interface RoomFormDialogProps {
  open: boolean
  room: Room | null // null = create
  onClose: () => void
  onSaved: (room: Room) => void
}

export function RoomFormDialog({ open, room, onClose, onSaved }: RoomFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={room ? 'Editar sala' : 'Nueva sala'}>
      <RoomForm key={`${room?.id ?? 'new'}-${open}`} room={room} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  )
}

interface RoomFormValues {
  name: string
  capacity: number
  location: string
  timezone: string
}

function RoomForm({ room, onClose, onSaved }: Omit<RoomFormDialogProps, 'open'>) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormValues>({
    mode: 'onTouched',
    defaultValues: {
      name: room?.name ?? '',
      capacity: room?.capacity,
      location: room?.location ?? '',
      timezone: room?.timezone ?? DEFAULT_TIME_ZONE,
    },
  })

  const onSubmit = handleSubmit(async ({ name, capacity, location, timezone }) => {
    try {
      const input = { name: name.trim(), capacity, location: location.trim(), timezone }
      onSaved(room ? await api.updateRoom(room.id, input) : await api.createRoom(input))
    } catch (err) {
      applyApiError(err, setError, ['name', 'capacity', 'location', 'timezone'])
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <InputField
        label="Nombre"
        placeholder="Ej. Sala Andes"
        error={errors.name?.message}
        {...register('name', {
          validate: rules.notBlank('Indica el nombre de la sala.'),
          maxLength: { value: 80, message: 'Máximo 80 caracteres.' },
        })}
      />
      <InputField
        label="Capacidad"
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        placeholder="Ej. 8"
        error={errors.capacity?.message}
        {...register('capacity', {
          valueAsNumber: true,
          required: rules.required('Indica la capacidad.'),
          validate: (v) => (Number.isInteger(v) && v >= 1) || 'Debe ser un número entero mayor que 0.',
        })}
      />
      <InputField
        label="Ubicación"
        placeholder="Ej. Oficina Centro, planta 2"
        error={errors.location?.message}
        {...register('location', {
          validate: rules.notBlank('Indica la ubicación.'),
          maxLength: { value: 120, message: 'Máximo 120 caracteres.' },
        })}
      />
      <Controller
        control={control}
        name="timezone"
        rules={{ required: rules.required('Elige la zona horaria.') }}
        render={({ field, fieldState }) => (
          <Select
            label="Zona horaria"
            hint="Las reservas de esta sala se hacen en su hora local."
            options={TIME_ZONE_OPTIONS}
            error={fieldState.error?.message}
            {...field}
          />
        )}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {room ? 'Guardar cambios' : 'Crear sala'}
        </Button>
      </div>
    </form>
  )
}
