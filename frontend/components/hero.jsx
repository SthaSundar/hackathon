"use client"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"

export default function Hero() {
    const { data: session } = useSession()

    return (
        <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
            {/* Background Image with Proper Aspect Ratio */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/banner.png"
                    alt="NepWork Floriculture Marketplace"
                    fill
                    className="object-cover object-center brightness-90"
                    priority
                />
                {/* Soft Gradient Overlay for Readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-background/80" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                <h1 className="text-5xl md:text-7xl font-black mb-6 text-white drop-shadow-2xl tracking-tight">
                    From Farm to Function
                    <span className="block text-primary mt-2 drop-shadow-none bg-white/90 backdrop-blur-md px-6 py-2 rounded-3xl inline-block">Fresh Flowers, Smarter Connections</span>
                </h1>

                <p className="text-xl md:text-2xl mb-12 text-white font-bold drop-shadow-md max-w-2xl mx-auto leading-relaxed">
                    Nepal's dedicated  marketplace for flower farmers, decorators, and floriculture professionals.
                </p>

                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    {session ? (
                        <Button asChild size="lg" className="text-lg px-12 py-8 rounded-[24px] shadow-2xl hover:shadow-primary/40 transition-all font-black uppercase tracking-widest scale-105">
                            <Link href="/dashboard">Go to Dashboard</Link>
                        </Button>
                    ) : (
                        <Button asChild size="lg" className="text-lg px-12 py-8 rounded-[24px] shadow-2xl hover:shadow-primary/40 transition-all font-black uppercase tracking-widest scale-105">
                            <Link href="/auth/signin">Get Started</Link>
                        </Button>
                    )}
                    <Button asChild variant="outline" size="lg" className="text-lg px-12 py-8 rounded-[24px] border-white bg-white/10 backdrop-blur-md text-white hover:bg-white hover:text-primary transition-all font-black uppercase tracking-widest">
                        <Link href="/services">Browse Flowers</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
