"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function RoleGuard({ allow = ["customer", "provider", "admin"], fallback = "/auth/signin", children }) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === "loading") return
        const isBrowser = typeof window !== "undefined"
        const localRole = isBrowser ? localStorage.getItem("npw_role") : "customer"
        const hasLocalToken = isBrowser && (!!localStorage.getItem("npw_token") || !!session?.accessToken)
        const role = session?.role || localRole
        if ((!session && !hasLocalToken) || !allow.includes(role)) {
            router.replace(fallback)
        }
    }, [session, status, router, allow, fallback])

    if (status === "loading") return null
    const isBrowser = typeof window !== "undefined"
    const localRole = isBrowser ? localStorage.getItem("npw_role") : "customer"
    const hasLocalToken = isBrowser && (!!localStorage.getItem("npw_token") || !!session?.accessToken)
    const role = session?.role || localRole
    if ((!session && !hasLocalToken) || !allow.includes(role)) return null
    return children
}



