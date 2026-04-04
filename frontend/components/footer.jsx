import Link from "next/link"
import Image from "next/image"

export default function Footer() {
    return (
        <footer className="bg-blue-50 text-blue-900 border-t border-blue-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Company Info */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center mb-4">
                            <Image
                                src="/logo.png"
                                alt="NepWork"
                                width={24}
                                height={24}
                                className="h-20 w-28"
                                sizes="contain"
                            />
                        </div>
                        <p className="text-blue-700 mb-4 text-sm leading-relaxed">
                            Connecting skilled freelancers and service providers with clients who need quality work done.
                            Join our platform to discover amazing services or showcase your expertise.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-blue-800">Quick Links</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/services" className="text-blue-600 hover:text-blue-800 transition-colors text-sm">
                                    Browse Services
                                </Link>
                            </li>
                            <li>
                                <Link href="/categories" className="text-blue-600 hover:text-blue-800 transition-colors text-sm">
                                    Service Categories
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="text-blue-600 hover:text-blue-800 transition-colors text-sm">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-blue-600 hover:text-blue-800 transition-colors text-sm">
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-blue-800">Support</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/help" className="text-blue-600 hover:text-blue-800 transition-colors text-sm">
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-blue-600 hover:text-blue-800 transition-colors text-sm">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="text-blue-600 hover:text-blue-800 transition-colors text-sm">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/disputes" className="text-blue-600 hover:text-blue-800 transition-colors text-sm">
                                    Dispute Resolution
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-blue-200 mt-8 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <p className="text-blue-600 text-sm">
                            © 2024 NepWork. All rights reserved.
                        </p>
                        <div className="flex space-x-6 mt-4 md:mt-0">
                            <Link href="/terms" className="text-blue-600 hover:text-blue-800 text-sm transition-colors">
                                Terms
                            </Link>
                            <Link href="/privacy" className="text-blue-600 hover:text-blue-800 text-sm transition-colors">
                                Privacy
                            </Link>
                            <Link href="/cookies" className="text-blue-600 hover:text-blue-800 text-sm transition-colors">
                                Cookies
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
