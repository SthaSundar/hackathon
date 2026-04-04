"use client"

import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

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
    username: ""
  })

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
        : { email: formData.email, password: formData.password, username: formData.username, role }

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
          setFormData({ email: formData.email, password: "", username: "" })
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
        const syncRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/sync/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.user.email,
            username: data.user.name || formData.username,
            role: actualRole // Use actual role from backend
          }),
        })
        if (!syncRes.ok) {
          console.warn("Sync failed but continuing:", await syncRes.text())
        }
      } catch (syncError) {
        console.warn("Sync error (non-critical):", syncError)
      }

      // Redirect based on actual role from backend
      const redirectRole = actualRole === "customer" ? "client" : actualRole
      if (redirectRole === "client") {
        window.location.href = "/"
      } else if (redirectRole === "admin") {
        window.location.href = "/admin"
      } else {
        window.location.href = `/dashboard?role=${redirectRole}`
      }
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-indigo-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="NepWork Logo"
            width={80}
            height={80}
            className="mx-auto mb-4"
          />
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome to NepWork
          </h2>
          <p className="mt-2 text-sm text-blue-700">
            {role === "provider" 
              ? "Join as a service provider and showcase your skills"
              : "Find the best service providers for your needs"
            }
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {isLogin ? "Sign in" : "Create account"}
            </CardTitle>
            <CardDescription>
              {role === "provider" 
                ? "Connect with clients and grow your business"
                : "Discover and book amazing services"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <Input
                    type="text"
                    placeholder="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required={!isLogin}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                  {!isLogin && (
                    <span className="text-xs text-gray-500 ml-1">(8+ chars, uppercase, lowercase, number, special char)</span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    required
                    minLength={isLogin ? 6 : 8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {!isLogin && formData.password && (
                  <div className="mt-2 text-xs space-y-1">
                    <div className={passwordValidation.length ? "text-green-600" : "text-gray-500"}>
                      {passwordValidation.length ? "✓" : "○"} At least 8 characters
                    </div>
                    <div className={passwordValidation.uppercase ? "text-green-600" : "text-gray-500"}>
                      {passwordValidation.uppercase ? "✓" : "○"} One uppercase letter
                    </div>
                    <div className={passwordValidation.lowercase ? "text-green-600" : "text-gray-500"}>
                      {passwordValidation.lowercase ? "✓" : "○"} One lowercase letter
                    </div>
                    <div className={passwordValidation.number ? "text-green-600" : "text-gray-500"}>
                      {passwordValidation.number ? "✓" : "○"} One number
                    </div>
                    <div className={passwordValidation.special ? "text-green-600" : "text-gray-500"}>
                      {passwordValidation.special ? "✓" : "○"} One special character
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  isLogin ? "Sign In" : "Create Account"
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoadingGoogle || isLoading}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {isLoadingGoogle ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
                  Continue with Google
                </>
              )}
            </Button>

            <div className="text-center text-sm">
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError("")
                  setSuccess("")
                  setFormData({ email: "", password: "", username: "" })
                  setPasswordValidation({
                    length: false,
                    uppercase: false,
                    lowercase: false,
                    number: false,
                    special: false
                  })
                }}
                className="text-blue-600 hover:underline"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"}
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-600">
                By signing in, you agree to our{" "}
                <a href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>
                {" "}
                and{" "}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Want to join as a {role === "provider" ? "client" : "service provider"}?{" "}
            <a 
              href={`/auth/signin?role=${role === "provider" ? "client" : "provider"}`}
              className="text-blue-600 hover:underline font-medium"
            >
              Switch here
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
