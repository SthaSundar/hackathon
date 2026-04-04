"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Filter, Grid3X3, List } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function CategoriesPage() {
    const [categories, setCategories] = useState([])
    const [searchTerm, setSearchTerm] = useState("")
    const [viewMode, setViewMode] = useState("grid")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadCategories = async () => {
            try {
                if (!process.env.NEXT_PUBLIC_API_URL) {
                    setLoading(false)
                    return
                }
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/categories/`)
                if (res.ok) {
                    const data = await res.json()
                    setCategories(Array.isArray(data) ? data : [])
                }
            } catch (e) {
                console.error("Failed to load categories", e)
            } finally {
                setLoading(false)
            }
        }
        loadCategories()
    }, [])

    const filteredCategories = categories.filter(category =>
        category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Service Categories</h1>
                    <p className="text-lg text-gray-600">
                        Explore services by category
                    </p>
                </div>

                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Search categories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-gray-300"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={viewMode === "grid" ? "default" : "outline"}
                            onClick={() => setViewMode("grid")}
                        >
                            <Grid3X3 className="h-4 w-4 mr-2" />
                            Grid
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "default" : "outline"}
                            onClick={() => setViewMode("list")}
                        >
                            <List className="h-4 w-4 mr-2" />
                            List
                        </Button>
                    </div>
                </div>

                {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCategories.map((category) => (
                            <Link key={category.id} href={`/services?category=${category.slug}`}>
                                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                                    <CardHeader>
                                        <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                                            <span className="text-blue-600 text-2xl font-semibold">
                                                {category.name?.[0] || "?"}
                                            </span>
                                        </div>
                                        <CardTitle className="text-xl text-center">{category.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center">
                                        <p className="text-gray-600 mb-4">{category.description || "No description"}</p>
                                        {category.service_count !== undefined && (
                                            <p className="text-sm text-gray-500">
                                                {category.service_count} service{category.service_count !== 1 ? 's' : ''}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredCategories.map((category) => (
                            <Link key={category.id} href={`/services?category=${category.slug}`}>
                                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                                                    <span className="text-blue-600 text-lg font-semibold">
                                                        {category.name?.[0] || "?"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <CardTitle className="text-xl">{category.name}</CardTitle>
                                                    <p className="text-gray-600 mt-1">{category.description || "No description"}</p>
                                                </div>
                                            </div>
                                            {category.service_count !== undefined && (
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">
                                                        {category.service_count} service{category.service_count !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}

                {filteredCategories.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No categories found.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
