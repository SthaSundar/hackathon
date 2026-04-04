"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Settings, Briefcase, Calendar } from "lucide-react"

export default function Navigation() {
    const { data: session, status } = useSession()
    const isBrowser = typeof window !== "undefined"
    const localToken = isBrowser ? localStorage.getItem("npw_token") : null
    const localName = isBrowser ? localStorage.getItem("npw_user_name") : null
    const localEmail = isBrowser ? localStorage.getItem("npw_user_email") : null

    const handleSignOut = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("npw_token")
            localStorage.removeItem("npw_role")
            localStorage.removeItem("npw_user_name")
            localStorage.removeItem("npw_user_email")
        }
        signOut({ callbackUrl: "/" })
    }

    return (
        <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo and Brand */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center space-x-3">
                            <Image
                                src="/logo.png"
                                alt="NepWork"
                                width={24}
                                height={24}
                                className="h-32 w-full"
                                sizes="contain"
                            />
                        </Link>
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link
                            href="/"
                            className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                        >
                            Home
                        </Link>
                        <Link
                            href="/services"
                            className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                        >
                            Services
                        </Link>
                        <Link
                            href="/categories"
                            className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                        >
                            Categories
                        </Link>
                        <Link
                            href="/about"
                            className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                        >
                            About
                        </Link>
                    </div>

                    {/* User Actions */}
                    <div className="flex items-center space-x-4">
                        {status === "loading" ? (
                            <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                        ) : (session || localToken) ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="flex items-center space-x-2">
                                        <Image
                                            src={session?.user?.image || "/logo.png"}
                                            alt="Profile"
                                            width={24}
                                            height={24}
                                            className="h-6 w-6 rounded-full"
                                        />
                                        <span className="hidden sm:block text-sm font-medium">
                                            {session?.user?.name || localName || "Account"}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <div className="flex items-center justify-start gap-2 p-2">
                                        <div className="flex flex-col space-y-1 leading-none">
                                            <p className="font-medium">{session?.user?.name || localName || "Account"}</p>
                                            <p className="w-[200px] truncate text-sm text-muted-foreground">
                                                {session?.user?.email || localEmail || ""}
                                            </p>
                                        </div>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard" className="cursor-pointer">
                                            <User className="mr-2 h-4 w-4" />
                                            Dashboard
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard?tab=services" className="cursor-pointer">
                                            <Briefcase className="mr-2 h-4 w-4" />
                                            My Services
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard?tab=bookings" className="cursor-pointer">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            My Bookings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile" className="cursor-pointer">
                                            <Settings className="mr-2 h-4 w-4" />
                                            Settings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Button asChild variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                                    <Link href="/auth/signin">Sign In</Link>
                                </Button>
                                <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                                    <Link href="/auth/signin">Get Started</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
