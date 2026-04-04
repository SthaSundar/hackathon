"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Star, MapPin, Clock, Filter, Search } from "lucide-react"
import Link from "next/link"

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sortBy, setSortBy] = useState("rating")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!process.env.NEXT_PUBLIC_API_URL) {
          setLoading(false)
          return
        }

        // Load services
        const servicesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/services/`)
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json()
          setServices(Array.isArray(servicesData) ? servicesData : [])
        }

        // Load categories
        const categoriesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/categories/`)
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          setCategories(Array.isArray(categoriesData) ? categoriesData : [])
        }
      } catch (e) {
        console.error("Failed to load data", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredServices = services.filter(service => {
    const matchesSearch = service.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.provider_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "All" || 
                           service.category_name === selectedCategory ||
                           service.category?.name === selectedCategory
    return matchesSearch && matchesCategory
  })

  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return (b.average_rating || 0) - (a.average_rating || 0)
      case "price-low":
        return parseFloat(a.base_price || 0) - parseFloat(b.base_price || 0)
      case "price-high":
        return parseFloat(b.base_price || 0) - parseFloat(a.base_price || 0)
      case "reviews":
        return (b.total_reviews || 0) - (a.total_reviews || 0)
      default:
        return 0
    }
  })

  const categoryList = ["All", ...categories.map(cat => cat.name)]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Browse Services</h1>
          <p className="text-lg text-gray-600">
            Find the perfect service for your needs from our verified professionals
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search services, providers, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-300"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            >
              <option value="rating">Sort by Rating</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="reviews">Most Reviews</option>
            </select>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categoryList.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedServices.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-600 font-medium">{service.category_name || "Service"}</span>
                  {service.average_rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{service.average_rating}</span>
                      {service.total_reviews > 0 && (
                        <span className="text-sm text-gray-500">({service.total_reviews})</span>
                      )}
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {service.title}
                  {service.provider_verified && (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 rounded-full" title="Verified Provider">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-sm text-blue-700">
                  by {service.provider_name || service.provider_email}
                  {service.provider_verified && <span className="ml-1 text-blue-800 font-semibold">✓ Verified</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4 line-clamp-3">{service.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  {service.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {service.location}
                    </div>
                  )}
                  {service.pricing_type && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {service.pricing_type}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-blue-600">Rs. {service.base_price}</span>
                </div>
                
                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/services/${service.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sortedServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No services found matching your criteria.</p>
            <p className="text-gray-400">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
