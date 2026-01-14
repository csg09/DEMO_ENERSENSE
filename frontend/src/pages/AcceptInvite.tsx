import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      setError('Invalid invite link. Please check the URL.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!/[a-zA-Z]/.test(password)) {
      setError('Password must contain at least one letter')
      return
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to accept invite')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Account Activated!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your account has been successfully activated. You can now log in with your email and password.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">SmartSense</h1>
          <p className="text-gray-500">Set up your account</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {!token && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg">
            <AlertCircle size={20} />
            No invite token provided. Please use the link from your invite email.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium mb-2">
              Invite Token
            </label>
            <input
              id="token"
              type="text"
              value={token}
              readOnly
              className="w-full px-4 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength={8}
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters with a letter and number
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Activating...' : 'Activate Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-primary hover:underline">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
