"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, Phone, MapPin, Send, MessageCircle, HelpCircle, Flower, Sprout } from "lucide-react"

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        
        // Simulate sending message
        setTimeout(() => {
            alert("Thank you for your message! Our floriculture support team will get back to you soon.")
            setFormData({ name: "", email: "", subject: "", message: "" })
            setIsSubmitting(false)
        }, 1500)
    }

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const faqs = [
        {
            q: "How do I list my floral services?",
            a: "Sign up as a Provider, complete your KYC verification with a trade certificate, and you can start listing your cut flowers, decoration packages, or nursery services."
        },
        {
            q: "Can I order flowers in bulk for events?",
            a: "Yes! Our platform connects you directly with flower farmers and wholesalers for bulk orders. You can chat with them to discuss specific varieties and delivery schedules."
        },
        {
            q: "How do the decoration bookings work?",
            a: "Browse through event decorators, view their portfolios, and request a quote. Once you agree on the price and terms via chat, you can make a secure escrow payment."
        },
        {
            q: "What is the Nursery AMC service?",
            a: "It's an Annual Maintenance Contract for offices and commercial spaces. Professional nurseries will provide regular plant care, watering, and replacement to keep your workspace green."
        }
    ]

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Premium Header */}
            <div className="bg-primary/5 py-24 relative overflow-hidden border-b border-primary/10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h1 className="text-5xl md:text-7xl font-black text-foreground mb-8 tracking-tight">
                        Get in <span className="text-primary">Touch</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
                        Have questions about Kathmandu's digital flower market? Our team is here to help you grow.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    
                    {/* Contact Form Area */}
                    <div className="lg:col-span-7 space-y-12">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest">
                                <MessageCircle size={14} /> Send a Message
                            </div>
                            <h2 className="text-4xl font-black text-foreground tracking-tight">How can we help?</h2>
                            <p className="text-muted-foreground font-medium text-lg">Whether you're a farmer, decorator, or buyer, we'd love to hear from you.</p>
                        </div>

                        <Card className="rounded-[40px] border-primary/10 shadow-2xl overflow-hidden bg-white">
                            <CardContent className="p-10">
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1">Full Name</label>
                                            <Input
                                                name="name"
                                                required
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder="Sundar Shrestha"
                                                className="h-14 rounded-2xl border-primary/10 focus:ring-primary/20"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1">Email Address</label>
                                            <Input
                                                name="email"
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="name@example.com"
                                                className="h-14 rounded-2xl border-primary/10 focus:ring-primary/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1">Subject</label>
                                        <Input
                                            name="subject"
                                            required
                                            value={formData.subject}
                                            onChange={handleChange}
                                            placeholder="Bulk order inquiry / Technical support"
                                            className="h-14 rounded-2xl border-primary/10 focus:ring-primary/20"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-foreground uppercase tracking-widest ml-1">Message</label>
                                        <textarea
                                            name="message"
                                            rows={5}
                                            required
                                            value={formData.message}
                                            onChange={handleChange}
                                            placeholder="Tell us more about your inquiry..."
                                            className="w-full px-6 py-4 rounded-3xl border-2 border-primary/10 focus:border-primary focus:ring-primary/20 outline-none font-medium leading-relaxed"
                                        />
                                    </div>

                                    <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-[24px] text-lg font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                                        {isSubmitting ? "Sending..." : (
                                            <>
                                                <Send className="h-5 w-5 mr-2" />
                                                Send Message
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Contact Info & FAQs */}
                    <div className="lg:col-span-5 space-y-12">
                        {/* Quick Contact Info */}
                        <div className="space-y-6">
                            <h3 className="text-2xl font-black text-foreground tracking-tight mb-8">Contact Information</h3>
                            <div className="grid grid-cols-1 gap-6">
                                {[
                                    { icon: Mail, label: "Email Support", value: "support@nepwork.com", color: "bg-primary/10 text-primary" },
                                    { icon: Phone, label: "Call Us", value: "+977 1-4XXXXXX", color: "bg-secondary/20 text-secondary-foreground" },
                                    { icon: MapPin, label: "Visit Office", value: "Kathmandu, Nepal", color: "bg-amber-100 text-amber-700" }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-6 p-6 rounded-[32px] bg-white border border-primary/10 shadow-sm hover:shadow-md transition-all">
                                        <div className={`h-12 w-12 rounded-2xl ${item.color} flex items-center justify-center shrink-0`}>
                                            <item.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
                                            <p className="text-lg font-bold text-foreground">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Updated FAQs */}
                        <div className="space-y-8 pt-8">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <HelpCircle className="text-primary" />
                                </div>
                                <h3 className="text-2xl font-black text-foreground tracking-tight">Floral FAQs</h3>
                            </div>
                            
                            <div className="space-y-6">
                                {faqs.map((faq, i) => (
                                    <div key={i} className="group">
                                        <h4 className="font-bold text-foreground mb-2 flex items-start gap-3">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                                            {faq.q}
                                        </h4>
                                        <p className="text-sm text-muted-foreground font-medium leading-relaxed ml-4.5 pl-4 border-l-2 border-primary/5 group-hover:border-primary/20 transition-all">
                                            {faq.a}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
