import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { Button, InputField } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { applyApiError, rules } from '../../lib/forms'
import { notify } from '../../lib/notify'
import { AuthLayout } from './AuthLayout'
import { SocialButtons } from './SocialButtons'

const MIN_PASSWORD = 8

interface RegisterForm {
  name: string
  email: string
  password: string
}

export function RegisterPage() {
  const { register: signUp } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ mode: 'onTouched', defaultValues: { name: '', email: '', password: '' } })

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    try {
      await signUp(name.trim(), email.trim(), password)
      notify.success(`¡Bienvenido, ${name.trim()}!`)
      navigate('/', { replace: true })
    } catch (err) {
      applyApiError(err, setError, ['name', 'email', 'password'])
    }
  })

  return (
    <AuthLayout title="Crea tu cuenta" subtitle="Las cuentas nuevas tienen rol de miembro.">
      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <InputField
          label="Nombre"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name', {
            validate: rules.notBlank('Indica tu nombre.'),
            maxLength: { value: 80, message: 'Máximo 80 caracteres.' },
          })}
        />
        <InputField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: rules.required('Indica tu email.'), pattern: rules.email })}
        />
        <InputField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
          error={errors.password?.message}
          {...register('password', {
            required: rules.required('Indica tu contraseña.'),
            minLength: { value: MIN_PASSWORD, message: `Mínimo ${MIN_PASSWORD} caracteres.` },
          })}
        />
        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          Crear cuenta
        </Button>
      </form>
      <div className="mt-4">
        <SocialButtons action="register" />
      </div>
      <p className="mt-5 text-center text-sm text-muted-fg">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
