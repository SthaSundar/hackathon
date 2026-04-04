"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function ServiceCategories() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL, [])

    useEffect(() => {
        const load = async () => {
            try {
                if (!apiBase) throw new Error("API URL not configured")
                const res = await fetch(`${apiBase}/services/categories/`)
                if (!res.ok) throw new Error("Failed to load categories")
                const data = await res.json()
                setCategories(Array.isArray(data) ? data : [])
            } catch (e) {
                setError(e?.message || "Error loading categories")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [apiBase])

    return (
        <section className="py-16 px-4 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Explore Service Categories
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Find the perfect service for your needs or showcase your expertise in your field
                    </p>
                </div>

                {loading ? (
                    <div className="text-center text-gray-500">Loading categories...</div>
                ) : error ? (
                    <div className="text-center text-red-600">{error}</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((category) => (
                            <Link key={category.id} href={`/services/${category.slug}`}>
                                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
                                    <CardHeader className="text-center">
                                        <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <span className="text-blue-600 text-lg font-semibold">
                                                {category.name?.[0] || "?"}
                                            </span>
                                        </div>
                                        <CardTitle className="text-xl font-semibold text-gray-900">
                                            {category.name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center">
                                        <p className="text-gray-600">{category.description || ""}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
