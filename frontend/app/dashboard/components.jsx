"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Star, Calendar, CheckCircle, Clock, XCircle, MessageSquare, Ban, Briefcase, Plus, Edit2, Trash2, ArrowRight, User, Flower2, MessageCircle } from "lucide-react"
import Link from "next/link"

export function ServicesList({ role, session }) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [pendingDelete, setPendingDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const fetchServices = async () => {
        setLoading(true)
        try {
            const bearer = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken;
            const headers = bearer ? { "Authorization": `Bearer ${bearer}`, "Content-Type": "application/json" } : undefined

            const backendRole = role === "client" ? "customer" : role
            let url
            if (backendRole === "provider") {
                url = bearer
                ? `${process.env.NEXT_PUBLIC_API_URL}/services/services/my/`
                : `${process.env.NEXT_PUBLIC_API_URL}/services/services/`
            } else {
                url = `${process.env.NEXT_PUBLIC_API_URL}/services/services/`
            }
            
            const res = await fetch(url, headers ? { headers } : undefined)
            if (res.ok) {
                const data = await res.json()
                setItems(Array.isArray(data) ? data : data.results || [])
            } else if (res.status === 403) {
                setError("Access denied. Please ensure your account is set up as a provider.")
                setItems([])
            } else {
                setItems([])
            }
        } catch (e) {
            setError(e.message)
            setItems([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchServices()
    }, [role, session?.accessToken, session?.user?.email])

    const confirmDelete = async () => {
        if (!pendingDelete) return
        const id = pendingDelete.id
        setDeleting(true)
        try {
            const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/services/${id}/delete/`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                setPendingDelete(null)
                fetchServices()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setDeleting(false)
        }
    }

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-64 rounded-[32px] bg-muted animate-pulse" />
            ))}
        </div>
    )

    if (!items.length) return (
        <div className="text-center py-20 bg-primary/5 rounded-[40px] border-2 border-dashed border-primary/10 mx-4">
            <Briefcase className="w-12 h-12 text-primary/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-bold">No services found.</p>
            {role === "provider" && (
                <Button asChild className="mt-6 rounded-full font-black px-8 shadow-lg shadow-primary/20">
                    <Link href="/services/new"><Plus className="mr-2 h-4 w-4" /> Add Your First Service</Link>
                </Button>
            )}
        </div>
    )

    return (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
            {items.map((s) => (
                <Card key={s.id} className="group rounded-[32px] border border-primary/10 hover:border-primary/25 shadow-sm hover:shadow-lg transition-all duration-300 bg-white overflow-hidden flex flex-col">
                    <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" aria-hidden />
                        <div className="absolute inset-0 flex items-end justify-between px-8 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-14 w-14 rounded-2xl bg-white/90 shadow-sm border border-primary/10 flex items-center justify-center text-primary">
                                    <span className="text-lg font-black" aria-hidden>{(s.title || "?").slice(0, 1).toUpperCase()}</span>
                                </div>
                                <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 text-primary/70">
                                    <Flower2 className="h-5 w-5" aria-hidden />
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-foreground leading-tight">
                                    {s.base_price ? `Rs ${Number(s.base_price).toLocaleString()}` : "Contact"}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/90 mt-0.5">
                                    {s.pricing_type || "fixed"}
                                </p>
                            </div>
                        </div>
                    </div>
                    <CardHeader className="p-8 pt-6 space-y-2">
                        <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {s.title}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground font-medium line-clamp-2 leading-relaxed text-sm">
                            {s.description}
                        </CardDescription>
                        {s.category_name && (
                            <p className="text-xs font-semibold text-primary/80 pt-1">{s.category_name}</p>
                        )}
                    </CardHeader>
                    <CardContent className="px-8 pb-8 pt-0 mt-auto flex gap-3">
                        {role === "provider" ? (
                            <>
                                <Button variant="outline" size="sm" asChild className="flex-1 h-11 rounded-full font-bold border-primary/15 bg-primary/[0.04] hover:bg-primary/10 text-foreground">
                                    <Link href={`/services/${s.id}/edit`}><Edit2 className="mr-2 h-4 w-4" /> Edit</Link>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPendingDelete(s)}
                                    className="h-11 min-w-[44px] rounded-full font-bold border-destructive/15 text-destructive hover:bg-destructive/5"
                                    aria-label={`Delete ${s.title}`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                            <Button asChild className="w-full h-12 rounded-full font-black shadow-md shadow-primary/10 hover:shadow-lg">
                                <Link href={`/services/${s.id}`}>
                                    View details <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>

        <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
            <DialogContent className="sm:max-w-md rounded-[28px] border border-primary/10 p-0 gap-0 overflow-hidden shadow-xl">
                <div className="bg-primary/5 px-8 pt-10 pb-6 text-center border-b border-primary/10">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm border border-primary/10">
                        <Trash2 className="h-7 w-7 text-destructive/80" aria-hidden />
                    </div>
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl font-bold text-foreground text-center">
                            Remove this service?
                        </DialogTitle>
                        <DialogDescription className="text-center text-muted-foreground text-sm leading-relaxed px-1">
                            {pendingDelete ? (
                                <>“{pendingDelete.title}” will be removed from your listings. You can add a new service anytime.</>
                            ) : null}
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <DialogFooter className="flex-row gap-3 sm:justify-center px-8 py-6 bg-background">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1 rounded-full font-bold border-primary/15"
                        onClick={() => setPendingDelete(null)}
                        disabled={deleting}
                    >
                        Keep service
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        className="flex-1 rounded-full font-bold shadow-sm"
                        onClick={confirmDelete}
                        disabled={deleting}
                    >
                        {deleting ? "Removing…" : "Yes, remove"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}

function formatBookingAmount(b) {
    const raw = b.total_amount != null && b.total_amount !== "" ? b.total_amount : (b.amount_paid != null && b.amount_paid !== "" ? b.amount_paid : b.base_price)
    const n = Number(raw)
    return Number.isFinite(n) ? n.toLocaleString() : "0"
}

function bookingPaymentBadge(b) {
    if (b.status !== "completed") return null
    const s = b.payment_status
    if (s === "unpaid") return { label: "Unpaid", className: "bg-amber-50 text-amber-800 border border-amber-100" }
    if (s === "held") return { label: "Paid · held", className: "bg-sky-50 text-sky-800 border border-sky-100" }
    if (s === "released") return { label: "Paid", className: "bg-emerald-50 text-emerald-800 border border-emerald-100" }
    if (s === "refunded") return { label: "Refunded", className: "bg-muted text-muted-foreground border border-border" }
    return null
}

export function BookingsList({ role, session, refreshSignal = 0 }) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        const run = async () => {
            setLoading(true)
            try {
                const bearer = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken;
                const headers = { "Content-Type": "application/json" }
                if (bearer) headers["Authorization"] = `Bearer ${bearer}`
                else if (session?.user?.email) headers["X-User-Email"] = session.user.email

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/mine/`, { headers })
                if (res.ok) {
                    const data = await res.json()
                    setItems(Array.isArray(data) ? data : data.results || [])
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        run()
    }, [session?.accessToken, session?.user?.email, refreshSignal])

    if (loading) return (
        <div className="p-8 space-y-4">
            {[1, 2].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
        </div>
    )

    if (!items.length) return (
        <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-bold">No bookings found.</p>
        </div>
    )

    return (
        <div className="divide-y divide-primary/5">
            {items.map((b) => (
                <div key={b.id} className="p-8 hover:bg-primary/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden border border-primary/10 group-hover:scale-105 transition-transform">
                            {b.service_photo ? (
                                <img src={b.service_photo} className="w-full h-full object-cover" />
                            ) : (
                                <Calendar className="text-primary/30 h-8 w-8" />
                            )}
                        </div>
                        <div>
                            <h4 className="font-black text-foreground text-lg tracking-tight">{b.service_title}</h4>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                    <User size={12} className="text-primary" />
                                    {role === 'provider' ? (b.customer_name || b.client_name) : b.provider_name}
                                </p>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                    <Calendar size={12} className="text-primary" />
                                    {new Date(b.created_at).toLocaleDateString()}
                                </p>
                                {b.chat_thread_id && Number(b.chat_unread_count) > 0 && (
                                    <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 text-primary">
                                        <MessageCircle size={12} className="shrink-0" />
                                        New message
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:items-end gap-3">
                        <div className="flex flex-wrap gap-2 justify-end">
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                            b.status === 'completed' ? 'bg-secondary/20 text-secondary-foreground' :
                            b.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-muted text-muted-foreground'
                        }`}>
                            {b.status}
                        </div>
                        {(() => {
                            const pay = bookingPaymentBadge(b)
                            if (!pay) return null
                            return (
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${pay.className}`}>
                                    {pay.label}
                                </div>
                            )
                        })()}
                        </div>
                        <div className="text-lg font-black text-foreground">
                            Rs. {formatBookingAmount(b)}
                        </div>
                        <Button asChild variant="ghost" size="sm" className="h-8 rounded-full font-bold text-xs hover:bg-primary/10 text-primary">
                            <Link href={`/bookings/${b.id}`}>View Details <ChevronRight size={14} /></Link>
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    )
}

function ChevronRight(props) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    )
}
