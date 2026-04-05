"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ArrowLeft,
  Calendar,
  MessageCircle,
  MapPin,
  Loader2,
  AlertCircle,
  CreditCard,
  Star,
  Scale,
  CheckCircle2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

function displayAmount(b) {
  const raw = b?.total_amount ?? b?.amount_paid ?? b?.base_price
  const n = Number(raw)
  return Number.isFinite(n) ? n.toLocaleString() : "0"
}

function paymentStatusLabel(status) {
  switch (status) {
    case "not_due":
      return "Payment not due"
    case "unpaid":
      return "Unpaid"
    case "held":
      return "Paid (held)"
    case "released":
      return "Paid"
    case "refunded":
      return "Refunded"
    default:
      return status || "—"
  }
}

function submitEsewaForm(payload) {
  const target = payload.esewa_url || ""
  if (target === "/mock-payment" || target.endsWith("/mock-payment")) {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("esewa_mock_payload", JSON.stringify(payload))
      } catch {
        /* ignore */
      }
      const q = new URLSearchParams({
        booking_id: String(payload.booking_id ?? ""),
        amount: String(payload.total_amount ?? ""),
      })
      window.location.href = `${window.location.origin}/mock-payment?${q.toString()}`
    }
    return
  }
  const form = document.createElement("form")
  form.method = "POST"
  form.action = payload.esewa_url
  const keys = [
    "amount",
    "tax_amount",
    "total_amount",
    "transaction_uuid",
    "product_code",
    "product_service_charge",
    "product_delivery_charge",
    "success_url",
    "failure_url",
    "signed_field_names",
    "signature",
  ]
  keys.forEach((key) => {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = key
    input.value = payload[key] ?? ""
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
}

function FulfillmentTracker({ booking }) {
  const s = booking.status
  const phase = booking.delivery_phase || "none"
  if (s === "cancelled" || s === "declined") {
    return (
      <div className="rounded-2xl border border-primary/10 bg-muted/30 p-4 text-sm text-muted-foreground">
        {s === "cancelled" ? "This booking was cancelled." : "The provider declined this request."}
      </div>
    )
  }
  const steps = [
    { label: "Requested", done: true },
    { label: "Accepted", done: ["confirmed", "completed"].includes(s) },
    {
      label: "Preparing",
      done: s === "completed" || (s === "confirmed" && ["preparing", "out_for_delivery"].includes(phase)),
    },
    {
      label: "Out for delivery",
      done: s === "completed" || (s === "confirmed" && phase === "out_for_delivery"),
    },
    { label: "Completed", done: s === "completed" },
  ]
  const doneCount = steps.filter((x) => x.done).length
  const pct = (doneCount / steps.length) * 100
  return (
    <div className="rounded-2xl border border-primary/10 bg-white p-5 space-y-4">
      <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Order progress</p>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <ol className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-between gap-3 sm:gap-2">
        {steps.map((st, i) => (
          <li
            key={st.label}
            className={`flex items-center gap-2 text-[11px] font-bold ${st.done ? "text-primary" : "text-muted-foreground"}`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shrink-0 text-[10px] ${
                st.done ? "border-primary bg-primary text-white" : "border-muted-foreground/25 text-muted-foreground"
              }`}
            >
              {st.done ? "✓" : i + 1}
            </span>
            <span className="leading-tight">{st.label}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = params?.id
  const [booking, setBooking] = useState(null)
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState("")
  const [ratingVal, setRatingVal] = useState(5)
  const [reviewText, setReviewText] = useState("")
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeCategory, setDisputeCategory] = useState("service_quality")
  const [disputeDescription, setDisputeDescription] = useState("")
  const [freshOpen, setFreshOpen] = useState(false)
  const [freshDesc, setFreshDesc] = useState("")
  const [freshBusy, setFreshBusy] = useState(false)

  const loadBooking = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setLoadError("")
    try {
      const token =
        (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
      const headers = { "Content-Type": "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`
      else if (session?.user?.email) headers["X-User-Email"] = session.user.email

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${id}/`, { headers })
      if (res.status === 404) {
        setLoadError("This booking was not found.")
        setBooking(null)
        return
      }
      if (res.status === 403) {
        setLoadError("You do not have access to this booking.")
        setBooking(null)
        return
      }
      if (!res.ok) throw new Error("Could not load booking")
      setBooking(await res.json())
    } catch (e) {
      setLoadError(e.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [id, session?.accessToken, session?.user?.email])

  useEffect(() => {
    loadBooking()
  }, [loadBooking])

  const currentRole = useMemo(() => {
    if (typeof window === "undefined") return session?.role || "customer"
    return localStorage.getItem("npw_role") || session?.role || "customer"
  }, [session?.role])

  const isProviderViewer = useMemo(() => {
    if (currentRole !== "provider" || !session?.user?.email || !booking?.provider_email) return false
    return session.user.email.toLowerCase() === String(booking.provider_email).toLowerCase()
  }, [currentRole, session?.user?.email, booking?.provider_email])

  const isCustomerViewer = useMemo(() => {
    if (!session?.user?.email || !booking?.customer_email) return false
    return session.user.email.toLowerCase() === String(booking.customer_email).toLowerCase()
  }, [session?.user?.email, booking?.customer_email])

  const authHeaders = useCallback(() => {
    const token =
      (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
    const headers = { "Content-Type": "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }, [session?.accessToken])

  const patchBookingStatus = async (nextStatus) => {
    setActionBusy(true)
    setActionError("")
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${id}/status/`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || data.message || "Could not update booking")
      setBooking(data)
    } catch (e) {
      setActionError(e.message || "Update failed")
    } finally {
      setActionBusy(false)
    }
  }

  useEffect(() => {
    if (booking?.rating) setRatingVal(Number(booking.rating) || 5)
    if (booking?.review) setReviewText(booking.review)
  }, [booking?.rating, booking?.review])

  const payWithEsewa = async () => {
    setActionBusy(true)
    setActionError("")
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/payment/esewa/initiate/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ booking_id: Number(id) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || "Could not start payment")
      if (typeof window !== "undefined") {
        window.localStorage.setItem("pending_esewa_booking_id", String(id))
      }
      submitEsewaForm(data)
    } catch (e) {
      setActionError(e.message || "Payment start failed")
    } finally {
      setActionBusy(false)
    }
  }

  const confirmSettlement = async () => {
    setActionBusy(true)
    setActionError("")
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${id}/settlement/confirm/`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: "{}",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || "Could not confirm")
      if (data.booking) setBooking(data.booking)
      else await loadBooking()
    } catch (e) {
      setActionError(e.message || "Confirm failed")
    } finally {
      setActionBusy(false)
    }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    setActionBusy(true)
    setActionError("")
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${id}/rate/`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ rating: ratingVal, review: reviewText }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || "Could not save review")
      setBooking(data)
    } catch (e) {
      setActionError(e.message || "Review failed")
    } finally {
      setActionBusy(false)
    }
  }

  const submitDispute = async (e) => {
    e.preventDefault()
    if (!disputeDescription.trim()) return
    setActionBusy(true)
    setActionError("")
    try {
      const fd = new FormData()
      fd.append("category", disputeCategory)
      fd.append("description", disputeDescription)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/create/${id}/`, {
        method: "POST",
        headers: { Authorization: authHeaders().Authorization || "" },
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || "Could not create dispute")
      setDisputeOpen(false)
      setDisputeDescription("")
      await loadBooking()
    } catch (e) {
      setActionError(e.message || "Dispute failed")
    } finally {
      setActionBusy(false)
    }
  }

  const submitFreshness = async (e) => {
    e.preventDefault()
    setFreshBusy(true)
    setActionError("")
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${id}/report-freshness/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ description: freshDesc.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || "Could not submit report")
      setFreshOpen(false)
      setFreshDesc("")
    } catch (err) {
      setActionError(err.message || "Report failed")
    } finally {
      setFreshBusy(false)
    }
  }

  const patchDeliveryPhase = async (delivery_phase) => {
    setActionBusy(true)
    setActionError("")
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${id}/delivery-phase/`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ delivery_phase }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || data.message || "Could not update progress")
      setBooking(data)
    } catch (e) {
      setActionError(e.message || "Update failed")
    } finally {
      setActionBusy(false)
    }
  }

  const scheduledLabel = useMemo(() => {
    if (!booking?.scheduled_for) return null
    try {
      return new Date(booking.scheduled_for).toLocaleString()
    } catch {
      return booking.scheduled_for
    }
  }, [booking])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (loadError || !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-[28px] border-primary/15">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-primary mx-auto" />
            <p className="text-muted-foreground font-medium">{loadError || "Booking not found."}</p>
            <Button asChild className="rounded-full font-bold">
              <Link href="/dashboard?tab=bookings">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 rounded-full font-semibold -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="rounded-[28px] border-primary/15 shadow-sm overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-primary/30 to-transparent" />
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">{booking.service_title}</CardTitle>
                <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
                  <span>Booking #{booking.id}</span>
                  <span className="capitalize font-semibold text-foreground">{booking.status}</span>
                  {booking.status === "completed" && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {paymentStatusLabel(booking.payment_status)}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Amount</p>
                <p className="text-2xl font-black text-primary">Rs. {displayAmount(booking)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <FulfillmentTracker booking={booking} />

            {booking.status === "completed" && isProviderViewer && (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1">Payment</p>
                <p className="font-semibold text-foreground">{paymentStatusLabel(booking.payment_status)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  After the client pays with eSewa, funds show as &quot;Paid (held)&quot; until they confirm settlement.
                </p>
              </div>
            )}

            {booking.status === "completed" && isCustomerViewer && booking.payment_status === "unpaid" && (
              <div className="rounded-2xl border border-primary/20 bg-card p-5 space-y-3">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Pay with eSewa
                </p>
                <p className="text-xs text-muted-foreground">
                  You will be redirected to eSewa (sandbox: ID 9806800001 / Nepal@123 / OTP 123456).
                </p>
                <Button
                  type="button"
                  className="rounded-full font-bold"
                  disabled={actionBusy}
                  onClick={payWithEsewa}
                >
                  {actionBusy ? "Starting…" : `Pay Rs. ${displayAmount(booking)}`}
                </Button>
              </div>
            )}

            {booking.status === "completed" && isCustomerViewer && booking.payment_status === "held" && (
              <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-5 space-y-3">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary-foreground" />
                  Payment received
                </p>
                <p className="text-xs text-muted-foreground">
                  Confirm you are satisfied so the booking can be settled and the provider can be paid out.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full font-bold"
                  disabled={actionBusy}
                  onClick={confirmSettlement}
                >
                  {actionBusy ? "Confirming…" : "Confirm & release settlement"}
                </Button>
              </div>
            )}

            {booking.status === "completed" && isCustomerViewer && (
              <form onSubmit={submitReview} className="rounded-2xl border border-primary/10 p-5 space-y-4">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  Rate this service
                </p>
                <p className="text-xs text-muted-foreground">
                  Your rating appears on the service page for other clients.
                </p>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Rating (1–5)</label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    className="mt-1 rounded-xl border-primary/15"
                    value={ratingVal}
                    onChange={(e) => setRatingVal(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Review (optional)</label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-primary/15 p-3 text-sm min-h-[88px] outline-none focus:ring-2 focus:ring-primary/20"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience…"
                  />
                </div>
                <Button type="submit" variant="outline" className="rounded-full font-bold border-primary/20" disabled={actionBusy}>
                  {booking.rating ? "Update review" : "Submit review"}
                </Button>
              </form>
            )}

            {booking.status === "completed" && isCustomerViewer && (
              <button
                type="button"
                className="text-xs font-bold text-primary underline underline-offset-2"
                onClick={() => setFreshOpen(true)}
              >
                Report freshness issue
              </button>
            )}

            {booking.status === "completed" && (isCustomerViewer || isProviderViewer) && (
              <Button
                type="button"
                variant="outline"
                className="rounded-full font-bold border-destructive/20 text-destructive hover:bg-destructive/5"
                onClick={() => setDisputeOpen(true)}
              >
                <Scale className="h-4 w-4 mr-2" />
                Raise dispute
              </Button>
            )}

            {isProviderViewer && ["pending", "confirmed"].includes(booking.status) && (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 space-y-3">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Provider actions</p>
                <p className="text-xs text-muted-foreground">
                  Use these to test the flow after a client books. Customers only see progress above.
                </p>
                {booking.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="rounded-full font-bold"
                      disabled={actionBusy}
                      onClick={() => patchBookingStatus("confirmed")}
                    >
                      Accept booking
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full font-bold border-primary/20"
                      disabled={actionBusy}
                      onClick={() => patchBookingStatus("declined")}
                    >
                      Decline
                    </Button>
                  </div>
                )}
                {booking.status === "confirmed" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {booking.delivery_phase === "none" && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full font-bold border-primary/20"
                          disabled={actionBusy}
                          onClick={() => patchDeliveryPhase("preparing")}
                        >
                          Mark preparing
                        </Button>
                      )}
                      {booking.delivery_phase === "preparing" && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full font-bold border-primary/20"
                          disabled={actionBusy}
                          onClick={() => patchDeliveryPhase("out_for_delivery")}
                        >
                          Out for delivery
                        </Button>
                      )}
                      {booking.delivery_phase === "out_for_delivery" && (
                        <p className="text-xs text-muted-foreground w-full">
                          Customer sees &quot;Out for delivery&quot;. Mark completed when the job is done.
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-full font-bold"
                      disabled={actionBusy}
                      onClick={() => patchBookingStatus("completed")}
                    >
                      Mark completed
                    </Button>
                  </div>
                )}
                {actionError && (
                  <p className="text-sm text-destructive font-medium flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {actionError}
                  </p>
                )}
              </div>
            )}

            {scheduledLabel && (
              <div className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">Scheduled for</p>
                  <p className="font-semibold text-foreground">{scheduledLabel}</p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-primary/10 p-4">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Provider</p>
                <p className="font-semibold text-foreground">{booking.provider_name || booking.provider_email}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 p-4">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Customer</p>
                <p className="font-semibold text-foreground">{booking.customer_name || booking.customer_email}</p>
              </div>
            </div>

            {booking.notes && (
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Notes</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{booking.notes}</p>
              </div>
            )}

            {(booking.company_name || booking.pan) && (
              <div className="rounded-2xl border border-dashed border-primary/20 p-4 text-sm">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Company / AMC</p>
                {booking.company_name && <p className="text-foreground">{booking.company_name}</p>}
                {booking.pan && <p className="text-muted-foreground">PAN: {booking.pan}</p>}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {booking.service && (
                <Button asChild variant="outline" className="rounded-full font-bold border-primary/20">
                  <Link href={`/services/${booking.service}`}>
                    <MapPin className="h-4 w-4 mr-2" />
                    View service
                  </Link>
                </Button>
              )}
              {booking.chat_thread_id && (
                <Button asChild className="rounded-full font-bold">
                  <Link href={`/chat/${booking.chat_thread_id}`}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Open chat
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" className="rounded-full font-bold">
                <Link href="/dashboard?tab=bookings">All bookings</Link>
              </Button>
            </div>

            {actionError && (
              <p className="text-sm text-destructive font-medium flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {actionError}
              </p>
            )}
          </CardContent>
        </Card>

        <Dialog open={freshOpen} onOpenChange={setFreshOpen}>
          <DialogContent className="rounded-[28px] border-primary/15 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Report freshness issue</DialogTitle>
              <DialogDescription>
                Use this after the job is completed if flowers or materials did not meet freshness expectations.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitFreshness} className="space-y-3">
              <textarea
                className="w-full rounded-xl border border-primary/15 bg-background px-3 py-2 text-sm min-h-[100px]"
                value={freshDesc}
                onChange={(e) => setFreshDesc(e.target.value)}
                placeholder="Describe what you observed"
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setFreshOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full font-bold" disabled={freshBusy}>
                  {freshBusy ? "Submitting…" : "Submit report"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
          <DialogContent className="rounded-[28px] border-primary/15 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Raise dispute</DialogTitle>
              <DialogDescription>
                Describe the issue. An admin will review and both parties get a notification.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitDispute} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Category</label>
                <select
                  className="mt-1 w-full rounded-xl border border-primary/15 bg-background px-3 py-2 text-sm"
                  value={disputeCategory}
                  onChange={(e) => setDisputeCategory(e.target.value)}
                >
                  <option value="service_quality">Service quality</option>
                  <option value="payment">Payment</option>
                  <option value="behavior">Behavior</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Description</label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-primary/15 bg-background px-3 py-2 text-sm min-h-[100px]"
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  required
                  placeholder="Explain what went wrong"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setDisputeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full font-bold" disabled={actionBusy}>
                  Submit
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
