"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function EsewaFailedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Payment not completed</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          eSewa did not confirm a successful charge. You can safely try again from your booking.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild className="rounded-full font-bold">
            <Link href="/dashboard?tab=bookings">My bookings</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full font-bold border-primary/20">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
