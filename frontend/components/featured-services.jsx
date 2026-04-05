"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, MapPin, Clock } from "lucide-react"
import Link from "next/link"

export default function FeaturedServices() {
    const [services, setServices] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadServices = async () => {
            try {
                if (!process.env.NEXT_PUBLIC_API_URL) {
                    console.warn("NEXT_PUBLIC_API_URL not configured")
                    setLoading(false)
                    return
                }
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/services/?limit=3`, {
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                })
                if (res.ok) {
                    const data = await res.json()
                    // Sort by rating or take first 3
                    const sorted = Array.isArray(data) 
                        ? data.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)).slice(0, 3)
                        : []
                    setServices(sorted)
                } else {
                    console.warn(`Failed to load services: ${res.status} ${res.statusText}`)
                    setServices([]) // Set empty array on error
                }
            } catch (e) {
                // Silently handle errors - don't crash the app
                if (e.name === 'AbortError') {
                    console.warn("Request timeout - backend server may not be running")
                } else if (e.name === 'TypeError' && e.message?.includes('fetch')) {
                    console.warn("Failed to connect to backend. Make sure the Django server is running.")
                } else {
                    console.warn("Failed to load services", e.message || e)
                }
                setServices([]) // Set empty array on error
            } finally {
                setLoading(false)
            }
        }
        loadServices()
    }, [])

    if (loading) {
        return (
            <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
                            Featured Services
                        </h2>
                        <p className="text-xl text-black max-w-2xl mx-auto">
                            Loading services...
                        </p>
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section className="py-16 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
                        Featured Services
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Discover top-rated services from verified professionals
                    </p>
                </div>

                {services.length === 0 ? (
                    <div className="text-center py-12 bg-primary/5 rounded-[40px] border-2 border-dashed border-primary/10">
                        <p className="text-muted-foreground font-bold italic">
                            No featured services available at the moment.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {services.map((service) => (
                            <Card key={service.id} className="hover:shadow-lg transition-all duration-300">
                                <CardHeader>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {service.provider_freshness_guarantee && (
                                            <span
                                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                                                style={{ background: "#EAF3DE", color: "#173404", borderColor: "#97C459" }}
                                            >
                                                Fresh guaranteed
                                            </span>
                                        )}
                                        {service.provider_response_label && (
                                            <span
                                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                                style={{ background: "#E6F1FB", color: "#0C447C" }}
                                            >
                                                {service.provider_response_label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-blue-600 font-medium">{service.category_name || "Service"}</span>
                                        {service.average_rating && (
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                <span className="text-sm font-medium">{service.average_rating}</span>
                                                {service.total_reviews > 0 && (
                                                    <span className="text-sm text-white">({service.total_reviews})</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        {service.title}
                                        {service.provider_verified && (
                                            <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 rounded-full" title="Verified Provider">
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                        )}
                                    </CardTitle>
                                    <CardDescription className="text-sm text-blue-600">
                                        by {service.provider_name || service.provider_email}
                                        {service.provider_verified && <span className="ml-1 text-blue-800 font-semibold">✓ Verified</span>}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-white mb-4">{service.description?.slice(0, 150)}...</p>

                                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                                        {service.location && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {service.location}
                                            </div>
                                        )}
                                        {service.pricing_type && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {service.pricing_type}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-2xl font-bold text-blue-600">Rs. {service.base_price}</span>
                                    </div>

                                    <Button asChild className="w-full">
                                        <Link href={`/services/${service.id}`}>
                                            View Details
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="text-center mt-8">
                    <Button asChild size="lg" variant="outline">
                        <Link href="/services">
                            View All Services
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
