'use client'

import { login } from './actions'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useActionState } from 'react'

export default function LoginPage() {
  const [rememberMe, setRememberMe] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [envWarning, setEnvWarning] = useState('')
  const [state, formAction, isPending] = useActionState(login, { error: '' })
  
  // Defensive programming: ensure formAction is available
  const safeFormAction = formAction || (() => {
    console.warn('Form action not available, possibly due to server action configuration')
  })

  const isLoading = isPending // Use isPending from useActionState for better UX

  useEffect(() => {
    setIsClient(true)
    
    // Check environment variables on client side
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setEnvWarning('Authentication service may be unavailable. Please check configuration.')
    }
  }, [])

  // Prevent hydration mismatch by showing loading state during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-32 h-16 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Interactive Pink-Themed Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large floating orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-b9-pink/25 to-rose-400/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-300/20 to-rose-500/15 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-rose-200/15 to-pink-400/10 rounded-full blur-3xl animate-pulse-gentle"></div>
        
        {/* Medium accent orbs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-b9-pink/30 to-transparent rounded-full blur-2xl animate-float-medium"></div>
        <div className="absolute bottom-32 right-24 w-24 h-24 bg-gradient-to-br from-rose-300/25 to-transparent rounded-full blur-xl animate-float-slow-reverse"></div>
        <div className="absolute top-3/4 left-10 w-20 h-20 bg-gradient-to-br from-pink-200/20 to-transparent rounded-full blur-lg animate-bounce-gentle"></div>
        
        {/* Small sparkle particles */}
        <div className="absolute top-1/4 right-1/3 w-8 h-8 bg-b9-pink/40 rounded-full blur-sm animate-twinkle"></div>
        <div className="absolute bottom-1/3 left-1/4 w-6 h-6 bg-pink-300/35 rounded-full blur-sm animate-twinkle-delay"></div>
        <div className="absolute top-2/3 right-1/4 w-4 h-4 bg-pink-400/30 rounded-full blur-sm animate-float-tiny"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* B9 Agency Logo */}
        <div className="text-center mb-12">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-b9-pink/30 via-pink-400/20 to-pink-300/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 animate-pulse"></div>
              <Image 
                src="/logo/logo.png" 
                alt="B9 Agency Logo" 
                width={200}
                height={100}
                className="relative h-24 w-auto object-contain drop-shadow-2xl filter brightness-110 contrast-110 hover:scale-105 transition-all duration-500"
                priority
              />
            </div>
          </div>
        </div>
        
        {/* Pink-Themed Frosted Glass Login Form */}
        <div className="mt-8 w-full">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-b9-pink/30 via-rose-300/25 to-pink-400/20 rounded-2xl blur-xl"></div>
            <div 
              className="relative rounded-2xl p-10 shadow-apple-strong border border-pink-200/30 animated-pink-gradient-bg"
              style={{
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 8px 32px rgba(255, 131, 149, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              }}
            >
              <form className="space-y-7" role="form" aria-labelledby="signin-title" action={safeFormAction}>
                <div>
                  <h2 id="signin-title" className="text-center text-xl font-semibold text-gray-800 mb-10 tracking-wide">
                    Sign In
                  </h2>
                </div>

                {/* Environment Warning Display */}
                {envWarning && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-100/60 to-yellow-200/40 rounded-xl blur-sm"></div>
                    <div 
                      className="relative p-4 rounded-xl border border-yellow-300/50 text-gray-900 text-sm font-medium"
                      style={{
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.8), rgba(252, 211, 77, 0.6))',
                      }}
                      role="alert"
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-800" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {envWarning}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message Display */}
                {state?.error && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-100/60 to-pink-200/40 rounded-xl blur-sm"></div>
                    <div 
                      className="relative p-4 rounded-xl border border-gray-300/50 text-gray-900 text-sm font-medium"
                      style={{
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        background: 'linear-gradient(135deg, rgba(254, 226, 226, 0.8), rgba(252, 165, 165, 0.6))',
                      }}
                      role="alert"
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-800" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {state.error}
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <label htmlFor="email" className="block text-sm font-medium text-pink-700/80 mb-3 tracking-wide">
                    Email Address
                  </label>
                  <div className="relative group">
                    <input 
                      id="email" 
                      name="email" 
                      type="email" 
                      autoComplete="email"
                      required 
                      aria-required="true"
                      aria-describedby="email-desc"
                      className="pink-glass-input w-full px-6 py-4 rounded-2xl placeholder-rose-400/60 focus:outline-none text-gray-800 font-medium transition-all duration-500 group-hover:shadow-pink-glow"
                      placeholder="your@email.com"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-b9-pink/10 to-rose-300/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  <div id="email-desc" className="sr-only">
                    Enter your email address to sign in to your B9 Dashboard account
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="password" className="block text-sm font-medium text-pink-700/80 mb-3 tracking-wide">
                    Password
                  </label>
                  <div className="relative group">
                    <input 
                      id="password" 
                      name="password" 
                      type="password" 
                      autoComplete="current-password"
                      required 
                      aria-required="true"
                      aria-describedby="password-desc"
                      className="pink-glass-input w-full px-6 py-4 rounded-2xl placeholder-rose-400/60 focus:outline-none text-gray-800 font-medium transition-all duration-500 group-hover:shadow-pink-glow"
                      placeholder="••••••••••••"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-b9-pink/10 to-rose-300/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  <div id="password-desc" className="sr-only">
                    Enter your account password
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center pt-2 pb-4">
                  <div className="flex items-center group">
                    <input 
                      type="checkbox" 
                      name="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                      aria-describedby="remember-desc"
                      id="remember-me-checkbox"
                    />
                    <label htmlFor="remember-me-checkbox" className="flex items-center cursor-pointer">
                      <div className="relative mr-3">
                        <div className={`w-5 h-5 border-2 rounded-md transition-all duration-300 hover:border-b9-pink/80 ${
                          rememberMe 
                            ? 'bg-gradient-to-br from-b9-pink to-rose-400 border-b9-pink/80' 
                            : 'bg-white/60 border-pink-200/60'
                        }`}></div>
                        <div className={`absolute inset-0 w-5 h-5 bg-gradient-to-br from-b9-pink to-rose-400 rounded-md transition-opacity duration-300 pointer-events-none ${
                          rememberMe ? 'opacity-0' : 'opacity-0 hover:opacity-20'
                        }`}></div>
                        <svg className={`absolute inset-0 w-3 h-3 m-1 text-white transition-opacity duration-200 pointer-events-none ${
                          rememberMe ? 'opacity-100' : 'opacity-0'
                        }`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm text-pink-700/70 font-medium hover:text-pink-600 transition-colors duration-200 select-none">
                        Remember me
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-4 px-6 border border-transparent rounded-2xl shadow-apple text-white font-semibold text-base tracking-wide transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] overflow-hidden focus:outline-none focus:ring-4 focus:ring-b9-pink/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    aria-describedby="signin-desc"
                    style={{
                      background: 'linear-gradient(135deg, #FF8395 0%, #E91E63 30%, #FF8395 60%, #F8BBD9 100%)',
                      backgroundSize: '300% 300%',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundPosition = '100% 0%';
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 20px 40px rgba(255, 131, 149, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundPosition = '0% 0%';
                      e.currentTarget.style.transform = 'translateY(0px) scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 131, 149, 0.2)';
                    }}
                  >
                    {/* Button shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%] skew-x-12"></div>
                    
                    <span className="relative z-10 flex items-center justify-center">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Signing In...</span>
                        </>
                      ) : (
                        <>
                          <span className="mr-2">Sign In</span>
                          <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </div>

                {/* Screen reader descriptions */}
                <div className="sr-only">
                  <div id="remember-desc">Keep me signed in on this device</div>
                  <div id="signin-desc">Sign in to access your B9 Dashboard</div>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
