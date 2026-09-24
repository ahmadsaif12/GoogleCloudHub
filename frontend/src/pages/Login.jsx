import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, User } from 'lucide-react'
import { useApp } from '../context/AppContext'

const Login = ({ mode = 'login' }) => {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const { login, register } = useApp()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  const [isLoading, setIsLoading] = useState(false)

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const success = isRegister
        ? await register(form.name, form.email, form.password)
        : await login(form.email, form.password)

      if (success) {
        navigate('/')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-zinc-900">
      <div className="md:w-1/2 p-8 md:p-12 lg:p-16 bg-gradient-to-br from-orange-50 via-zinc-50 to-red-50 border-b md:border-b-0 md:border-r border-zinc-200 flex flex-col justify-between relative overflow-hidden">
        <div className='absolute inset-0 bg-[url("/pattern.svg")] bg-cover opacity-40' />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="Drivea Logo"
            className="w-9 h-9 object-contain"
          />

          <span className="text-2xl font-semibold tracking-tight">
            DRIVEA
          </span>
        </div>

        <div className="relative z-10 my-16 md:my-0">
          <h1 className="text-4xl lg:text-5xl font-medium leading-tight tracking-tight">
            Secure, Simple & Fast
            <br />
            <span className="text-orange-600">Cloud Storage.</span>
          </h1>

          <p className="mt-6 max-w-md text-sm leading-6 text-zinc-500">
            Store your files securely in our drive, organize into folders,
            share with permissions and access anywhere.
          </p>
        </div>

        <p className="relative z-10 text-xs text-zinc-400">
          © 2026 Drivea. All rights reserved.
        </p>
      </div>

      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-7">
            <h2 className="text-2xl font-medium text-zinc-900">
              {isRegister ? 'Create an account' : 'Welcome back'}
            </h2>

            <p className="mt-1 text-xs text-zinc-400">
              {isRegister
                ? 'Enter your details below to get started with 1 GB free storage'
                : 'Enter your credentials to access your Drive'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block mb-2 text-xs font-medium text-zinc-600">
                  Full Name <span className="text-orange-600">*</span>
                </label>

                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />

                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-zinc-200 outline-none text-sm placeholder:text-zinc-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block mb-2 text-xs font-medium text-zinc-600">
                Email Address <span className="text-orange-600">*</span>
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-zinc-200 outline-none text-sm placeholder:text-zinc-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-xs font-medium text-zinc-600">
                Password <span className="text-orange-600">*</span>
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />

                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-zinc-200 outline-none text-sm placeholder:text-zinc-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-medium transition"
            >
              {isLoading
                ? 'Please wait...'
                : isRegister
                  ? 'Register Account'
                  : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-400">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sign in here
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Create account
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login