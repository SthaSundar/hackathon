"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Handshake, Star, CheckCircle, Store, Truck, BadgeCheck, MessageCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"

const steps = [
    {
        icon: Search,
        title: "Discover Partners",
        description: "Browse verified flower vendors, decorators, and nursery experts across Kathmandu city."
    },
    {
        icon: MessageCircle,
        title: "Chat & Consult",
        description: "Talk directly with farmers or decorators to discuss your specific floral needs or event requirements."
    },
    {
        icon: Truck,
        title: "Seamless Delivery",
        description: "Receive fresh cut flowers or professional decoration services right at your doorstep or venue."
    },
    {
        icon: BadgeCheck,
        title: "Quality Guaranteed",
        description: "Rate your experience and help us maintain high standards for Nepal's floriculture community."
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
        const showClient = !isLoggedIn || displayRole !== "client"
        const showProvider = !isLoggedIn || displayRole !== "provider"
        setCta({ showClient, showProvider })
    }, [session?.role])

    return (
        <section className="py-24 px-4 bg-primary/5 relative overflow-hidden">
            {/* Soft Pattern Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#F48FB1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black mb-6 text-foreground tracking-tight">
                        How <span className="text-primary">NepWork</span> Works
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
                        Your journey from choosing the perfect bloom to professional event decoration.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, index) => {
                        const IconComponent = step.icon
                        return (
                            <Card key={index} className="bg-white/80 backdrop-blur-md border-primary/10 text-center hover:shadow-2xl transition-all duration-500 rounded-[40px] group overflow-hidden">
                                <CardHeader className="p-10">
                                    <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-500 shadow-sm">
                                        <IconComponent className="w-10 h-10 text-primary group-hover:text-white transition-colors" />
                                    </div>
                                    <CardTitle className="text-2xl font-black text-foreground mb-4 tracking-tight">
                                        {step.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-10 pb-10 pt-0">
                                    <p className="text-muted-foreground font-medium leading-relaxed">{step.description}</p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                <div className="mt-20 text-center">
                    <div className="bg-white rounded-[48px] p-12 max-w-4xl mx-auto border border-primary/10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-110 transition-transform duration-700" />
                        
                        <h3 className="text-3xl font-black mb-4 text-foreground tracking-tight">Ready to Elevate Your Floral Experience?</h3>
                        <p className="text-lg text-muted-foreground mb-10 font-medium max-w-xl mx-auto">
                            Join Kathmandu's most vibrant community of flower enthusiasts and professionals today.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10">
                            {cta.showClient && (
                                <Button asChild size="lg" className="h-16 px-10 rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:shadow-xl transition-all scale-105">
                                    <Link href="/auth/signin">Join as Client</Link>
                                </Button>
                            )}
                            {cta.showProvider && (
                                <Button asChild variant="outline" size="lg" className="h-16 px-10 rounded-[20px] font-black uppercase tracking-widest text-xs border-primary/20 text-primary hover:bg-primary/5 transition-all">
                                    <Link href="/auth/signin?role=provider">Join as Provider</Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
