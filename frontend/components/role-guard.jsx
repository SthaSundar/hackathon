"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function RoleGuard({ allow = ["customer", "provider", "admin"], fallback = "/auth/signin", children }) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === "loading") return
        const localRole = (typeof window !== "undefined" && localStorage.getItem("npw_role")) || "customer"
        const hasLocalToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token")
        const role = session?.role || localRole
        if ((!session && !hasLocalToken) || !allow.includes(role)) {
            router.replace(fallback)
        }
    }, [session, status, router, allow, fallback])

    if (status === "loading") return null
    const localRole = (typeof window !== "undefined" && localStorage.getItem("npw_role")) || "customer"
    const hasLocalToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token")
    const role = session?.role || localRole
    if ((!session && !hasLocalToken) || !allow.includes(role)) return null
    return children
}



