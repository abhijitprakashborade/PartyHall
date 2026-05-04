'use client'

export default function OfflinePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 flex items-center justify-center px-4">
            <div className="text-center">
                <div className="text-8xl mb-6">🎉</div>
                <h1 className="text-3xl font-bold text-white mb-3">You're offline</h1>
                <p className="text-purple-200 text-lg mb-8">
                    No internet connection. Please check your network and try again.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-purple-50 transition-colors"
                >
                    Try Again
                </button>
            </div>
        </div>
    )
}
