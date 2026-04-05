"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import NepaliDatePicker from "@/components/NepaliDatePicker"
import { getApiBase } from "@/lib/apiBase"
import { toast } from "sonner"
import { Loader2, ClipboardList } from "lucide-react"
import NepaliDate from "nepali-date-converter"

function formatEventDateLine(iso) {
  if (!iso) return null
  try {
    const n = new NepaliDate(new Date(`${iso}T12:00:00`))
    const bs = `${n.getYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`
    return (
      <span>
        Event (AD): {iso} · BS: {bs}
      </span>
    )
  } catch {
    return <span>Event: {iso}</span>
  }
}

async function apiErrorMessage(res) {
  const j = await res.json().catch(() => ({}))
  const d = j.detail
  if (typeof d === "string") return d
  if (Array.isArray(d)) {
    return d
      .map((x) => (typeof x === "string" ? x : x?.msg || JSON.stringify(x)))
      .join(" ")
  }
  return `Request failed (${res.status})`
}

export default function BulkBoardPage() {
  const { data: session, status } = useSession()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [offerModal, setOfferModal] = useState(null)
  const [offerMsg, setOfferMsg] = useState("")
  const [offerPrice, setOfferPrice] = useState("")
  const [offerBusy, setOfferBusy] = useState(false)

  const api = getApiBase()
  const token = () =>
    (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken

  const role =
    (typeof window !== "undefined" ? localStorage.getItem("npw_role") : null) || session?.role || "customer"
  const isClient = role === "customer" || role === "client"
  const isProvider = role === "provider"

  const load = useCallback(async () => {
    const t = token()
    if (!t) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const r = await fetch(`${api}/platform/bulk-inquiries/`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (r.ok) setItems(await r.json())
      else setItems([])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [api, session?.accessToken])

  useEffect(() => {
    if (status === "loading") return
    load()
  }, [status, load])

  const submitRequirement = async (e) => {
    e.preventDefault()
    const t = token()
    if (!t) return
    setSaving(true)
    try {
      const body = { title: title.trim(), description: description.trim() }
      if (eventDate) body.event_date = eventDate
      const r = await fetch(`${api}/platform/bulk-inquiries/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error(await apiErrorMessage(r))
      setModalOpen(false)
      setTitle("")
      setDescription("")
      setEventDate("")
      await load()
      toast.success("Requirement posted")
    } catch (err) {
      toast.error(err.message || "Failed to post")
    } finally {
      setSaving(false)
    }
  }

  const sendOffer = async () => {
    if (!offerModal) return
    const t = token()
    if (!t) return
    setOfferBusy(true)
    try {
      const body = { message: offerMsg.trim() }
      if (offerPrice.trim()) body.price_offer = parseInt(offerPrice, 10)
      const r = await fetch(`${api}/platform/bulk-inquiries/${offerModal.id}/respond/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error(await apiErrorMessage(r))
      setOfferModal(null)
      setOfferMsg("")
      setOfferPrice("")
      await load()
    } catch (e) {
      toast.error(e.message || "Failed")
    } finally {
      setOfferBusy(false)
    }
  }

  const closeInquiry = async (id) => {
    const t = token()
    if (!t) return
    const r = await fetch(`${api}/platform/bulk-inquiries/${id}/close/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}` },
    })
    if (r.ok) load()
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!token()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground font-medium">Sign in to use the bulk board.</p>
        <Button asChild className="rounded-full">
          <Link href="/auth/signin">Sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary/5 border-b border-primary/10 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <ClipboardList className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-black text-foreground tracking-tight">Bulk flower board</h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Post wholesale requirements. Verified vendors reply with price and availability — all on NepWork.
          </p>
          {isClient && (
            <Button className="mt-8 rounded-full font-bold" onClick={() => setModalOpen(true)}>
              Post a requirement
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-primary/20">
            <CardContent className="py-16 text-center text-muted-foreground font-medium">
              No open inquiries yet.
            </CardContent>
          </Card>
        ) : (
          items.map((inq) => (
            <Card key={inq.id} className="rounded-3xl border-primary/10 overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <div className="flex flex-wrap justify-between gap-2">
                  <CardTitle className="text-lg">{inq.title}</CardTitle>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    {inq.status}
                  </span>
                </div>
                <CardDescription>
                  {inq.event_date ? (
                    <>
                      {formatEventDateLine(inq.event_date)} ·{" "}
                    </>
                  ) : null}
                  Posted {inq.hours_since_posted}h ago · {inq.response_count} response(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {inq.description && <p className="text-sm text-muted-foreground">{inq.description}</p>}
                {isProvider && inq.status === "open" && (
                  <Button variant="outline" className="rounded-full font-bold" onClick={() => setOfferModal(inq)}>
                    Send offer
                  </Button>
                )}
                {inq.is_owner && inq.status === "open" && (
                  <Button variant="secondary" className="rounded-full font-bold" onClick={() => closeInquiry(inq.id)}>
                    Close inquiry
                  </Button>
                )}
                {inq.responses?.length > 0 && (
                  <div className="border-t border-primary/10 pt-4 space-y-3">
                    <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Responses</p>
                    {inq.responses.map((r) => (
                      <div key={r.id} className="rounded-2xl bg-muted/40 p-4 text-sm">
                        <p className="font-bold text-foreground">{r.provider_name}</p>
                        {r.price_offer != null && <p className="text-primary font-semibold">Rs. {r.price_offer}</p>}
                        <p className="text-muted-foreground mt-1">{r.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl border-primary/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post requirement</DialogTitle>
            <DialogDescription>Bulk flowers — quantities, varieties, delivery area.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRequirement} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground">Title</label>
              <Input
                className="mt-1 rounded-xl"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Need 500 roses for wedding on May 10"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
              <textarea
                className="mt-1 w-full min-h-[100px] rounded-xl border border-primary/15 px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <NepaliDatePicker label="Event date (optional)" value={eventDate} onChange={setEventDate} />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="rounded-full font-bold">
                {saving ? "Posting…" : "Post"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!offerModal} onOpenChange={(o) => !o && setOfferModal(null)}>
        <DialogContent className="rounded-3xl border-primary/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send offer</DialogTitle>
            <DialogDescription>Your message stays on NepWork.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-primary/15 px-3 py-2 text-sm"
              value={offerMsg}
              onChange={(e) => setOfferMsg(e.target.value)}
              placeholder="Availability, stem quality, delivery terms…"
            />
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground">Price (NPR, optional)</label>
              <Input
                type="number"
                className="mt-1 rounded-xl"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setOfferModal(null)}>
              Cancel
            </Button>
            <Button className="rounded-full font-bold" disabled={offerBusy} onClick={sendOffer}>
              {offerBusy ? "Sending…" : "Submit offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
