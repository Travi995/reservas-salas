import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Alert, Button, Dialog, InputField, Select } from '../../components/ui'
import { ApiError, api } from '../../lib/api'
import { applyApiError, rules } from '../../lib/forms'
import { DEFAULT_TIME_ZONE, TIME_ZONE_OPTIONS } from '../../lib/timezones'
import type { Room } from '../../lib/types'

interface RoomFormDialogProps {
  open: boolean
  room: Room | null // null = create
  onClose: () => void
  onSaved: (room: Room) => void
  /** Someone else changed the room meanwhile (409): the list behind the dialog should reload. */
  onStale?: () => void
}

export function RoomFormDialog({ open, room, onClose, onSaved, onStale }: RoomFormDialogProps) {
  const [dirty, setDirty] = useState(false)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={room ? 'Editar sala' : 'Nueva sala'}
      closeOnBackdrop={false}
      dirty={dirty}
    >
      <RoomForm
        key={`${room?.id ?? 'new'}-${open}`}
        room={room}
        onClose={onClose}
        onSaved={onSaved}
        onStale={onStale}
        onDirtyChange={setDirty}
      />
    </Dialog>
  )
}

interface RoomFormValues {
  name: string
  capacity: number
  location: string
  timezone: string
}

function RoomForm({
  room,
  onClose,
  onSaved,
  onStale,
  onDirtyChange,
}: Omit<RoomFormDialogProps, 'open'> & { onDirtyChange: (dirty: boolean) => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RoomFormValues>({
    mode: 'onTouched',
    defaultValues: {
      name: room?.name ?? '',
      capacity: room?.capacity,
      location: room?.location ?? '',
      timezone: room?.timezone ?? DEFAULT_TIME_ZONE,
    },
  })

  // The dialog asks before discarding typed input (X, Escape, back button).
  useEffect(() => {
    onDirtyChange(isDirty)
    return () => onDirtyChange(false)
  }, [isDirty, onDirtyChange])

  const onSubmit = handleSubmit(async ({ name, capacity, location, timezone }) => {
    setFormError(null)
    try {
      const input = { name: name.trim(), capacity, location: location.trim(), timezone }
      // `version`: if another admin saved this room after we opened the form, the API answers 409
      // instead of silently overwriting their change.
      onSaved(room ? await api.updateRoom(room.id, { ...input, version: room.version }) : await api.createRoom(input))
    } catch (err) {
      applyApiError(err, setError, ['name', 'capacity', 'location', 'timezone'], setFormError)
      if (err instanceof ApiError && err.code === 'ROOM_MODIFIED') onStale?.()
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
        max={500}
        step={1}
        placeholder="Ej. 8"
        error={errors.capacity?.message}
        {...register('capacity', {
          valueAsNumber: true,
          required: rules.required('Indica la capacidad.'),
          validate: (v) => (Number.isInteger(v) && v >= 1 && v <= 500) || 'Debe ser un número entero entre 1 y 500.',
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
            hint={
              room
                ? 'Las reservas se hacen en la hora local de la sala. Solo se puede cambiar si no tiene reservas pendientes.'
                : 'Las reservas de esta sala se hacen en su hora local.'
            }
            options={TIME_ZONE_OPTIONS}
            error={fieldState.error?.message}
            {...field}
          />
        )}
      />
      {formError && <Alert>{formError}</Alert>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {room ? 'Cerrar sin guardar' : 'Cerrar sin crear'}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {room ? 'Guardar cambios' : 'Crear sala'}
        </Button>
      </div>
    </form>
  )
}
