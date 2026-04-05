"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import NepaliDate from "nepali-date-converter"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Clock, AlertCircle, Info, ChevronLeft, ChevronRight, MapPin, Phone, Images, User } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"

/** Calendar + forms must use local calendar date, not UTC from toISOString(). */
function formatLocalDateKey(d) {
  if (!d) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function BookingBsHint({ ymd }) {
  if (!ymd) return null
  try {
    const nepali = new NepaliDate(new Date(`${ymd}T12:00:00`))
    const bs = `${nepali.getYear()}-${String(nepali.getMonth() + 1).padStart(2, "0")}-${String(nepali.getDate()).padStart(2, "0")}`
    return (
      <p className="text-[11px] font-medium text-[#1D5E44] mt-2 px-1">
        Bikram Sambat (BS): {bs}
      </p>
    )
  } catch {
    return null
  }
}

function localDateTimeKeyFromIso(isoStr) {
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const h = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${day}T${h}:${min}`
}

export default function BookServicePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [service, setService] = useState(null)
  const [scheduledDate, setScheduledDate] = useState("") // YYYY-MM-DD
  const [scheduledTime, setScheduledTime] = useState("") // HH:mm
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [loadError, setLoadError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [bookedSlots, setBookedSlots] = useState([])
  const [userStatus, setUserStatus] = useState(null)
  const [companyName, setCompanyName] = useState("")
  const [pan, setPan] = useState("")
  const [profileDraft, setProfileDraft] = useState({ display_name: "", phone_number: "", address: "" })
  const [profileSaving, setProfileSaving] = useState(false)

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [unavailableDates, setUnavailableDates] = useState(() => new Set())
  const [isPrebooking, setIsPrebooking] = useState(false)
  const [prebookEventId, setPrebookEventId] = useState(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    setIsPrebooking(sp.get("prebooking") === "true")
    const eid = sp.get("event_id")
    setPrebookEventId(eid ? parseInt(eid, 10) : null)
  }, [])

  const scheduledFor = useMemo(() => {
    if (scheduledDate && scheduledTime) return `${scheduledDate}T${scheduledTime}`
    return ""
  }, [scheduledDate, scheduledTime])

  const currentRole = useMemo(() => {
    if (!session) return "customer"
    return (typeof window !== "undefined" ? localStorage.getItem("npw_role") : null) || session.role || "customer"
  }, [session])

  const premiumTier = useMemo(() => {
    if (!service?.base_price) return false
    return Number(service.base_price) >= 5000
  }, [service])

  const loadUnavailable = useCallback(async () => {
    if (!service?.provider_id || !process.env.NEXT_PUBLIC_API_URL) return
    const api = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    const y = currentMonth.getFullYear()
    const m = currentMonth.getMonth() + 1
    const month = `${y}-${String(m).padStart(2, "0")}`
    try {
      const r = await fetch(`${api}/accounts/providers/${service.provider_id}/availability/?month=${month}`)
      if (r.ok) {
        const d = await r.json()
        setUnavailableDates(new Set(d.unavailable_dates || []))
      }
    } catch {
      setUnavailableDates(new Set())
    }
  }, [service?.provider_id, currentMonth])

  useEffect(() => {
    loadUnavailable()
  }, [loadUnavailable])

  const isOwnService = useMemo(() => {
    if (!session?.user?.email || !service?.provider_email) return false
    return session.user.email === service.provider_email
  }, [session, service])

  const restrictionError = useMemo(() => {
    if (currentRole === "provider") {
      return "Service providers cannot book services. Please switch to a client role to continue."
    }
    if (isOwnService) {
      return "You cannot book your own service. Please browse other available services."
    }
    return null
  }, [currentRole, isOwnService])

  useEffect(() => {
    const isBrowser = typeof window !== "undefined"
    const hasToken = isBrowser && (!!localStorage.getItem("npw_token") || !!session?.accessToken)
    if (!session && !hasToken) {
      router.replace("/auth/signin")
      return
    }
    const load = async () => {
      try {
        const token = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null
        const headers = token ? { "Authorization": `Bearer ${token}` } : {}
        
        try {
          const stRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/user-status/`, { headers })
          if (stRes.ok) {
            const st = await stRes.json()
            setUserStatus(st)
            setProfileDraft({
              display_name: st.name || "",
              phone_number: st.phone_number || "",
              address: st.address || "",
            })
          }
        } catch (e) {
          console.warn("Failed to load user status", e)
        }

        // Load service details
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/services/${params.id}/detail/`, { headers })
        if (!res.ok) throw new Error("Service not found")
        const serviceData = await res.json()
        setService(serviceData)
        
        // Load booked slots
        if (token && params.id) {
          try {
            const slotsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/service/${params.id}/booked-slots/`, { headers })
            if (slotsRes.ok) {
              const slotsData = await slotsRes.json()
              setBookedSlots(slotsData.booked_slots || [])
            }
          } catch (e) {
            console.warn("Failed to load booked slots", e)
          }
        }
      } catch (e) {
        setLoadError(e.message)
      } finally {
        setLoading(false)
      }
    }
    if (params.id) load()
  }, [params.id, router, session])

  const saveProfileForPremium = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setError("")
    try {
      const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
      if (!token) throw new Error("Please sign in again.")
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/me/profile/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(profileDraft),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || "Could not save profile")
      setUserStatus((prev) =>
        prev
          ? {
              ...prev,
              profile_complete: data.profile_complete,
              name: data.display_name,
              phone_number: data.phone_number,
              address: data.address,
            }
          : prev
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setProfileSaving(false)
    }
  }

  const submitBooking = async () => {
    setSubmitting(true)
    setError("")
    try {
      // Validate date is not in the past
      if (scheduledFor) {
        const selectedDate = new Date(scheduledFor)
        const now = new Date()
        if (selectedDate < now) {
          setError("Cannot select past dates. Please choose a future date and time.")
          setSubmitting(false)
          return
        }
        
        // Check if slot is already booked
        const selectedISO = selectedDate.toISOString()
        const isBooked = bookedSlots.some(slot => {
          const slotDate = new Date(slot)
          return Math.abs(slotDate.getTime() - selectedDate.getTime()) < 30 * 60 * 1000 // 30 minutes buffer
        })
        
        if (isBooked) {
          setError("This time slot is already booked. Please choose another time.")
          setSubmitting(false)
          return
        }
      }
      
      const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken;
      const headers = token
        ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" }

      const body = { service: service.id }
      if (scheduledFor) body.scheduled_for = new Date(scheduledFor).toISOString()
      if (notes) body.notes = notes
      if (isPrebooking && prebookEventId) {
        body.is_prebooking = true
        body.event_id = prebookEventId
      }
      if (service.pricing_type === "per_month") {
        if (companyName.trim()) body.company_name = companyName.trim()
        if (pan.trim()) body.pan = pan.trim()
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/create/`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail || "Failed to create booking")
      }
      router.push("/dashboard?tab=bookings")
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }
  
  const isSlotBooked = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false
    const checkKey = `${dateStr}T${timeStr}`
    return bookedSlots.some((slot) => {
      const raw = typeof slot === "string" ? slot : slot?.scheduled_for
      if (!raw) return false
      return localDateTimeKeyFromIso(raw) === checkKey
    })
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 18; hour++) {
      const h = hour < 10 ? `0${hour}` : `${hour}`
      slots.push(`${h}:00`)
      if (hour < 18) slots.push(`${h}:30`)
    }
    return slots
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    const startOffset = firstDay.getDay()
    
    // Previous month filler
    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1))
  }

  const isPastDate = (date) => {
    if (!date) return true
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const isToday = (date) => {
    if (!date) return false
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const isSelected = (date) => {
    if (!date || !scheduledDate) return false
    return formatLocalDateKey(date) === scheduledDate
  }

  const isProviderAway = (date) => {
    if (!date) return false
    return unavailableDates.has(formatLocalDateKey(date))
  }

  const selectDate = (date) => {
    if (!date || isPastDate(date) || isProviderAway(date)) return
    setScheduledDate(formatLocalDateKey(date))
    setScheduledTime("") // Reset time when date changes
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Loading booking…</p>
      </div>
    </div>
  )
  
  if (restrictionError) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full rounded-[28px] border-primary/15 shadow-lg">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Booking restricted</h3>
          <p className="text-muted-foreground mb-8 leading-relaxed">{restrictionError}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => router.back()} className="w-full rounded-full font-bold">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Go back
            </Button>
            {currentRole === "provider" && (
              <Button variant="outline" onClick={() => router.push("/role-switch")} className="w-full rounded-full font-bold">
                Switch to client role
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (!loading && !service) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full rounded-[28px] border-primary/15">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-foreground">Could not load service</h3>
          <p className="text-muted-foreground">{loadError || "Service unavailable."}</p>
          <Button onClick={() => router.back()} className="rounded-full font-bold">
            Go back
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 rounded-full font-semibold text-foreground">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to service
        </Button>

        <Card className="shadow-lg border border-primary/10 overflow-hidden rounded-[28px]">
          <div className="bg-gradient-to-r from-primary/40 via-primary/20 to-transparent h-2 w-full" />
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">Confirm booking</CardTitle>
                <CardDescription className="text-muted-foreground mt-1">Pick a time and confirm.</CardDescription>
              </div>
              <div className="bg-primary/10 px-3 py-1 rounded-full text-primary text-sm font-bold flex items-center shrink-0">
                <Info className="h-4 w-4 mr-1.5" />
                Checkout
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Service Summary */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-1">{service.title}</h3>
              <p className="text-sm text-gray-500 mb-4 flex items-center">
                by <span className="font-medium text-gray-700 ml-1">{service.provider_name || service.provider_email}</span>
              </p>
              <p className="text-gray-600 line-clamp-3 leading-relaxed">{service.description}</p>
              
              <div className="mt-6 flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="text-gray-600 font-medium">Listed price</div>
                <div className="text-2xl font-black text-primary">Rs. {service.base_price}</div>
              </div>
            </div>

            {userStatus && (
              <details className="rounded-2xl border border-primary/15 bg-primary/5 text-sm group">
                <summary className="cursor-pointer list-none font-bold text-foreground px-4 py-3 flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                  <span>Booking eligibility (tap to expand)</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-4 pt-0 space-y-2 border-t border-primary/10">
                  <p className="text-xs text-muted-foreground pt-3">Only read this if the app blocks your booking or asks for profile details.</p>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-1 leading-relaxed">
                    <li>
                      <strong className="text-foreground">Under Rs 5,000:</strong> phone-verified sign-up, verified email, or Google
                      sign-in satisfies the requirement.
                    </li>
                    <li>
                      <strong className="text-foreground">Rs 5,000 and above:</strong> your account needs display name, mobile, and
                      address on file.
                    </li>
                  </ul>
                </div>
              </details>
            )}

            {(service.provider_photo_url || service.provider_address || service.provider_phone) && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-primary/10 bg-white p-4">
                <div className="h-14 w-14 rounded-2xl overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                  {service.provider_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={service.provider_photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-7 w-7 text-primary/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-bold text-foreground">{service.provider_name || service.provider_email}</p>
                  {service.provider_phone && (
                    <p className="text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="h-3.5 w-3.5" />
                      {service.provider_phone}
                    </p>
                  )}
                  {service.provider_address && (
                    <p className="text-muted-foreground flex items-start gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{service.provider_address}</span>
                    </p>
                  )}
                </div>
                {service.provider_id && (
                  <Button asChild variant="outline" size="sm" className="rounded-full font-bold shrink-0 border-primary/20">
                    <Link href={`/profile/${service.provider_id}/portfolio`}>
                      <Images className="h-4 w-4 mr-2" />
                      Portfolio
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {premiumTier && userStatus && !userStatus.profile_complete && (
              <form onSubmit={saveProfileForPremium} className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.04] p-6">
                <p className="font-bold text-foreground">Complete your profile for premium bookings</p>
                <p className="text-sm text-muted-foreground">Required for services at or above Rs 5,000.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground">Display name</label>
                    <Input
                      className="mt-1 rounded-xl border-primary/15"
                      value={profileDraft.display_name}
                      onChange={(e) => setProfileDraft((d) => ({ ...d, display_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground">Mobile</label>
                    <Input
                      className="mt-1 rounded-xl border-primary/15"
                      value={profileDraft.phone_number}
                      onChange={(e) => setProfileDraft((d) => ({ ...d, phone_number: e.target.value }))}
                      placeholder="98xxxxxxxx"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground">Address</label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-primary/15 p-3 text-sm min-h-[88px] outline-none focus:ring-2 focus:ring-primary/20"
                    value={profileDraft.address}
                    onChange={(e) => setProfileDraft((d) => ({ ...d, address: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" disabled={profileSaving} className="rounded-full font-bold">
                  {profileSaving ? "Saving…" : "Save profile"}
                </Button>
              </form>
            )}

            {isPrebooking && prebookEventId && (
              <div className="rounded-2xl border border-[#1D5E44]/30 bg-[#1D5E44]/5 px-4 py-3 text-sm font-semibold text-[#1D5E44]">
                Seasonal pre-booking — your request will be linked to the selected festival campaign.
              </div>
            )}

            {service.pricing_type === "per_month" && (
              <div className="space-y-3 rounded-2xl border border-dashed border-primary/25 bg-background p-5">
                <p className="text-sm font-bold text-foreground">Company / AMC details</p>
                <p className="text-xs text-muted-foreground">Optional — never required to complete a booking.</p>
                <Input
                  placeholder="Company name (optional)"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="rounded-xl border-primary/15"
                />
                <Input
                  placeholder="PAN (optional)"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  className="rounded-xl border-primary/15"
                />
              </div>
            )}

            {/* Booking Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="flex items-center text-sm font-bold text-gray-700">
                    <CalendarIcon className="h-4 w-4 mr-2 text-blue-600" />
                    Select Date
                  </label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-bold min-w-[120px] text-center">
                      {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                      <div key={day} className="text-[10px] font-black text-gray-400 uppercase tracking-wider py-1">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(currentMonth).map((date, idx) => {
                      const past = isPastDate(date)
                      const away = date && isProviderAway(date)
                      const selected = isSelected(date)
                      const today = isToday(date)
                      
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!date || past || away}
                          onClick={() => selectDate(date)}
                          className={`
                            h-10 rounded-xl text-sm font-semibold transition-all flex items-center justify-center relative
                            ${!date ? 'bg-transparent' : ''}
                            ${away ? 'bg-red-100 text-red-700 cursor-not-allowed line-through' : ''}
                            ${past && !away ? 'text-gray-300 cursor-not-allowed' : ''}
                            ${!past && !away ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600' : ''}
                            ${selected ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white shadow-md shadow-blue-200 !line-through' : ''}
                            ${today && !selected && !away ? 'ring-2 ring-blue-600 ring-inset text-blue-600 font-black' : ''}
                          `}
                        >
                          {date?.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <BookingBsHint ymd={scheduledDate} />

                <div className="flex flex-wrap items-center gap-4 px-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                    <div className="w-3 h-3 rounded-full bg-blue-600" /> Selected
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                    <div className="w-3 h-3 rounded-full border border-blue-600" /> Today
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                    <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200" /> Provider away
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                    <div className="w-3 h-3 rounded-full bg-gray-100" /> Past
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <label className="flex items-center text-sm font-bold text-gray-700">
                  <Clock className="h-4 w-4 mr-2 text-blue-600" />
                  Select Time Slot
                </label>
                
                {scheduledDate ? (
                  <div className="grid grid-cols-3 gap-2">
                    {generateTimeSlots().map((time) => {
                      const booked = isSlotBooked(scheduledDate, time)
                      const selected = scheduledTime === time
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={booked}
                          onClick={() => setScheduledTime(time)}
                          className={`
                            py-3 rounded-xl text-xs font-bold transition-all border-2
                            ${booked 
                              ? 'bg-gray-50 border-gray-50 text-gray-300 cursor-not-allowed line-through' 
                              : selected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                                : 'bg-white border-gray-100 text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50'
                            }
                          `}
                        >
                          {time}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="bg-white p-3 rounded-full shadow-sm">
                      <CalendarIcon className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-400">Please select a date first</p>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <label className="flex items-center text-sm font-bold text-gray-700">
                    <Info className="h-4 w-4 mr-2 text-blue-600" />
                    Additional Notes
                  </label>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 min-h-[100px] resize-none text-sm" 
                    placeholder="Any specific requirements for the provider?" 
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start">
                <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-4">
              <Button
                onClick={submitBooking}
                disabled={submitting || (scheduledFor && isSlotBooked(scheduledFor))}
                className="w-full h-14 text-lg font-bold rounded-full shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Processing...
                  </div>
                ) : (
                  "Confirm and Book Service"
                )}
              </Button>
              <p className="text-center text-xs text-gray-400 mt-4 italic">
                By confirming, you agree to our terms of service and cancellation policy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


