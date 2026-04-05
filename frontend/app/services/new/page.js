"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft, Plus, Trash2, Briefcase, MapPin, DollarSign, Tag } from "lucide-react"
import Link from "next/link"

const CATEGORIES = [
  { id: "flower_vendor", label: "Flower Vendor" },
  { id: "event_decorator", label: "Event Decorator" },
  { id: "nursery_amc", label: "Nursery / Office AMC" }
]

export default function NewServicePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [form, setForm] = useState({
    title: "",
    description: "",
    base_price: "",
    pricing_type: "fixed",
    location: "",
    category: "flower_vendor",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    if (status === "loading") return
    const isBrowser = typeof window !== "undefined"
    const localToken = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null
    const role = isBrowser ? localStorage.getItem("npw_role") : "customer"
    
    if (!session && !localToken) {
      router.replace("/auth/signin")
      return
    }
    if (role !== "provider") {
      router.replace("/dashboard?role=customer")
      return
    }
    
    // Check user status and KYC
    const checkUserStatus = async () => {
        try {
          const token = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null
          const headers = { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }

          const statusRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/user-status/`, { headers })
          if (statusRes.ok) {
            const statusData = await statusRes.json()
            if (!statusData.can_post_services) {
              setError("KYC verification is required to post services. Please complete your KYC verification first.")
              setTimeout(() => router.push("/kyc"), 3000)
            }
          }
        } catch (e) {
          console.error("Failed to check user status", e)
        } finally {
          setCheckingStatus(false)
        }
      }
      checkUserStatus()
  }, [session, status, router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken;
      const headers = {
        ...(token ? { "Authorization": `Bearer ${token}` } : { "X-User-Email": session?.user?.email || "" })
      }

      // Basic validation
      if (!form.title.trim() || !form.description.trim() || !form.base_price) {
        setError("Please fill in all required fields.")
        setLoading(false)
        return
      }

      const body = new FormData()
      body.append("title", form.title.trim())
      body.append("description", form.description.trim())
      body.append("base_price", parseFloat(form.base_price).toString())
      body.append("pricing_type", form.pricing_type)
      body.append("location", form.location.trim() || "Kathmandu")
      body.append("category", form.category)

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/services/create/`, {
        method: "POST",
        headers,
        body,
      })
      
      const data = await res.json().catch(() => ({}))
      
      if (res.status === 403 && data.kyc_update_required) {
        setError(data.detail)
        setTimeout(() => {
          // Redirect to KYC with the category they tried to post for
          localStorage.setItem("npw_pending_category", form.category)
          router.push("/kyc")
        }, 3000)
        return
      }
      
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create service. Please try again.")
      }

      router.push("/dashboard?tab=services")
    } catch (err) {
      setError(err.message)
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

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-8 rounded-full hover:bg-primary/5 text-primary font-bold">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
        </Button>

        <Card className="rounded-[40px] border-primary/10 shadow-2xl overflow-hidden bg-white">
          <CardHeader className="bg-primary/5 p-10 border-b border-primary/10">
            <div className="h-16 w-16 rounded-3xl bg-white flex items-center justify-center shadow-xl mb-6">
              <Plus className="text-primary h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-black text-foreground tracking-tight">List Your Floral Service</CardTitle>
            <CardDescription className="text-lg font-medium text-muted-foreground mt-2">
              Share your expertise with Kathmandu's floriculture community.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl text-destructive text-sm font-bold flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Briefcase size={14} className="text-primary" /> Service Title
                  </label>
                  <Input
                    name="title"
                    placeholder="e.g., Premium Rose Bouquet Wholesale"
                    value={form.title}
                    onChange={handleChange}
                    className="h-14 rounded-2xl border-primary/10 focus:ring-primary/20 focus:border-primary text-lg font-medium"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Tag size={14} className="text-primary" /> Category
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {CATEGORIES.map((cat) => (
                      <div
                        key={cat.id}
                        onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                        className={`cursor-pointer p-4 rounded-2xl border-2 transition-all text-center font-bold text-sm ${
                          form.category === cat.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-primary/5 hover:border-primary/20 text-muted-foreground"
                        }`}
                      >
                        {cat.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                      <DollarSign size={14} className="text-primary" /> Starting Price (NPR)
                    </label>
                    <Input
                      name="base_price"
                      type="number"
                      placeholder="500"
                      value={form.base_price}
                      onChange={handleChange}
                      className="h-14 rounded-2xl border-primary/10"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                      Pricing Model
                    </label>
                    <select
                      name="pricing_type"
                      value={form.pricing_type}
                      onChange={handleChange}
                      className="w-full h-14 rounded-2xl border-2 border-primary/10 bg-white px-4 font-bold text-foreground focus:border-primary focus:ring-primary/20 outline-none appearance-none"
                    >
                      <option value="fixed">Fixed Price</option>
                      <option value="negotiable">Negotiable</option>
                      <option value="per_month">Per Month (AMC)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                    <MapPin size={14} className="text-primary" /> Service Location
                  </label>
                  <Input
                    name="location"
                    placeholder="e.g., Kathmandu, Lalitpur, Bhaktapur"
                    value={form.location}
                    onChange={handleChange}
                    className="h-14 rounded-2xl border-primary/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1">Detailed Description</label>
                  <textarea
                    name="description"
                    placeholder="Describe your service, variety of flowers, delivery options, etc."
                    value={form.description}
                    onChange={handleChange}
                    className="w-full min-h-[150px] rounded-3xl border-2 border-primary/10 p-6 focus:border-primary focus:ring-primary/20 outline-none font-medium leading-relaxed"
                    required
                  ></textarea>
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-16 rounded-[24px] text-lg font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Publish Service"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
