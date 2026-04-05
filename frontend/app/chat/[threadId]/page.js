"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Paperclip,
  MoreVertical,
  Send,
  Download,
  Eye,
  FileText,
  AlertTriangle,
  Lock,
  History,
  XCircle,
  ShieldCheck,
  Scale,
  ChevronLeft,
  Check,
  CheckCheck,
  ImageIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const BOOKING_FILE_ACCEPT = ".pdf,.txt,.doc,.docx,image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg"

function mediaBaseUrl() {
  const api = process.env.NEXT_PUBLIC_API_URL || ""
  return api.replace(/\/api\/?$/, "")
}

function attachmentUrl(msg) {
  if (msg.file_url) return msg.file_url
  if (msg.file && String(msg.file).startsWith("http")) return msg.file
  if (msg.file) return `${mediaBaseUrl()}${msg.file.startsWith("/") ? "" : "/"}${msg.file}`
  return ""
}

function fileLabel(name) {
  const n = (name || "").toLowerCase()
  if (n.endsWith(".pdf")) return "PDF"
  if (n.endsWith(".txt")) return "Text"
  if (n.endsWith(".doc") || n.endsWith(".docx")) return "Document"
  if (/\.(png|jpe?g)$/.test(n)) return "Image"
  return "File"
}

function formatMessageTime(iso) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    const now = new Date()
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    if (sameDay) {
      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [thread, setThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [disputes, setDisputes] = useState([])
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeCategory, setDisputeCategory] = useState("service_quality")
  const [disputeDescription, setDisputeDescription] = useState("")
  const [disputeAttachment, setDisputeAttachment] = useState(null)
  const [meId, setMeId] = useState(null)

  const threadId = params?.threadId

  const authHeaders = useMemo(() => {
    const token =
      (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken || null
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }, [session?.accessToken])

  const privacyNotice =
    "Messages are private between users. Admins may review chats only in case of disputes, safety issues, or policy violations."

  const loadThread = useCallback(
    async (silent = false) => {
      if (!threadId) return
      const token =
        (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
      if (!token) {
        if (!silent) {
          setError("Authentication credentials were not provided.")
          setLoading(false)
        }
        return
      }
      if (!silent) {
        setLoading(true)
        setError("")
      }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chats/thread/${threadId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.detail || "Thread not found")
        }
        const data = await res.json()
        setThread(data)
        setMessages(Array.isArray(data?.messages) ? data.messages : [])
      } catch (e) {
        if (!silent) setError(e.message || "Could not load chat")
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [threadId, session?.accessToken]
  )

  useEffect(() => {
    if (sessionStatus === "loading") return
    const token =
      (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
    if (!token) {
      router.replace("/auth/signin")
      return
    }
    loadThread(false)
  }, [sessionStatus, session?.accessToken, loadThread, router])

  useEffect(() => {
    if (!authHeaders.Authorization) return
    const run = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/user-status/`, {
          headers: { ...authHeaders, "Content-Type": "application/json" },
        })
        if (res.ok) {
          const j = await res.json()
          if (j?.id != null) setMeId(j.id)
        }
      } catch {
        /* optional */
      }
    }
    run()
  }, [authHeaders])

  useEffect(() => {
    if (!thread?.booking?.id || !authHeaders.Authorization) return
    const fetchDisputes = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/booking/${thread.booking.id}/`, {
          headers: { ...authHeaders },
        })
        if (!res.ok) return
        const data = await res.json()
        setDisputes(Array.isArray(data) ? data : [])
      } catch {
        setDisputes([])
      }
    }
    fetchDisputes()
  }, [thread?.booking?.id, authHeaders])

  useEffect(() => {
    if (!threadId || !authHeaders.Authorization) return
    const blocked =
      thread &&
      (thread.status !== "active" ||
        thread.has_open_dispute ||
        disputes.some((d) => d.status === "open"))
    if (blocked) return
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      loadThread(true)
    }, 12000)
    return () => clearInterval(t)
  }, [threadId, thread?.status, thread?.has_open_dispute, disputes, authHeaders.Authorization, loadThread])

  useEffect(() => {
    if (!authHeaders.Authorization) return
    const onVis = () => {
      if (document.visibilityState === "visible") loadThread(true)
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [authHeaders.Authorization, loadThread])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() && !file) return
    if (!thread) return
    if (!authHeaders.Authorization) {
      setError("Please sign in again.")
      return
    }
    setSending(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("content", newMessage)
      if (file) formData.append("file", file)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chats/thread/${threadId}/message/`, {
        method: "POST",
        headers: { ...authHeaders },
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg =
          typeof data?.detail === "string"
            ? data.detail
            : data?.file?.[0] || data?.content?.[0] || data?.non_field_errors?.[0] || "Failed to send message"
        throw new Error(msg)
      }
      const data = await res.json()
      setMessages((prev) => [...prev, data])
      setNewMessage("")
      setFile(null)
      loadThread(true)
    } catch (err) {
      setError(err.message || "Failed to send")
    } finally {
      setSending(false)
    }
  }

  const handleCreateDispute = async (e) => {
    e.preventDefault()
    if (!thread?.booking?.id || !disputeDescription.trim()) return
    try {
      const fd = new FormData()
      fd.append("category", disputeCategory)
      fd.append("description", disputeDescription)
      if (disputeAttachment) fd.append("attachment", disputeAttachment)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/create/${thread.booking.id}/`, {
        method: "POST",
        headers: { ...authHeaders },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed to create dispute")
      setDisputeOpen(false)
      setDisputeCategory("service_quality")
      setDisputeDescription("")
      setDisputeAttachment(null)
      setDisputes((prev) => [data, ...prev])
      if (thread) {
        setThread({ ...thread, status: "locked", has_open_dispute: true })
      }
    } catch (e2) {
      setError(e2.message)
    }
  }

  const handleDownload = (url, filename) => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename || "attachment"
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (sessionStatus === "loading" || (loading && !error && !thread)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium text-sm">Loading chat…</p>
        </div>
      </div>
    )
  }

  if (error && !thread) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full rounded-[28px] border-primary/15 shadow-sm">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Chat error</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {error === "Authentication credentials were not provided."
                ? "You need to be signed in. If you use Google sign-in, wait a moment and try again, or sign out and back in."
                : error}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild variant="outline" className="rounded-full font-bold border-primary/20">
                <Link href="/auth/signin">Sign in</Link>
              </Button>
              <Button onClick={() => router.back()} variant="ghost" className="rounded-full font-bold">
                Go back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isInquiry = thread?.thread_type === "inquiry"
  const isLocked = thread?.status === "locked"
  const isExpired = thread?.status === "expired"
  const hasOpenDispute = !!thread?.has_open_dispute || disputes.some((d) => d.status === "open")
  const isAdminRole = typeof window !== "undefined" && localStorage.getItem("npw_role") === "admin"

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <Button variant="ghost" asChild className="mb-4 rounded-full font-semibold -ml-2 text-foreground">
          <Link href="/dashboard?tab=bookings">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Bookings
          </Link>
        </Button>

        <Card className="rounded-[28px] border border-primary/15 shadow-sm overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary/35 to-transparent" />
          <CardHeader className="space-y-3 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-xl font-bold text-foreground truncate">
                  {thread?.service?.title || thread?.booking?.service_title || "Chat"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-bold">
                    {isInquiry ? "Inquiry" : "Booking"}
                  </span>
                  {!isInquiry && thread?.booking?.id && (
                    <span className="text-muted-foreground">#{thread.booking.id}</span>
                  )}
                  {!isInquiry && thread?.booking?.status && (
                    <span className="capitalize font-semibold text-foreground">{thread.booking.status}</span>
                  )}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  {!isInquiry && (
                    <DropdownMenuItem onClick={() => setDisputeOpen(true)} className="rounded-lg">
                      Raise dispute
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigator.clipboard?.writeText(`Thread #${thread?.id}`)}
                    className="rounded-lg"
                  >
                    Copy thread ID
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{privacyNotice}</p>
            {isAdminRole && (
              <div className="rounded-xl bg-muted/80 px-3 py-2 text-xs font-medium text-muted-foreground">
                Read-only admin view
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {(isLocked || isExpired || hasOpenDispute) && (
              <div
                className={`flex items-start gap-3 p-4 rounded-2xl border ${
                  hasOpenDispute
                    ? "bg-destructive/5 border-destructive/15 text-destructive"
                    : isLocked
                      ? "bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-100"
                      : "bg-muted/50 border-border text-muted-foreground"
                }`}
              >
                <div className="p-2 rounded-xl bg-background/80 shrink-0">
                  {hasOpenDispute ? (
                    <Scale className="h-4 w-4" />
                  ) : isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <History className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide">
                    {hasOpenDispute ? "Dispute in progress" : isLocked ? "Chat locked" : "Thread expired"}
                  </h4>
                  <p className="text-xs mt-1 opacity-90 leading-relaxed">
                    {hasOpenDispute
                      ? "Messaging is paused while this booking is under review."
                      : isLocked
                        ? "This chat is closed. You cannot send new messages."
                        : "This inquiry expired. Book the service to keep chatting."}
                  </p>
                </div>
              </div>
            )}

            {error && thread && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="max-h-[min(28rem,55vh)] overflow-y-auto space-y-3 px-1 pb-2 scroll-smooth">
              {messages.map((msg) => {
                const isSelf =
                  (meId != null && msg.sender === meId) ||
                  (!!session?.user?.email &&
                    msg.sender_email &&
                    msg.sender_email.toLowerCase() === session.user.email.toLowerCase())
                const otherLastSeen =
                  typeof window !== "undefined" && localStorage.getItem("npw_role") === "provider"
                    ? thread?.client_last_seen
                    : thread?.provider_last_seen
                const seen =
                  isSelf && otherLastSeen && new Date(msg.created_at) <= new Date(otherLastSeen)
                const url = attachmentUrl(msg)
                const fileName = msg.file ? String(msg.file).split("/").pop() : ""

                return (
                  <div key={msg.id} className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
                    <div className={`flex items-end gap-2 max-w-[88%] ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
                      <div
                        className={`relative px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                          isSelf
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card border border-primary/10 text-foreground rounded-bl-md"
                        }`}
                      >
                        {!isSelf && (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 mb-1">
                            {msg.sender_name || msg.sender_email?.split("@")[0] || "User"}
                          </p>
                        )}
                        {msg.content ? (
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        ) : null}
                        {msg.file && url ? (
                          <div
                            className={`mt-2 overflow-hidden rounded-xl border ${
                              isSelf ? "border-primary-foreground/25" : "border-primary/10"
                            }`}
                          >
                            {msg.kind === "image" ? (
                              <div className="relative group/img">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="max-w-[260px] w-full h-auto block" />
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    className="h-9 w-9 rounded-full"
                                    onClick={() => window.open(url, "_blank")}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    className="h-9 w-9 rounded-full"
                                    onClick={() => handleDownload(url, fileName)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`p-3 flex items-center gap-3 ${
                                  isSelf ? "bg-primary-foreground/10" : "bg-muted/40"
                                }`}
                              >
                                <div
                                  className={`p-2 rounded-lg ${isSelf ? "bg-primary-foreground/20" : "bg-background"}`}
                                >
                                  <FileText className={`h-5 w-5 ${isSelf ? "" : "text-primary"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold truncate">{fileName || "Attachment"}</p>
                                  <p className="text-[10px] opacity-70">{fileLabel(fileName)}</p>
                                </div>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className={`shrink-0 rounded-full ${isSelf ? "hover:bg-primary-foreground/15" : ""}`}
                                  onClick={() => handleDownload(url, fileName)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={`flex flex-col gap-0.5 mb-0.5 shrink-0 text-[10px] text-muted-foreground ${isSelf ? "items-end" : "items-start"}`}
                      >
                        <span className="font-medium tabular-nums">{formatMessageTime(msg.created_at)}</span>
                        {isSelf && (
                          <span
                            className={`flex items-center gap-0.5 font-semibold ${seen ? "text-primary" : "text-muted-foreground/70"}`}
                            title={seen ? "Seen" : "Sent"}
                          >
                            {seen ? (
                              <>
                                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                                <span className="sr-only">Seen</span>
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" aria-hidden />
                                <span className="sr-only">Sent</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {messages.length === 0 && (
                <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <div className="bg-muted/60 p-4 rounded-full mb-3">
                    <History className="h-7 w-7 opacity-40" />
                  </div>
                  <p className="text-sm font-semibold">No messages yet</p>
                  <p className="text-xs mt-1">Say hello below</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="space-y-3 pt-2 border-t border-primary/10">
              <div className="relative rounded-2xl border border-primary/15 bg-card focus-within:ring-2 focus-within:ring-primary/20 transition-shadow">
                <textarea
                  rows={1}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    e.target.style.height = "inherit"
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                  }}
                  placeholder="Message…"
                  className="w-full bg-transparent rounded-2xl px-4 py-3 pr-24 text-sm resize-none min-h-[48px] max-h-[120px] outline-none"
                  disabled={
                    isLocked || (isInquiry && isExpired) || sending || isAdminRole || hasOpenDispute
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend(e)
                    }
                  }}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  {!isInquiry && (
                    <div className="relative">
                      <input
                        type="file"
                        id="chat-file-upload"
                        className="hidden"
                        accept={BOOKING_FILE_ACCEPT}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        disabled={isLocked || sending || isAdminRole || hasOpenDispute}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        asChild
                        className={`h-9 w-9 rounded-full ${file ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
                      >
                        <label htmlFor="chat-file-upload" className="cursor-pointer flex items-center justify-center">
                          <Paperclip className="h-4 w-4" />
                        </label>
                      </Button>
                    </div>
                  )}
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 rounded-full shadow-sm"
                    disabled={
                      isLocked ||
                      (isInquiry && isExpired) ||
                      sending ||
                      (!newMessage.trim() && !file) ||
                      isAdminRole ||
                      hasOpenDispute
                    }
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {!isInquiry && (
                <p className="text-[10px] text-muted-foreground px-1">
                  Booking chat: PNG, JPG, PDF, TXT, DOC, DOCX · max 5 MB
                </p>
              )}
              {file && (
                <div className="flex items-center justify-between bg-primary/5 px-3 py-2 rounded-xl border border-primary/15">
                  <div className="flex items-center gap-2 min-w-0">
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-foreground truncate">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => setFile(null)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </form>

            {!isInquiry && (
              <div className="mt-6 border-t border-primary/10 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Disputes</h4>
                </div>
                {disputes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-primary/15 bg-muted/20 p-6 text-center">
                    <ShieldCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs font-medium text-muted-foreground">No disputes for this booking</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {disputes.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-2xl border border-primary/10 bg-card p-4 text-sm shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              d.status === "open" ? "bg-destructive/10 text-destructive" : "bg-secondary/20 text-secondary-foreground"
                            }`}
                          >
                            {d.status === "open" ? "Open" : "Resolved"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(d.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-primary">{d.category?.replace(/_/g, " ")}</p>
                        <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{d.description}</p>
                        {d.attachment && (
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 mt-2 text-xs font-bold"
                            onClick={() => window.open(d.attachment, "_blank")}
                          >
                            View attachment
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
          <DialogContent className="rounded-[28px] border-primary/15 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Raise dispute</DialogTitle>
              <DialogDescription>Chat may be locked until the case is resolved.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDispute} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Reason</label>
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
                  rows={4}
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Describe the issue"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Attachment (optional)</label>
                <input
                  type="file"
                  className="mt-1 w-full text-xs"
                  accept="image/*,application/pdf"
                  onChange={(e) => setDisputeAttachment(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setDisputeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full font-bold">
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
