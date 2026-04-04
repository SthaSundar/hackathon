"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react"
import Image from "next/image"

export default function KYCPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [checkingStatus, setCheckingStatus] = useState(true)
    const [kycStatus, setKycStatus] = useState(null)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [previousNotes, setPreviousNotes] = useState("")
    
    const [formData, setFormData] = useState({
        photo: null,
        full_name: "",
        address: "",
        phone_number: "",
        citizenship: null,
        driving_license: null,
        passport: null,
    })
    
    const [previews, setPreviews] = useState({
        photo: null,
        citizenship: null,
        driving_license: null,
        passport: null,
    })

    useEffect(() => {
        if (status === "loading") return
        const hasLocalToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token")
        if (!session && !hasLocalToken) {
            router.push("/auth/signin")
            return
        }
        
        // Check KYC status
        const checkStatus = async () => {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
                // Build headers only when we have a bearer token to avoid CORS preflight on Google-only sign-in
                const headers = {}
                if (token) {
                    headers["Authorization"] = `Bearer ${token}`
                    headers["Content-Type"] = "application/json"
                }

                if (!process.env.NEXT_PUBLIC_API_URL) {
                    setCheckingStatus(false)
                    setError("API URL not configured")
                    return
                }
                
                let res;
                try {
                    res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/kyc/status/`, {
                        ...(token ? { headers } : {}),
                        signal: AbortSignal.timeout(10000)
                    });
                } catch (fetchError) {
                    // Silently handle connection errors - don't crash the app
                    if (fetchError.name === 'AbortError') {
                        console.warn("Request timeout - backend server may not be running");
                    } else if (fetchError.name === 'TypeError' && fetchError.message?.includes('fetch')) {
                        console.warn("Failed to connect to backend. Make sure Django server is running.");
                    } else {
                        console.warn("Failed to check KYC status", fetchError.message || fetchError);
                    }
                    setCheckingStatus(false);
                    return;
                }
                
                if (res.ok) {
                    const data = await res.json()
                    setKycStatus(data)
                    if (data.status === "rejected" && data.admin_notes) {
                        setPreviousNotes(data.admin_notes)
                    }
                    if (data.status === "approved") {
                        setSuccess("Your KYC is verified! You can now post services.")
                    }
                } else {
                    console.warn(`Failed to check KYC status: ${res.status} ${res.statusText}`);
                }
            } catch (e) {
                console.error("Failed to check KYC status", e)
            } finally {
                setCheckingStatus(false)
            }
        }
        checkStatus()
    }, [session, status, router])

    const handleFileChange = (field, file) => {
        if (file) {
            setFormData(prev => ({ ...prev, [field]: file }))
            
            // Create preview for images
            if (field === "photo" && file.type.startsWith("image/")) {
                const reader = new FileReader()
                reader.onload = (e) => {
                    setPreviews(prev => ({ ...prev, [field]: e.target.result }))
                }
                reader.readAsDataURL(file)
            } else {
                setPreviews(prev => ({ ...prev, [field]: file.name }))
            }
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setSuccess("")

        // Validate mandatory fields
        if (!formData.photo) {
            setError("Photo is required")
            setLoading(false)
            return
        }
        if (!formData.full_name.trim()) {
            setError("Full name is required")
            setLoading(false)
            return
        }
        if (!formData.address.trim()) {
            setError("Address is required")
            setLoading(false)
            return
        }
        if (!formData.phone_number.trim()) {
            setError("Phone number is required")
            setLoading(false)
            return
        }
        if (!formData.citizenship) {
            setError("Citizenship document is required")
            setLoading(false)
            return
        }

        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
            const headers = {}
            if (token) {
                headers["Authorization"] = `Bearer ${token}`
            } else if (session?.user?.email) {
                headers["X-User-Email"] = session.user.email
            }
            // Don't set Content-Type for FormData - browser will set it with boundary

            const formDataToSend = new FormData()
            formDataToSend.append("photo", formData.photo)
            formDataToSend.append("full_name", formData.full_name)
            formDataToSend.append("address", formData.address)
            formDataToSend.append("phone_number", formData.phone_number)
            formDataToSend.append("citizenship", formData.citizenship)
            
            if (formData.driving_license) {
                formDataToSend.append("driving_license", formData.driving_license)
            }
            if (formData.passport) {
                formDataToSend.append("passport", formData.passport)
            }

            // Ensure API URL is set
            if (!process.env.NEXT_PUBLIC_API_URL) {
                throw new Error("API URL not configured. Please set NEXT_PUBLIC_API_URL environment variable.")
            }

            // Ensure we have authentication
            if (!token && !session?.user?.email) {
                throw new Error("Authentication required. Please sign in first.")
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') // Remove trailing slash
            const endpoint = `${apiUrl}/accounts/kyc/submit/`
            
            console.log("=== KYC Submission Debug ===")
            console.log("API URL:", process.env.NEXT_PUBLIC_API_URL)
            console.log("Endpoint:", endpoint)
            console.log("Has token:", !!token)
            console.log("Token preview:", token ? token.substring(0, 20) + "..." : "none")
            console.log("Has session:", !!session?.user?.email)
            console.log("Session email:", session?.user?.email)
            console.log("FormData fields:", Array.from(formDataToSend.keys()))

            const res = await fetch(endpoint, {
                method: "POST",
                headers,
                body: formDataToSend,
            })

            // Check if response is HTML (error page)
            const contentType = res.headers.get("content-type") || ""
            console.log("Response status:", res.status)
            console.log("Response content-type:", contentType)
            
            if (!contentType.includes("application/json")) {
                const text = await res.text()
                console.error("=== NON-JSON RESPONSE DETECTED ===")
                console.error("Status:", res.status)
                console.error("Status Text:", res.statusText)
                console.error("Content-Type:", contentType)
                console.error("URL:", endpoint)
                console.error("Response Preview (first 1000 chars):", text.substring(0, 1000))
                console.error("Full Response Length:", text.length)
                
                // Try to extract error message from HTML
                let errorMsg = `Server error (${res.status})`
                if (text.includes("CSRF") || text.includes("csrf")) {
                    errorMsg = "CSRF verification failed. Please refresh the page and try again."
                } else if (text.includes("403") || text.includes("Forbidden")) {
                    errorMsg = "Access forbidden. Please check your authentication."
                } else if (text.includes("404") || text.includes("Not Found") || text.includes("Page not found")) {
                    errorMsg = `API endpoint not found: ${endpoint}\n\nPlease verify:\n1. Django server is running\n2. NEXT_PUBLIC_API_URL is set correctly (should be http://localhost:8000/api)\n3. The endpoint exists in the backend`
                } else if (text.includes("500") || text.includes("Internal Server Error")) {
                    // Try to extract Django error details
                    const errorMatch = text.match(/<pre[^>]*>(.*?)<\/pre>/s)
                    if (errorMatch) {
                        errorMsg = `Server error: ${errorMatch[1].substring(0, 200)}`
                    } else {
                        errorMsg = "Internal server error. Check Django server logs for details."
                    }
                } else if (text.includes("401") || text.includes("Unauthorized")) {
                    errorMsg = "Authentication failed. Please sign in again."
                }
                
                if (res.status === 401 || res.status === 403) {
                    throw new Error("Authentication failed. Please sign in again.")
                } else if (res.status === 404) {
                    throw new Error(`API endpoint not found: ${endpoint}\n\nCheck:\n1. Django server is running on port 8000\n2. NEXT_PUBLIC_API_URL=http://localhost:8000/api\n3. Backend URL routing is correct`)
                } else {
                    throw new Error(errorMsg)
                }
            }

            let data
            try {
                data = await res.json()
            } catch (parseError) {
                console.error("Failed to parse JSON response:", parseError)
                throw new Error("Invalid response from server. Please try again.")
            }

            if (!res.ok) {
                console.error("KYC submission failed:", {
                    status: res.status,
                    statusText: res.statusText,
                    data: data
                })
                const aggregateErrors = () => {
                    if (!data || typeof data !== "object") return null
                    const values = Object.values(data)
                    if (!values.length) return null
                    return values
                        .flat()
                        .filter(Boolean)
                        .map((val) => (typeof val === "string" ? val : JSON.stringify(val)))
                        .join(" ")
                }
                const message = data.error || data.detail || aggregateErrors() || `Failed to submit KYC (${res.status})`
                throw new Error(message)
            }

            setSuccess(data.message || "KYC form submitted successfully! Your documents have been sent for verification.")
            setKycStatus(data.kyc || { status: data.status || "pending" })
            if (data.previous_admin_notes) {
                setPreviousNotes(data.previous_admin_notes)
            }
            
            // Clear form
            setFormData({
                photo: null,
                full_name: "",
                address: "",
                phone_number: "",
                citizenship: null,
                driving_license: null,
                passport: null,
            })
            setPreviews({
                photo: null,
                citizenship: null,
                driving_license: null,
                passport: null,
            })

            setTimeout(() => {
                router.push("/dashboard")
            }, 2000)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (status === "loading" || checkingStatus) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!session && !(typeof window !== "undefined" && localStorage.getItem("npw_token"))) {
        return null
    }

    // Show status if already submitted
    if (kycStatus && kycStatus.status !== "not_submitted") {
        const statusConfig = {
            pending: {
                icon: Clock,
                color: "text-yellow-600",
                bgColor: "bg-yellow-50",
                borderColor: "border-yellow-200",
                message: "Your KYC form is being processed. It will take some time to verify."
            },
            approved: {
                icon: CheckCircle,
                color: "text-green-600",
                bgColor: "bg-green-50",
                borderColor: "border-green-200",
                message: "Your KYC is verified! You can now post services."
            },
            rejected: {
                icon: XCircle,
                color: "text-red-600",
                bgColor: "bg-red-50",
                borderColor: "border-red-200",
                message: "Your KYC was rejected. Please check admin notes and resubmit."
            }
        }

        const config = statusConfig[kycStatus.status] || statusConfig.pending
        const StatusIcon = config.icon

        return (
            <div className="min-h-screen bg-white py-8">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Card className={`border-2 ${config.borderColor}`}>
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4">
                                <StatusIcon className={`w-16 h-16 ${config.color}`} />
                            </div>
                            <CardTitle className={`text-2xl ${config.color}`}>
                                KYC Status: {(kycStatus.status_display || kycStatus.status || "").toString().toUpperCase()}
                            </CardTitle>
                            <CardDescription className="mt-2">
                                {config.message}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {kycStatus.admin_notes && (
                                <div className={`p-4 rounded-lg ${config.bgColor}`}>
                                    <h3 className="font-semibold mb-2">Admin Notes:</h3>
                                    <p className="text-sm">{kycStatus.admin_notes}</p>
                                </div>
                            )}
                            {kycStatus.status === "approved" && (
                                <Button onClick={() => router.push("/dashboard")} className="w-full">
                                    Go to Dashboard
                                </Button>
                            )}
                            {kycStatus.status === "rejected" && (
                                <Button onClick={() => { setPreviousNotes(kycStatus.admin_notes || previousNotes); setKycStatus({ status: "not_submitted" }) }} className="w-full">
                                    Resubmit KYC
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white py-8">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl text-blue-800">KYC Verification Form</CardTitle>
                            <CardDescription className="text-blue-700">
                                Complete your KYC verification to post services. Fields marked with * are mandatory.
                            </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                                {success}
                            </div>
                        )}
                        {previousNotes && (
                            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm">
                                <div className="font-semibold mb-1">Admin Notes from previous review:</div>
                                <div>{previousNotes}</div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Photo */}
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-2">
                                    Photo <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer hover:bg-blue-50">
                                        {previews.photo ? (
                                            <Image
                                                src={previews.photo}
                                                alt="Preview"
                                                width={128}
                                                height={128}
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <Upload className="w-8 h-8 mb-2 text-blue-500" />
                                                <p className="text-xs text-blue-600">Click to upload</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileChange("photo", e.target.files[0])}
                                            required
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-1">
                                    Address <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Enter your complete address"
                                    className="w-full border rounded-md p-2 min-h-[100px]"
                                    required
                                />
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-1">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="tel"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    placeholder="Enter your phone number"
                                    required
                                />
                            </div>

                            {/* Email (read-only from account) */}
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-1">
                                    Email
                                </label>
                                <Input
                                    type="email"
                                    value={session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("npw_user_email") : "")}
                                    disabled
                                    className="bg-gray-100"
                                />
                                <p className="text-xs text-blue-600 mt-1">Email is taken from your account</p>
                            </div>

                            {/* Citizenship */}
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-2">
                                    Citizenship Document <span className="text-red-500">*</span>
                                </label>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer hover:bg-blue-50">
                                    {previews.citizenship ? (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <CheckCircle className="w-8 h-8 mb-2 text-green-500" />
                                            <p className="text-sm text-blue-600">{previews.citizenship}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-2 text-blue-500" />
                                            <p className="text-sm text-blue-600">Click to upload citizenship</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={(e) => handleFileChange("citizenship", e.target.files[0])}
                                        required
                                    />
                                </label>
                            </div>

                            {/* Driving License (Optional) */}
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-2">
                                    Driving License (Optional)
                                </label>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer hover:bg-blue-50">
                                    {previews.driving_license ? (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <CheckCircle className="w-8 h-8 mb-2 text-green-500" />
                                            <p className="text-sm text-blue-600">{previews.driving_license}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-2 text-blue-500" />
                                            <p className="text-sm text-blue-600">Click to upload driving license</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={(e) => handleFileChange("driving_license", e.target.files[0])}
                                    />
                                </label>
                            </div>

                            {/* Passport (Optional) */}
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-2">
                                    Passport (Optional)
                                </label>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer hover:bg-blue-50">
                                    {previews.passport ? (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <CheckCircle className="w-8 h-8 mb-2 text-green-500" />
                                            <p className="text-sm text-blue-600">{previews.passport}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-2 text-blue-500" />
                                            <p className="text-sm text-blue-600">Click to upload passport</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={(e) => handleFileChange("passport", e.target.files[0])}
                                    />
                                </label>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1"
                                    size="lg"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        "Submit KYC Form"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/dashboard")}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
