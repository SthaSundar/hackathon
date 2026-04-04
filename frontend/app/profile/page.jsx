"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Shield, Bell, CreditCard, Settings } from "lucide-react"

export default function ProfilePage() {
    const { data: session } = useSession()
    const hasLocal = typeof window !== "undefined" && !!localStorage.getItem("npw_token")
    const [activeTab, setActiveTab] = useState("profile")
    const [profileData, setProfileData] = useState({
        firstName: (session?.user?.name || (typeof window !== "undefined" ? localStorage.getItem("npw_user_name") : ""))?.split(" ")[0] || "",
        lastName: (session?.user?.name || (typeof window !== "undefined" ? localStorage.getItem("npw_user_name") : ""))?.split(" ").slice(1).join(" ") || "",
        email: session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("npw_user_email") : ""),
        phone: "",
        bio: "",
        location: ""
    })

    const handleProfileUpdate = (e) => {
        e.preventDefault()
        // Handle profile update here
        console.log("Profile updated:", profileData)
        alert("Profile updated successfully!")
    }

    const handleChange = (e) => {
        setProfileData({
            ...profileData,
            [e.target.name]: e.target.value
        })
    }

    if (!session && !hasLocal) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Please sign in to view your profile</h2>
                    <a href="/auth/signin" className="text-blue-600 hover:underline">Sign In</a>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
                    <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                        <TabsTrigger value="billing">Billing</TabsTrigger>
                        <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Personal Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleProfileUpdate} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                                                First Name
                                            </label>
                                            <Input
                                                id="firstName"
                                                name="firstName"
                                                value={profileData.firstName}
                                                onChange={handleChange}
                                                placeholder="Enter your first name"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                                                Last Name
                                            </label>
                                            <Input
                                                id="lastName"
                                                name="lastName"
                                                value={profileData.lastName}
                                                onChange={handleChange}
                                                placeholder="Enter your last name"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                            Email Address
                                        </label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={profileData.email}
                                            onChange={handleChange}
                                            placeholder="Enter your email address"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                            Phone Number
                                        </label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            value={profileData.phone}
                                            onChange={handleChange}
                                            placeholder="Enter your phone number"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                                            Location
                                        </label>
                                        <Input
                                            id="location"
                                            name="location"
                                            value={profileData.location}
                                            onChange={handleChange}
                                            placeholder="Enter your location"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                                            Bio
                                        </label>
                                        <textarea
                                            id="bio"
                                            name="bio"
                                            rows={4}
                                            value={profileData.bio}
                                            onChange={handleChange}
                                            placeholder="Tell us about yourself..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <Button type="submit">Update Profile</Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Security Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Change Password</h3>
                                    <div className="space-y-3">
                                        <Input type="password" placeholder="Current Password" />
                                        <Input type="password" placeholder="New Password" />
                                        <Input type="password" placeholder="Confirm New Password" />
                                        <Button>Update Password</Button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <h3 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h3>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Add an extra layer of security to your account
                                    </p>
                                    <Button variant="outline">Enable 2FA</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="h-5 w-5" />
                                    Notification Preferences
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">Email Notifications</h3>
                                            <p className="text-sm text-gray-600">Receive updates via email</p>
                                        </div>
                                        <input type="checkbox" defaultChecked className="rounded" />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">Push Notifications</h3>
                                            <p className="text-sm text-gray-600">Receive push notifications</p>
                                        </div>
                                        <input type="checkbox" defaultChecked className="rounded" />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">SMS Notifications</h3>
                                            <p className="text-sm text-gray-600">Receive updates via SMS</p>
                                        </div>
                                        <input type="checkbox" className="rounded" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="billing" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Billing Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600 mb-4">
                                    Manage your billing information and payment methods
                                </p>
                                <Button variant="outline">Add Payment Method</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="preferences" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    Account Preferences
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">Language</h3>
                                            <p className="text-sm text-gray-600">Choose your preferred language</p>
                                        </div>
                                        <select className="px-3 py-2 border border-gray-300 rounded-md">
                                            <option>English</option>
                                            <option>Nepali</option>
                                            <option>Hindi</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">Time Zone</h3>
                                            <p className="text-sm text-gray-600">Set your local time zone</p>
                                        </div>
                                        <select className="px-3 py-2 border border-gray-300 rounded-md">
                                            <option>Asia/Kathmandu (GMT+5:45)</option>
                                            <option>UTC (GMT+0)</option>
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
