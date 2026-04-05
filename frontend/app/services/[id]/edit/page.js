"use client"

import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft, Save, Briefcase, DollarSign, Tag } from "lucide-react"
import Link from "next/link"

const CATEGORY_SLUGS = [
  { id: "flower_vendor", label: "Flower Vendor" },
  { id: "event_decorator", label: "Event Decorator" },
  { id: "nursery_amc", label: "Nursery / Office AMC" },
]

export default function EditServicePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const serviceId = params?.id

  const [form, setForm] = useState({
    title: "",
    description: "",
    base_price: "",
    pricing_type: "fixed",
    categorySlug: "flower_vendor",
    categoryId: null,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => {
    if (status === "loading" || !serviceId) return
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

    const load = async () => {
      setLoadError("")
      try {
        const token = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null
        const headers = token ? { Authorization: `Bearer ${token}` } : {}

        const [svcRes, catRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/services/${serviceId}/detail/`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/categories/`),
        ])

        if (!svcRes.ok) {
          setLoadError("We couldn't load this service. It may have been removed.")
          setInitialLoad(false)
          return
        }

        const svc = await svcRes.json()
        const categories = catRes.ok ? await catRes.json() : []
        const catList = Array.isArray(categories) ? categories : categories.results || []
        const match = catList.find((c) => c.id === svc.category)
        const slug = match?.slug || "flower_vendor"

        setForm({
          title: svc.title || "",
          description: svc.description || "",
          base_price: svc.base_price != null ? String(svc.base_price) : "",
          pricing_type: svc.pricing_type || "fixed",
          categorySlug: slug,
          categoryId: svc.category,
        })
      } catch (e) {
        setLoadError(e.message || "Failed to load service.")
      } finally {
        setInitialLoad(false)
      }
    }

    load()
  }, [session, status, router, serviceId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
      if (!token) {
        setError("Please sign in again.")
        setLoading(false)
        return
      }

      if (!form.title.trim() || !form.description.trim() || !form.base_price) {
        setError("Please fill in all required fields.")
        setLoading(false)
        return
      }

      const catRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/categories/`)
      const categories = catRes.ok ? await catRes.json() : []
      const catList = Array.isArray(categories) ? categories : categories.results || []
      const selected = catList.find((c) => c.slug === form.categorySlug)
      const categoryPayload = selected?.id ?? form.categoryId

      if (!categoryPayload) {
        setError("Invalid category. Please pick a category again.")
        setLoading(false)
        return
      }

      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        base_price: String(parseFloat(form.base_price)),
        pricing_type: form.pricing_type,
        category: categoryPayload,
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/services/${serviceId}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.detail || (typeof data === "object" ? JSON.stringify(data.errors || data) : "Update failed"))
      }

      router.push("/dashboard?tab=services")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || initialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-lg mx-auto text-center space-y-6">
          <p className="text-muted-foreground font-medium">{loadError}</p>
          <Button asChild className="rounded-full font-bold">
            <Link href="/dashboard?tab=services">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-8 rounded-full hover:bg-primary/5 text-primary font-bold">
          <Link href="/dashboard?tab=services">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to services
          </Link>
        </Button>

        <Card className="rounded-[40px] border-primary/10 shadow-2xl overflow-hidden bg-white">
          <CardHeader className="bg-primary/5 p-10 border-b border-primary/10">
            <div className="h-16 w-16 rounded-3xl bg-white flex items-center justify-center shadow-xl mb-6">
              <Save className="text-primary h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-black text-foreground tracking-tight">Edit your service</CardTitle>
            <CardDescription className="text-lg font-medium text-muted-foreground mt-2">
              Update details—changes go live for customers right away.
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
                    <Briefcase size={14} className="text-primary" /> Service title
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
                    {CATEGORY_SLUGS.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, categorySlug: cat.id }))}
                        className={`p-4 rounded-2xl border-2 transition-all text-center font-bold text-sm ${
                          form.categorySlug === cat.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-primary/5 hover:border-primary/20 text-muted-foreground"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                      <DollarSign size={14} className="text-primary" /> Starting price (NPR)
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
                    <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1">Pricing model</label>
                    <select
                      name="pricing_type"
                      value={form.pricing_type}
                      onChange={handleChange}
                      className="w-full h-14 rounded-2xl border-2 border-primary/10 bg-white px-4 font-bold text-foreground focus:border-primary focus:ring-primary/20 outline-none appearance-none"
                    >
                      <option value="fixed">Fixed price</option>
                      <option value="negotiable">Negotiable</option>
                      <option value="per_month">Per month (AMC)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    name="description"
                    placeholder="Describe your service, variety of flowers, delivery options, etc."
                    value={form.description}
                    onChange={handleChange}
                    className="w-full min-h-[150px] rounded-3xl border-2 border-primary/10 p-6 focus:border-primary focus:ring-primary/20 outline-none font-medium leading-relaxed"
                    required
                  />
                </div>
              </div>

              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 rounded-[24px] text-lg font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
