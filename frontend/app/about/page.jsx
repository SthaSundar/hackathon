"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Target, Award, Shield, Flower, Leaf, Sprout, Heart } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AboutPage() {
    const { data: session } = useSession()

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Premium Hero Section */}
            <div className="bg-primary/5 py-24 relative overflow-hidden border-b border-primary/10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h1 className="text-5xl md:text-7xl font-black text-foreground mb-8 tracking-tight">
                        About <span className="text-primary">NepWork</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
                        NEPWORK is a digital marketplace designed to connect Nepal’s flower farmers, decorators, and customers through a single smart platform.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                {/* Our Story / Mission */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24 items-center">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest">
                            <Sprout size={14} /> Our Mission
                        </div>
                        <h2 className="text-4xl font-black text-foreground tracking-tight leading-tight">
                            Empowering Kathmandu's <br />
                            <span className="text-primary">Floriculture</span> Community
                        </h2>
                        <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                            We enable real-time access to cut flowers, bulk ordering for events, transparent pricing, and direct farmer-to-buyer interaction. By transforming the traditional, offline flower market into a modern system, NEPWORK helps reduce last-minute shortages, ensures fair pricing, and empowers local growers while making event planning faster and more reliable.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <Card className="rounded-[32px] border-primary/10 bg-white shadow-xl p-8 hover:scale-105 transition-transform duration-500">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                                <Leaf size={24} />
                            </div>
                            <h3 className="font-black text-foreground text-lg mb-2">Sustainability</h3>
                            <p className="text-sm text-muted-foreground font-medium">Supporting local flower farmers and eco-friendly nursery practices.</p>
                        </Card>
                        <Card className="rounded-[32px] border-primary/10 bg-white shadow-xl p-8 hover:scale-105 transition-transform duration-500 translate-y-8">
                            <div className="h-12 w-12 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary-foreground mb-6">
                                <Heart size={24} />
                            </div>
                            <h3 className="font-black text-foreground text-lg mb-2">Passion</h3>
                            <p className="text-sm text-muted-foreground font-medium">Every bouquet and decoration is handled with care and artistry.</p>
                        </Card>
                    </div>
                </div>

                {/* Core Values Section */}
                <div className="mb-24">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black text-foreground tracking-tight mb-4">Our Core Values</h2>
                        <p className="text-muted-foreground font-medium">The principles that drive Nepal's floral digital revolution.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: Users, title: "Community", desc: "Building strong bonds between farmers, decorators, and buyers." },
                            { icon: Award, title: "Quality", desc: "Only the freshest blooms and top-tier decoration services." },
                            { icon: Target, title: "Innovation", desc: "Modernizing an ancient trade with cutting-edge technology." },
                            { icon: Shield, title: "Trust", desc: "Verified professionals and secure transactions for everyone." }
                        ].map((value, i) => (
                            <Card key={i} className="text-center border-primary/10 rounded-[40px] p-10 bg-white hover:shadow-2xl transition-all duration-500 group">
                                <div className="mx-auto w-16 h-16 bg-primary/5 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-500">
                                    <value.icon className="h-8 w-8 text-primary group-hover:text-white" />
                                </div>
                                <h3 className="text-xl font-black text-foreground mb-4">{value.title}</h3>
                                <p className="text-muted-foreground font-medium text-sm leading-relaxed">{value.desc}</p>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Final CTA Section */}
                <Card className="rounded-[48px] border-primary/10 bg-white shadow-2xl p-16 text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-110 transition-transform duration-700" />
                    
                    <h2 className="text-4xl font-black text-foreground mb-6 tracking-tight relative z-10">
                        Join the <span className="text-primary">Digital Flower Market</span> Today
                    </h2>
                    <p className="text-xl text-muted-foreground mb-10 font-medium max-w-2xl mx-auto relative z-10">
                        Whether you're a farmer looking to grow your business or a customer planning your dream wedding, NepWork is here for you.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10">
                        {!session ? (
                            <Button asChild size="lg" className="h-16 px-12 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all scale-105">
                                <Link href="/auth/signin">Get Started Now</Link>
                            </Button>
                        ) : (
                            <Button asChild size="lg" className="h-16 px-12 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all scale-105">
                                <Link href="/dashboard">View Dashboard</Link>
                            </Button>
                        )}
                        <Button asChild variant="outline" size="lg" className="h-16 px-12 rounded-[24px] font-black uppercase tracking-widest text-xs border-primary/20 text-primary hover:bg-primary/5 transition-all">
                            <Link href="/contact">Contact Support</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    )
}
