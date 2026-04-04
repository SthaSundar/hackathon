"use client"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"

export default function Hero() {
    const { data: session } = useSession()

    return (
        <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/Background.png"
                    alt="NepWork Background"
                    fill
                    className="object-contain md:object-cover object-center"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-blue-800/20 to-blue-900/30" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
                <div className="mb-8">
                    <Image
                        src="/logo.png"
                        alt="NepWork Logo"
                        width={120}
                        height={120}
                        className="mx-auto mb-6"
                    />
                </div>

                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                    Connect with the Best
                    <span className="block text-blue-300">Freelancers & Service Providers</span>
                </h1>

                <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-2xl mx-auto">
                    Find skilled professionals for your projects or showcase your expertise to potential clients.
                    Join NepWork today and build meaningful connections.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {session ? (
                        <Button asChild size="lg" className="text-lg px-8 py-3">
                            <Link href="/dashboard">Go to Dashboard</Link>
                        </Button>
                    ) : (
                        <Button asChild size="lg" className="text-lg px-8 py-3">
                            <Link href="/auth/signin">Get Started</Link>
                        </Button>
                    )}
                    <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600">
                        <Link href="/services">Browse Services</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
