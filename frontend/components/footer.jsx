import Link from "next/link"
import Image from "next/image"

export default function Footer() {
    return (
        <footer className="bg-muted text-foreground border-t border-primary/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Company Info */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center mb-6 group">
                            <span className="text-2xl font-black tracking-tighter text-foreground">
                                Nep<span className="text-primary">Work</span>
                            </span>
                        </div>
                        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                            NEPWORK is a digital marketplace designed to connect Nepal’s flower farmers, decorators, and customers through a single smart platform. It enables real-time access to cut flowers, bulk ordering for events, transparent pricing, and direct farmer-to-buyer interaction.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-6 text-foreground">Explore</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/services" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                                    Browse Flowers
                                </Link>
                            </li>
                            <li>
                                <Link href="/categories" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                                    Our Categories
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                                    About NepWork
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="text-lg font-semibold mb-6 text-foreground">Support</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                                    Contact Us
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-primary/10 mt-12 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-muted-foreground text-sm">
                            © 2026 NepWork. Connecting Kathmandu's Floriculture.
                        </p>
                        <div className="flex space-x-8">
                            <Link href="/terms" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                                Terms
                            </Link>
                            <Link href="/privacy" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                                Privacy
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
