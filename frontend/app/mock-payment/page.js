"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

function MockPaymentInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const bookingId = searchParams.get("booking_id")
  const amount = searchParams.get("amount") || ""
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  const handlePay = async () => {
    setErr("")
    if (!bookingId) {
      setErr("Missing booking.")
      return
    }
    if (status === "loading") return
    const token =
      (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
    if (!token) {
      setErr("Please sign in to complete payment.")
      return
    }

    let stored = {}
    try {
      stored = JSON.parse(sessionStorage.getItem("esewa_mock_payload") || "{}")
    } catch {
      stored = {}
    }
    const transactionUuid = stored.transaction_uuid || "mock-uuid"
    const totalAmount = String(amount || stored.total_amount || "0")
    const data = btoa(
      JSON.stringify({
        transaction_uuid: transactionUuid,
        total_amount: totalAmount,
      })
    )

    setBusy(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/payment/esewa/verify/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data,
          booking_id: Number(bookingId),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.detail || "Verification failed")
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("pending_esewa_booking_id")
        sessionStorage.removeItem("esewa_mock_payload")
      }
      router.push(`/bookings/${bookingId}?payment=success`)
    } catch (e) {
      setErr(e.message || "Payment failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6 rounded-[28px] border border-primary/15 bg-card p-10 shadow-sm">
        <div
          className="inline-block rounded-lg px-5 py-2 text-lg font-semibold text-white"
          style={{ background: "#60BB46" }}
        >
          eSewa
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Test payment</h1>
          <p className="text-sm text-muted-foreground mt-2">Amount: NPR {amount || "—"}</p>
          <p className="text-xs text-muted-foreground/80 mt-1">Academic demo — simulates eSewa (mock mode)</p>
        </div>
        {err && <p className="text-sm text-destructive font-medium">{err}</p>}
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            className="w-full h-12 rounded-xl font-bold text-white border-0"
            style={{ background: "#60BB46" }}
            disabled={busy || status === "loading"}
            onClick={handlePay}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Processing…
              </>
            ) : (
              `Pay NPR ${amount || "—"}`
            )}
          </Button>
          <Button type="button" variant="outline" className="w-full h-11 rounded-xl font-semibold" asChild>
            <Link href="/payment/esewa/failed">Cancel payment</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function MockPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <MockPaymentInner />
    </Suspense>
  )
}
