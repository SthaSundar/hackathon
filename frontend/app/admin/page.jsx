"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
    Clock
} from "lucide-react"

function UsersTable() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const run = async () => {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
                const headers = token ? { "Authorization": `Bearer ${token}` } : {}
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/users/`, { headers })
                if (!res.ok) throw new Error("Failed to load users")
                const data = await res.json()
                setItems(Array.isArray(data) ? data : [])
            } catch (e) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        run()
    }, [])

    const remove = async (id) => {
        if (!confirm("Delete this user?")) return
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

    if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>
    if (error) return <p className="text-sm text-red-600">{error}</p>

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Role</th>
                        <th className="text-left p-2">KYC</th>
                        <th className="text-left p-2">Services</th>
                        <th className="text-left p-2">Bookings</th>
                        <th className="text-left p-2">Completed</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(u => (
                        <tr key={u.id} className="border-b">
                            <td className="p-2">{u.username}{u.is_verified && <span className="ml-1 text-blue-600">✓</span>}</td>
                            <td className="p-2">{u.email}</td>
                            <td className="p-2 capitalize">{u.role}</td>
                            <td className="p-2 capitalize">{u.kyc_status}</td>
                            <td className="p-2">{u.services_count}</td>
                            <td className="p-2">{u.bookings_count}</td>
                            <td className="p-2">{u.completed_count ?? 0}</td>
                            <td className="p-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {u.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="p-2">
                                <div className="flex space-x-2">
                                    <Button size="sm" variant="outline" onClick={async () => {
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
                                    }}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => remove(u.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function AddCategoryButton() {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const create = async () => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
            const headers = { "Content-Type": "application/json" }
            if (token) headers["Authorization"] = `Bearer ${token}`
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/categories/create/`, {
                method: "POST",
                headers,
                body: JSON.stringify({ name, slug: name.toLowerCase().replace(/\s+/g, '-').slice(0, 120), description })
            })
            if (!res.ok) throw new Error("Create failed")
            setOpen(false); setName(""); setDescription("")
            // Trigger a light refresh by dispatching an event
            window.dispatchEvent(new CustomEvent("npw_categories_refresh"))
        } catch (e) { alert(e.message) }
    }
    if (!open) return (
        <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
        </Button>
    )
    return (
        <div className="flex gap-2">
            <input className="border rounded px-2 py-1" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <input className="border rounded px-2 py-1" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
            <Button onClick={create}>Save</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
    )
}

