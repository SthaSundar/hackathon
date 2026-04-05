"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    Users,
    Briefcase,
    AlertTriangle,
    BarChart3,
    Plus,
    Edit,
    Trash2,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    LayoutDashboard,
    LogOut,
    Search,
    Filter,
    ArrowUpRight,
    TrendingUp,
    ShieldCheck,
    FileText,
    ExternalLink,
    Star,
    Bell,
    Home,
    ArrowLeftRight
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

function UsersTable() {
    const { data: session } = useSession()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [searchTerm, setSearchTerm] = useState("")

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const isBrowser = typeof window !== "undefined"
            const token = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null;
            if (!token) {
                setLoading(false)
                return
            }
            const headers = { "Authorization": `Bearer ${token}` }
            const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, '');
            const res = await fetch(`${apiUrl}/accounts/users/`, { headers })
            if (!res.ok) throw new Error("Failed to load users")
            const data = await res.json()
            setItems(Array.isArray(data) ? data : [])
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [session])

    useEffect(() => {
        if (session || (typeof window !== "undefined" && localStorage.getItem("npw_token"))) {
            fetchUsers()
        }
    }, [session, fetchUsers])

    const toggleFeatured = async (u) => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
            const headers = { "Content-Type": "application/json" }
            if (token) headers["Authorization"] = `Bearer ${token}`
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/providers/${u.id}/toggle-featured/`, { method: "POST", headers })
            if (!res.ok) throw new Error("Toggle failed")
            const data = await res.json()
            setItems(prev => prev.map(x => x.id === u.id ? { ...x, is_featured: data.is_featured } : x))
        } catch(e) { alert(e.message) }
    }

    const toggleActive = async (u) => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
            const headers = { "Content-Type": "application/json" }
            if (token) headers["Authorization"] = `Bearer ${token}`
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/users/${u.id}/status/`, {
                method: "PATCH",
                headers,
                body: JSON.stringify({ active: !u.is_active })
            })
            if (!res.ok) throw new Error("Failed to update status")
            const data = await res.json()
            setItems(prev => prev.map(x => x.id === u.id ? { ...x, is_active: data.is_active } : x))
        } catch (e) { alert(e.message) }
    }

    const remove = async (id) => {
        if (!confirm("Delete this user permanently?")) return
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
            const headers = token ? { "Authorization": `Bearer ${token}` } : {}
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/users/${id}/`, { method: "DELETE", headers })
            if (!res.ok) throw new Error("Delete failed")
            setItems(prev => prev.filter(u => u.id !== id))
        } catch (e) {
            alert(e.message)
        }
    }

    const filteredItems = items.filter(u => 
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getCategoryBadge = (category) => {
        switch(category) {
            case "flower_vendor":
                return <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-100">Flower Vendor</span>
            case "event_decorator":
                return <span className="px-2.5 py-1 bg-orange-50 text-orange-700 text-[9px] font-black uppercase tracking-widest rounded-full border border-orange-100">Event Decorator</span>
            case "nursery_amc":
                return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-100">Nursery & AMC</span>
            default:
                return <span className="px-2.5 py-1 bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-widest rounded-full border border-primary/5">Customer</span>
        }
    }

    if (loading) return (
        <div className="p-20 flex flex-col items-center gap-4">
            <Clock className="animate-spin h-10 w-10 text-primary" />
            <p className="text-muted-foreground font-bold">Loading users...</p>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8 px-4">
                <div className="relative w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input 
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-primary/10 bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Total: {filteredItems.length} Users
                </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-primary/10 shadow-sm bg-white">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-primary/5 border-b border-primary/10">
                            <th className="text-left p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">User Profile</th>
                            <th className="text-left p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</th>
                            <th className="text-left p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verification</th>
                            <th className="text-left p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Activity</th>
                            <th className="text-right p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(u => (
                            <tr key={u.id} className="border-b border-primary/5 hover:bg-primary/5 transition-colors group">
                                <td className="p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/10">
                                            {u.username?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                                {u.username}
                                                {u.is_verified && <CheckCircle className="h-3.5 w-3.5 text-secondary-foreground" />}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    {getCategoryBadge(u.category || (u.role === 'customer' ? 'client' : ''))}
                                </td>
                                <td className="p-5">
                                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider gap-1.5 ${
                                        u.kyc_status === 'approved' ? 'bg-secondary/10 text-secondary-foreground' :
                                        u.kyc_status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                                        'bg-muted text-muted-foreground'
                                    }`}>
                                        {u.kyc_status === 'approved' ? <ShieldCheck size={10} /> : <Clock size={10} />}
                                        {u.kyc_status}
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-muted-foreground tracking-tighter uppercase">Services</p>
                                            <p className="text-xs font-bold">{u.services_count || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-muted-foreground tracking-tighter uppercase">Bookings</p>
                                            <p className="text-xs font-bold">{u.bookings_count || 0}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-muted-foreground hover:bg-primary/5 hover:text-primary" onClick={() => toggleActive(u)}>
                                            <Eye size={16} />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-destructive hover:bg-destructive/5" onClick={() => remove(u.id)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function KYCReviews() {
    const { data: session } = useSession()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [processing, setProcessing] = useState(false)
    const [selectedReview, setSelectedReview] = useState(null)
    const [notes, setNotes] = useState("")

    const fetchKYC = useCallback(async () => {
        setLoading(true)
        try {
            const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken;
            const headers = token ? { "Authorization": `Bearer ${token}` } : {}
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/kyc/list/?status=all`, { headers })
            if (!res.ok) throw new Error("Failed to load KYC submissions")
            const data = await res.json()
            setItems(Array.isArray(data) ? data : [])
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [session])

    useEffect(() => {
        if (session || (typeof window !== "undefined" && localStorage.getItem("npw_token"))) {
            fetchKYC()
        }
    }, [session, fetchKYC])

    const handleAction = async (id, status) => {
        setProcessing(true)
        try {
            const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken;
            const headers = { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/kyc/${id}/verify/`, {
                method: "POST",
                headers,
                body: JSON.stringify({ action: status === 'approved' ? 'approve' : 'reject', admin_notes: notes })
            })
            if (!res.ok) throw new Error("Action failed")
            setSelectedReview(null)
            setNotes("")
            fetchKYC()
        } catch (e) {
            alert(e.message)
        } finally {
            setProcessing(false)
        }
    }

    if (loading) return (
        <div className="p-20 flex flex-col items-center gap-4">
            <Clock className="animate-spin h-10 w-10 text-primary" />
            <p className="text-muted-foreground font-bold">Checking submissions...</p>
        </div>
    )

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {items.map(k => (
                    <Card key={k.id} className={`rounded-[40px] border-primary/10 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden bg-white ${k.status === 'pending' ? 'ring-2 ring-primary/20' : 'opacity-80'}`}>
                        <div className={`p-6 border-b border-primary/5 flex items-center justify-between ${
                            k.status === 'approved' ? 'bg-secondary/5' : 
                            k.status === 'rejected' ? 'bg-destructive/5' : 'bg-primary/5'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white shadow-md flex items-center justify-center font-black text-primary overflow-hidden">
                                    {k.photo_url ? <img src={k.photo_url} className="w-full h-full object-cover" /> : 'U'}
                                </div>
                                <div>
                                    <p className="font-bold text-foreground text-sm">{k.full_name}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-black uppercase text-primary tracking-widest">{k.category?.replace('_', ' ')}</p>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                                            k.status === 'approved' ? 'bg-secondary text-white' : 
                                            k.status === 'rejected' ? 'bg-destructive text-white' : 'bg-primary text-white'
                                        }`}>
                                            {k.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" className="rounded-full h-9 w-9 text-primary hover:bg-primary/10" onClick={() => setSelectedReview(k)}>
                                <Eye size={18} />
                            </Button>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                <Clock size={14} className="text-primary" />
                                {k.status === 'pending' ? 'Submitted' : 'Reviewed'} {new Date(k.updated_at || k.created_at).toLocaleDateString()}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl bg-muted border border-primary/5 flex flex-col items-center justify-center text-center">
                                    <FileText size={18} className="text-primary mb-1" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">ID Docs</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-muted border border-primary/5 flex flex-col items-center justify-center text-center">
                                    <ShieldCheck size={18} className="text-primary mb-1" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Trade Cert</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    className={`flex-1 rounded-2xl font-black text-xs uppercase h-10 shadow-lg ${
                                        k.status === 'pending' 
                                            ? 'bg-secondary text-white hover:bg-secondary/90 shadow-secondary/20' 
                                            : 'bg-primary/10 text-primary hover:bg-primary/20 shadow-none'
                                    }`} 
                                    onClick={() => setSelectedReview(k)}
                                >
                                    {k.status === 'pending' ? 'Review Now' : 'View Reference'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {items.length === 0 && (
                <div className="text-center py-24 bg-primary/5 rounded-[48px] border-2 border-dashed border-primary/10">
                    <CheckCircle className="w-16 h-16 text-secondary-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-bold">No pending KYC submissions to review.</p>
                </div>
            )}

            {/* Detailed Review Modal */}
            {selectedReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <Card className="w-full max-w-4xl rounded-[40px] border-primary/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="bg-primary/5 p-8 flex justify-between items-center border-b border-primary/10 sticky top-0 bg-white z-10">
                            <div>
                                <CardTitle className="text-2xl font-black tracking-tight">Review KYC Submission</CardTitle>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Provider: {selectedReview.full_name}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedReview(null)} className="rounded-full">
                                <XCircle size={24} />
                            </Button>
                        </div>
                        <CardContent className="p-8 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-primary border-b border-primary/10 pb-2">Provider Details</h4>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground">Full Name</p>
                                            <p className="text-sm font-bold">{selectedReview.full_name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground">Phone Number</p>
                                            <p className="text-sm font-bold">{selectedReview.phone_number}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground">Email</p>
                                            <p className="text-sm font-bold">{selectedReview.email || selectedReview.user_email}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground">Category</p>
                                            <p className="text-sm font-bold capitalize">{selectedReview.category?.replace('_', ' ')}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-xs font-bold text-muted-foreground uppercase">Profile Photo</p>
                                        <div className="relative h-48 w-48 rounded-3xl overflow-hidden border border-primary/10 bg-muted">
                                            {selectedReview.photo_url ? (
                                                <img src={selectedReview.photo_url} className="w-full h-full object-cover" alt="Profile" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">No photo</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-primary border-b border-primary/10 pb-2">Submitted Documents</h4>
                                    
                                    <div className="space-y-4">
                                        <p className="text-xs font-bold text-muted-foreground uppercase">1. Citizenship / Identity Document</p>
                                        <div className="relative aspect-video rounded-3xl overflow-hidden border border-primary/10 bg-muted group">
                                            {selectedReview.citizenship_url ? (
                                                <>
                                                    <img src={selectedReview.citizenship_url} className="w-full h-full object-contain" />
                                                    <a href={selectedReview.citizenship_url} target="_blank" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ExternalLink className="text-white" />
                                                    </a>
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">No ID image provided</div>
                                            )}
                                        </div>
                                    </div>

                                    {selectedReview.trade_certificate_url && (
                                        <div className="space-y-4">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">2. Trade / Business Certificate</p>
                                            <div className="relative aspect-video rounded-3xl overflow-hidden border border-primary/10 bg-muted group">
                                                <img src={selectedReview.trade_certificate_url} className="w-full h-full object-contain" />
                                                <a href={selectedReview.trade_certificate_url} target="_blank" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ExternalLink className="text-white" />
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-4 border-t border-primary/10">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Admin Feedback / Rejection Reason</label>
                                        <textarea 
                                            className="w-full rounded-3xl border border-primary/10 p-6 min-h-[120px] focus:ring-2 focus:ring-primary/20 outline-none font-medium text-sm leading-relaxed"
                                            placeholder="Write feedback for the provider..."
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-2">
                                        <Button 
                                            variant="outline" 
                                            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-destructive text-destructive hover:bg-destructive/5"
                                            onClick={() => handleAction(selectedReview.id, 'rejected')}
                                            disabled={processing}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" /> Reject
                                        </Button>
                                        <Button 
                                            className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-secondary text-white hover:bg-secondary/90 shadow-lg shadow-secondary/20"
                                            onClick={() => handleAction(selectedReview.id, 'approved')}
                                            disabled={processing}
                                        >
                                            <CheckCircle className="mr-2 h-4 w-4" /> Approve KYC
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}

function DisputesAdminPanel() {
    const { data: session } = useSession()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [err, setErr] = useState("")
    const [noteById, setNoteById] = useState({})
    const [busy, setBusy] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        setErr("")
        try {
            const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
            if (!token) {
                setItems([])
                return
            }
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/list/`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error("Failed to load disputes")
            const data = await res.json()
            setItems(Array.isArray(data) ? data : [])
        } catch (e) {
            setErr(e.message)
        } finally {
            setLoading(false)
        }
    }, [session])

    useEffect(() => {
        load()
    }, [load])

    const closeOne = async (d) => {
        setBusy(d.id)
        try {
            const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/${d.id}/close/`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ resolution_notes: noteById[d.id] || "" }),
            })
            if (!res.ok) throw new Error("Could not close dispute")
            await load()
        } catch (e) {
            alert(e.message)
        } finally {
            setBusy(null)
        }
    }

    const refund = async (bookingId) => {
        if (!confirm("Mark refunded in database? Use eSewa portal for real refunds in production.")) return
        setBusy(`r${bookingId}`)
        try {
            const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/settlement/refund/`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.detail || "Refund failed")
            await load()
        } catch (e) {
            alert(e.message)
        } finally {
            setBusy(null)
        }
    }

    if (loading) {
        return (
            <div className="p-20 flex flex-col items-center gap-4">
                <Clock className="animate-spin h-10 w-10 text-primary" />
                <p className="text-muted-foreground font-bold">Loading disputes…</p>
            </div>
        )
    }

    if (err) {
        return <p className="text-center text-destructive font-medium py-12">{err}</p>
    }

    if (!items.length) {
        return (
            <div className="text-center py-24 bg-primary/5 rounded-[40px] border border-dashed border-primary/10">
                <AlertTriangle className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-bold">No disputes yet.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-6">
            {items.map((d) => {
                const bid = d.booking?.id
                const pay = d.booking?.payment_status
                return (
                    <Card key={d.id} className="rounded-[32px] border-primary/10 shadow-sm overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-primary/10">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg font-black">
                                        Dispute #{d.id}
                                        {bid != null && (
                                            <span className="text-sm font-bold text-muted-foreground ml-2">· Booking #{bid}</span>
                                        )}
                                    </CardTitle>
                                    <CardDescription className="mt-2 font-medium">
                                        {d.creator_name || d.creator_email} · {d.category?.replace(/_/g, " ")} ·{" "}
                                        <span className={d.status === "open" ? "text-destructive font-bold" : "text-secondary-foreground font-bold"}>
                                            {d.status}
                                        </span>
                                        {pay && (
                                            <span className="ml-2 text-xs uppercase tracking-wider text-muted-foreground">Payment: {pay}</span>
                                        )}
                                    </CardDescription>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground">
                                    {new Date(d.created_at).toLocaleString()}
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{d.description}</p>
                            <textarea
                                className="w-full rounded-2xl border border-primary/10 p-4 text-sm min-h-[80px] outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Resolution notes (optional)"
                                value={noteById[d.id] || ""}
                                onChange={(e) => setNoteById((prev) => ({ ...prev, [d.id]: e.target.value }))}
                            />
                            <div className="flex flex-wrap gap-3">
                                {d.status === "open" && (
                                    <Button
                                        className="rounded-full font-bold"
                                        disabled={busy === d.id}
                                        onClick={() => closeOne(d)}
                                    >
                                        {busy === d.id ? "Closing…" : "Close dispute"}
                                    </Button>
                                )}
                                {bid != null && pay === "held" && (
                                    <Button
                                        variant="destructive"
                                        className="rounded-full font-bold"
                                        disabled={busy === `r${bid}`}
                                        onClick={() => refund(bid)}
                                    >
                                        {busy === `r${bid}` ? "Working…" : "Mark refund (DB)"}
                                    </Button>
                                )}
                                {bid != null && (
                                    <Button asChild variant="outline" className="rounded-full font-bold border-primary/20">
                                        <Link href={`/bookings/${bid}`}>Open booking</Link>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}

function FreshnessReportsAdmin() {
    const { data: session } = useSession()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(null)

    const load = useCallback(async () => {
        const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
        const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "")
        if (!token) {
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const r = await fetch(`${api}/platform/freshness-reports/pending/`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (r.ok) setItems(await r.json())
            else setItems([])
        } catch {
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [session?.accessToken])

    useEffect(() => {
        load()
    }, [load])

    const confirmOne = async (id) => {
        const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
        const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "")
        setBusy(id)
        try {
            const r = await fetch(`${api}/accounts/admin/freshness-reports/${id}/confirm/`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: "{}",
            })
            if (r.ok) setItems((prev) => prev.filter((x) => x.id !== id))
        } finally {
            setBusy(null)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Clock className="animate-spin h-10 w-10 text-primary" />
            </div>
        )
    }

    if (!items.length) {
        return (
            <div className="text-center py-16 rounded-[40px] border border-dashed border-primary/15 text-muted-foreground font-medium">
                No pending freshness reports.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {items.map((r) => (
                <Card key={r.id} className="rounded-3xl border-primary/10">
                    <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <p className="font-black text-foreground">Booking #{r.booking_id}</p>
                            <p className="text-xs text-muted-foreground mt-1">{r.client_email}</p>
                            <p className="text-sm text-foreground mt-2">{r.provider_name}</p>
                            {r.description && <p className="text-sm text-muted-foreground mt-2">{r.description}</p>}
                        </div>
                        <Button
                            className="rounded-full font-bold shrink-0"
                            disabled={busy === r.id}
                            onClick={() => confirmOne(r.id)}
                        >
                            {busy === r.id ? "Working…" : "Confirm violation"}
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function formatAdminRevenue(raw) {
    if (raw == null || raw === "") return "0"
    const n = Number(raw)
    if (Number.isFinite(n)) return n.toLocaleString()
    return String(raw)
}

export default function AdminPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [stats, setStats] = useState(null)
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifications, setNotifications] = useState([])

    const fetchAdminData = useCallback(async () => {
        try {
            const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
            const headers = token ? { "Authorization": `Bearer ${token}` } : {}
            const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "")

            const res = await fetch(`${apiUrl}/accounts/admin-stats/`, { headers })
            if (res.ok) setStats(await res.json())

            const unreadRes = await fetch(`${apiUrl}/accounts/notifications/unread-count/`, { headers })
            if (unreadRes.ok) {
                const data = await unreadRes.json()
                setUnreadCount(data.unread_count)
            }

            const notifListRes = await fetch(`${apiUrl}/accounts/notifications/`, { headers })
            if (notifListRes.ok) {
                setNotifications(await notifListRes.json())
            }
        } catch (e) {
            console.error(e)
        }
    }, [session?.accessToken])

    useEffect(() => {
        if (status === "loading") return

        const isBrowser = typeof window !== "undefined"
        const localRole = isBrowser ? localStorage.getItem("npw_role") : null
        const role = session?.role || localRole

        if (role !== "admin") {
            router.push("/")
            return
        }

        fetchAdminData()
    }, [session, status, router, fetchAdminData])

    useEffect(() => {
        if (status === "loading") return
        const isBrowser = typeof window !== "undefined"
        const localRole = isBrowser ? localStorage.getItem("npw_role") : null
        if ((session?.role || localRole) !== "admin") return

        const id = setInterval(() => fetchAdminData(), 45000)
        const onVis = () => {
            if (document.visibilityState === "visible") fetchAdminData()
        }
        document.addEventListener("visibilitychange", onVis)
        return () => {
            clearInterval(id)
            document.removeEventListener("visibilitychange", onVis)
        }
    }, [status, session?.role, fetchAdminData])

    const markAllRead = async () => {
        try {
            const isBrowser = typeof window !== "undefined";
            const token = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null;
            const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, '');
            
            const res = await fetch(`${apiUrl}/accounts/notifications/read-all/`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setUnreadCount(0);
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            }
        } catch (e) { console.error(e) }
    };

    if (status === "loading") return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Clock className="animate-spin h-12 w-12 text-primary" />
        </div>
    )

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Admin Header */}
            <div className="bg-white border-b border-primary/10 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10 shadow-sm">
                                <ShieldCheck className="text-primary h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-foreground tracking-tight">Admin Central</h1>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">NepWork Control Panel</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <Link href="/" className="p-2 rounded-full hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors">
                                <Home className="h-5 w-5" />
                            </Link>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-primary/5">
                                        <Bell className="h-5 w-5 text-foreground/70" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full ring-2 ring-white" />
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80 p-4 rounded-[32px] shadow-2xl border-primary/10 bg-white/95 backdrop-blur-md">
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <h3 className="font-black text-foreground tracking-tight">Notifications</h3>
                                        <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">{unreadCount} New</span>
                                    </div>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="text-center py-10">
                                                <Bell className="w-10 h-10 text-primary/10 mx-auto mb-2" />
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">No notifications yet</p>
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div key={n.id} className={`p-4 rounded-2xl transition-all border ${n.is_read ? 'bg-transparent border-primary/5 opacity-60' : 'bg-primary/5 border-primary/10 shadow-sm'}`}>
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.is_read ? 'bg-muted' : 'bg-primary'}`} />
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-black text-foreground leading-tight">{n.title}</p>
                                                            <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">{n.message}</p>
                                                            <p className="text-[9px] font-bold text-primary/40 uppercase tracking-tighter pt-1">
                                                                {new Date(n.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <DropdownMenuSeparator className="my-3 bg-primary/5" />
                                    <Button 
                                        variant="ghost" 
                                        className="w-full rounded-xl font-bold text-xs text-primary hover:bg-primary/5 h-10"
                                        onClick={markAllRead}
                                    >
                                        Mark all as read
                                    </Button>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/' })} className="rounded-full hover:bg-destructive/5 text-destructive">
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
                
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[
                        { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'bg-blue-500' },
                        { label: 'Providers', value: stats?.providers_count || 0, icon: Briefcase, color: 'bg-primary' },
                        { label: 'Verified', value: stats?.verified_count || 0, icon: CheckCircle, color: 'bg-secondary' },
                        { label: 'Total revenue', value: `Rs. ${formatAdminRevenue(stats?.total_revenue)}`, icon: BarChart3, color: 'bg-amber-500' },
                    ].map((s, i) => (
                        <Card key={i} className="rounded-[32px] border-primary/10 shadow-sm hover:shadow-xl transition-all duration-500 group overflow-hidden bg-white">
                            <CardContent className="p-8">
                                <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center text-white mb-6 group-hover:rotate-12 transition-transform`}>
                                    <s.icon size={24} />
                                </div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
                                <h3 className="text-3xl font-black text-foreground tracking-tighter">{s.value}</h3>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Tabs defaultValue="users" className="space-y-10">
                    <div className="flex justify-center">
                        <TabsList className="bg-primary/5 p-1.5 rounded-3xl h-auto border border-primary/5">
                            <TabsTrigger value="users" className="rounded-2xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                                <Users className="mr-2 h-4 w-4" /> Users
                            </TabsTrigger>
                            <TabsTrigger value="kyc" className="rounded-2xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                                <ShieldCheck className="mr-2 h-4 w-4" /> KYC Reviews
                            </TabsTrigger>
                            <TabsTrigger value="reports" className="rounded-2xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                                <BarChart3 className="mr-2 h-4 w-4" /> Reports
                            </TabsTrigger>
                            <TabsTrigger value="disputes" className="rounded-2xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                                <AlertTriangle className="mr-2 h-4 w-4" /> Disputes
                            </TabsTrigger>
                            <TabsTrigger value="freshness" className="rounded-2xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                                <FileText className="mr-2 h-4 w-4" /> Freshness
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="users" className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
                        <UsersTable />
                    </TabsContent>

                    <TabsContent value="kyc" className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
                        <KYCReviews />
                    </TabsContent>

                    <TabsContent value="reports" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center py-32 bg-primary/5 rounded-[48px] border-2 border-dashed border-primary/10">
                            <BarChart3 className="w-20 h-20 text-primary/20 mx-auto mb-6" />
                            <h3 className="text-2xl font-black text-foreground mb-2">Revenue Analytics</h3>
                            <p className="text-muted-foreground font-bold">Detailed reports and 10% commission tracking coming in Phase 2.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="disputes" className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
                        <DisputesAdminPanel />
                    </TabsContent>

                    <TabsContent value="freshness" className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
                        <FreshnessReportsAdmin />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
