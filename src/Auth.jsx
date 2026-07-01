import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/* ─── Phone formatting helper ─── */
function formatPhone(raw) {
  // Strip everything except digits and leading +
  const cleaned = raw.replace(/[^\d+]/g, '')
  // Add +91 if user types without country code (Indian number assumed)
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.length === 10) return `+91${cleaned}`
  return cleaned
}

/* ─── Spinner ─── */
function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )
}

/* ══════════════════════════════════════════════
   MAIN AUTH COMPONENT
   ══════════════════════════════════════════════ */
export default function Auth({ onAuthSuccess }) {
  const [tab, setTab]           = useState('google')   // 'google' | 'phone'
  const [phone, setPhone]       = useState('')
  const [otp, setOtp]           = useState('')
  const [step, setStep]         = useState('phone')    // 'phone' | 'otp'
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [message, setMessage]   = useState('')
  const [countdown, setCountdown] = useState(0)

  /* ── OTP resend countdown ── */
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  /* ── Listen for auth state (handles Google redirect) ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) onAuthSuccess(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) onAuthSuccess(session)
    })

    return () => subscription.unsubscribe()
  }, [onAuthSuccess])

  /* ── Google Sign In ── */
  async function handleGoogleLogin() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // If no error, Google redirects — loading stays true
  }

  /* ── Send OTP ── */
  async function handleSendOtp() {
    setError('')
    const formatted = formatPhone(phone)
    if (formatted.length < 10) {
      setError('Please enter a valid phone number.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setStep('otp')
      setMessage(`OTP sent to ${formatted}`)
      setCountdown(60)
    }
  }

  /* ── Verify OTP ── */
  async function handleVerifyOtp() {
    setError('')
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP.')
      return
    }
    setLoading(true)
    const formatted = formatPhone(phone)
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: otp,
      type: 'sms',
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else if (data.session) {
      onAuthSuccess(data.session)
    }
  }

  /* ── Resend OTP ── */
  async function handleResend() {
    setOtp('')
    setError('')
    setMessage('')
    await handleSendOtp()
  }

  /* ── Reset phone flow ── */
  function resetPhone() {
    setStep('phone')
    setOtp('')
    setError('')
    setMessage('')
    setCountdown(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">

      {/* Glow blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 z-10 my-8">

        {/* Quote & Portrait Card */}
        <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
          <div className="relative w-44 h-44 md:w-48 md:h-48 rounded-2xl overflow-hidden border-2 border-indigo-500/30 shadow-lg mb-6 group transition-all duration-500 hover:border-indigo-500/70">
            <img 
              src="/Krishna.png" 
              alt="Shri Krishna Image"
              className="w-full h-full object-cover object-top scale-105 group-hover:scale-100 transition-all duration-500 filter contrast-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          </div>
          <blockquote className="space-y-3">
            <p className="text-lg md:text-xl font-medium text-indigo-100 italic leading-relaxed">
              "उद्धरेदात्मनात्मानं नात्मानमवसादयेत् ।आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ॥" <p> One must elevate oneself by one's own mind, not degrade oneself. The mind is the friend of the conditioned soul, and his enemy as well." </p>
            </p>
            <cite className="block text-sm font-semibold tracking-wider text-amber-400 not-italic uppercase font-semibold">
              — Shri Krishna
            </cite>
          </blockquote>
        </div>

        {/* Auth Form Column */}
        <div className="w-full max-w-md">

          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/40 mb-4">
              <span className="text-3xl">🎯</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">UPSC/SPSC PrepSheet</h1>
            <p className="text-indigo-300 text-sm mt-1">30-Days Tracker · UPSC/SPSC Prep </p>
          </div>

          {/* Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

            <h2 className="text-lg font-semibold text-white mb-1">Sign in to continue</h2>
            <p className="text-slate-400 text-sm mb-6">Your data is saved securely to your account.</p>

            {/* Tab switcher */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
              <button
                onClick={() => { setTab('google'); setError(''); setMessage('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === 'google'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Enter your ✉️ Gmail
              </button>
              {/* <button
                onClick={() => { setTab('phone'); setError(''); setMessage(''); resetPhone() }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === 'phone'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📱 Phone OTP
              </button> */}
            </div>

            {/* ── GOOGLE TAB ── */}
            {tab === 'google' && (
              <div>
                <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                  Sign in with your Google account. Quick, secure, and no password needed.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-slate-800 font-semibold text-sm hover:bg-slate-100 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Spinner /><span>Redirecting to Google...</span></>
                  ) : (
                    <>
                      {/* Google SVG icon */}
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── PHONE TAB ── */}
            {tab === 'phone' && (
              <div>
                {step === 'phone' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                        Phone Number
                      </label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm font-mono whitespace-nowrap">
                          🇮🇳 +91
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10-digit mobile number"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono tracking-wider"
                          onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                        />
                      </div>
                      <p className="text-slate-500 text-xs mt-1.5">Enter your 10-digit Indian mobile number</p>
                    </div>
                    <button
                      onClick={handleSendOtp}
                      disabled={loading || phone.length !== 10}
                      className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? <><Spinner /> Sending OTP...</> : 'Send OTP →'}
                    </button>
                  </div>
                )}

                {step === 'otp' && (
                  <div className="space-y-4">
                    {/* Back button */}
                    <button onClick={resetPhone} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
                      ← Change number
                    </button>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                        Enter OTP
                      </label>
                      <p className="text-slate-400 text-xs mb-3">
                        Sent to <span className="text-indigo-400 font-mono">+91 {phone}</span>
                      </p>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="• • • • • •"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-2xl text-center placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono tracking-[1rem]"
                        onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                        autoFocus
                      />
                    </div>

                    <button
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length !== 6}
                      className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? <><Spinner /> Verifying...</> : '✓ Verify & Sign In'}
                    </button>

                    {/* Resend */}
                    <div className="text-center">
                      {countdown > 0 ? (
                        <p className="text-slate-500 text-sm">Resend OTP in <span className="text-indigo-400 font-mono">{countdown}s</span></p>
                      ) : (
                        <button onClick={handleResend} className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                          Didn't receive it? Resend OTP
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <span className="text-red-400 text-sm mt-0.5">⚠</span>
                <p className="text-red-400 text-sm leading-relaxed">{error}</p>
              </div>
            )}

            {/* Success message */}
            {message && !error && (
              <div className="mt-4 flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
                <span className="text-emerald-400 text-sm mt-0.5">✓</span>
                <p className="text-emerald-400 text-sm">{message}</p>
              </div>
            )}

          </div>

          {/* Footer note */}
          <p className="text-center text-slate-600 text-xs mt-6">
            By signing in you agree to use this app for UPSC/SPSC preparation only.<br />
            Your data is private and stored securely.
          </p>

        </div>
      </div>
    </div>
  )
}