function CategoriesGrid() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const load = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/categories/`)
            if (!res.ok) throw new Error("Failed to load categories")
            const data = await res.json()
            setItems(Array.isArray(data) ? data : [])
        } catch (e) { setError(e.message) } finally { setLoading(false) }
    }
    useEffect(() => {
        load()
        const onRefresh = () => load()
        window.addEventListener("npw_categories_refresh", onRefresh)
        return () => window.removeEventListener("npw_categories_refresh", onRefresh)
    }, [])
    const remove = async (id) => {
        if (!confirm("Delete this category?")) return
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
            const headers = token ? { "Authorization": `Bearer ${token}` } : {}
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/categories/${id}/delete/`, { method: "DELETE", headers })
            if (!res.ok) throw new Error("Delete failed")
            setItems(prev => prev.filter(c => c.id !== id))
        } catch (e) { alert(e.message) }
    }
    if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>
    if (error) return <p className="text-sm text-red-600">{error}</p>
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c) => (
                <Card key={c.id} className="p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-medium">{c.name}</h3>
                            <p className="text-xs text-gray-500">{c.description}</p>
                            <p className="text-xs text-gray-500">{c.service_count} services</p>
                        </div>
                        <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => remove(c.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}
function PendingKYCList() {
    const { data: session } = useSession()
    const [kycList, setKycList] = useState([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(null)

    useEffect(() => {
        const loadKYC = async () => {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
                const headers = { "Content-Type": "application/json" }
                if (token) {
                    headers["Authorization"] = `Bearer ${token}`
                }

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/kyc/pending/`, { headers })
                if (res.ok) {
                    const data = await res.json()
                    setKycList(Array.isArray(data) ? data : [])
                }
            } catch (e) {
                console.error("Failed to load KYC", e)
            } finally {
                setLoading(false)
            }
        }
        const hasToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token")
        if (session || hasToken) loadKYC()
    }, [session])

    const handleVerify = async (kycId, action) => {
        setProcessing(kycId)
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
            const headers = {
                "Content-Type": "application/json",
            }
            if (token) {
                headers["Authorization"] = `Bearer ${token}`
            }

            let adminNotes = ""
            if (action === "reject") {
                adminNotes = window.prompt("Enter rejection reason for this KYC:", "") || ""
                if (!adminNotes.trim()) {
                    alert("Rejection reason is required.")
                    setProcessing(null)
                    return
                }
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/kyc/${kycId}/verify/`, {
                method: "POST",
                headers,
                body: JSON.stringify({ action, admin_notes: adminNotes }),
            })

            if (res.ok) {
                // Remove from pending list if approved/rejected
                setKycList(prev => prev.filter(k => k.id !== kycId))
                // Trigger refresh of approved list if approved
                if (action === "approve") {
                    window.dispatchEvent(new CustomEvent("npw_kyc_approved"))
                    alert("KYC approved successfully. The service provider can now post services.")
                } else {
                    alert("KYC rejected")
                }
            } else {
                alert("Failed to verify KYC")
            }
        } catch (e) {
            console.error("Failed to verify KYC", e)
            alert("Failed to verify KYC")
        } finally {
            setProcessing(null)
        }
    }

    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading...</p>
    }

    if (kycList.length === 0) return <p className="text-sm text-muted-foreground">No pending KYC verifications.</p>

    return (
        <div className="space-y-4">
            {kycList.map((kyc) => (
                <Card key={kyc.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-yellow-600" />
                                    {kyc.full_name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {kyc.user_email} • Phone: {kyc.phone_number}
                                </p>
                            </div>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                Pending
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium">Address:</p>
                                <p className="text-sm text-muted-foreground">{kyc.address}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {kyc.photo_url && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">Photo:</p>
                                        <img src={kyc.photo_url} alt="Photo" className="w-24 h-24 object-cover rounded border" />
                                    </div>
                                )}
                                {kyc.citizenship_url && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">Citizenship:</p>
                                        <a href={kyc.citizenship_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                            View Document
                                        </a>
                                    </div>
                                )}
                            </div>

                            {kyc.driving_license_url && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Driving License:</p>
                                    <a href={kyc.driving_license_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                        View Document
                                    </a>
                                </div>
                            )}

                            {kyc.passport_url && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Passport:</p>
                                    <a href={kyc.passport_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                        View Document
                                    </a>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleVerify(kyc.id, "approve")}
                                    disabled={processing === kyc.id}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleVerify(kyc.id, "reject")}
                                    disabled={processing === kyc.id}
                                    className="flex-1"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function ApprovedKYCList() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    
    const loadApproved = async () => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
            const headers = token ? { "Authorization": `Bearer ${token}` } : {}
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/kyc/list/?status=approved`, { headers })
            if (res.ok) {
                const data = await res.json()
                setItems(Array.isArray(data) ? data : [])
            }
        } catch (_) {} finally { setLoading(false) }
    }
    
    useEffect(() => {
        loadApproved()
        // Listen for refresh events from pending list
        const handleRefresh = () => loadApproved()
        window.addEventListener("npw_kyc_approved", handleRefresh)
        return () => window.removeEventListener("npw_kyc_approved", handleRefresh)
    }, [])
    
    if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>
    if (!items.length) return <p className="text-sm text-muted-foreground">No approved KYC yet.</p>
    
    return (
        <div className="space-y-4">
            {items.map((kyc) => (
                <Card key={kyc.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    {kyc.full_name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {kyc.user_email} • Phone: {kyc.phone_number}
                                </p>
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                Approved
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium">Address:</p>
                                <p className="text-sm text-muted-foreground">{kyc.address}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {kyc.photo_url && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">Photo:</p>
                                        <img src={kyc.photo_url} alt="Photo" className="w-24 h-24 object-cover rounded border" />
                                    </div>
                                )}
                                {kyc.citizenship_url && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">Citizenship:</p>
                                        <a href={kyc.citizenship_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                            View Document
                                        </a>
                                    </div>
                                )}
                            </div>

                            {kyc.driving_license_url && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Driving License:</p>
                                    <a href={kyc.driving_license_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                        View Document
                                    </a>
                                </div>
                            )}

                            {kyc.passport_url && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Passport:</p>
                                    <a href={kyc.passport_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                        View Document
                                    </a>
                                </div>
                            )}
                            
                            {kyc.admin_notes && (
                                <div>
                                    <p className="text-sm font-medium">Admin Notes:</p>
                                    <p className="text-sm text-muted-foreground">{kyc.admin_notes}</p>
                                </div>
                            )}
                            
                            {kyc.verified_at && (
                                <div>
                                    <p className="text-sm font-medium">Approved At:</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(kyc.verified_at).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export default function AdminDashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("overview")
    const [stats, setStats] = useState(null)

    useEffect(() => {
        if (status === "loading") return
        const hasLocal = typeof window !== "undefined" && !!localStorage.getItem("npw_token")
        if (!session && !hasLocal) {
            router.push("/auth/signin")
            return
        }
        const mintIfNeeded = async () => {
            try {
                const hasToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token")
                if (!hasToken && session?.user?.email && process.env.NEXT_PUBLIC_API_URL) {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/token-by-email/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: session.user.email })
                    })
                    if (res.ok) {
                        const data = await res.json()
                        if (data?.token && typeof window !== "undefined") {
                            localStorage.setItem("npw_token", data.token)
                        }
                    }
                }
            } catch (_) {}
        }
        mintIfNeeded()
    }, [session, status, router])

    useEffect(() => {
        const loadStats = async () => {
            try {
                if (!process.env.NEXT_PUBLIC_API_URL) return
                const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
                const headers = { "Content-Type": "application/json" }
                if (token) headers["Authorization"] = `Bearer ${token}`
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/stats/`, { headers })
                if (res.ok) {
                    const data = await res.json()
                    setStats(data)
                }
            } catch (e) {
                console.error("Failed to fetch stats", e)
            }
        }
        const t = setTimeout(loadStats, 150)
        return () => clearTimeout(t)
    }, [session?.user?.email])

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    // Let backend endpoints enforce admin access; we don't block rendering here.

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                            <p className="mt-2 text-lg text-gray-600">Manage users, services, categories, and disputes</p>
                            {process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                                <p className="mt-1 text-sm text-gray-500">Admin access email: {process.env.NEXT_PUBLIC_ADMIN_EMAIL}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => setActiveTab("profile")}>Profile</Button>
                            <Button variant="outline" onClick={() => signOut({ callbackUrl: "/auth/signin" })}>Sign Out</Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
                        <TabsTrigger value="categories">Categories</TabsTrigger>
                        <TabsTrigger value="disputes">Disputes</TabsTrigger>
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats?.total_users ?? "-"}</div>
                                    <p className="text-xs text-muted-foreground">
                                        +12% from last month
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Customers</CardTitle>
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats?.customers ?? "-"}</div>
                                    <p className="text-xs text-muted-foreground">
                                        +8% from last month
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Providers</CardTitle>
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats?.providers ?? "-"}</div>
                                    <p className="text-xs text-muted-foreground">
                                        -5% from last month
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">Rs. {stats?.revenue ?? 0}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Commission basis (e.g., 3%)
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Activity</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <span className="text-sm">New user registration</span>
                                            <span className="text-xs text-muted-foreground ml-auto">2h ago</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-sm">Service approved</span>
                                            <span className="text-xs text-muted-foreground ml-auto">4h ago</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                            <span className="text-sm">Dispute resolved</span>
                                            <span className="text-xs text-muted-foreground ml-auto">1d ago</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Quick Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button className="w-full" onClick={() => setActiveTab("categories")}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Category
                                    </Button>
                                    <Button variant="outline" className="w-full" onClick={() => setActiveTab("users")}>
                                        <Users className="h-4 w-4 mr-2" />
                                        Manage Users
                                    </Button>
                                    <Button variant="outline" className="w-full" onClick={() => setActiveTab("disputes")}>
                                        <AlertTriangle className="h-4 w-4 mr-2" />
                                        Review Disputes
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="users" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">User Management</h2>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add User
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>All Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <UsersTable />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="kyc" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">KYC Verification</h2>
                        </div>

                        <PendingKYCList />
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-2">Approved (for reference)</h3>
                            <ApprovedKYCList />
                        </div>
                    </TabsContent>

                    <TabsContent value="categories" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Category Management</h2>
                            <AddCategoryButton />
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Service Categories</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CategoriesGrid />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="disputes" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Dispute Management</h2>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Active Disputes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="border rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-medium">Service Quality Issue</h3>
                                                <p className="text-sm text-gray-600">Complainant vs Respondent</p>
                                                <p className="text-xs text-gray-500">Created 2 days ago</p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <Button size="sm" variant="outline">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View
                                                </Button>
                                                <Button size="sm">
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Resolve
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="profile" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Admin Profile</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm">Name: {typeof window !== "undefined" ? (localStorage.getItem("npw_user_name") || "Admin") : "Admin"}</p>
                                <p className="text-sm">Email: {typeof window !== "undefined" ? (localStorage.getItem("npw_user_email") || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "-") : "-"}</p>
                                <div className="flex gap-2 mt-2">
                                    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/auth/signin" })}>Sign Out</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
