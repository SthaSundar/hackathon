"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Star, CheckCircle, Store, MapPin, Search, Filter, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "flower_vendor", label: "Flower Vendors" },
  { id: "event_decorator", label: "Event Decorators" },
  { id: "nursery_amc", label: "Nursery / AMC" }
]

export default function ServicesPage() {
  const [providers, setProviders] = useState([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [prebookQs, setPrebookQs] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get("prebooking") === "true" && sp.get("event_id")) {
      setPrebookQs(`prebooking=true&event_id=${encodeURIComponent(sp.get("event_id"))}`)
    } else {
      setPrebookQs("")
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, '')
        let endpoint = selectedCategory === "all" 
          ? `${apiUrl}/accounts/providers/`
          : `${apiUrl}/accounts/providers/?category=${selectedCategory}`

        if (searchQuery) {
          endpoint += (endpoint.includes('?') ? '&' : '?') + `q=${encodeURIComponent(searchQuery)}`
        }

        const res = await fetch(endpoint)
        if (res.ok) {
          const data = await res.json()
          setProviders(data.results || [])
        }
      } catch (e) {
        console.error("Failed to load providers", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedCategory, searchQuery])

  const getCategoryBadge = (category) => {
    switch(category) {
      case "flower_vendor":
        return <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-green-100">Flower Vendor</span>
      case "event_decorator":
        return <span className="px-3 py-1 bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-orange-100">Event Decorator</span>
      case "nursery_amc":
        return <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-100">Nursery & AMC</span>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-primary/5 py-20 border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold text-foreground mb-6 tracking-tight">
            Our <span className="text-primary">Floriculture</span> Partners
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
            Connecting Kathmandu's finest flower growers, decorators, and nursery professionals in one smart marketplace.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Minimal Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 -mx-4 px-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
            <Filter size={18} className="text-muted-foreground mr-2 shrink-0" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
                  selectedCategory === cat.id
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
                    : "bg-white text-muted-foreground border-primary/10 hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-72 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              placeholder="Search partners..." 
              className="pl-12 h-12 rounded-full border-primary/10 focus:border-primary focus:ring-primary/20 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="animate-spin h-12 w-12 text-primary" />
            <p className="text-muted-foreground font-medium animate-pulse">Loading floral partners...</p>
          </div>
        ) : (
          <>
            {/* Elegant Providers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {providers.map((provider) => (
                <Card key={provider.id} className="group rounded-3xl border-primary/10 hover:border-primary/30 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white flex flex-col h-full">
                  <div className="relative h-32 bg-primary/5 group-hover:bg-primary/10 transition-colors">
                    {provider.is_featured && (
                      <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full z-10 shadow-sm border border-yellow-500/20">
                        Featured Partner
                      </div>
                    )}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                      <div className="w-24 h-24 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-white group-hover:scale-110 transition-transform duration-500 rotate-3 group-hover:rotate-0">
                        {provider.profile_photo ? (
                          <img src={provider.profile_photo} alt={provider.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5">
                            <Store className="w-10 h-10 text-primary/40" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="pt-16 pb-8 px-8 text-center flex-1 flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-foreground flex items-center justify-center gap-1.5 mb-2 group-hover:text-primary transition-colors">
                        {provider.name}
                        {provider.is_verified && (
                          <div className="bg-secondary/20 p-0.5 rounded-full">
                            <CheckCircle className="w-4 h-4 text-secondary-foreground" />
                          </div>
                        )}
                      </h3>
                      <div className="flex justify-center mb-4">
                        {getCategoryBadge(provider.category)}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 mb-2">
                        {provider.freshness_guarantee && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                            style={{ background: "#EAF3DE", color: "#173404", borderColor: "#97C459" }}
                          >
                            Fresh guaranteed
                          </span>
                        )}
                        {provider.response_label && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "#E6F1FB", color: "#0C447C" }}
                          >
                            {provider.response_label}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-primary/5 mb-6">
                      <div className="text-center border-r border-primary/5">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter mb-1">Rating</p>
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-500" />
                          <span className="text-sm font-bold">{provider.average_rating ? Number(provider.average_rating).toFixed(1) : "New"}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter mb-1">Services</p>
                        <p className="text-sm font-bold text-foreground">{provider.service_count || 0}</p>
                      </div>
                    </div>
                    
                    <Button asChild className="w-full h-12 rounded-2xl font-bold shadow-md hover:shadow-lg transition-all mt-auto group-hover:scale-105 active:scale-95">
                      <Link href={`/profile/${provider.id}${prebookQs ? `?${prebookQs}` : ""}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {providers.length === 0 && (
              <div className="text-center py-32 bg-primary/5 rounded-[40px] border-2 border-dashed border-primary/20 animate-in zoom-in-95">
                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-primary/10">
                  <Store className="w-10 h-10 text-primary/40" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">No partners found</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">We couldn't find any partners in this category. Try adjusting your filters.</p>
                <Button variant="ghost" onClick={() => setSelectedCategory("all")} className="mt-6 text-primary font-bold hover:bg-primary/10 rounded-full">
                  Show all partners
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
