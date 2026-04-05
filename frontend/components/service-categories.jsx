"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Flower, Palette, TreeDeciduous, ArrowRight } from "lucide-react"
import Link from "next/link"

const CATEGORIES = [
    {
        id: "flower_vendor",
        name: "Flower Vendors",
        description: "Fresh cut flowers directly from Kathmandu's local farmers and wholesalers.",
        icon: Flower,
        color: "bg-green-50 text-green-600",
        border: "border-green-100"
    },
    {
        id: "event_decorator",
        name: "Event Decorators",
        description: "Professional floral decorators for weddings, receptions, and special events.",
        icon: Palette,
        color: "bg-orange-50 text-orange-600",
        border: "border-orange-100"
    },
    {
        id: "nursery_amc",
        name: "Nursery & AMC",
        description: "Office plant care and maintenance contracts for a greener workspace.",
        icon: TreeDeciduous,
        color: "bg-amber-50 text-amber-600",
        border: "border-amber-100"
    }
]

export default function ServiceCategories() {
    return (
        <section className="py-24 px-4 bg-background overflow-hidden relative">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight">
                        Explore Our <span className="text-primary">Floral</span> Marketplace
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
                        Connecting you with Kathmandu's most trusted floriculture professionals.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {CATEGORIES.map((category) => {
                        const IconComponent = category.icon
                        return (
                            <Link key={category.id} href={`/services?category=${category.id}`}>
                                <Card className={`h-full hover:shadow-2xl transition-all duration-500 cursor-pointer group border-2 ${category.border} rounded-[40px] bg-white overflow-hidden flex flex-col`}>
                                    <CardHeader className="p-10 text-center flex-1">
                                        <div className={`mx-auto w-20 h-20 rounded-3xl ${category.color} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-sm`}>
                                            <IconComponent className="w-10 h-10" />
                                        </div>
                                        <CardTitle className="text-2xl font-black text-foreground mb-4 tracking-tight">
                                            {category.name}
                                        </CardTitle>
                                        <CardContent className="p-0">
                                            <p className="text-muted-foreground font-medium leading-relaxed">
                                                {category.description}
                                            </p>
                                        </CardContent>
                                    </CardHeader>
                                    <div className="px-10 pb-10 mt-auto">
                                        <div className="flex items-center justify-center gap-2 text-primary font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                                            View Listings <ArrowRight size={14} />
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
