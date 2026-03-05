import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wrapper component - authentication disabled.
 * All users can access protected routes without login.
 */
export default function ProtectedRoute({ children }) {
  // Authentication disabled - allow all access
  // Uncomment below to re-enable authentication
  /*
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <p className="text-4xl">🌿</p>
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }
  */

  return children
}
