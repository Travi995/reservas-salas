import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { useState } from 'react'
import { Alert, Button, InputField } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { applyApiError, rules } from '../../lib/forms'
import { AuthLayout } from './AuthLayout'
import { SocialButtons } from './SocialButtons'

interface LoginForm {
  email: string
  password: string
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ defaultValues: { email: '', password: '' } })

  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      applyApiError(err, setError, ['email', 'password'], setFormError)
    }
  })

  return (
    <AuthLayout title="Inicia sesión" subtitle="Reserva salas sin pisarte con nadie.">
      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: rules.required('Indica tu contraseña.') })}
        />
        {formError && <Alert>{formError}</Alert>}
        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          Entrar
        </Button>
      </form>
      <div className="mt-4">
        <SocialButtons action="login" />
      </div>
      <p className="mt-5 text-center text-sm text-muted-fg">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-semibold text-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </AuthLayout>
  )
}
