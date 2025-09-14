export default function TrackingDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Tracking Dashboard
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            Cross-platform performance tracking and ROI analytics
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-full font-medium">
            Beta Access Available
          </div>
        </div>
      </div>
    </div>
  )
}