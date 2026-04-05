"use client"

import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  })
  const roleParam = searchParams.get("role") || "client"
  // Map "client" to "customer" for backend, and "provider" stays the same
  const role = roleParam === "client" ? "customer" : roleParam
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    category: "flower_vendor"
  })

  const categories = [
    { id: "flower_vendor", label: "Flower Vendor", description: "Wholesale/retail cut flower sellers & farmers" },
    { id: "event_decorator", label: "Event Decorator", description: "Decorators for weddings, receptions, events" },
    { id: "nursery_amc", label: "Nursery / Office AMC", description: "Nurseries offering office plant care contracts" }
  ]

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        const localRole = (typeof window !== "undefined" && localStorage.getItem("npw_role")) || session.role || "customer"
        const redirectRole = localRole === "customer" ? "client" : localRole
        if (localRole === "customer") {
          router.push("/")
        } else {
          router.push(`/dashboard?role=${redirectRole}`)
        }
      }
    }
    checkSession()
  }, [router])

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true)
    setError("")
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("npw_role", role)
        if (role === "provider") {
          localStorage.setItem("npw_pending_category", formData.category)
        }
      }
      const redirectRole = role === "customer" ? "client" : role
      await signIn("google", {
        callbackUrl: redirectRole === "client" ? "/" : `/dashboard?role=${redirectRole}`,
        prompt: "select_account",
      })
    } catch (error) {
      console.error("Sign in error:", error)
      setError("Failed to sign in with Google")
      setIsLoadingGoogle(false)
    }
  }

  const validatePassword = (password) => {
    const validation = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
    }
    setPasswordValidation(validation)
    return Object.values(validation).every(v => v === true)
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value
    setFormData({ ...formData, password: newPassword })
    if (!isLogin && newPassword.length > 0) {
      validatePassword(newPassword)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    // Validate email
    if (!validateEmail(formData.email)) {
      setError("Please enter a valid email address")
      setIsLoading(false)
      return
    }

    // Validate password for signup
    if (!isLogin) {
      if (!validatePassword(formData.password)) {
        setError("Password does not meet requirements. Please check all criteria.")
        setIsLoading(false)
        return
      }
    }

    try {
      const url = isLogin 
        ? `${process.env.NEXT_PUBLIC_API_URL}/accounts/login/`
        : `${process.env.NEXT_PUBLIC_API_URL}/accounts/register/`
      
      const body = isLogin
        ? { email: formData.email, password: formData.password }
        : { 
            email: formData.email, 
            password: formData.password, 
            username: formData.username, 
            role,
            category: role === "provider" ? formData.category : null
          }

      let res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      let data = await res.json()

      if (!res.ok) {
        // If trying to sign up an already existing email for another role, attempt to add role via sync
        if (!isLogin && (res.status === 409 || (data?.error || "").toString().toLowerCase().includes("exist"))) {
          try {
            const syncAdd = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/sync/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: formData.email,
                username: formData.username,
                role,
                category: role === "provider" ? formData.category : null
              })
            })
            if (syncAdd.ok) {
              setSuccess("Role added to your existing account. Please sign in.")
              setIsLoading(false)
              setTimeout(() => {
                setIsLogin(true)
              }, 1500)
              return
            }
          } catch (_) {}
        }
        throw new Error(data.error || "Authentication failed")
      }

      // If signup, show success and redirect to sign-in
      if (!isLogin) {
        setSuccess(data.message || "Account created successfully! Redirecting to sign in...")
        setIsLoading(false)
        setTimeout(() => {
          setIsLogin(true)
          setFormData({ email: formData.email, password: "", username: "", category: "flower_vendor" })
          setSuccess("")
          setPasswordValidation({
            length: false,
            uppercase: false,
            lowercase: false,
            number: false,
            special: false
          })
        }, 2000)
        return
      }

      // Get the actual user role from backend response
      const actualRole = data.user.role || role
      
      // For login, store token and proceed to dashboard
      if (typeof window !== "undefined") {
        localStorage.setItem("npw_token", data.token)
        localStorage.setItem("npw_role", actualRole)
        if (data?.user?.email) localStorage.setItem("npw_user_email", data.user.email)
        if (data?.user?.name || formData.username) localStorage.setItem("npw_user_name", data.user.name || formData.username)
      }

      // Sync with NextAuth for session management with actual role from backend
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/sync/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.user.email,
            username: data.user.name || formData.username,
            role: actualRole, // Use actual role from backend
            category: data.user.category || (role === "provider" ? formData.category : null)
          }),
        })
      } catch (syncError) {
        console.warn("Sync error (non-critical):", syncError)
      }

      setSuccess("Successfully signed in!")
      
      const redirectRole = actualRole === "customer" ? "client" : actualRole
      setTimeout(() => {
        if (actualRole === "customer") {
          window.location.href = "/"
        } else if (actualRole === "admin") {
          window.location.href = "/admin"
        } else {
          window.location.href = `/dashboard?role=${redirectRole}`
        }
      }, 1000)

    } catch (err) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg shadow-2xl rounded-3xl border-primary/10 overflow-hidden">
        <div className="bg-primary/5 p-8 text-center border-b border-primary/10">
          <CardTitle className="text-3xl font-bold text-foreground">
            {isLogin ? "Welcome Back" : `Join as ${role === 'provider' ? 'Provider' : 'Client'}`}
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            {isLogin 
              ? "Access your account to manage your floral business" 
              : "Start your journey in Nepal's floriculture marketplace"}
          </CardDescription>
          
          <div className="mt-6 p-4 bg-primary/10 rounded-2xl border border-primary/20">
            <p className="text-sm font-medium text-foreground">
              Want to join as a {role === "provider" ? "client" : "service provider"}?{" "}
              <a 
                href={`/auth/signin?role=${role === "provider" ? "client" : "provider"}`}
                className="text-primary hover:underline font-bold"
              >
                Switch here
              </a>
            </p>
          </div>
        </div>

        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/70 ml-1">Username</label>
                <Input
                  placeholder="janesmith"
                  className="rounded-xl border-primary/20 focus:border-primary focus:ring-primary/20 h-12"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/70 ml-1">Email Address</label>
              <Input
                type="email"
                placeholder="name@example.com"
                className="rounded-xl border-primary/20 focus:border-primary focus:ring-primary/20 h-12"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/70 ml-1">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="rounded-xl border-primary/20 focus:border-primary focus:ring-primary/20 h-12 pr-10"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {!isLogin && formData.password.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-muted rounded-xl text-[11px]">
                  <div className={`flex items-center gap-1.5 ${passwordValidation.length ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${passwordValidation.length ? 'bg-secondary' : 'bg-muted-foreground/30'}`} />
                    8+ characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordValidation.uppercase ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${passwordValidation.uppercase ? 'bg-secondary' : 'bg-muted-foreground/30'}`} />
                    Uppercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordValidation.lowercase ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${passwordValidation.lowercase ? 'bg-secondary' : 'bg-muted-foreground/30'}`} />
                    Lowercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordValidation.number ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${passwordValidation.number ? 'bg-secondary' : 'bg-muted-foreground/30'}`} />
                    One number
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordValidation.special ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${passwordValidation.special ? 'bg-secondary' : 'bg-muted-foreground/30'}`} />
                    Special character
                  </div>
                </div>
              )}
            </div>

            {!isLogin && role === "provider" && (
              <div className="space-y-4 pt-2">
                <label className="text-sm font-bold text-foreground">Select Your Category</label>
                <div className="grid grid-cols-1 gap-3">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                        formData.category === cat.id
                          ? "border-primary bg-primary/5 ring-4 ring-primary/5"
                          : "border-primary/10 hover:border-primary/30"
                      }`}
                    >
                      <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        formData.category === cat.id ? "border-primary bg-primary" : "border-primary/20"
                      }`}>
                        {formData.category === cat.id && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${formData.category === cat.id ? "text-primary" : "text-foreground"}`}>
                          {cat.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl flex items-start gap-3 text-destructive text-sm animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-2xl flex items-start gap-3 text-secondary-foreground text-sm animate-in fade-in slide-in-from-top-1">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <p>{success}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 text-muted-foreground font-medium">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-14 rounded-2xl border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-center gap-3 font-semibold"
              onClick={handleGoogleSignIn}
              disabled={isLoadingGoogle}
            >
              {isLoadingGoogle ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center space-y-6">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError("")
                setSuccess("")
                setFormData({ email: "", password: "", username: "", category: "flower_vendor" })
                setPasswordValidation({
                  length: false,
                  uppercase: false,
                  lowercase: false,
                  number: false,
                  special: false
                })
              }}
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? (
                <>New to NepWork? <span className="text-primary underline decoration-2 underline-offset-4">Create an account</span></>
              ) : (
                <>Already have an account? <span className="text-primary underline decoration-2 underline-offset-4">Sign in</span></>
              )}
            </button>

            {role === "customer" && (
              <p className="text-sm text-center text-muted-foreground">
                Prefer phone?{" "}
                <Link href="/auth/register-client" className="text-primary font-bold underline underline-offset-4">
                  Sign up with OTP
                </Link>
              </p>
            )}

            <div className="pt-4 border-t border-primary/10">
              <p className="text-xs text-muted-foreground mb-3">
                By signing in, you agree to our{" "}
                <a href="/terms" className="text-primary hover:underline font-semibold">Terms</a>
                {" "}and{" "}
                <a href="/privacy" className="text-primary hover:underline font-semibold">Privacy Policy</a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <SignInForm />
    </Suspense>
  )
}
