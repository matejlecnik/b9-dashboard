'use client'

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-b9-pink mb-2">B9 Agency</h1>
          <p className="text-lg text-gray-600">Reddit Dashboard</p>
        </div>
        
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-red-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-black mb-4">Authentication Error</h2>
              <p className="text-gray-600 mb-6">
                Sorry, there was a problem with your authentication. This could be due to:
              </p>
              <ul className="text-left text-sm text-gray-600 mb-8 space-y-2">
                <li>• Invalid email or password</li>
                <li>• Account not found or not verified</li>
                <li>• Temporary authentication service issue</li>
              </ul>
              
              <div className="space-y-4">
                <a
                  href="/login"
                  className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-b9-pink hover:bg-b9-pink/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-b9-pink font-medium transition-colors"
                >
                  Try Again
                </a>
                
                <p className="text-xs text-gray-500">
                  If you continue to experience issues, please contact the B9 Agency team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
