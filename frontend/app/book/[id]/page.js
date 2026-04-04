"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Clock, AlertCircle, Info, ChevronLeft, ShieldAlert, ChevronRight, UserCheck } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

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
  const [submitting, setSubmitting] = useState(false)
  const [bookedSlots, setBookedSlots] = useState([])
  const [kycStatus, setKycStatus] = useState(null)
  const [kycDialogOpen, setKycDialogOpen] = useState(false)
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const isVerified = useMemo(() => {
    return kycStatus?.status === "approved"
  }, [kycStatus])

  const scheduledFor = useMemo(() => {
    if (scheduledDate && scheduledTime) return `${scheduledDate}T${scheduledTime}`
    return ""
  }, [scheduledDate, scheduledTime])

  const currentRole = useMemo(() => {
    if (!session) return "customer"
    return (typeof window !== "undefined" ? localStorage.getItem("npw_role") : null) || session.role || "customer"
  }, [session])

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
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token")
    if (!session && !hasToken) {
      router.replace("/auth/signin")
      return
    }
    const load = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
        const headers = token ? { "Authorization": `Bearer ${token}` } : {}
        
        // Load KYC status
        try {
          const kycRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/kyc/status/`, { headers })
          if (kycRes.ok) {
            const kycData = await kycRes.json()
            setKycStatus(kycData)
          }
        } catch (e) {
          console.warn("Failed to load KYC status", e)
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
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    if (params.id) load()
  }, [params.id, router, session])

  const submitBooking = async () => {
    if (!isVerified) {
      setKycDialogOpen(true)
      return
    }
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
      
      const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null
      const headers = token
        ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" }

      const body = { service: service.id }
      if (scheduledFor) body.scheduled_for = new Date(scheduledFor).toISOString()
      if (notes) body.notes = notes

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
  
  const getMinDate = () => {
    const d = new Date()
    return d.toISOString().split("T")[0]
  }

  const isSlotBooked = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false
    const checkDateTime = `${dateStr}T${timeStr}`
    return bookedSlots.some((slot) => {
      const slotDate = new Date(slot.scheduled_for).toISOString().slice(0, 16)
      return slotDate === checkDateTime
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
    const dStr = date.toISOString().split("T")[0]
    return dStr === scheduledDate
  }

  const selectDate = (date) => {
    if (!date || isPastDate(date)) return
    setScheduledDate(date.toISOString().split("T")[0])
    setScheduledTime("") // Reset time when date changes
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading booking details...</p>
      </div>
    </div>
  )
  
  if (error || !service || restrictionError) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full shadow-lg border-t-4 border-t-amber-500">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {restrictionError ? "Booking Restricted" : "Booking Error"}
          </h3>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {restrictionError || error || "Service not found or unavailable."}
          </p>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => router.back()} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            {currentRole === "provider" && (
              <Button 
                variant="outline" 
                onClick={() => router.push("/role-switch")}
                className="w-full"
              >
                Switch to Client Role
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="mb-6 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Service
        </Button>

        <Card className="shadow-xl border-none overflow-hidden">
          <div className="bg-blue-600 h-2 w-full"></div>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">Confirm Booking</CardTitle>
                <CardDescription className="text-gray-500 mt-1">Review details before submitting your booking.</CardDescription>
              </div>
              <div className="bg-blue-50 px-3 py-1 rounded-full text-blue-700 text-sm font-medium flex items-center">
                <Info className="h-4 w-4 mr-1.5" />
                Final Step
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
                <div className="text-gray-600 font-medium">Total Amount</div>
                <div className="text-2xl font-black text-blue-600">Rs. {service.base_price}</div>
              </div>
            </div>

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
                      const selected = isSelected(date)
                      const today = isToday(date)
                      
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!date || past}
                          onClick={() => selectDate(date)}
                          className={`
                            h-10 rounded-xl text-sm font-semibold transition-all flex items-center justify-center relative
                            ${!date ? 'bg-transparent' : ''}
                            ${past ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}
                            ${selected ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white shadow-md shadow-blue-200' : ''}
                            ${today && !selected ? 'text-blue-600 font-black' : ''}
                          `}
                        >
                          {date?.getDate()}
                          {today && !selected && <div className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-4 px-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                    <div className="w-3 h-3 rounded-full bg-blue-600" /> Selected
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                    <div className="w-3 h-3 rounded-full border border-blue-600" /> Today
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                    <div className="w-3 h-3 rounded-full bg-gray-100" /> Unavailable
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
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
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

      <Dialog open={kycDialogOpen} onOpenChange={setKycDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldAlert className="h-24 w-24" />
            </div>
            <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/30">
              <UserCheck className="h-10 w-10 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black mb-2 tracking-tight">Identity Verification Required</DialogTitle>
            <DialogDescription className="text-blue-100 text-sm font-medium leading-relaxed">
              To ensure a safe and trusted marketplace, all users must complete a one-time KYC verification before booking services.
            </DialogDescription>
          </div>
          
          <div className="p-8 bg-white">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Secure Your Bookings</h4>
                  <p className="text-xs text-gray-500 mt-1">Verified accounts enjoy enhanced protection and faster support.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">One-Time Process</h4>
                  <p className="text-xs text-gray-500 mt-1">Once verified, you won't need to fill this again, even as a provider.</p>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button 
                  onClick={() => router.push("/kyc")} 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
                >
                  Start Verification Now
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setKycDialogOpen(false)}
                  className="w-full text-gray-400 hover:text-gray-600 text-xs font-semibold"
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


