import { useForm } from 'react-hook-form'
import { Button, Dialog, InputField } from '../../components/ui'
import { api } from '../../lib/api'
import { applyApiError, rules } from '../../lib/forms'
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
}

function RoomForm({ room, onClose, onSaved }: Omit<RoomFormDialogProps, 'open'>) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormValues>({
    mode: 'onTouched',
    defaultValues: { name: room?.name ?? '', capacity: room?.capacity, location: room?.location ?? '' },
  })

  const onSubmit = handleSubmit(async ({ name, capacity, location }) => {
    try {
      const input = { name: name.trim(), capacity, location: location.trim() }
      onSaved(room ? await api.updateRoom(room.id, input) : await api.createRoom(input))
    } catch (err) {
      applyApiError(err, setError, ['name', 'capacity', 'location'])
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
