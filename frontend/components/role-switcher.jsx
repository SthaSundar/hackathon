"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Briefcase, Crown } from "lucide-react"

export default function RoleSwitcher() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [currentRole, setCurrentRole] = useState("customer")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedRole = localStorage.getItem("npw_role") || "customer"
            setCurrentRole(savedRole)
        }
    }, [])

    // Ensure auth redirect effect runs before any early returns to keep hook order stable
    useEffect(() => {
        if (status === "loading") return
        const hasLocal = typeof window !== "undefined" && !!localStorage.getItem("npw_token")
        if (!session && !hasLocal) {
            router.replace("/auth/signin")
        }
    }, [session, status, router])

    const switchRole = async (newRole) => {
        if (loading) return
        const email = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("npw_user_email") : "")
        const username = session?.user?.name || (typeof window !== "undefined" ? localStorage.getItem("npw_user_name") : "")
        if (!email) {
            router.replace("/auth/signin")
            return
        }

        setLoading(true)
        try {
            // Update role in backend
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/sync/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    username,
                    role: newRole
                })
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                const msg = (errorData.error || errorData.detail || "").toString().toLowerCase()
                // If backend indicates the role account doesn't exist, guide to signup for that role
                if (res.status === 404 || res.status === 403 || msg.includes("no account") || msg.includes("not found") || msg.includes("signup")) {
                    window.location.href = newRole === "provider" ? "/auth/signin?role=provider" : "/auth/signin"
                    return
                }
                throw new Error(errorData.error || errorData.detail || "Failed to switch role")
            }

            // Update local storage
            localStorage.setItem("npw_role", newRole)
            setCurrentRole(newRole)

            // Redirect to dashboard with new role
            router.push(`/dashboard?role=${newRole}`)
        } catch (error) {
            console.error("Failed to switch role:", error)
            alert(`Failed to switch role: ${error.message || "Unknown error"}`)
        } finally {
            setLoading(false)
        }
    }

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!session && !(typeof window !== "undefined" && localStorage.getItem("npw_token"))) {
        return null
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-blue-200">
                <CardHeader className="text-center">
                    <CardTitle>Choose Your Role</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Welcome, {session?.user?.name || (typeof window !== "undefined" ? localStorage.getItem("npw_user_name") : "")}! Select how you want to use NepWork.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        variant={currentRole === "customer" ? "default" : "outline"}
                        className="w-full h-20 flex flex-col items-center justify-center space-y-2"
                        onClick={() => switchRole("customer")}
                        disabled={loading}
                    >
                        <User className="h-6 w-6" />
                        <div>
                            <div className="font-medium">Client</div>
                            <div className="text-xs">Request services and book providers</div>
                        </div>
                    </Button>

                    <Button
                        variant={currentRole === "provider" ? "default" : "outline"}
                        className="w-full h-20 flex flex-col items-center justify-center space-y-2"
                        onClick={() => switchRole("provider")}
                        disabled={loading}
                    >
                        <Briefcase className="h-6 w-6" />
                        <div>
                            <div className="font-medium">Service Provider</div>
                            <div className="text-xs">Offer services and manage bookings</div>
                        </div>
                    </Button>

                    {session?.role === "admin" && (
                        <Button
                            variant={currentRole === "admin" ? "default" : "outline"}
                            className="w-full h-20 flex flex-col items-center justify-center space-y-2"
                            onClick={() => switchRole("admin")}
                            disabled={loading}
                        >
                            <Crown className="h-6 w-6" />
                            <div>
                                <div className="font-medium">Admin</div>
                                <div className="text-xs">Manage platform and users</div>
                            </div>
                        </Button>
                    )}

                    {loading && (
                        <div className="text-center text-sm text-muted-foreground">
                            Switching role...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}





