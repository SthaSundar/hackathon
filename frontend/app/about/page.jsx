"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Target, Award, Shield } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"

export default function AboutPage() {
    const { data: session } = useSession()

    return (
        <div className="min-h-screen bg-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-blue-800 mb-6">
                        About NepWork
                    </h1>
                    <p className="text-xl text-blue-700 max-w-3xl mx-auto">
                        Connecting skilled freelancers and service providers with clients who need quality work done.
                        We're building a community where talent meets opportunity.
                    </p>
                </div>

                {/* Mission & Vision */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                    <Card className="border-blue-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-800">
                                <Target className="h-6 w-6 text-blue-600" />
                                Our Mission
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-blue-700">
                                To democratize access to quality services by connecting talented professionals
                                with clients who need their expertise, creating opportunities for growth and
                                success for both parties.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-800">
                                <Award className="h-6 w-6 text-blue-600" />
                                Our Vision
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-blue-700">
                                To become the leading platform for service discovery and professional
                                networking, empowering individuals to build successful careers and
                                businesses through meaningful connections.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Values */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold text-center text-blue-800 mb-8">
                        Our Core Values
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="text-center border-blue-200">
                            <CardHeader>
                                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                                <CardTitle className="text-lg text-blue-800">Community</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-blue-700 text-sm">
                                    Building strong connections between service providers and clients
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-blue-200">
                            <CardHeader>
                                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <Award className="h-6 w-6 text-blue-600" />
                                </div>
                                <CardTitle className="text-lg text-blue-800">Quality</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-blue-700 text-sm">
                                    Ensuring high standards in all services and interactions
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-blue-200">
                            <CardHeader>
                                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <Target className="h-6 w-6 text-blue-600" />
                                </div>
                                <CardTitle className="text-lg text-blue-800">Innovation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-blue-700 text-sm">
                                    Continuously improving our platform and user experience
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-blue-200">
                            <CardHeader>
                                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <Shield className="h-6 w-6 text-blue-600" />
                                </div>
                                <CardTitle className="text-lg text-blue-800">Trust</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-blue-700 text-sm">
                                    Creating a safe and reliable environment for all users
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                

                {/* Contact CTA */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-blue-800 mb-4">
                        Ready to Get Started?
                    </h2>
                    <p className="text-blue-700 mb-6">
                        Join our community today and discover amazing services or showcase your expertise.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {!session && (
                            <Link
                                href="/auth/signin"
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                            >
                                Sign Up Now
                            </Link>
                        )}
                        <Link
                            href="/contact"
                            className="inline-flex items-center px-6 py-3 border border-blue-300 text-base font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors"
                        >
                            Contact Us
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
