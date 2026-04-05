"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, ImageIcon, Plus, Loader2, X, Pencil, Eye } from "lucide-react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function PortfolioList() {
  const { data: session } = useSession()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)

  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editFile, setEditFile] = useState(null)
  const [editPreview, setEditPreview] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "")

  const fetchPortfolio = async () => {
    setLoading(true)
    try {
      const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
      if (!token) {
        setLoading(false)
        return
      }

      const res = await fetch(`${apiUrl}/services/portfolio/my/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setItems(Array.isArray(data) ? data : data.results || [])
      } else if (res.status === 403) {
        setError("Access denied. Please ensure your account is set up as a provider.")
      } else {
        throw new Error("Failed to load portfolio")
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolio()
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) return
    setUploading(true)
    setError("")

    try {
      const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
      const formData = new FormData()
      formData.append("image", selectedFile)
      formData.append("title", title || "Untitled Work")
      if (description) formData.append("description", description)

      const res = await fetch(`${apiUrl}/services/portfolio/add/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (res.ok) {
        setSelectedFile(null)
        setPreviewUrl(null)
        setTitle("")
        setDescription("")
        setShowAddModal(false)
        fetchPortfolio()
      } else {
        const errData = await res.json()
        setError(errData.detail || "Upload failed")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
      const res = await fetch(`${apiUrl}/services/portfolio/${pendingDelete.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setPendingDelete(null)
        fetchPortfolio()
      } else {
        setError("Delete failed")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (item) => {
    setEditItem(item)
    setEditTitle(item.title || "")
    setEditDescription(item.description || "")
    setEditFile(null)
    setEditPreview(null)
  }

  const handleEditFile = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditFile(file)
      setEditPreview(URL.createObjectURL(file))
    }
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editItem) return
    if (!editTitle.trim()) {
      setError("Title is required.")
      return
    }
    setSavingEdit(true)
    setError("")
    try {
      const token = (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) || session?.accessToken
      if (editFile) {
        const fd = new FormData()
        fd.append("title", editTitle.trim())
        fd.append("description", editDescription.trim())
        fd.append("image", editFile)
        const res = await fetch(`${apiUrl}/services/portfolio/${editItem.id}/`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || "Update failed")
        }
      } else {
        const res = await fetch(`${apiUrl}/services/portfolio/${editItem.id}/`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editTitle.trim(),
            description: editDescription.trim(),
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || JSON.stringify(err))
        }
      }
      setEditItem(null)
      fetchPortfolio()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const itemSrc = (item) => item.image_url || item.image

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="aspect-square rounded-[32px] border-2 border-dashed border-primary/25 bg-primary/5 flex flex-col items-center justify-center gap-3 hover:bg-primary/10 hover:border-primary/40 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Plus className="text-primary h-6 w-6" />
          </div>
          <span className="font-black text-sm text-primary uppercase tracking-widest">Add photo</span>
        </button>

        {loading
          ? [1, 2, 3].map((i) => <div key={i} className="aspect-square rounded-[32px] bg-muted animate-pulse" />)
          : items.map((item) => (
              <div
                key={item.id}
                className="relative group aspect-square rounded-[32px] overflow-hidden shadow-sm border border-primary/10 hover:shadow-xl transition-all duration-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={itemSrc(item)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <p className="text-white font-bold text-sm line-clamp-2 mb-3">{item.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full h-9 font-bold text-xs bg-white/95 text-foreground hover:bg-white"
                      onClick={() => setViewItem(item)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full h-9 font-bold text-xs bg-white/95 text-foreground hover:bg-white"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="rounded-full h-9 font-bold text-xs"
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-xl rounded-[40px] border-primary/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="bg-primary/5 p-8 flex justify-between items-center border-b border-primary/10 shrink-0">
              <div>
                <CardTitle className="text-2xl font-black tracking-tight">Add portfolio work</CardTitle>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  Showcase your best floral projects
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="rounded-full">
                <X size={20} />
              </Button>
            </div>
            <CardContent className="p-8 overflow-y-auto flex-1">
              <form onSubmit={handleUpload} className="space-y-6 pb-10">
                {error && (
                  <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl text-destructive text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground ml-1">Work image</label>
                  <div
                    onClick={() => document.getElementById("portfolio-file")?.click()}
                    className={`aspect-video rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${
                      previewUrl ? "border-primary" : "border-primary/20 hover:border-primary/40 bg-primary/5"
                    }`}
                  >
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-md mb-3">
                          <ImageIcon className="text-primary h-6 w-6" />
                        </div>
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-tighter">
                          Click to upload photo
                        </span>
                      </>
                    )}
                  </div>
                  <input id="portfolio-file" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground ml-1">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-2xl h-12 border-primary/10"
                    placeholder="e.g., Grand wedding stage decoration"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground ml-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-2xl border border-primary/10 p-4 min-h-[100px] focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Tell us more about this project…"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading || !selectedFile} className="flex-[2] h-14 rounded-2xl font-black shadow-lg shadow-primary/20">
                    {uploading ? <Loader2 className="animate-spin h-5 w-5" /> : "Upload"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-[28px] border-primary/10 p-0 gap-0 overflow-hidden">
          <div className="bg-primary/5 px-8 pt-10 pb-6 text-center border-b border-primary/10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm border border-primary/10">
              <Trash2 className="h-7 w-7 text-destructive/80" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center">Remove this photo?</DialogTitle>
              <DialogDescription className="text-center text-muted-foreground leading-relaxed">
                {pendingDelete ? (
                  <>“{pendingDelete.title}” will be removed from your public portfolio. This cannot be undone.</>
                ) : null}
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="flex-row gap-3 sm:justify-center px-8 py-6">
            <Button type="button" variant="outline" className="flex-1 rounded-full font-bold border-primary/15" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Keep
            </Button>
            <Button type="button" variant="destructive" className="flex-1 rounded-full font-bold" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="sm:max-w-lg rounded-[28px] border-primary/10 p-0 gap-0 overflow-hidden">
          {viewItem && (
            <>
              <div className="aspect-video bg-primary/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={itemSrc(viewItem)} alt="" className="w-full h-full object-cover" />
              </div>
              <DialogHeader className="p-6 text-left">
                <DialogTitle className="text-xl font-bold">{viewItem.title}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground text-left leading-relaxed">
                  {viewItem.description || "No description."}
                </DialogDescription>
              </DialogHeader>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="sm:max-w-lg rounded-[28px] border-primary/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit portfolio item</DialogTitle>
            <DialogDescription>Update title, description, or replace the image.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4 pt-2">
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <div
              className="aspect-video rounded-2xl border-2 border-dashed border-primary/20 overflow-hidden cursor-pointer bg-primary/5 flex items-center justify-center"
              onClick={() => document.getElementById("edit-portfolio-file")?.click()}
            >
              {editPreview || itemSrc(editItem || {}) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editPreview || itemSrc(editItem || {})} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">Tap to change image</span>
              )}
            </div>
            <input id="edit-portfolio-file" type="file" accept="image/*" className="hidden" onChange={handleEditFile} />
            <div>
              <label className="text-sm font-bold ml-1">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-2xl mt-1" required />
            </div>
            <div>
              <label className="text-sm font-bold ml-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full rounded-2xl border border-primary/10 p-3 min-h-[88px] mt-1 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="rounded-full font-bold" onClick={() => setEditItem(null)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-full font-bold" disabled={savingEdit}>
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
