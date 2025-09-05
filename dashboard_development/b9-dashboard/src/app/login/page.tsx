'use client'

import { login } from './actions'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background blur elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-b9-pink/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* B9 Agency Logo/Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image 
              src="/logo/logo.png" 
              alt="B9 Dashboard Logo" 
              width={160}
              height={80}
              className="h-20 w-auto object-contain drop-shadow-2xl"
              priority
            />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">B9 Dashboard</h2>
          <p className="text-lg text-gray-600 font-medium">Business Intelligence Platform</p>
        </div>
        
        {/* Frosted Glass Login Form */}
        <div className="mt-8 w-full">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-400/40 via-gray-500/30 to-gray-600/40 rounded-2xl blur-xl"></div>
            <div 
              className="relative rounded-2xl p-8 shadow-apple-strong border border-gray-400/30"
              style={{
                background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.5), rgba(107, 114, 128, 0.4), rgba(75, 85, 99, 0.5))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              <form className="space-y-6">
                <div>
                  <h2 className="text-center text-2xl font-bold text-gray-900 mb-8">
                    Sign in with authorized credentials
                  </h2>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                    Email address
                  </label>
                  <input 
                    id="email" 
                    name="email" 
                    type="email" 
                    autoComplete="email"
                    required 
                    className="glass-input w-full px-4 py-3 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-b9-pink focus:border-transparent text-gray-900 font-medium"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                    Password
                  </label>
                  <input 
                    id="password" 
                    name="password" 
                    type="password" 
                    autoComplete="current-password"
                    required 
                    className="glass-input w-full px-4 py-3 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-b9-pink focus:border-transparent text-gray-900 font-medium"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="flex flex-col space-y-4 pt-4">
                  <button 
                    formAction={login}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-apple text-white font-semibold transition-all duration-200 hover-lift"
                    style={{
                      background: 'linear-gradient(to right, #FF8395, rgba(255, 131, 149, 0.9))',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, rgba(255, 131, 149, 0.9), rgba(255, 131, 149, 0.8))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #FF8395, rgba(255, 131, 149, 0.9))';
                    }}
                  >
                    Sign In
                  </button>
                </div>
              </form>

              {/* Footer */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600 font-medium">
                  Authorized access only - B9 Dashboard platform
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
