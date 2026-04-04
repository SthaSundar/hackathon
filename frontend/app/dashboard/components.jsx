"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Star, Calendar, CheckCircle, Clock, XCircle, MessageSquare, Ban } from "lucide-react"
import Link from "next/link"
import StripePayment from '@/components/stripe-payment'

export function ServicesList({ role, session }) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const run = async () => {
            setLoading(true)
            try {
                const localToken = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
                const bearer = localToken || session?.accessToken || null
                // Avoid custom headers when unauthenticated to prevent CORS preflight; public services need no headers
                const headers = bearer ? { "Authorization": `Bearer ${bearer}`, "Content-Type": "application/json" } : undefined

                // Map role - "client" is displayed but backend uses "customer"
                const backendRole = role === "client" ? "customer" : role
                let url
                if (backendRole === "provider") {
                    // If provider but no bearer token (e.g., Google-only login), fallback to public list to avoid 401
                    url = bearer
                    ? `${process.env.NEXT_PUBLIC_API_URL}/services/services/my/`
                    : `${process.env.NEXT_PUBLIC_API_URL}/services/services/`
                } else {
                    url = `${process.env.NEXT_PUBLIC_API_URL}/services/services/`
                }
                
                const res = await fetch(url, headers ? { headers } : undefined)
                if (!res.ok) {
                    // Show empty instead of error
                    setItems([])
                } else {
                    const data = await res.json()
                    setItems(Array.isArray(data) ? data : [])
                }
            } catch (e) {
                setError(e.message)
                setItems([])
            } finally {
                setLoading(false)
            }
        }
        // Always run: client can fetch public services even without session
        run()
    }, [role, session?.accessToken, session?.user?.email])

    if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>
    if (error) return <p className="text-sm text-muted-foreground">No services found.</p>
    if (!items.length) return <p className="text-sm text-muted-foreground">No services found.</p>

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((s) => (
                <Card key={s.id}>
                    <CardHeader>
                        <CardTitle>{s.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{s.description?.slice(0, 100)}...</p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-lg font-bold text-blue-600">Rs. {s.base_price}</span>
                            {s.average_rating && (
                                <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="text-sm">{s.average_rating}</span>
                                    {s.total_reviews > 0 && (
                                        <span className="text-xs text-gray-500">({s.total_reviews})</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 mt-4">
                            {role === "provider" ? (
                                <>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/services/${s.id}/edit`}>Edit</Link>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/services/${s.id}`}>View</Link>
                                    </Button>
                                </>
                            ) : (
                                <Button size="sm" asChild className="w-full">
                                    <Link href={`/services/${s.id}`}>View Details</Link>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export function BookingsList({ role, session, showOnlyCompleted = false }) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
    const router = useRouter()

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handlePaymentSuccess = (paymentData, bookingId) => {
    setSuccess('Payment completed successfully!');
    // Refresh bookings to update payment status
    setTimeout(() => window.location.reload(), 2000);
  };

  const handlePaymentError = (errorMessage) => {
    setError(`Payment failed: ${errorMessage}`);
  };
    useEffect(() => {
        const run = async () => {
            setLoading(true)
            try {
                const localToken = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
                const bearer = localToken || session?.accessToken || null
                const headers = { "Content-Type": "application/json" }
                if (bearer) headers["Authorization"] = `Bearer ${bearer}`
                else if (session?.user?.email) headers["X-User-Email"] = session.user.email

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/mine/`, { headers })
                if (!res.ok) { setItems([]); return }
                
                const data = await res.json()
                setItems(Array.isArray(data) ? data : [])
            } catch (e) {
                setError(e.message)
                setItems([])
            } finally {
                setLoading(false)
            }
        }
        // Only fetch bookings if we have at least some identity
        if (session?.accessToken || (typeof window !== "undefined" && localStorage.getItem("npw_token")) || session?.user?.email) {
            run()
        } else {
            setItems([])
            setLoading(false)
        }
    }, [session?.accessToken, session?.user?.email])

    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [review, setReview] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const submitRating = async (bookingId) => {
        if (rating === 0) {
            setError("Please select a rating")
            return
        }
        setSubmitting(true)
        setError("")
        setSuccess("")
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
            const headers = token ? {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            } : { "Content-Type": "application/json" }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/rate/`, {
                method: "PATCH",
                headers,
                body: JSON.stringify({ rating, review }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.detail || "Failed to submit rating")
            }
            setSuccess("Thanks for your review!")
            setRating(0)
            setReview("")
            
            // Refresh bookings
            const refreshed = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/mine/`, {
                headers
            }).then((r) => r.json()).catch(() => [])
            setItems(Array.isArray(refreshed) ? refreshed : [])
        } catch (e) {
            setError(e.message)
        } finally {
            setSubmitting(false)
        }
    }

    const updateStatus = async (bookingId, status) => {
        setError("")
        setSuccess("")
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
            const headers = token ? {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            } : { "Content-Type": "application/json" }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/status/`, {
                method: "PATCH",
                headers,
                body: JSON.stringify({ status }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.detail || "Failed to update status")
            }
            const friendly = {
                confirmed: "Booking accepted.",
                cancelled: "Booking cancelled.",
                completed: "Great! Booking marked completed.",
                declined: "Booking declined.",
            }
            setSuccess(friendly[status] || "Status updated!")
            
            // Refresh bookings
            const refreshed = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/mine/`, {
                headers
            }).then((r) => r.json()).catch(() => [])
            setItems(Array.isArray(refreshed) ? refreshed : [])
        } catch (e) {
            setError(e.message)
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case "completed":
                return <CheckCircle className="h-4 w-4 text-green-500" />
            case "confirmed":
                return <Clock className="h-4 w-4 text-blue-500" />
            case "pending":
                return <Clock className="h-4 w-4 text-yellow-500" />
            case "cancelled":
                return <XCircle className="h-4 w-4 text-red-500" />
            case "declined":
                return <Ban className="h-4 w-4 text-red-500" />
            default:
                return <Clock className="h-4 w-4" />
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-800"
            case "confirmed":
                return "bg-blue-100 text-blue-800"
            case "pending":
                return "bg-yellow-100 text-yellow-800"
            case "cancelled":
                return "bg-red-100 text-red-800"
            case "declined":
                return "bg-red-100 text-red-800"
            default:
                return "bg-gray-100 text-gray-800"
        }
    }

    // Filter bookings by status for different sections
    const pendingBookings = items.filter(b => b.status === "pending")
    const confirmedBookings = items.filter(b => b.status === "confirmed")
    const completedBookings = items.filter(b => b.status === "completed")
    const declinedBookings = items.filter(b => b.status === "declined")

    const cancelWindowMessage = (booking) => {
        if (booking.status !== "confirmed") return null
        if (!booking.confirmed_at) return "You can cancel within 24 hours of acceptance."
        const confirmedAt = new Date(booking.confirmed_at)
        const deadline = new Date(confirmedAt.getTime() + 24 * 60 * 60 * 1000)
        const now = new Date()
        if (now <= deadline) {
            const hoursLeft = Math.max(0, Math.round((deadline - now) / (60 * 60 * 1000)))
            return `Cancellation window ends in ${hoursLeft || "less than 1"} hour(s).`
        }
        return "Cancellation window expired (24h after acceptance)."
    }

    const canCustomerCancel = (booking) => {
        if (booking.status === "pending") return true
        if (booking.status !== "confirmed") return false
        if (!booking.confirmed_at) return true
        const confirmedAt = new Date(booking.confirmed_at)
        const deadline = new Date(confirmedAt.getTime() + 24 * 60 * 60 * 1000)
        return new Date() <= deadline
    }

    if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

    if (role === "provider") {
        return (
            <div className="space-y-6">
                {(error || success) && (
                    <div className={`px-4 py-3 rounded ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                        {error || success}
                    </div>
                )}
                {/* Pending Services */}
                {pendingBookings.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Pending Services ({pendingBookings.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingBookings.map((b) => (
                                <Card key={b.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg">{b.service_title}</CardTitle>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(b.status)}`}>
                                                {b.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Customer: {b.customer_name || b.customer_email}</p>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <p className="text-sm"><strong>Price:</strong> Rs. {b.base_price}</p>
                                            {b.scheduled_for && (
                                                <p className="text-sm"><strong>Scheduled:</strong> {new Date(b.scheduled_for).toLocaleString()}</p>
                                            )}
                                            {b.notes && (
                                                <p className="text-sm"><strong>Notes:</strong> {b.notes}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <Button size="sm" onClick={() => updateStatus(b.id, "confirmed")}>
                                                Accept
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "declined")}>
                                                Decline
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Current Working Jobs */}
                {confirmedBookings.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Current Working Jobs ({confirmedBookings.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {confirmedBookings.map((b) => (
                                <Card key={b.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg">{b.service_title}</CardTitle>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(b.status)}`}>
                                                {b.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Customer: {b.customer_name || b.customer_email}</p>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <p className="text-sm"><strong>Price:</strong> Rs. {b.base_price}</p>
                                            {b.scheduled_for && (
                                                <p className="text-sm"><strong>Scheduled:</strong> {new Date(b.scheduled_for).toLocaleString()}</p>
                                            )}
                                            {b.notes && (
                                                <p className="text-sm"><strong>Notes:</strong> {b.notes}</p>
                                            )}
                                        </div>
                                        {b.chat_thread_id ? (
                                            <Button size="sm" variant="outline" className="mt-2 w-full" asChild>
                                                <Link href={`/chat/${b.chat_thread_id}`}>
                                                    <MessageSquare className="h-4 w-4 mr-2" />
                                                    Open Chat
                                                </Link>
                                            </Button>
                                        ) : null}
                                        <Button size="sm" className="mt-2 w-full" onClick={() => updateStatus(b.id, "completed")}>
                                            Mark as Completed
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {declinedBookings.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Declined Requests ({declinedBookings.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {declinedBookings.map((b) => (
                                <Card key={b.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg">{b.service_title}</CardTitle>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(b.status)}`}>
                                                {b.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Customer: {b.customer_name || b.customer_email}</p>
                                    </CardHeader>
                                    <CardContent>
                                        {b.notes && (
                                            <p className="text-sm"><strong>Notes:</strong> {b.notes}</p>
                                        )}
                                        {b.provider_responded_at && (
                                            <p className="text-xs text-muted-foreground mt-2">Declined on {new Date(b.provider_responded_at).toLocaleString()}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Past Services */}
                {completedBookings.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Past Services ({completedBookings.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {completedBookings.map((b) => (
                                <Card key={b.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg">{b.service_title}</CardTitle>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(b.status)}`}>
                                                {b.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Customer: {b.customer_name || b.customer_email}</p>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <p className="text-sm"><strong>Price:</strong> Rs. {b.base_price}</p>
                                            <div className="flex items-center gap-2">
                                                <strong>Payment:</strong>
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                    b.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                    {b.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                                                </span>
                                            </div>
                                            {b.rating && (
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-sm">{b.rating}/5</span>
                                                </div>
                                            )}
                                            {b.review && (
                                                <div className="text-sm">
                                                    <strong>Review:</strong> <p className="mt-1 italic">{b.review}</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {items.length === 0 && (
                    <p className="text-sm text-muted-foreground">No bookings yet.</p>
                )}
            </div>
        )
    }

    // Client view
    if (showOnlyCompleted) {
        return (
            <div className="space-y-6">
                {(error || success) && (
                    <div className={`px-4 py-3 rounded ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                        {error || success}
                    </div>
                )}
                {completedBookings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {completedBookings.map((b) => (
                            <Card key={b.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{b.service_title}</CardTitle>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(b.status)}`}>
                                            {b.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Provider: {b.provider_name || b.provider_email}</p>
                                </CardHeader>
                                <CardContent>
                                        <div className="space-y-3">
                                            <p className="text-sm"><strong>Price:</strong> Rs. {b.base_price}</p>
                                            <div className="flex items-center gap-2">
                                                <strong>Payment:</strong>
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                    b.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                    {b.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                                                </span>
                                            </div>
                                            {b.rating ? (
                                                <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star 
                                                                key={star} 
                                                                className={`h-4 w-4 ${star <= b.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} 
                                                            />
                                                        ))}
                                                        <span className="text-sm font-medium ml-1">{b.rating}/5</span>
                                                    </div>
                                                    {b.review && (
                                                        <p className="text-sm text-gray-600 italic mt-1">"{b.review}"</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-semibold text-gray-700">Rate this service</label>
                                                        <div className="flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <button
                                                                    key={star}
                                                                    type="button"
                                                                    className="focus:outline-none transition-transform active:scale-110"
                                                                    onMouseEnter={() => setHover(star)}
                                                                    onMouseLeave={() => setHover(0)}
                                                                    onClick={() => setRating(star)}
                                                                >
                                                                    <Star
                                                                        className={`h-6 w-6 transition-colors ${
                                                                            star <= (hover || rating)
                                                                                ? "fill-yellow-400 text-yellow-400"
                                                                                : "text-gray-300"
                                                                        }`}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-semibold text-gray-700">Write a review</label>
                                                        <textarea
                                                            className="w-full min-h-[80px] p-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                            placeholder="Share your experience with this service..."
                                                            value={review}
                                                            onChange={(e) => setReview(e.target.value)}
                                                        />
                                                    </div>

                                                    <Button 
                                                        size="sm" 
                                                        className="w-full bg-blue-600 hover:bg-blue-700" 
                                                        disabled={submitting || rating === 0}
                                                        onClick={() => submitRating(b.id)}
                                                    >
                                                        {submitting ? "Submitting..." : "Submit Review"}
                                                    </Button>
                                                </div>
                                            )}
                                            {/* Pay Button for unpaid completed bookings */}
                                        {(!b.payment_status || b.payment_status === 'pending') && (
                                            <div className="mt-4">
                                                <StripePayment
                                                    amount={b.base_price}
                                                    bookingId={b.id}
                                                    onSuccess={(paymentData) => handlePaymentSuccess(paymentData, b.id)}
                                                    onError={handlePaymentError}
                                                />
                                            </div>
                                        )}
                                        {b.payment_status === 'paid' && (
                                            <div className="mt-2 text-sm text-green-600 font-medium">
                                                ✓ Payment Completed
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No completed services yet.</p>
                )}
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {(error || success) && (
                <div className={`px-4 py-3 rounded ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {error || success}
                </div>
            )}
            {/* Current Service */}
            {confirmedBookings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">Current Service ({confirmedBookings.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {confirmedBookings.map((b) => (
                            <Card key={b.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{b.service_title}</CardTitle>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(b.status)}`}>
                                            {b.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Provider: {b.provider_name || b.provider_email}</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <p className="text-sm"><strong>Price:</strong> Rs. {b.base_price}</p>
                                        {b.scheduled_for && (
                                            <p className="text-sm"><strong>Scheduled:</strong> {new Date(b.scheduled_for).toLocaleString()}</p>
                                        )}
                                        {cancelWindowMessage(b) && (
                                            <p className="text-xs text-muted-foreground">{cancelWindowMessage(b)}</p>
                                        )}
                                    </div>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                                        </div>
                                        <p className="text-xs text-gray-600">Work in progress - 75%</p>
                                        {b.chat_thread_id ? (
                                            <Button size="sm" variant="outline" onClick={() => router.push(`/chat/${b.chat_thread_id}`)}>
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                Open Chat
                                            </Button>
                                        ) : null}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={!canCustomerCancel(b)}
                                            onClick={() => updateStatus(b.id, "cancelled")}
                                        >
                                            {canCustomerCancel(b) ? "Cancel Booking" : "Cancellation Locked"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Past Services */}
            {completedBookings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">Past Services ({completedBookings.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {completedBookings.map((b) => (
                            <Card key={b.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{b.service_title}</CardTitle>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(b.status)}`}>
                                            {b.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Provider: {b.provider_name || b.provider_email}</p>
                                </CardHeader>
                                <CardContent>
                                        <div className="space-y-3">
                                            <p className="text-sm"><strong>Price:</strong> Rs. {b.base_price}</p>
                                            <div className="flex items-center gap-2">
                                                <strong>Payment:</strong>
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                    b.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                    {b.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                                                </span>
                                            </div>
                                            {b.rating ? (
                                                <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star 
                                                                key={star} 
                                                                className={`h-4 w-4 ${star <= b.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} 
                                                            />
                                                        ))}
                                                        <span className="text-sm font-medium ml-1">{b.rating}/5</span>
                                                    </div>
                                                    {b.review && (
                                                        <p className="text-sm text-gray-600 italic mt-1">"{b.review}"</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-semibold text-gray-700">Rate this service</label>
                                                        <div className="flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <button
                                                                    key={star}
                                                                    type="button"
                                                                    className="focus:outline-none transition-transform active:scale-110"
                                                                    onMouseEnter={() => setHover(star)}
                                                                    onMouseLeave={() => setHover(0)}
                                                                    onClick={() => setRating(star)}
                                                                >
                                                                    <Star
                                                                        className={`h-6 w-6 transition-colors ${
                                                                            star <= (hover || rating)
                                                                                ? "fill-yellow-400 text-yellow-400"
                                                                                : "text-gray-300"
                                                                        }`}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-semibold text-gray-700">Write a review</label>
                                                        <textarea
                                                            className="w-full min-h-[80px] p-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                            placeholder="Share your experience with this service..."
                                                            value={review}
                                                            onChange={(e) => setReview(e.target.value)}
                                                        />
                                                    </div>

                                                    <Button 
                                                        size="sm" 
                                                        className="w-full bg-blue-600 hover:bg-blue-700" 
                                                        disabled={submitting || rating === 0}
                                                        onClick={() => submitRating(b.id)}
                                                    >
                                                        {submitting ? "Submitting..." : "Submit Review"}
                                                    </Button>
                                                </div>
                                            )}
                                            
                                            {/* Pay Button for unpaid completed bookings */}
                                        {(!b.payment_status || b.payment_status === 'pending') && (
                                            <div className="mt-4">
                                                <StripePayment
                                                    amount={b.base_price}
                                                    bookingId={b.id}
                                                    onSuccess={(paymentData) => handlePaymentSuccess(paymentData, b.id)}
                                                    onError={handlePaymentError}
                                                />
                                            </div>
                                        )}
                                        {b.payment_status === 'paid' && (
                                            <div className="mt-2 text-sm text-green-600 font-medium">
                                                ✓ Payment Completed
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Pending Bookings */}
            {pendingBookings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">Pending Bookings ({pendingBookings.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingBookings.map((b) => (
                            <Card key={b.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{b.service_title}</CardTitle>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(b.status)}`}>
                                            {b.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Provider: {b.provider_name || b.provider_email}</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <p className="text-sm"><strong>Price:</strong> Rs. {b.base_price}</p>
                                        {b.scheduled_for && (
                                            <p className="text-sm"><strong>Scheduled:</strong> {new Date(b.scheduled_for).toLocaleString()}</p>
                                        )}
                                    </div>
                                    <Button size="sm" variant="outline" className="mt-4" onClick={() => updateStatus(b.id, "cancelled")}>
                                        Cancel Booking
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {declinedBookings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">Declined ({declinedBookings.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {declinedBookings.map((b) => (
                            <Card key={b.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{b.service_title}</CardTitle>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(b.status)}`}>
                                            {b.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Provider: {b.provider_name || b.provider_email}</p>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm">This booking request was declined by the provider.</p>
                                    <p className="text-xs text-muted-foreground mt-2">Requested on {new Date(b.created_at).toLocaleString()}</p>
                                    {b.provider_responded_at && (
                                        <p className="text-xs text-muted-foreground">Declined on {new Date(b.provider_responded_at).toLocaleString()}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {items.length === 0 && (
                <p className="text-sm text-muted-foreground">No bookings yet.</p>
            )}
        </div>
    )
}

export function ProviderInquiriesList({ session }) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [unreadTotal, setUnreadTotal] = useState(0)

    useEffect(() => {
        const run = async () => {
            setLoading(true)
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
                if (!token) { setItems([]); setUnreadTotal(0); setLoading(false); return }
                const headers = { "Authorization": `Bearer ${token}` }
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chats/inquiries/provider/`, { headers })
                if (!res.ok) { setItems([]); setUnreadTotal(0); return }
                const data = await res.json()
                const list = Array.isArray(data) ? data : []
                setItems(list)
                setUnreadTotal(list.reduce((acc, t) => acc + (t.unread_count || 0), 0))
            } catch (e) {
                setError(e.message)
                setItems([])
                setUnreadTotal(0)
            } finally {
                setLoading(false)
            }
        }
        run()
    }, [session?.accessToken, session?.user?.email])

    if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>
    if (error) return <p className="text-sm text-red-600">{error}</p>
    if (!items.length) return <p className="text-sm text-muted-foreground">No inquiries yet.</p>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Inquiries</h2>
                {unreadTotal > 0 && (
                    <span className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {unreadTotal} unread
                    </span>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((t) => {
                    const expiresLabel = t.expires_in_seconds != null
                        ? (t.expires_in_seconds > 0 ? `Expires in ${Math.max(0, Math.round(t.expires_in_seconds / 3600))}h` : "Expired")
                        : ""
                    return (
                        <Card key={t.id} className={t.unread_count > 0 ? "border-blue-300" : ""}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{t.service_title || "Service"}</CardTitle>
                                    {t.unread_count > 0 && (
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {t.unread_count} new
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">Client: {t.client_name || t.client_email}</p>
                            </CardHeader>
                            <CardContent>
                                {t.last_message_preview && (
                                    <p className="text-sm text-gray-700">“{t.last_message_preview}”</p>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    {t.last_message_at ? new Date(t.last_message_at).toLocaleString() : "No messages yet"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{expiresLabel}</p>
                                <Button asChild variant="outline" className="mt-3 w-full">
                                    <Link href={`/chat/${t.id}`}>Open Chat</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
