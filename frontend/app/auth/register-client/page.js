"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowLeft, Smartphone } from "lucide-react"

const API = () => (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")

export default function ClientRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [debugOtp, setDebugOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const startRegistration = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${API()}/accounts/register/client/start/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || "Could not send code")
      if (data.debug_otp) setDebugOtp(data.debug_otp)
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const confirmRegistration = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${API()}/accounts/register/client/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || "Verification failed")
      if (typeof window !== "undefined" && data.token) {
        localStorage.setItem("npw_token", data.token)
        localStorage.setItem("npw_role", "customer")
      }
      router.push("/")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-[28px] border-primary/15 shadow-xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Smartphone className="h-6 w-6" />
            <span className="text-xs font-black uppercase tracking-widest">Client only</span>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {step === 1 ? "Create your account" : "Enter verification code"}
          </CardTitle>
          <CardDescription className="text-muted-foreground leading-relaxed">
            {step === 1
              ? "Name, mobile, and password only. We text you a one-time code (dev: check API response / server log)."
              : `Code sent to ${phone}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button variant="ghost" asChild className="w-fit -ml-2 rounded-full text-primary font-semibold">
            <Link href="/auth/signin?role=client">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to sign in
            </Link>
          </Button>

          {error && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={startRegistration} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Full name</label>
                <Input
                  className="mt-1 h-12 rounded-xl border-primary/15"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Mobile (Nepal)</label>
                <Input
                  className="mt-1 h-12 rounded-xl border-primary/15"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98xxxxxxxx"
                  required
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Password</label>
                <Input
                  type="password"
                  className="mt-1 h-12 rounded-xl border-primary/15"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                  8+ characters with upper, lower, number, and special character.
                </p>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-full font-bold">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={confirmRegistration} className="space-y-4">
              {debugOtp && (
                <p className="text-xs font-mono bg-primary/10 text-primary px-3 py-2 rounded-xl">
                  Dev OTP: {debugOtp}
                </p>
              )}
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">6-digit code</label>
                <Input
                  className="mt-1 h-12 rounded-xl border-primary/15 tracking-[0.4em] text-center text-lg font-bold"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
              <Button type="submit" disabled={loading || otp.length < 6} className="w-full h-12 rounded-full font-bold">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & continue"}
              </Button>
              <Button type="button" variant="ghost" className="w-full rounded-full text-sm" onClick={() => setStep(1)}>
                Edit phone or start over
              </Button>
            </form>
          )}

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            After sign-up you can also sign in with email{" "}
            <span className="font-mono text-foreground">[your 10-digit mobile]@phone.npw.local</span> and your password.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
