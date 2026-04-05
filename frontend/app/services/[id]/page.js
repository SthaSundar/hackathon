"use client"

import { Suspense, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, MapPin, Clock, ArrowLeft, MessageSquare, BadgeCheck, Phone, Mail, Images, User } from "lucide-react"
import Link from "next/link"

function ServiceDetailInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isBooking, setIsBooking] = useState(false)

  useEffect(() => {
    const loadService = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/services/${params.id}/detail/`)
        if (!res.ok) throw new Error("Service not found")
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
    const qs = searchParams.toString()
    router.push(`/book/${service.id}${qs ? `?${qs}` : ""}`)
  }

  const providerId = service?.provider_id ?? service?.provider
  const canAct =
    (session?.user?.email || (typeof window !== "undefined" && localStorage.getItem("npw_token"))) &&
    session?.user?.email !== service?.provider_email

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full rounded-[32px] border-primary/10 shadow-lg">
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Service not found</h1>
            <p className="text-muted-foreground">{error || "This listing may have been removed."}</p>
            <Button asChild className="rounded-full font-bold">
              <Link href="/services">Browse partners</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 rounded-full text-foreground hover:bg-primary/10 font-semibold -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-[28px] border-primary/15 shadow-sm overflow-hidden">
              <div className="h-2 w-full bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex flex-wrap items-center gap-2">
                      {service.title}
                      {service.provider_verified && (
                        <span
                          className="inline-flex items-center justify-center rounded-full bg-primary/15 p-1.5 text-primary"
                          title="Verified provider"
                        >
                          <BadgeCheck className="h-5 w-5" />
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-base mt-2 text-muted-foreground">
                      Listed by{" "}
                      <span className="font-semibold text-foreground">
                        {service.provider_name || service.provider_email}
                      </span>
                      {service.provider_verified && (
                        <span className="ml-2 text-primary font-semibold">· Verified</span>
                      )}
                    </CardDescription>
                    <div className="flex flex-wrap gap-2 mt-3">
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
                  </div>
                  {service.average_rating != null && (
                    <div className="flex items-center gap-2 self-start rounded-2xl bg-primary/5 border border-primary/10 px-4 py-2">
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                      <span className="text-lg font-bold text-foreground">{service.average_rating}</span>
                      {service.total_reviews > 0 && (
                        <span className="text-sm text-muted-foreground">({service.total_reviews} reviews)</span>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary/80 mb-2">About</h3>
                  <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {service.category_name && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-bold px-4 py-1.5">
                      {service.category_name}
                    </span>
                  )}
                  {service.pricing_type && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white text-muted-foreground text-xs font-semibold px-4 py-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="capitalize">{service.pricing_type}</span>
                    </span>
                  )}
                </div>

                {service.reviews && service.reviews.length > 0 && (
                  <div className="pt-4 border-t border-primary/10">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      Reviews ({service.reviews.length})
                    </h3>
                    <div className="space-y-3">
                      {service.reviews.map((review) => (
                        <Card key={review.id} className="rounded-2xl border-primary/10 bg-primary/[0.03]">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-semibold text-foreground text-sm">
                                {review.customer_name || review.customer_email}
                              </p>
                              {review.rating && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  <span className="text-xs font-bold">{review.rating}/5</span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                            {review.review && <p className="text-sm text-muted-foreground leading-relaxed">{review.review}</p>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[28px] border-primary/15 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">From</p>
                  <p className="text-3xl font-black text-primary mt-1">Rs. {service.base_price}</p>
                  <p className="text-sm text-muted-foreground mt-1 capitalize">{service.pricing_type} pricing</p>
                </div>

                {canAct ? (
                  <>
                    <Button
                      onClick={handleBook}
                      disabled={isBooking}
                      className="w-full h-12 rounded-full font-bold shadow-md shadow-primary/20"
                      size="lg"
                    >
                      {isBooking ? "Opening…" : "Book this service"}
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
                          if (!token && !session) {
                            router.push("/auth/signin")
                            return
                          }
                          const headers = token ? { Authorization: `Bearer ${token}` } : {}
                          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chats/inquiry/${service.id}/start/`, {
                            method: "POST",
                            headers,
                          })
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}))
                            throw new Error(data?.detail || "Failed to start chat")
                          }
                          const data = await res.json()
                          if (data?.id) router.push(`/chat/${data.id}`)
                        } catch (e) {
                          console.error(e)
                        }
                      }}
                      variant="outline"
                      className="w-full h-12 rounded-full font-bold border-primary/20 bg-primary/5 hover:bg-primary/10"
                      size="lg"
                    >
                      Message provider
                    </Button>
                  </>
                ) : session?.user?.email === service.provider_email ? (
                  <Button variant="outline" className="w-full h-12 rounded-full font-semibold" size="lg" disabled>
                    Your listing
                  </Button>
                ) : (
                  <Button onClick={() => router.push("/auth/signin")} className="w-full h-12 rounded-full font-bold" size="lg">
                    Sign in to book
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-primary/15 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">Service provider</CardTitle>
                <CardDescription className="text-sm">From their verified profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-2xl overflow-hidden border border-primary/15 bg-primary/5 shrink-0 flex items-center justify-center">
                    {service.provider_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={service.provider_photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-primary/35" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-bold text-foreground leading-tight">
                      {service.provider_name || service.provider_email}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 break-all">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {service.provider_email}
                    </p>
                    {service.provider_phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        {service.provider_phone}
                      </p>
                    )}
                  </div>
                </div>

                {service.provider_address ? (
                  <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary/80 mb-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Address
                    </p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{service.provider_address}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Address will appear when the provider adds it to their KYC profile.</p>
                )}

                {providerId && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-11 rounded-full font-bold border-primary/20 hover:bg-primary/10"
                  >
                    <Link href={`/profile/${providerId}/portfolio`}>
                      <Images className="h-4 w-4 mr-2" />
                      View portfolio
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ServiceDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <ServiceDetailInner />
    </Suspense>
  )
}
