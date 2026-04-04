"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, MapPin, Clock, ArrowLeft, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function ServiceDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session } = useSession()
    const [service, setService] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [isBooking, setIsBooking] = useState(false)

    useEffect(() => {
        const loadService = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/services/${params.id}/detail/`)
                if (!res.ok) {
                    throw new Error("Service not found")
                }
                const data = await res.json()
                setService(data)
            } catch (e) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        if (params.id) loadService()
    }, [params.id])

    const handleBook = () => {
        const hasToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token")
        if (!session && !hasToken) {
            router.push("/auth/signin")
            return
        }
        router.push(`/book/${service.id}`)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (error || !service) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Service Not Found</h1>
                    <p className="text-gray-600 mb-6">{error || "The service you're looking for doesn't exist."}</p>
                    <Button asChild>
                        <Link href="/services">Browse Services</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Button variant="outline" onClick={() => router.back()} className="mb-6">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-3xl mb-2 flex items-center gap-2">
                                            {service.title}
                                            {service.provider_verified && (
                                                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full" title="Verified Provider">
                                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </span>
                                            )}
                                        </CardTitle>
                                        <CardDescription className="text-lg">
                                            by {service.provider_name || service.provider_email}
                                            {service.provider_verified && (
                                                <span className="ml-2 text-blue-600 font-semibold">✓ Verified Provider</span>
                                            )}
                                        </CardDescription>
                                    </div>
                                    {service.average_rating && (
                                        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                            <span className="text-xl font-bold">{service.average_rating}</span>
                                            {service.total_reviews > 0 && (
                                                <span className="text-sm text-gray-600">({service.total_reviews} reviews)</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Description</h3>
                                    <p className="text-gray-700 leading-relaxed">{service.description}</p>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    {service.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-5 w-5 text-gray-500" />
                                            <span className="text-gray-700">{service.location}</span>
                                        </div>
                                    )}
                                    {service.pricing_type && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-5 w-5 text-gray-500" />
                                            <span className="text-gray-700 capitalize">{service.pricing_type}</span>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-gray-700">Category: </span>
                                        <span className="font-medium">{service.category_name}</span>
                                    </div>
                                </div>

                                {/* Reviews Section */}
                                {service.reviews && service.reviews.length > 0 && (
                                    <div>
                                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                            <MessageSquare className="h-5 w-5" />
                                            Reviews ({service.reviews.length})
                                        </h3>
                                        <div className="space-y-4">
                                            {service.reviews.map((review) => (
                                                <Card key={review.id} className="bg-gray-50">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div>
                                                                <p className="font-medium">{review.customer_name || review.customer_email}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {new Date(review.created_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                            {review.rating && (
                                                                <div className="flex items-center gap-1">
                                                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                                    <span className="text-sm font-medium">{review.rating}/5</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {review.review && (
                                                            <p className="text-gray-700 mt-2">{review.review}</p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pricing</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Base Price</p>
                                        <p className="text-3xl font-bold text-blue-600">Rs. {service.base_price}</p>
                                        <p className="text-sm text-gray-500 mt-1 capitalize">{service.pricing_type} pricing</p>
                                    </div>

                                    {((session?.user?.email || (typeof window !== "undefined" && localStorage.getItem("npw_token"))) && session?.user?.email !== service.provider_email) ? (
                                        <Button 
                                            onClick={handleBook} 
                                            disabled={isBooking}
                                            className="w-full"
                                            size="lg"
                                        >
                                            {isBooking ? "Booking..." : "Book This Service"}
                                        </Button>
                                    ) : session?.user?.email === service.provider_email ? (
                                        <Button variant="outline" className="w-full" size="lg" disabled>
                                            Your Service
                                        </Button>
                                    ) : (
                                        <Button 
                                            onClick={() => router.push("/auth/signin")}
                                            className="w-full"
                                            size="lg"
                                        >
                                            Sign In to Book
                                        </Button>
                                    )}
                                    {((session?.user?.email || (typeof window !== "undefined" && localStorage.getItem("npw_token"))) && session?.user?.email !== service.provider_email) && (
                                        <Button 
                                            onClick={async () => {
                                                try {
                                                    const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
                                                    if (!token && !session) {
                                                        router.push("/auth/signin")
                                                        return
                                                    }
                                                    const headers = token
                                                        ? { "Authorization": `Bearer ${token}` }
                                                        : {}
                                                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chats/inquiry/${service.id}/start/`, {
                                                        method: "POST",
                                                        headers
                                                    })
                                                    if (!res.ok) {
                                                        const data = await res.json().catch(() => ({}))
                                                        throw new Error(data?.detail || "Failed to start inquiry chat")
                                                    }
                                                    const data = await res.json()
                                                    if (data?.id) {
                                                        router.push(`/chat/${data.id}`)
                                                    }
                                                } catch (e) {
                                                    console.error(e)
                                                }
                                            }} 
                                            variant="outline" 
                                            className="w-full mt-2"
                                            size="lg"
                                        >
                                            Start Inquiry Chat
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Service Provider</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <p className="font-medium">{service.provider_name || service.provider_email}</p>
                                    <p className="text-sm text-gray-600">{service.provider_email}</p>
                                    {service.average_rating && (
                                        <div className="flex items-center gap-2 mt-3">
                                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                            <span className="font-medium">{service.average_rating}/5</span>
                                            <span className="text-sm text-gray-500">({service.total_reviews} reviews)</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

