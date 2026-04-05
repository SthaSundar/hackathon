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
    const localToken = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null
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
        <nav className="bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(244,143,177,0.1)] border-b border-primary/10 sticky top-0 z-50 transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-24">
                    {/* Logo and Brand */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center group">
                            <span className="text-3xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">
                                Nep<span className="text-primary">Work</span>
                            </span>
                        </Link>
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-12">
                        <Link
                            href="/"
                            className="text-foreground/60 hover:text-primary px-1 py-2 text-sm font-black uppercase tracking-widest transition-all relative group"
                        >
                            Home
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                        </Link>
                        <Link
                            href="/services"
                            className="text-foreground/60 hover:text-primary px-1 py-2 text-sm font-black uppercase tracking-widest transition-all relative group"
                        >
                            Browse Flowers
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                        </Link>
                        <Link
                            href="/bulk-board"
                            className="text-foreground/60 hover:text-primary px-1 py-2 text-sm font-black uppercase tracking-widest transition-all relative group"
                        >
                            Bulk Board
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                        </Link>
                        <Link
                            href="/about"
                            className="text-foreground/60 hover:text-primary px-1 py-2 text-sm font-black uppercase tracking-widest transition-all relative group"
                        >
                            About
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                        </Link>
                    </div>

                    {/* User Actions */}
                    <div className="flex items-center space-x-8">
                        {status === "loading" ? (
                            <div className="animate-pulse bg-primary/5 h-10 w-24 rounded-full"></div>
                        ) : (session || localToken) ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="flex items-center space-x-4 hover:bg-primary/5 rounded-[20px] px-4 py-6 border border-transparent hover:border-primary/10 transition-all">
                                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-white shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                                            <Image
                                                src={session?.user?.image || "/logo.png"}
                                                alt="Profile"
                                                width={40}
                                                height={40}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <span className="hidden sm:block text-sm font-black uppercase tracking-tighter text-foreground">
                                            {session?.user?.name || localName || "Account"}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-72 p-3 rounded-[32px] shadow-2xl border-primary/10 bg-white/95 backdrop-blur-md">
                                    <div className="flex flex-col space-y-1 p-4 bg-primary/5 rounded-2xl mb-2">
                                        <p className="font-black text-foreground tracking-tight">{session?.user?.name || localName || "Account"}</p>
                                        <p className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            {session?.user?.email || localEmail || ""}
                                        </p>
                                    </div>
                                    <DropdownMenuSeparator className="my-2 bg-primary/5" />
                                    <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer py-3 font-bold text-sm">
                                        <Link href="/dashboard">
                                            <User className="mr-3 h-4 w-4" />
                                            My Dashboard
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer py-3 font-bold text-sm">
                                        <Link href="/dashboard?tab=services">
                                            <Briefcase className="mr-3 h-4 w-4" />
                                            Service Listings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer py-3 font-bold text-sm">
                                        <Link href="/dashboard?tab=bookings">
                                            <Calendar className="mr-3 h-4 w-4" />
                                            Bookings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="my-2 bg-primary/5" />
                                    <DropdownMenuItem onClick={handleSignOut} className="rounded-xl focus:bg-destructive/5 focus:text-destructive cursor-pointer py-3 font-bold text-sm text-destructive">
                                        <LogOut className="mr-3 h-4 w-4" />
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center space-x-6">
                                <Button asChild variant="ghost" className="text-foreground/60 hover:text-primary hover:bg-primary/5 rounded-full px-8 font-black uppercase tracking-widest text-xs transition-all">
                                    <Link href="/auth/signin">Sign In</Link>
                                </Button>
                                <Button asChild className="bg-primary text-white hover:bg-primary/90 rounded-[20px] px-10 py-6 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all font-black uppercase tracking-widest text-xs scale-105">
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
