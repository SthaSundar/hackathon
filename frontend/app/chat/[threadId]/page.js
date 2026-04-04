 "use client";
 
 import { useEffect, useState, useCallback } from "react";
 import { useParams, useRouter } from "next/navigation";
 import { useSession } from "next-auth/react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Button } from "@/components/ui/button";
 import { Paperclip, MoreVertical, Send, Download, Eye, FileText, Image as ImageIcon, AlertTriangle, Lock, History, XCircle, ShieldCheck, Scale } from "lucide-react";
 import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
 
 export default function ChatPage() {
   const params = useParams();
   const router = useRouter();
   const { data: session } = useSession();
   const [thread, setThread] = useState(null);
   const [messages, setMessages] = useState([]);
   const [newMessage, setNewMessage] = useState("");
   const [file, setFile] = useState(null);
   const [loading, setLoading] = useState(true);
   const [sending, setSending] = useState(false);
   const [error, setError] = useState("");
  const [disputes, setDisputes] = useState([]);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState("service_quality");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeAttachment, setDisputeAttachment] = useState(null);
 
   const threadId = params?.threadId;
 
   const privacyNotice =
     "Messages are private between users. Admins may review chats only in case of disputes, safety issues, or policy violations.";
 
   const getAuthHeaders = () => {
     const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null;
     return token ? { Authorization: `Bearer ${token}` } : {};
   };
 
   const loadThread = useCallback(async () => {
     if (!threadId) return;
     setLoading(true);
     setError("");
     try {
       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chats/thread/${threadId}/`, {
         headers: { ...getAuthHeaders() },
       });
       if (!res.ok) {
         const data = await res.json().catch(() => ({}));
         throw new Error(data?.detail || "Thread not found");
       }
       const data = await res.json();
       setThread(data);
       setMessages(Array.isArray(data?.messages) ? data.messages : []);
     } catch (e) {
       setError(e.message);
     } finally {
       setLoading(false);
     }
   }, [threadId]);
 
   useEffect(() => {
     const hasToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token");
     if (!session && !hasToken) {
       router.replace("/auth/signin");
       return;
     }
     loadThread();
   }, [session, loadThread, router]);
 
  useEffect(() => {
    const fetchDisputes = async () => {
      if (!thread?.booking?.id) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/booking/${thread.booking.id}/`, {
          headers: { ...getAuthHeaders() }
        });
        if (!res.ok) return;
        const data = await res.json();
        setDisputes(Array.isArray(data) ? data : []);
      } catch {
        setDisputes([]);
      }
    };
    fetchDisputes();
  }, [thread?.booking?.id]);

   const handleSend = async (e) => {
     e.preventDefault();
     if (!newMessage.trim() && !file) return;
     if (!thread) return;
     setSending(true);
     setError("");
     try {
       const formData = new FormData();
       formData.append("content", newMessage);
       if (file) {
         formData.append("file", file);
       }
       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chats/thread/${threadId}/message/`, {
         method: "POST",
         headers: { ...getAuthHeaders() },
         body: formData,
       });
       if (!res.ok) {
         const data = await res.json().catch(() => ({}));
         throw new Error(data?.detail || "Failed to send message");
       }
       const data = await res.json();
       setMessages((prev) => [...prev, data]);
       setNewMessage("");
       setFile(null);
     } catch (e) {
       setError(e.message);
     } finally {
       setSending(false);
     }
   };
 
  const handleCreateDispute = async (e) => {
    e.preventDefault();
    if (!thread?.booking?.id || !disputeDescription.trim()) return;
    try {
      const fd = new FormData();
      fd.append("category", disputeCategory);
      fd.append("description", disputeDescription);
      if (disputeAttachment) fd.append("attachment", disputeAttachment);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/create/${thread.booking.id}/`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to create dispute");
      setDisputeOpen(false);
      setDisputeCategory("service_quality");
      setDisputeDescription("");
      setDisputeAttachment(null);
      setDisputes((prev) => [data, ...prev]);
      if (thread) {
        setThread({ ...thread, status: "locked", has_open_dispute: true });
      }
    } catch (e2) {
      setError(e2.message);
    }
  };

   if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <div className="text-center">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
           <p className="text-gray-600">Loading chat...</p>
         </div>
       </div>
     );
   }
 
   if (error) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <div className="text-center max-w-md">
           <div className="text-red-500 text-xl mb-2">⚠️</div>
           <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat Error</h3>
           <p className="text-gray-600 mb-4">{error}</p>
           <Button onClick={() => router.back()} variant="outline">
             Go Back
           </Button>
         </div>
       </div>
     );
   }
 
   const isInquiry = thread?.thread_type === "inquiry";
   const isLocked = thread?.status === "locked";
   const isExpired = thread?.status === "expired";
  const hasOpenDispute = !!thread?.has_open_dispute || disputes.some((d) => d.status === "open");
 
  const isAdminRole = (typeof window !== "undefined" ? (localStorage.getItem("npw_role") === "admin") : false);
   
   const handleDownload = (url, filename) => {
     const link = document.createElement('a');
     link.href = url;
     link.download = filename || 'attachment';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
   };

   return (
     <div className="max-w-3xl mx-auto p-6">
       <Card>
         <CardHeader>
          <CardTitle>
            {(thread?.service?.title) || (thread?.booking?.service_title) || "Service"}
          </CardTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">
              {isInquiry ? "Inquiry Chat (Pre-booking)" : "Booking Chat (Post-booking)"}
            </span>
            {!isInquiry && thread?.booking?.id && (
              <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">
                Booking ID: {thread.booking.id}
              </span>
            )}
            {!isInquiry && thread?.booking?.status && (
              <span className="px-2 py-1 rounded bg-green-50 text-green-700">
                Status: {thread.booking.status}
              </span>
            )}
            <span className="ml-auto"></span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isInquiry && (
                  <DropdownMenuItem onClick={() => setDisputeOpen(true)}>
                    Raise Dispute
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(`Thread #${thread?.id}`)}>
                  Copy Thread ID
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
           <p className="text-xs text-gray-500">{privacyNotice}</p>
          {isAdminRole && (
            <div className="mt-2 px-3 py-2 rounded bg-yellow-50 text-yellow-700 text-xs">
              Read-only admin view
            </div>
          )}
          {!isInquiry && (
            <div className="mt-3 flex items-center gap-2">
              <Button variant="outline" onClick={() => setDisputeOpen(true)}>
                Raise Dispute
              </Button>
            </div>
          )}
         </CardHeader>
         <CardContent className="space-y-4">
          {(isLocked || isExpired || hasOpenDispute) && (
             <div className={`
               flex items-start gap-4 p-4 rounded-2xl border animate-in fade-in slide-in-from-top-4
               ${hasOpenDispute 
                 ? "bg-red-50 border-red-100 text-red-800" 
                 : isLocked 
                   ? "bg-amber-50 border-amber-100 text-amber-800" 
                   : "bg-gray-50 border-gray-100 text-gray-800"}
             `}>
               <div className={`
                 p-2 rounded-xl
                 ${hasOpenDispute ? "bg-red-100 text-red-600" : isLocked ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-600"}
               `}>
                 {hasOpenDispute ? <Scale className="h-5 w-5" /> : isLocked ? <Lock className="h-5 w-5" /> : <History className="h-5 w-5" />}
               </div>
               <div className="flex-1">
                 <h4 className="text-sm font-black uppercase tracking-tight">
                   {hasOpenDispute ? "Dispute in Progress" : isLocked ? "Chat Locked" : "Thread Expired"}
                 </h4>
                 <p className="text-xs font-medium opacity-80 mt-0.5">
                   {hasOpenDispute 
                     ? "This conversation is currently under review by our arbitration team. Messaging is temporarily disabled." 
                     : isLocked 
                       ? "This chat has been closed. You can no longer send messages." 
                       : "This inquiry has expired. Please book the service to continue the conversation."}
                 </p>
               </div>
             </div>
           )}
 
           <div className="max-h-[32rem] overflow-y-auto space-y-4 px-2 pb-4 custom-scrollbar">
             {messages.map((msg) => {
               const isSelf =
                 !!session?.user?.email &&
                 (msg.sender_email === session.user.email ||
                   msg.sender_name === session.user.name);
              const otherLastSeen = (() => {
                const role = typeof window !== "undefined" ? localStorage.getItem("npw_role") : null
                if (role === "provider") return thread?.client_last_seen
                return thread?.provider_last_seen
              })()
              const seen = isSelf && otherLastSeen && new Date(msg.created_at) <= new Date(otherLastSeen)
               
               return (
                 <div
                   key={msg.id}
                   className={`group flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                 >
                   <div className={`flex items-end gap-2 max-w-[85%] ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
                     <div className={`
                       relative px-4 py-3 rounded-2xl shadow-sm transition-all
                       ${isSelf 
                         ? "bg-blue-600 text-white rounded-br-none" 
                         : "bg-white border border-gray-100 text-gray-800 rounded-bl-none"}
                     `}>
                       {!isSelf && (
                         <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 opacity-70">
                           {msg.sender_name || msg.sender_email.split('@')[0]}
                         </p>
                       )}
                       
                       {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                       
                       {msg.file && (
                         <div className={`mt-2 overflow-hidden rounded-xl border ${isSelf ? "border-blue-400/30" : "border-gray-100"}`}>
                           {(() => {
                             const url = (msg.file_url && msg.file_url) || (msg.file?.startsWith("http") ? msg.file : `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api$/, "")}${msg.file}`)
                             const fileName = msg.file.split('/').pop()
                             
                             if (msg.kind === "image") {
                               return (
                                 <div className="relative group/img cursor-pointer">
                                   <img src={url} alt="Attachment" className="max-w-[280px] w-full h-auto transition-transform hover:scale-[1.02]" />
                                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                     <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => window.open(url)}>
                                       <Eye className="h-5 w-5" />
                                     </Button>
                                     <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => handleDownload(url, fileName)}>
                                       <Download className="h-5 w-5" />
                                     </Button>
                                   </div>
                                 </div>
                               )
                             }
                             
                             return (
                               <div className={`p-3 flex items-center gap-3 ${isSelf ? "bg-blue-700/30" : "bg-gray-50"}`}>
                                 <div className={`p-2 rounded-lg ${isSelf ? "bg-blue-500" : "bg-white border"}`}>
                                   <FileText className={`h-5 w-5 ${isSelf ? "text-white" : "text-blue-600"}`} />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <p className="text-xs font-bold truncate">{fileName}</p>
                                   <p className="text-[10px] opacity-60">Document • PDF/Word</p>
                                 </div>
                                 <Button size="icon" variant="ghost" className={isSelf ? "text-white hover:bg-white/10" : "text-gray-500 hover:bg-gray-200"} onClick={() => handleDownload(url, fileName)}>
                                   <Download className="h-4 w-4" />
                                 </Button>
                               </div>
                             )
                           })()}
                         </div>
                       )}
                     </div>
                     <span className="text-[10px] text-gray-400 font-medium mb-1 flex items-center gap-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isSelf && (
                          <span className={`flex items-center gap-0.5 ${seen ? "text-blue-500" : "text-gray-300"}`}>
                            {seen ? <Eye className="h-3 w-3" /> : <Send className="h-2.5 w-2.5" />}
                          </span>
                        )}
                     </span>
                   </div>
                 </div>
               );
             })}
             {messages.length === 0 && (
               <div className="h-64 flex flex-col items-center justify-center text-center opacity-40">
                 <div className="bg-gray-100 p-4 rounded-full mb-3">
                   <History className="h-8 w-8 text-gray-400" />
                 </div>
                 <p className="text-sm font-medium">No messages yet.</p>
                 <p className="text-xs">Start the conversation below</p>
               </div>
             )}
           </div>
 
           <form onSubmit={handleSend} className="space-y-4 pt-4 border-t border-gray-100">
             <div className="relative group">
               <textarea
                 rows={1}
                 value={newMessage}
                 onChange={(e) => {
                   setNewMessage(e.target.value);
                   e.target.style.height = 'inherit';
                   e.target.style.height = `${e.target.scrollHeight}px`;
                 }}
                 placeholder="Type your message here..."
                 className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all resize-none min-h-[46px] max-h-32 outline-none"
                 disabled={isLocked || (isInquiry && isExpired) || sending || isAdminRole || hasOpenDispute}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSend(e);
                   }
                 }}
               />
               <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
                 {!isInquiry && (
                    <div className="relative">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        disabled={isLocked || sending || isAdminRole || hasOpenDispute}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        asChild
                        className={`h-8 w-8 rounded-full ${file ? "text-blue-600 bg-blue-50" : "text-gray-400"}`}
                      >
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Paperclip className="h-4 w-4" />
                        </label>
                      </Button>
                    </div>
                 )}
                 <Button
                   type="submit"
                   size="icon"
                   className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200"
                   disabled={isLocked || (isInquiry && isExpired) || sending || (!newMessage.trim() && !file) || isAdminRole || hasOpenDispute}
                 >
                   <Send className="h-4 w-4" />
                 </Button>
               </div>
             </div>
             
             {file && (
               <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center gap-2 min-w-0">
                   <div className="bg-blue-600 p-1.5 rounded-lg">
                     <FileText className="h-3.5 w-3.5 text-white" />
                   </div>
                   <span className="text-xs font-bold text-blue-700 truncate">{file.name}</span>
                   <span className="text-[10px] text-blue-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                 </div>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-6 w-6 text-blue-400 hover:text-red-500" 
                   onClick={() => setFile(null)}
                 >
                   <XCircle className="h-4 w-4" />
                 </Button>
               </div>
             )}
           </form>
          
          {!isInquiry && (
            <div className="mt-8 border-t border-gray-100 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-4 w-4 text-red-500" />
                <h4 className="text-sm font-black uppercase tracking-tight text-gray-700">Dispute History</h4>
              </div>
              
              {disputes.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-6 text-center border-2 border-dashed border-gray-100">
                  <ShieldCheck className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-400">No disputes raised for this booking</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {disputes.map((d) => (
                    <div key={d.id} className="group relative bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`
                          text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full
                          ${d.status === "open" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}
                        `}>
                          {d.status === "open" ? "Pending Review" : "Resolved"}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">
                          {new Date(d.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-blue-600 uppercase tracking-tight">Reason: {d.category.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{d.description}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {d.creator_name?.[0] || d.creator_email?.[0]}
                          </div>
                          <p className="text-[10px] font-bold text-gray-500">By {d.creator_name || d.creator_email.split('@')[0]}</p>
                        </div>
                        
                        {d.attachment && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[10px] font-bold text-blue-600 hover:bg-blue-50"
                            onClick={() => window.open(d.attachment)}
                          >
                            <Paperclip className="h-3 w-3 mr-1" />
                            View Proof
                          </Button>
                        )}
                      </div>

                      {d.resolution_notes && (
                        <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100">
                          <p className="text-[10px] font-black text-green-700 uppercase tracking-tight mb-1">Resolution Note</p>
                          <p className="text-xs text-green-800 italic">"{d.resolution_notes}"</p>
                        </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Dispute</DialogTitle>
            <DialogDescription>
              Provide details and optional attachment. Chat will be locked until resolution.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDispute} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <select
                className="mt-1 w-full border rounded px-2 py-1 text-sm"
                value={disputeCategory}
                onChange={(e) => setDisputeCategory(e.target.value)}
              >
                <option value="service_quality">Service Quality</option>
                <option value="payment">Payment Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="mt-1 w-full border rounded px-2 py-1 text-sm"
                rows={4}
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                placeholder="Describe the issue clearly"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Attachment (optional)</label>
              <input
                type="file"
                className="mt-1 w-full text-sm"
                onChange={(e) => setDisputeAttachment(e.target.files?.[0] || null)}
                accept="image/*,application/pdf"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Submit Dispute</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
     </div>
   );
 }
