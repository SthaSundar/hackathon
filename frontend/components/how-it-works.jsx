"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Handshake, Star, CheckCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

const steps = [
    {
        icon: Search,
        title: "Find Services",
        description: "Browse through our extensive list of services and find the perfect match for your needs"
    },
    {
        icon: Handshake,
        title: "Connect & Book",
        description: "Connect with service providers, discuss requirements, and book your service"
    },
    {
        icon: CheckCircle,
        title: "Get Work Done",
        description: "Service providers complete your work with quality and professionalism"
    },
    {
        icon: Star,
        title: "Rate & Review",
        description: "Share your experience and help others find great service providers"
    }
]

export default function HowItWorks() {
    const { data: session } = useSession()
    const [cta, setCta] = useState({ showClient: true, showProvider: true })

    useEffect(() => {
        const isBrowser = typeof window !== "undefined"
        const hasToken = isBrowser && !!localStorage.getItem("npw_token")
        const localRole = (isBrowser ? localStorage.getItem("npw_role") : null) || session?.role || "customer"
        const displayRole = localRole === "customer" ? "client" : localRole
        const isLoggedIn = !!session || hasToken
        // When logged out: show both. When logged in: hide current role.
        const showClient = !isLoggedIn || displayRole !== "client"
        const showProvider = !isLoggedIn || displayRole !== "provider"
        setCta({ showClient, showProvider })
    }, [session?.role])
    return (
        <section className="py-16 px-4 bg-blue-50 text-blue-900">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-blue-800">
                        How NepWork Works
                    </h2>
                    <p className="text-xl text-blue-700 max-w-2xl mx-auto">
                        Simple steps to connect with the best service providers
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {steps.map((step, index) => {
                        const IconComponent = step.icon
                        return (
                            <Card key={index} className="bg-white border-blue-200 text-center hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="mx-auto w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mb-4">
                                        <IconComponent className="w-8 h-8 text-white" />
                                    </div>
                                    <CardTitle className="text-xl text-blue-800">
                                        {step.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-blue-700">{step.description}</p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                <div className="text-center mt-12">
                    <div className="bg-white rounded-lg p-8 max-w-2xl mx-auto border border-blue-200">
                        <h3 className="text-2xl font-bold mb-4 text-blue-800">Ready to Get Started?</h3>
                        <p className="text-blue-700 mb-6">
                            Join thousands of satisfied customers and service providers on NepWork
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {cta.showClient && (
                                <a href="/auth/signin" className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors">
                                    Join as Client
                                </a>
                            )}
                            {cta.showProvider && (
                                <a href="/auth/signin?role=provider" className="inline-flex items-center justify-center px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors">
                                    Join as Provider
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
