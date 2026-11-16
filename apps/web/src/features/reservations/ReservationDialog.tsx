import { Controller, useForm } from 'react-hook-form'
import { Button, DatePicker, Dialog, InputField, Select } from '../../components/ui'
import { api } from '../../lib/api'
import { applyApiError, rules } from '../../lib/forms'
import { notify } from '../../lib/notify'
import { isInPast, MAX_MINUTES, MIN_MINUTES, todayISO, toMinutes } from '../../lib/time'
import type { ReservationInput, Room } from '../../lib/types'

interface ReservationDialogProps {
  open: boolean
  rooms: Room[]
  initial: { roomId: string; date: string }
  onClose: () => void
  onCreated: () => void
}

export function ReservationDialog({ open, rooms, initial, onClose, onCreated }: ReservationDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Nueva reserva">
      {/* key: resets the form each time it opens with a different room/date */}
      <ReservationForm
        key={`${initial.roomId}-${initial.date}-${open}`}
        rooms={rooms}
        initial={initial}
        onClose={onClose}
        onCreated={onCreated}
      />
    </Dialog>
  )
}

const FIELDS = ['roomId', 'date', 'startTime', 'endTime', 'title'] as const

function ReservationForm({ rooms, initial, onClose, onCreated }: Omit<ReservationDialogProps, 'open'>) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ReservationInput>({
    mode: 'onTouched',
    defaultValues: { ...initial, startTime: '', endTime: '', title: '' },
  })

  const roomOf = (id: string) => rooms.find((r) => r.id === id)

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.createReservation({ ...values, title: values.title.trim() })
      notify.success('Reserva creada.')
      onCreated()
    } catch (err) {
      applyApiError(err, setError, FIELDS)
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Controller
        control={control}
        name="roomId"
        rules={{ required: rules.required('Elige una sala.') }}
        render={({ field, fieldState }) => (
          <Select
            label="Sala"
            options={rooms.map((r) => ({ value: r.id, label: r.name, description: `${r.capacity} personas` }))}
            error={fieldState.error?.message}
            {...field}
          />
        )}
      />
      <Controller
        control={control}
        name="date"
        rules={{ required: rules.required('Indica la fecha.'), deps: ['startTime'] }}
        render={({ field, fieldState }) => (
          <DatePicker label="Fecha" min={todayISO()} error={fieldState.error?.message} {...field} />
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Inicio"
          type="time"
          step={900}
          error={errors.startTime?.message}
          {...register('startTime', {
            required: rules.required('Indica la hora de inicio.'),
            deps: ['endTime'],
            // «No se puede reservar en el pasado» goes on the start field.
            validate: (startTime) => {
              const { date, roomId } = getValues()
              const room = roomOf(roomId)
              return !room || !date || !isInPast(date, startTime, room.timezone) || 'No se puede reservar en el pasado.'
            },
          })}
        />
        <InputField
          label="Fin"
          type="time"
          step={900}
          error={errors.endTime?.message}
          {...register('endTime', {
            required: rules.required('Indica la hora de fin.'),
            // End > start and duration between 15 min and 4 h go on the end field.
            validate: (endTime) => {
              const { startTime } = getValues()
              if (!startTime) return true
              const duration = toMinutes(endTime) - toMinutes(startTime)
              if (duration <= 0) return 'Debe ser posterior al inicio.'
              if (duration < MIN_MINUTES) return 'Mínimo 15 minutos.'
              if (duration > MAX_MINUTES) return 'Máximo 4 horas.'
              return true
            },
          })}
        />
      </div>
      <InputField
        label="Título"
        placeholder="Ej. Planificación semanal"
        error={errors.title?.message}
        {...register('title', {
          validate: rules.notBlank('Pon un título a la reunión.'),
          maxLength: { value: 120, message: 'Máximo 120 caracteres.' },
        })}
      />
      <p className="text-sm text-muted-fg">Entre 15 minutos y 4 horas, en el horario de la sala.</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Reservar
        </Button>
      </div>
    </form>
  )
}
