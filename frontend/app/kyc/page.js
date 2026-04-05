"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, CheckCircle, Clock, XCircle, AlertCircle, ShieldCheck } from "lucide-react"
import Image from "next/image"

export default function KYCPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [checkingStatus, setCheckingStatus] = useState(true)
    const [kycStatus, setKycStatus] = useState(null)
    const [step, setStep] = useState(1)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [previousNotes, setPreviousNotes] = useState("")
    
    const [formData, setFormData] = useState({
        category: "",
        photo: null,
        trade_certificate: null,
        full_name: "",
        address: "",
        phone_number: "",
        citizenship: null,
        driving_license: null,
        passport: null,
    })
    
    const [previews, setPreviews] = useState({
        photo: null,
        trade_certificate: null,
        citizenship: null,
        driving_license: null,
        passport: null,
    })

    const categories = [
        { id: "flower_vendor", label: "Flower Vendor", description: "Wholesale/retail cut flower sellers & farmers" },
        { id: "event_decorator", label: "Event Decorator", description: "Decorators for weddings, receptions, events" },
        { id: "nursery_amc", label: "Nursery / Office AMC", description: "Nurseries offering office plant care contracts" }
    ]

    useEffect(() => {
        if (status === "loading") return
        const isBrowser = typeof window !== "undefined"
        const localToken = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null
        
        if (!session && !localToken) {
            router.push("/auth/signin")
            return
        }

        // Try to get pre-selected category
        const pendingCategory = isBrowser ? localStorage.getItem("npw_pending_category") : null
        if (pendingCategory) {
            setFormData(prev => ({ ...prev, category: pendingCategory }))
            setStep(2) // Skip category selection if already chosen
        }
        
        // Check KYC status and user category
        const checkStatus = async () => {
            try {
                const token = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null
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
                    console.warn("Failed to connect to backend", fetchError);
                    setCheckingStatus(false);
                    return;
                }
                
                if (res.ok) {
                    const data = await res.json()
                    setKycStatus(data)
                    
                    if (data.user_category) {
                        setFormData(prev => ({ ...prev, category: data.user_category }))
                        setStep(2)
                    }

                    if (data.status === "rejected" && data.admin_notes) {
                        setPreviousNotes(data.admin_notes)
                    }
                    if (data.status === "approved") {
                        setSuccess("Your KYC is verified! You can now post services.")
                    }
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

        // Comprehensive validation
        const phoneRegex = /^(98|97|96)\d{8}$/
        
        if (!formData.full_name.trim()) {
            setError("Full name is required as per your legal ID")
            setLoading(false)
            return
        }
        if (!formData.phone_number.trim()) {
            setError("Contact number is required")
            setLoading(false)
            return
        }
        if (!phoneRegex.test(formData.phone_number.trim())) {
            setError("Please enter a valid Nepal phone number (e.g., 98XXXXXXXX)")
            setLoading(false)
            return
        }
        if (!formData.address.trim()) {
            setError("Current address is required")
            setLoading(false)
            return
        }
        if (!formData.photo) {
            setError("Profile photo is mandatory for identity verification")
            setLoading(false)
            return
        }
        if (!formData.citizenship) {
            setError("Citizenship document upload is required")
            setLoading(false)
            return
        }
        
        // NEW: Business certificate is now mandatory for ALL roles
        if (!formData.trade_certificate) {
            setError("Trade/Business Certificate is now mandatory for all service providers.")
            setLoading(false)
            return
        }

        try {
            const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken;
            const headers = {}
            if (token) {
                headers["Authorization"] = `Bearer ${token}`
            } else if (session?.user?.email) {
                headers["X-User-Email"] = session.user.email
            }

            const formDataToSend = new FormData()
            formDataToSend.append("photo", formData.photo)
            formDataToSend.append("full_name", formData.full_name)
            formDataToSend.append("address", formData.address)
            formDataToSend.append("phone_number", formData.phone_number)
            formDataToSend.append("citizenship", formData.citizenship)
            formDataToSend.append("category", formData.category)

            if (formData.trade_certificate) {
                formDataToSend.append("trade_certificate", formData.trade_certificate)
            }
            
            if (formData.driving_license) formDataToSend.append("driving_license", formData.driving_license)
            if (formData.passport) formDataToSend.append("passport", formData.passport)

            const apiUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
            const res = await fetch(`${apiUrl}/accounts/kyc/submit/`, {
                method: "POST",
                headers,
                body: formDataToSend,
            })

            const contentType = res.headers.get("content-type") || ""
            if (!contentType.includes("application/json")) {
                throw new Error(`Server error (${res.status})`)
            }

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || data.detail || "Failed to submit KYC")
            }

            setSuccess(data.message || "KYC form submitted successfully!")
            setKycStatus(data.kyc || { status: "pending" })
            
            // Clear local storage pending category
            if (typeof window !== "undefined") {
                localStorage.removeItem("npw_pending_category")
            }

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
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
            </div>
        )
    }

    // Show status if already submitted
    if (kycStatus && kycStatus.status !== "not_submitted") {
        const statusConfig = {
            pending: {
                icon: Clock,
                color: "text-yellow-600",
                bgColor: "bg-yellow-50",
                borderColor: "border-yellow-200",
                message: "Your verification is in progress. We'll notify you once approved."
            },
            approved: {
                icon: CheckCircle,
                color: "text-secondary-foreground",
                bgColor: "bg-secondary/10",
                borderColor: "border-secondary/20",
                message: "Verified! You can now access all features of NepWork."
            },
            rejected: {
                icon: XCircle,
                color: "text-destructive",
                bgColor: "bg-destructive/5",
                borderColor: "border-destructive/20",
                message: "Verification failed. Please resubmit with correct documents."
            }
        }

        const config = statusConfig[kycStatus.status] || statusConfig.pending
        const StatusIcon = config.icon

        return (
            <div className="min-h-screen bg-background py-12 px-4">
                <div className="max-w-2xl mx-auto">
                    <Card className={`border-2 rounded-3xl overflow-hidden shadow-xl ${config.borderColor}`}>
                        <CardHeader className={`text-center py-12 ${config.bgColor}`}>
                            <div className="mx-auto mb-6">
                                <StatusIcon className={`w-20 h-20 ${config.color}`} />
                            </div>
                            <CardTitle className={`text-3xl font-bold ${config.color}`}>
                                {kycStatus.status.toUpperCase()}
                            </CardTitle>
                            <CardDescription className="text-lg mt-2 font-medium">
                                {config.message}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            {kycStatus.admin_notes && (
                                <div className="p-6 rounded-2xl bg-muted border border-primary/5">
                                    <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                                        <AlertCircle size={18} className="text-primary" />
                                        Admin Feedback
                                    </h3>
                                    <p className="text-muted-foreground leading-relaxed">{kycStatus.admin_notes}</p>
                                </div>
                            )}
                            
                            {kycStatus.status === "rejected" ? (
                                <Button onClick={() => setKycStatus(null)} className="w-full h-14 rounded-2xl text-lg font-bold">
                                    Resubmit Documents
                                </Button>
                            ) : (
                                <Button onClick={() => router.push("/dashboard")} className="w-full h-14 rounded-2xl text-lg font-bold">
                                    Go to Dashboard
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-foreground mb-3">Identity Verification</h1>
                    <p className="text-muted-foreground text-lg">Help us maintain a trusted marketplace for Kathmandu's floral industry.</p>
                </div>

                <Card className="rounded-3xl shadow-2xl border-primary/10 overflow-hidden">
                    {step === 1 ? (
                        <CardContent className="p-8">
                            <div className="space-y-8">
                                <div className="text-center">
                                    <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold mb-2">Select Your Category</h2>
                                    <p className="text-muted-foreground">Different categories require specific documentation.</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {categories.map((cat) => (
                                        <div
                                            key={cat.id}
                                            onClick={() => setFormData({ ...formData, category: cat.id })}
                                            className={`cursor-pointer p-6 rounded-2xl border-2 transition-all flex items-start gap-5 ${
                                                formData.category === cat.id
                                                    ? "border-primary bg-primary/5 ring-4 ring-primary/5 shadow-inner"
                                                    : "border-primary/10 hover:border-primary/30"
                                            }`}
                                        >
                                            <div className={`mt-1 h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                                                formData.category === cat.id ? "border-primary bg-primary" : "border-primary/20"
                                            }`}>
                                                {formData.category === cat.id && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`font-bold text-lg ${formData.category === cat.id ? "text-primary" : "text-foreground"}`}>
                                                    {cat.label}
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                                    {cat.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button 
                                    onClick={() => formData.category && setStep(2)} 
                                    disabled={!formData.category}
                                    className="w-full h-14 rounded-2xl text-lg font-bold"
                                >
                                    Continue to Documents
                                </Button>
                            </div>
                        </CardContent>
                    ) : (
                        <CardContent className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="rounded-full">← Back</Button>
                                    <div className="h-1 flex-1 bg-primary/10 rounded-full">
                                        <div className="h-full w-full bg-primary rounded-full transition-all duration-500" />
                                    </div>
                                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Documents</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Personal Info */}
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-lg border-b border-primary/10 pb-2">Personal Information</h3>
                                        
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-muted-foreground">Full Name (as per ID)</label>
                                            <Input
                                                placeholder="Enter your full name"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                className="rounded-xl h-12"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-muted-foreground">Contact Number</label>
                                            <Input
                                                placeholder="98XXXXXXXX"
                                                value={formData.phone_number}
                                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                                className="rounded-xl h-12"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-muted-foreground">Current Address</label>
                                            <Input
                                                placeholder="City, Area, Street"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                className="rounded-xl h-12"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Document Uploads */}
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-lg border-b border-primary/10 pb-2">Identity Documents</h3>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-muted-foreground">Profile Photo</label>
                                                <div 
                                                    onClick={() => document.getElementById('photo-upload').click()}
                                                    className={`aspect-square rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center transition-all overflow-hidden relative ${
                                                        previews.photo ? "border-primary" : "border-primary/20 hover:border-primary/50"
                                                    }`}
                                                >
                                                    {previews.photo ? (
                                                        <Image src={previews.photo} alt="Preview" fill className="object-cover" />
                                                    ) : (
                                                        <>
                                                            <Upload className="h-6 w-6 text-primary mb-2" />
                                                            <span className="text-[10px] font-bold text-muted-foreground">Upload Photo</span>
                                                        </>
                                                    )}
                                                </div>
                                                <input id="photo-upload" type="file" hidden accept="image/*" onChange={(e) => handleFileChange("photo", e.target.files[0])} />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-muted-foreground">Citizenship ID</label>
                                                <div 
                                                    onClick={() => document.getElementById('citizenship-upload').click()}
                                                    className={`aspect-square rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center transition-all ${
                                                        formData.citizenship ? "border-primary bg-primary/5" : "border-primary/20 hover:border-primary/50"
                                                    }`}
                                                >
                                                    {formData.citizenship ? (
                                                        <div className="text-center p-2">
                                                            <CheckCircle className="h-6 w-6 text-primary mx-auto mb-1" />
                                                            <span className="text-[10px] font-bold truncate block w-full">{formData.citizenship.name}</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Upload className="h-6 w-6 text-primary mb-2" />
                                                            <span className="text-[10px] font-bold text-muted-foreground">Upload ID</span>
                                                        </>
                                                    )}
                                                </div>
                                                <input id="citizenship-upload" type="file" hidden onChange={(e) => handleFileChange("citizenship", e.target.files[0])} />
                                            </div>
                                        </div>

                                        <div className="space-y-4 animate-in slide-in-from-bottom-2">
                                            <label className="text-sm font-bold text-foreground">Trade / Business Certificate</label>
                                            <div 
                                                onClick={() => document.getElementById('trade-upload').click()}
                                                className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer flex items-center gap-4 transition-all ${
                                                    formData.trade_certificate ? "border-primary bg-primary/5" : "border-primary/20 hover:border-primary/50"
                                                }`}
                                            >
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Upload className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-xs font-bold truncate">
                                                        {formData.trade_certificate ? formData.trade_certificate.name : "Upload Business License"}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">Mandatory for all service providers</p>
                                                </div>
                                            </div>
                                            <input id="trade-upload" type="file" hidden onChange={(e) => handleFileChange("trade_certificate", e.target.files[0])} />
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl flex items-start gap-3 text-destructive text-sm">
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                        <p>{error}</p>
                                    </div>
                                )}

                                <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transition-all" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Submit for Verification"}
                                </Button>
                            </form>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    )
}
