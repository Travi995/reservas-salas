import { Controller, useForm, useWatch } from 'react-hook-form'
import { Button, Checkbox, DatePicker, Dialog, InputField, Select } from '../../components/ui'
import { api } from '../../lib/api'
import { applyApiError, rules } from '../../lib/forms'
import { notify } from '../../lib/notify'
import {
  formatPlainDate,
  isInPast,
  MAX_MINUTES,
  MAX_WEEKS,
  MIN_MINUTES,
  MIN_WEEKS,
  todayISO,
  toMinutes,
  weeklyDates,
} from '../../lib/time'
import type { ReservationInput, Room } from '../../lib/types'

interface ReservationDialogProps {
  open: boolean
  rooms: Room[]
  /** Pre-filled values; the weekly calendar also passes the clicked hour. */
  initial: { roomId: string; date: string; startTime?: string; endTime?: string }
  onClose: () => void
  onCreated: () => void
}

export function ReservationDialog({ open, rooms, initial, onClose, onCreated }: ReservationDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Nueva reserva">
      {/* key: resets the form each time it opens with a different room/date */}
      <ReservationForm
        key={`${initial.roomId}-${initial.date}-${initial.startTime}-${open}`}
        rooms={rooms}
        initial={initial}
        onClose={onClose}
        onCreated={onCreated}
      />
    </Dialog>
  )
}

interface ReservationFormValues extends ReservationInput {
  repeat: boolean
  weeks: number
}

const FIELDS = ['roomId', 'date', 'startTime', 'endTime', 'title', 'weeks'] as const

function ReservationForm({ rooms, initial, onClose, onCreated }: Omit<ReservationDialogProps, 'open'>) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormValues>({
    mode: 'onTouched',
    defaultValues: { startTime: '', endTime: '', ...initial, title: '', repeat: false, weeks: 4 },
  })

  const [repeat, weeks, date] = useWatch({ control, name: ['repeat', 'weeks', 'date'] })
  const validWeeks = Number.isInteger(weeks) && weeks >= MIN_WEEKS && weeks <= MAX_WEEKS
  const seriesDates = repeat && date && validWeeks ? weeklyDates(date, weeks) : []

  const roomOf = (id: string) => rooms.find((r) => r.id === id)

  const onSubmit = handleSubmit(async ({ repeat, weeks, ...values }) => {
    const input = { ...values, title: values.title.trim() }
    try {
      if (repeat) {
        // All or nothing: if any week clashes the API creates none and lists the dates (toast).
        const { reservations } = await api.createRecurringReservation({ ...input, weeks })
        notify.success(`Serie creada: ${reservations.length} reservas semanales.`)
      } else {
        await api.createReservation(input)
        notify.success('Reserva creada.')
      }
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
      <Checkbox
        label="Repetir cada semana"
        hint="Mismo día y horario. Si alguna semana choca, no se crea ninguna."
        {...register('repeat')}
      />
      {repeat && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <InputField
            label="Durante cuántas semanas"
            type="number"
            inputMode="numeric"
            min={MIN_WEEKS}
            max={MAX_WEEKS}
            error={errors.weeks?.message}
            {...register('weeks', {
              valueAsNumber: true,
              validate: (v) =>
                (Number.isInteger(v) && v >= MIN_WEEKS && v <= MAX_WEEKS) ||
                `Entre ${MIN_WEEKS} y ${MAX_WEEKS} semanas.`,
            })}
          />
          {seriesDates.length > 0 && (
            <p className="text-sm text-muted-fg" aria-live="polite">
              <span className="font-medium text-fg">{seriesDates.length} reservas:</span>{' '}
              {seriesDates.map((d) => formatPlainDate(d)).join(' · ')}
            </p>
          )}
        </div>
      )}
      <p className="text-sm text-muted-fg">Entre 15 minutos y 4 horas, en el horario de la sala.</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {repeat && validWeeks ? `Reservar ${weeks} semanas` : 'Reservar'}
        </Button>
      </div>
    </form>
  )
}
