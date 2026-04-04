"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Briefcase,
  Star,
  Calendar,
  Settings,
  Plus,
  LogOut,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Bell,
  BadgeCheck,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ServicesList, BookingsList, ProviderInquiriesList } from "./components";
import { Loader2 } from "lucide-react";

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");
  const roleFromUrl = searchParams?.get("role");
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [kycInfo, setKycInfo] = useState(null);
  const [providerEarnings, setProviderEarnings] = useState(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  // Determine current role early so hooks can depend on it before any early returns
  const rawRole = roleFromUrl ||
    (typeof window !== "undefined" ? localStorage.getItem("npw_role") : null) ||
    session?.role ||
    "customer";
  const currentRole = rawRole === "client" ? "customer" : rawRole;
  // Redirect admins to the dedicated admin dashboard
  useEffect(() => {
    if (currentRole === "admin") {
      router.replace("/admin");
    }
  }, [currentRole, router]);

  // Clients are allowed to view a client dashboard now; no redirect here

  useEffect(() => {
    if (status === "loading") return;
    const hasLocalToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token");
    if (!session && !hasLocalToken) {
      router.push("/auth/signin");
      return;
    }
    
    // Get user's actual role from backend
    const fetchUserRole = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null;
        if (!token || !process.env.NEXT_PUBLIC_API_URL || !session?.user?.email) {
          // If signed in via Google and we don't yet have a token, mint one now
          if (session?.user?.email && !token && process.env.NEXT_PUBLIC_API_URL) {
            try {
              const mint = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/token-by-email/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: session.user.email })
              });
              if (mint.ok) {
                const minted = await mint.json();
                if (typeof window !== "undefined" && minted?.token) {
                  localStorage.setItem("npw_token", minted.token);
                }
              }
            } catch (mintErr) {
              console.warn("Failed to mint JWT for Google user", mintErr);
            }
          }
          // Continue even if no token; rest of dashboard will gracefully degrade
          // and services list for clients will still show public services.
        }

        // Fetch user data from backend to get actual role
        if (!process.env.NEXT_PUBLIC_API_URL) {
          console.warn("NEXT_PUBLIC_API_URL not configured");
          return;
        }
        
        let userRes;
        try {
          userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/user-stats/`, {
            headers: {
              "Content-Type": "application/json",
              "Authorization": token ? `Bearer ${token}` : ""
            },
            signal: AbortSignal.timeout(10000)
          });
        } catch (fetchError) {
          console.error("Failed to connect to backend. Make sure Django server is running on http://localhost:8000", fetchError);
          return;
        }

        if (userRes.ok) {
          // Role is determined from backend user data
          // Use role from URL, localStorage, or session, but prioritize backend verification
          const roleFromStorage = roleFromUrl || 
            (typeof window !== "undefined" ? localStorage.getItem("npw_role") : null) ||
            session?.role ||
            "customer";
          
          // Normalize role: "client" -> "customer" for backend
          const normalizedRole = roleFromStorage === "client" ? "customer" : roleFromStorage;
          
          if (typeof window !== "undefined") {
            localStorage.setItem("npw_role", normalizedRole);
          }

          // Sync role with backend
          try {
            const syncRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/sync/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: session.user.email,
                username: session.user.name,
                role: normalizedRole,
              }),
            });
            if (!syncRes.ok) {
              console.warn("Role sync failed:", await syncRes.text());
            }
          } catch (syncError) {
            console.warn("Sync error:", syncError);
          }
        }
      } catch (e) {
        console.error("Failed to fetch user role:", e);
      }
    };
    
    if (session?.user?.email) {
      fetchUserRole();
    }
  }, [session?.user?.email, roleFromUrl, router, status]);

  useEffect(() => {
    const fetchStats = async () => {
      const hasLocalToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token");
      if (!session?.user?.email && !hasLocalToken) return;
      setLoadingStats(true);

      try {
        // Use token from localStorage if available, otherwise try session token
        const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null;
        const authHeader = token 
          ? `Bearer ${token}` 
          : session?.accessToken 
          ? `Bearer ${session.accessToken}` 
          : null;

        if (!authHeader) {
          console.warn("No auth token available for stats");
          setLoadingStats(false);
          return;
        }

        if (!process.env.NEXT_PUBLIC_API_URL) {
          console.warn("NEXT_PUBLIC_API_URL not configured");
          setLoadingStats(false);
          return;
        }

        let res;
        try {
          res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/accounts/user-stats/`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
              },
              signal: AbortSignal.timeout(10000)
            }
          );
        } catch (fetchError) {
          // Silently handle connection errors - don't crash the app
          if (fetchError.name === 'AbortError') {
            console.warn("Request timeout - backend server may not be running");
          } else if (fetchError.name === 'TypeError' && fetchError.message?.includes('fetch')) {
            console.warn("Failed to connect to backend. Make sure Django server is running.");
          } else {
            console.warn("Failed to fetch stats", fetchError.message || fetchError);
          }
          setStats({});
          setLoadingStats(false);
          return;
        }
        if (!res.ok) {
          if (res.status === 401) {
            // Token expired, clear it
            if (typeof window !== "undefined") {
              localStorage.removeItem("npw_token");
            }
          }
          // Graceful fallback
          setStats({});
        } else {
        const data = await res.json();
        setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    const hasLocalToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token");
    if (session?.user?.email || hasLocalToken) {
      fetchStats();
    }
  }, [session?.user?.email]); // local token read inside

  useEffect(() => {
    const fetchKycStatus = async () => {
      if (!process.env.NEXT_PUBLIC_API_URL) return;
      const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null;
      if (!token && !session?.user?.email) return;

      try {
        const headers = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        } else if (session?.user?.email) {
          headers["X-User-Email"] = session.user.email;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/kyc/status/`, { 
          headers,
          signal: AbortSignal.timeout(10000)
        });
        if (res.ok) {
          const data = await res.json();
          setKycInfo(data);
        }
      } catch (error) {
        // Silently handle errors - don't crash the app
        if (error.name === 'AbortError') {
          console.warn("Request timeout - backend server may not be running");
        } else if (error.name === 'TypeError' && error.message?.includes('fetch')) {
          console.warn("Failed to connect to backend. Make sure Django server is running.");
        } else {
          console.warn("Failed to load KYC status", error.message || error);
        }
      }
    };

    const fetchProviderEarnings = async () => {
      if (currentRole !== "provider") return;
      if (!process.env.NEXT_PUBLIC_API_URL) return;
      
      const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null;
      if (!token) return;

      setLoadingEarnings(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/provider-earnings/`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          signal: AbortSignal.timeout(10000)
        });
        
        if (res.ok) {
          const data = await res.json();
          setProviderEarnings(data);
        }
      } catch (error) {
        console.error("Failed to fetch provider earnings:", error);
      } finally {
        setLoadingEarnings(false);
      }
    };

    fetchKycStatus();
    fetchProviderEarnings();
  }, [session?.user?.email, currentRole]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null;
      if (!token) return;
      
      try {
        if (!process.env.NEXT_PUBLIC_API_URL) {
          console.warn("NEXT_PUBLIC_API_URL not configured");
          return;
        }
        
        const headers = { "Authorization": `Bearer ${token}` };
        let notifsRes, countRes;
        try {
          [notifsRes, countRes] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/notifications/`, { 
              headers,
              signal: AbortSignal.timeout(10000)
            }),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/notifications/unread-count/`, { 
              headers,
              signal: AbortSignal.timeout(10000)
            })
          ]);
        } catch (fetchError) {
          // Silently handle connection errors - don't crash the app
          if (fetchError.name === 'AbortError') {
            console.warn("Request timeout - backend server may not be running");
          } else if (fetchError.name === 'TypeError' && fetchError.message?.includes('fetch')) {
            console.warn("Failed to connect to backend. Make sure Django server is running.");
          } else {
            console.warn("Failed to fetch notifications", fetchError.message || fetchError);
          }
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        
        if (notifsRes.ok) {
          const notifs = await notifsRes.json();
          setNotifications(Array.isArray(notifs) ? notifs : []);
        }
        if (countRes.ok) {
          const countData = await countRes.json();
          setUnreadCount(countData.unread_count || 0);
        }
      } catch (e) {
        console.error("Failed to fetch notifications", e);
      }
    };
    
    const hasLocalToken = typeof window !== "undefined" && !!localStorage.getItem("npw_token");
    if (session?.user?.email || hasLocalToken) {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.email]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Allow rendering if either session or local token exists
  if (!session && !(typeof window !== "undefined" && localStorage.getItem("npw_token"))) {
    return null;
  }

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("npw_role");
      localStorage.removeItem("npw_token");
      localStorage.removeItem("npw_user_name");
      localStorage.removeItem("npw_user_email");
    }
    signOut({ callbackUrl: "/" });
  };

  // currentRole already computed above

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                NepWork Dashboard
              </h1>
              <span className="ml-3 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {currentRole === "provider"
                  ? "Service Provider"
                  : currentRole === "admin"
                  ? "Admin"
                  : currentRole === "customer" || currentRole === "client"
                  ? "Client"
                  : "Client"}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/role-switch")}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Switch Role
              </Button>
              
              {/* Notifications */}
              <div className="relative notification-dropdown">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto notification-dropdown">
                    <div className="p-3 border-b flex justify-between items-center">
                      <h3 className="font-semibold">Notifications</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null;
                          if (token) {
                            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/notifications/read-all/`, {
                              method: "PATCH",
                              headers: { "Authorization": `Bearer ${token}` }
                            });
                            setUnreadCount(0);
                            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                          }
                        }}
                      >
                        Mark all read
                      </Button>
                    </div>
                    <div className="divide-y">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 hover:bg-gray-50 cursor-pointer ${!notif.is_read ? 'bg-blue-50' : ''}`}
                            onClick={async () => {
                              if (!notif.is_read) {
                                const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null;
                                if (token) {
                                  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/notifications/${notif.id}/read/`, {
                                    method: "PATCH",
                                    headers: { "Authorization": `Bearer ${token}` }
                                  });
                                  setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                                  setUnreadCount(prev => Math.max(0, prev - 1));
                                }
                              }
                              if (notif.related_booking_id) {
                                setActiveTab("bookings");
                                setShowNotifications(false);
                              }
                            }}
                          >
                            <p className="font-medium text-sm">{notif.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notif.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <img
                  src={session?.user?.image || "/logo.png"}
                  alt="Profile"
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  {session?.user?.name || (typeof window !== "undefined" ? localStorage.getItem("npw_user_name") : "")}
                  {kycInfo?.status === "approved" && (
                    <BadgeCheck className="h-4 w-4 text-green-500" title="KYC Verified" />
                  )}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className={`grid w-full ${currentRole === "provider" ? "grid-cols-5" : "grid-cols-4"}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">
              {currentRole === "provider" ? "My Services" : "Services"}
            </TabsTrigger>
            <TabsTrigger value="bookings">
              {currentRole === "provider" ? "Orders" : "Bookings"}
            </TabsTrigger>
            {currentRole === "provider" && (
              <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            )}
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card 
                className={currentRole === "customer" || currentRole === "client" ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                onClick={() => {
                  if (currentRole === "customer" || currentRole === "client") {
                    setShowServicesModal(true);
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {currentRole === "provider"
                      ? "Total Services"
                      : "Services Used"}
                  </CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingStats
                      ? "..."
                      : stats?.[
                          currentRole === "provider"
                            ? "total_services"
                            : "total_bookings"
                        ] || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentRole === "provider"
                      ? "Active services"
                      : currentRole === "customer" || currentRole === "client"
                      ? "Click to view completed services"
                      : "Total bookings"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {currentRole === "provider" ? "Pending Services" : "Active Bookings"}
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingStats
                      ? "..."
                      : currentRole === "provider"
                      ? (stats?.pending_bookings || 0)
                      : (stats?.active_bookings || stats?.confirmed_bookings || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentRole === "provider"
                      ? "Pending orders"
                      : "Current bookings"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {currentRole === "provider" ? "Rating" : "Completed"}
                  </CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingStats
                      ? "..."
                      : currentRole === "provider"
                      ? (stats?.average_rating ? `${stats.average_rating}/5` : "N/A")
                      : (stats?.completed_bookings || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentRole === "provider"
                      ? "Average rating"
                      : "Completed jobs"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Provider Earnings Card */}
            {currentRole === "provider" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Earnings
                    </CardTitle>
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {loadingEarnings 
                        ? "..." 
                        : `Rs. ${providerEarnings?.total_earnings?.toLocaleString() || 0}`
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      After 3% commission deduction ({providerEarnings?.recent_transactions || 0} recent transactions)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Commission Paid
                    </CardTitle>
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {loadingEarnings 
                        ? "..." 
                        : `Rs. ${providerEarnings?.total_commission?.toLocaleString() || 0}`
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total commission paid to platform
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
              {currentRole === "provider" && (
                <>
                  <Button asChild className="w-full">
                    <Link href="/services/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Post New Service
                    </Link>
                  </Button>
                  {kycInfo?.status === "approved" ? (
                    <div className="w-full border border-green-200 bg-green-50 text-green-700 text-sm rounded-md px-4 py-3 flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4" />
                      Profile verified. Thank you!
                    </div>
                  ) : (
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/kyc">
                      <Eye className="h-4 w-4 mr-2" />
                        {kycInfo?.status === "pending" ? "KYC Pending" : "KYC Verification"}
                    </Link>
                  </Button>
                  )}
                </>
              )}
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/services">
                      <Search className="h-4 w-4 mr-2" />
                      Browse Services
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/profile">
                      <Settings className="h-4 w-4 mr-2" />
                      Update Profile
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-medium">
                      {session?.user?.name || (typeof window !== "undefined" ? localStorage.getItem("npw_user_name") : "")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Email:
                    </span>
                    <span className="text-sm font-medium">
                      {session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("npw_user_email") : "")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <span className="text-sm font-medium capitalize">
                      {currentRole}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {currentRole === "provider"
                  ? "My Services"
                  : "Available Services"}
              </h2>
              {currentRole === "provider" && (
                <Button asChild>
                  <Link href="/services/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Link>
                </Button>
              )}
            </div>

            <ServicesList role={currentRole} session={session} />
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <h2 className="text-2xl font-bold">
              {currentRole === "provider" ? "Service Orders" : "My Bookings"}
            </h2>
            <BookingsList role={currentRole} session={session} />
          </TabsContent>
          
          {currentRole === "provider" && (
            <TabsContent value="inquiries" className="space-y-6">
              <ProviderInquiriesList session={session} />
            </TabsContent>
          )}

          <TabsContent value="profile" className="space-y-6">
            <h2 className="text-2xl font-bold">Profile Settings</h2>
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <p className="text-sm text-muted-foreground">
                      {session?.user?.name || (typeof window !== "undefined" ? localStorage.getItem("npw_user_name") : "")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">
                      {session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("npw_user_email") : "")}
                    </p>
                  </div>
                </div>
                <Button variant="outline">Edit Profile</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Services Used Modal */}
      {showServicesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowServicesModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Completed Services</h2>
              <Button variant="outline" onClick={() => setShowServicesModal(false)}>Close</Button>
            </div>
            <BookingsList role={currentRole} session={session} showOnlyCompleted={true} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
