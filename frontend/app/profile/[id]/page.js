"use client"

import { useEffect, useState, use } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, CheckCircle, Store, MapPin, Phone, Mail, Image as ImageIcon, Briefcase, Calendar, MessageCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import ProviderAvailabilityCalendar from "@/components/ProviderAvailabilityCalendar"

export default function ProviderProfilePage({ params }) {
  const resolvedParams = use(params)
  const providerId = resolvedParams.id
  
  const [provider, setProvider] = useState(null)
  const [services, setServices] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [prebookQs, setPrebookQs] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get("prebooking") === "true" && sp.get("event_id")) {
      setPrebookQs(`prebooking=true&event_id=${encodeURIComponent(sp.get("event_id"))}`)
    }
  }, [])

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!process.env.NEXT_PUBLIC_API_URL || !providerId) return
      
      setLoading(true)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
        
        // Fetch Provider Details
        const providerRes = await fetch(`${apiUrl}/accounts/providers/${providerId}/`)
        if (!providerRes.ok) throw new Error("Provider not found")
        const providerData = await providerRes.json()
        setProvider(providerData)

        // Fetch Services 
        const servicesRes = await fetch(`${apiUrl}/services/services/?provider=${providerId}`)
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json()
          setServices(Array.isArray(servicesData) ? servicesData : servicesData.results || [])
        }

        // Fetch Portfolio
        const portfolioRes = await fetch(`${apiUrl}/services/providers/${providerId}/portfolio/`)
        if (portfolioRes.ok) {
          const portfolioData = await portfolioRes.json()
          setPortfolio(Array.isArray(portfolioData) ? portfolioData : portfolioData.results || [])
        }

      } catch (err) {
        console.error(err)
        setError("Failed to load provider profile. They may not exist or are currently inactive.")
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [providerId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    )
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center bg-white p-12 rounded-[40px] shadow-2xl border border-primary/10 max-w-md w-full">
          <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Store className="w-10 h-10 text-primary/40" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">Provider Not Found</h2>
          <p className="text-muted-foreground font-medium leading-relaxed">{error}</p>
          <Button asChild className="mt-8 h-12 rounded-full px-8 font-bold shadow-lg hover:shadow-xl transition-all">
            <Link href="/services">Back to Marketplace</Link>
          </Button>
        </div>
      </div>
    )
  }

  const getCategoryBadge = (category) => {
    switch(category) {
      case "flower_vendor":
        return <span className="px-4 py-1.5 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-100">Flower Vendor</span>
      case "event_decorator":
        return <span className="px-4 py-1.5 bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-orange-100">Event Decorator</span>
      case "nursery_amc":
        return <span className="px-4 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-100">Nursery & AMC</span>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Premium Profile Header */}
      <div className="bg-primary/5 border-b border-primary/10 pt-24 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
            {/* Elegant Avatar */}
            <div className="w-48 h-48 rounded-[48px] border-8 border-white shadow-2xl overflow-hidden bg-white shrink-0 rotate-3 hover:rotate-0 transition-transform duration-500">
              {provider.profile_photo ? (
                <img src={provider.profile_photo} alt={provider.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/5">
                  <Store className="w-16 h-16 text-primary/30" />
                </div>
              )}
            </div>

            {/* Comprehensive Info */}
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                <h1 className="text-5xl font-black text-foreground tracking-tight">{provider.name}</h1>
                <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start">
                  {provider.is_verified && (
                    <div className="bg-secondary/20 p-1.5 rounded-full shadow-sm" title="Verified Provider">
                      <CheckCircle className="w-6 h-6 text-secondary-foreground" />
                    </div>
                  )}
                  {provider.freshness_guarantee && (
                    <span
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
                      style={{ background: "#EAF3DE", color: "#173404", borderColor: "#97C459" }}
                    >
                      Fresh guaranteed
                    </span>
                  )}
                  {provider.response_label && (
                    <span
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "#E6F1FB", color: "#0C447C" }}
                    >
                      {provider.response_label}
                    </span>
                  )}
                  {provider.is_featured && (
                    <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full shadow-sm">FEATURED</span>
                  )}
                </div>
              </div>
              
              <div className="mb-8 flex justify-center md:justify-start">
                {getCategoryBadge(provider.category)}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 text-muted-foreground font-semibold">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-500" />
                  <span className="text-foreground">{provider.average_rating ? Number(provider.average_rating).toFixed(1) : "New"}</span>
                  <span className="text-xs text-muted-foreground/60">Rating</span>
                </div>
                
                {provider.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary/60" />
                    <span className="text-foreground/80">{provider.phone}</span>
                  </div>
                )}

                {provider.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary/60" />
                    <span className="text-foreground/80">{provider.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-10 flex flex-wrap gap-4 justify-center md:justify-start">
                <Button asChild size="lg" className="rounded-full px-10 h-14 font-black shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                  <Link href={`/chat/${providerId}`}>
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Send Message
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="rounded-full px-10 h-14 font-black border-primary/20 text-primary hover:bg-primary/5 transition-all">
                  <Calendar className="mr-2 h-5 w-5" />
                  Request Booking
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 space-y-24">
        
        {/* SECTION A: SERVICES OFFERED */}
        <section id="services">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-3xl font-black text-foreground tracking-tight">Our Services</h2>
              </div>
              <p className="text-muted-foreground font-medium">Browse our active floriculture service listings</p>
            </div>
          </div>
          
          {services.length === 0 ? (
            <div className="bg-primary/5 p-16 rounded-[40px] border-2 border-dashed border-primary/10 text-center animate-in fade-in duration-500">
              <p className="text-muted-foreground font-bold">This provider hasn't listed any services yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map(service => (
                <Card key={service.id} className="group rounded-3xl border-primary/10 hover:border-primary/30 shadow-sm hover:shadow-xl transition-all duration-500 bg-white overflow-hidden flex flex-col h-full">
                  <CardHeader className="p-8">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="bg-primary/5 p-3 rounded-2xl group-hover:bg-primary/10 transition-colors">
                        <Briefcase className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-foreground tracking-tight">
                          {service.base_price ? `Rs ${Number(service.base_price).toLocaleString()}` : "Contact"}
                        </div>
                        <div className="text-[10px] font-black uppercase text-primary tracking-widest">{service.pricing_type}</div>
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{service.title}</CardTitle>
                    <CardDescription className="mt-3 text-muted-foreground leading-relaxed line-clamp-3 font-medium">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 mt-auto">
                    <Button asChild className="w-full h-12 rounded-2xl font-black shadow-md hover:shadow-lg transition-all group-hover:scale-105">
                      <Link href={`/services/${service.id}${prebookQs ? `?${prebookQs}` : ""}`}>
                        Book Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section id="availability">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-3xl font-black text-foreground tracking-tight">Availability</h2>
              </div>
              <p className="text-muted-foreground font-medium">
                Bikram Sambat calendar — green days are open; red days the provider marked unavailable (stored as Gregorian for
                booking checks).
              </p>
            </div>
          </div>
          <Card className="rounded-[40px] border-primary/10 p-8">
            <ProviderAvailabilityCalendar
              providerId={Number(providerId)}
              editable={false}
              getToken={() => null}
            />
          </Card>
        </section>

        {/* SECTION B: PORTFOLIO (Past Work) */}
        <section id="portfolio">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-secondary/20 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-secondary-foreground" />
                </div>
                <h2 className="text-3xl font-black text-foreground tracking-tight">Our Portfolio</h2>
              </div>
              <p className="text-muted-foreground font-medium">Showcasing our past floriculture projects and works</p>
            </div>
          </div>

          {portfolio.length === 0 ? (
            <div className="bg-primary/5 p-20 rounded-[40px] border-2 border-dashed border-primary/10 text-center animate-in fade-in duration-700">
              <ImageIcon className="w-16 h-16 text-primary/20 mx-auto mb-6" />
              <p className="text-muted-foreground font-bold">This provider hasn't added portfolio photos yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {portfolio.map(item => (
                <div key={item.id} className="group relative aspect-square rounded-[32px] overflow-hidden bg-muted shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                    <p className="text-white font-black text-lg mb-1 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{item.title}</p>
                    <p className="text-white/70 text-xs line-clamp-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

function Loader2(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
