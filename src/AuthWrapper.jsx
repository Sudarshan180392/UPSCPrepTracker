import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'

export default function AuthWrapper({ children }) {
  const [session, setSession]   = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    // Force validate session with Supabase server every time
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Extra check — verify session is still valid on server
        supabase.auth.getUser().then(({ data: { user }, error }) => {
          if (error || !user) {
            setSession(null) // Force logout if session invalid
          } else {
            setSession(session)
          }
          setLoading(false)
        })
      } else {
        setSession(null)
        setLoading(false)
      }
    })

    // Listen for login/logout changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session)
      } else {
        setSession(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthSuccess = useCallback((session) => {
    setSession(session)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  // Still checking session
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center animate-pulse">
            <span className="text-2xl">🎯</span>
          </div>
          <p className="text-slate-400 text-sm">Loading your tracker...</p>
        </div>
      </div>
    )
  }

  // Not logged in → show Auth screen
  if (!session) {
    return <Auth onAuthSuccess={handleAuthSuccess} />
  }

  // Logged in → show the app
  const user = session.user
  const displayName = user.user_metadata?.full_name
    || user.user_metadata?.name
    || user.phone
    || user.email
    || 'User'
  const avatar = user.user_metadata?.avatar_url || null

  return (
    <div>
      {/* ── User bar at top ── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {avatar ? (
            <img
              src={avatar}
              alt={displayName}
              className="w-7 h-7 rounded-full ring-2 ring-indigo-500/50"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-white leading-tight">{displayName}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{user.email || user.phone}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
        >
          Sign out
        </button>
      </div>

      {/* Spacer so content doesn't hide under user bar */}
      <div className="h-11" />

      {/* The actual app */}
      {children}
    </div>
  )
}