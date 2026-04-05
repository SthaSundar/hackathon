"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ArrowLeft, Images, Loader2, Store } from "lucide-react"

export default function PublicPortfolioPage() {
  const params = useParams()
  const router = useRouter()
  const providerId = params?.id
  const [providerName, setProviderName] = useState("")
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const run = async () => {
      if (!providerId) return
      setLoading(true)
      setError("")
      try {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
        const [pRes, portRes] = await Promise.all([
          fetch(`${apiUrl}/accounts/providers/${providerId}/`),
          fetch(`${apiUrl}/services/providers/${providerId}/portfolio/`),
        ])
        if (pRes.ok) {
          const p = await pRes.json()
          setProviderName(p.name || "Provider")
        }
        if (!portRes.ok) throw new Error("Could not load portfolio")
        const data = await portRes.json()
        setItems(Array.isArray(data) ? data : data.results || [])
      } catch (e) {
        setError(e.message || "Failed to load")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [providerId])

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 rounded-full font-semibold -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-3 mb-10">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Images className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Portfolio</h1>
            <p className="text-muted-foreground font-medium">{providerName || "Provider showcase"}</p>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center py-24 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm font-medium">Loading gallery…</p>
          </div>
        )}

        {!loading && error && (
          <Card className="rounded-[28px] border-primary/15 max-w-md mx-auto">
            <CardContent className="py-12 text-center space-y-4">
              <Store className="h-10 w-10 text-primary/30 mx-auto" />
              <p className="text-muted-foreground">{error}</p>
              <Button asChild variant="outline" className="rounded-full font-bold">
                <Link href={`/profile/${providerId}`}>View profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-20 rounded-[32px] border border-dashed border-primary/20 bg-primary/5">
            <p className="text-muted-foreground font-medium">No portfolio photos yet.</p>
            <Button asChild variant="link" className="text-primary font-bold mt-2">
              <Link href={`/profile/${providerId}`}>Back to profile</Link>
            </Button>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {items.map((item) => {
              const src = item.image_url || item.image
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="text-left group rounded-[28px] overflow-hidden border border-primary/15 bg-white shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-primary/5">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                    ) : null}
                  </div>
                  <div className="p-5">
                    <h2 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{item.title}</h2>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{item.description}</p>
                    )}
                    <p className="text-xs font-bold text-primary mt-3 uppercase tracking-wider">Tap for details</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg rounded-[28px] border-primary/15 p-0 gap-0 overflow-hidden">
          {selected && (
            <>
              <div className="aspect-video bg-primary/5 overflow-hidden">
                {(selected.image_url || selected.image) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.image_url || selected.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <DialogHeader className="p-6 text-left space-y-2">
                <DialogTitle className="text-xl font-bold">{selected.title}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed text-left">
                  {selected.description || "No description provided."}
                </DialogDescription>
              </DialogHeader>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
