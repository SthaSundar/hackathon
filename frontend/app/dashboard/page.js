"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Briefcase,
  Star,
  Calendar,
  CalendarRange,
  Settings,
  Plus,
  LogOut,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Bell,
  BadgeCheck,
  LayoutDashboard,
  Image as ImageIcon,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Home,
  ArrowLeftRight,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ServicesList, BookingsList, ProviderInquiriesList } from "./components";
import { PortfolioList } from "./PortfolioList";
import { Loader2 } from "lucide-react";
import ProviderAvailabilityCalendar from "@/components/ProviderAvailabilityCalendar";
import { getApiBase } from "@/lib/apiBase";

function formatNprAmount(raw) {
  if (raw == null || raw === "") return "0";
  const n = Number(raw);
  if (Number.isFinite(n)) return n.toLocaleString();
  return String(raw);
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");
  const roleFromUrl = searchParams?.get("role");
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [kycInfo, setKycInfo] = useState(null);
  const [providerEarnings, setProviderEarnings] = useState(null);
  const [userData, setUserData] = useState(null);
  const [bookingsRefreshSignal, setBookingsRefreshSignal] = useState(0);
  const [freshnessBusy, setFreshnessBusy] = useState(false);

  const rawRole = roleFromUrl ||
    (typeof window !== "undefined" ? localStorage.getItem("npw_role") : null) ||
    session?.role ||
    "customer";
  const currentRole = rawRole === "client" ? "customer" : rawRole;

  const apiUrl = useMemo(() => getApiBase(), []);

  const refreshUserStats = useCallback(async () => {
    const isBrowser = typeof window !== "undefined";
    const token = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null;
    if (!token) return;
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const statsRes = await fetch(`${apiUrl}/accounts/user-stats/`, { headers });
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error("User stats refresh error:", e);
    }
  }, [apiUrl, session?.accessToken]);

  const overviewStats = useMemo(() => {
    const b = stats?.bookings_count ?? stats?.total_bookings ?? 0;
    if (currentRole === "provider") {
      return [
        { label: "Total orders", value: b, icon: Calendar, color: "bg-blue-500" },
        {
          label: "Active services",
          value: stats?.services_count ?? stats?.total_services ?? 0,
          icon: Briefcase,
          color: "bg-primary",
        },
        {
          label: "Total earnings",
          value: `Rs. ${formatNprAmount(stats?.total_earned)}`,
          icon: Wallet,
          color: "bg-secondary",
        },
      ];
    }
    const active =
      stats?.active_bookings_count ??
      (Number(stats?.pending_bookings ?? 0) + Number(stats?.confirmed_bookings ?? 0));
    return [
      { label: "Total orders", value: b, icon: Calendar, color: "bg-blue-500" },
      { label: "Active bookings", value: active, icon: Clock, color: "bg-primary" },
    ];
  }, [currentRole, stats]);

  useEffect(() => {
    if (currentRole === "admin") {
      router.replace("/admin");
    }
  }, [currentRole, router]);

  useEffect(() => {
    if (status === "loading") return;
    const isBrowser = typeof window !== "undefined";
    const hasLocalToken = isBrowser && !!localStorage.getItem("npw_token");
    const hasSessionToken = !!session?.accessToken;

    if (!session && !hasLocalToken) {
      router.push("/auth/signin");
      return;
    }
    
    const fetchData = async () => {
      try {
        const token = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null;
        
        if (!token) {
          console.warn("No authentication token found. Waiting for session...");
          return;
        }

        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        };

        // If session role is different from localStorage role, sync with backend
        const localRole = isBrowser ? localStorage.getItem("npw_role") : null;
        if (session?.user?.email && localRole && localRole !== session.role) {
          try {
            const syncRes = await fetch(`${apiUrl}/accounts/sync/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: session.user.email,
                role: localRole,
                category: isBrowser ? localStorage.getItem("npw_pending_category") : null
              })
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (syncData.role === localRole) {
                // If synced successfully, we might need to refresh the page or session
                // to reflect the new role in the session object
                console.log("Role synced successfully to", syncData.role);
              }
            }
          } catch (e) {
            console.error("Role sync failed", e);
          }
        }

        await refreshUserStats();

        // Fetch Full User Profile Status
        const userStatusRes = await fetch(`${apiUrl}/accounts/user-status/`, { headers });
        if (userStatusRes.ok) setUserData(await userStatusRes.json());

        // Fetch KYC Status
        const kycRes = await fetch(`${apiUrl}/accounts/kyc/status/`, { headers });
        if (kycRes.ok) setKycInfo(await kycRes.json());

        // Fetch Notifications
        const notifRes = await fetch(`${apiUrl}/accounts/notifications/unread-count/`, { headers });
        if (notifRes.ok) {
          const data = await notifRes.json();
          setUnreadCount(data.unread_count);
        }

        // Fetch Notifications List
        const notifListRes = await fetch(`${apiUrl}/accounts/notifications/`, { headers });
        if (notifListRes.ok) {
          setNotifications(await notifListRes.json());
        }

      } catch (e) {
        console.error("Dashboard data fetch error:", e);
      } finally {
        setLoadingStats(false);
      }
    };
    
    fetchData();
  }, [session, router, status, apiUrl, refreshUserStats]);

  useEffect(() => {
    if (status === "loading") return;
    const tick = async () => {
      await refreshUserStats();
      setBookingsRefreshSignal((n) => n + 1);
    };
    const id = setInterval(tick, 45000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [status, refreshUserStats]);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("npw_token");
      localStorage.removeItem("npw_role");
    }
    signOut({ callbackUrl: "/" });
  };

  const markAllRead = async () => {
    try {
      const isBrowser = typeof window !== "undefined";
      const token = isBrowser ? (localStorage.getItem("npw_token") || session?.accessToken) : null;
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, '');
      
      const res = await fetch(`${apiUrl}/accounts/notifications/read-all/`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (e) {
      console.error("Mark all read failed", e);
    }
  };

  const handleSwitchRole = async (targetRole) => {
    const isBrowser = typeof window !== "undefined";
    const newRole = targetRole || (currentRole === 'provider' ? 'customer' : 'provider');
    
    if (session?.user?.email) {
      try {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, '');
        const syncRes = await fetch(`${apiUrl}/accounts/sync/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: session.user.email,
            role: newRole
          })
        });
        
        if (syncRes.ok) {
          if (isBrowser) {
            localStorage.setItem("npw_role", newRole);
          }
          // Force a full page reload to refresh all states and navigation
          const redirectRole = newRole === 'customer' ? 'client' : newRole;
          window.location.href = `/dashboard?role=${redirectRole}`;
        }
      } catch (e) {
        console.error("Role switch failed", e);
      }
    }
  };

  if (status === "loading" || loadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Header */}
      <div className="bg-white border-b border-primary/10 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="text-primary h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-foreground tracking-tight">Dashboard</h1>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {currentRole === 'provider' ? 'Floriculture Partner' : 'Flower Enthusiast'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {userData?.role === 'admin' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full border-primary/20 text-primary hover:bg-primary/5 font-bold gap-2">
                      <ArrowLeftRight size={14} />
                      Switch Role (Admin)
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl shadow-xl border-primary/10">
                    <DropdownMenuItem onClick={() => handleSwitchRole('customer')} className="rounded-xl font-bold py-3 cursor-pointer">
                      Switch to Client
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSwitchRole('provider')} className="rounded-xl font-bold py-3 cursor-pointer">
                      Switch to Provider
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl font-bold py-3 cursor-pointer text-primary">
                      <Link href="/admin">Go to Admin Panel</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => handleSwitchRole()} variant="outline" size="sm" className="rounded-full border-primary/20 text-primary hover:bg-primary/5 font-bold gap-2">
                  <ArrowLeftRight size={14} />
                  Switch to {currentRole === 'provider' ? 'Client' : 'Provider'}
                </Button>
              )}
              <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-primary/5" title="Back to Home">
                <Link href="/">
                  <Home className="h-5 w-5 text-foreground/70" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-primary/5">
                    <Bell className="h-5 w-5 text-foreground/70" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full ring-2 ring-white" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-4 rounded-[32px] shadow-2xl border-primary/10 bg-white/95 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-black text-foreground tracking-tight">Notifications</h3>
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">{unreadCount} New</span>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="text-center py-10">
                        <Bell className="w-10 h-10 text-primary/10 mx-auto mb-2" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-4 rounded-2xl transition-all border ${n.is_read ? 'bg-transparent border-primary/5 opacity-60' : 'bg-primary/5 border-primary/10 shadow-sm'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.is_read ? 'bg-muted' : 'bg-primary'}`} />
                            <div className="space-y-1">
                              <p className="text-xs font-black text-foreground leading-tight">{n.title}</p>
                              <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">{n.message}</p>
                              <p className="text-[9px] font-bold text-primary/40 uppercase tracking-tighter pt-1">
                                {new Date(n.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <DropdownMenuSeparator className="my-3 bg-primary/5" />
                  <Button 
                    variant="ghost" 
                    className="w-full rounded-xl font-bold text-xs text-primary hover:bg-primary/5 h-10"
                    onClick={markAllRead}
                  >
                    Mark all as read
                  </Button>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full hover:bg-destructive/5 text-destructive">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Sidebar - Navigation */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="rounded-[32px] border-primary/10 shadow-sm overflow-hidden">
              <div className="p-6 bg-primary/5 text-center border-b border-primary/5">
                <div className="w-20 h-20 rounded-3xl bg-white shadow-xl mx-auto mb-4 overflow-hidden border-2 border-white rotate-3">
                  {userData?.image || session?.user?.image ? (
                    <img src={userData?.image || session.user.image} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-black text-2xl">
                      {userData?.name?.[0] || session?.user?.name?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <h2 className="font-black text-foreground">{userData?.name || session?.user?.name || 'User'}</h2>
                <p className="text-xs text-muted-foreground font-medium truncate">{userData?.email || session?.user?.email}</p>
              </div>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {[
                    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                    { id: 'bookings', label: 'Bookings', icon: Calendar },
                    ...(currentRole === 'provider' ? [
                      { id: 'services', label: 'My Services', icon: Briefcase },
                      { id: 'portfolio', label: 'My Portfolio', icon: ImageIcon },
                      { id: 'availability', label: 'Availability', icon: CalendarRange },
                    ] : []),
                    { id: 'settings', label: 'Settings', icon: Settings },
                    { id: 'home', label: 'Back to Home', icon: Home, href: '/' },
                  ].map((item) => (
                    item.href ? (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all"
                      >
                        <item.icon size={18} />
                        {item.label}
                      </Link>
                    ) : (
                      <button
                        key={item.id}
                        onClick={item.onClick || (() => setActiveTab(item.id))}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                          activeTab === item.id 
                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                            : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                        }`}
                      >
                        <item.icon size={18} />
                        {item.label}
                      </button>
                    )
                  ))}
                </nav>
              </CardContent>
            </Card>

            {/* KYC Status Card */}
            {kycInfo && (
              <Card className={`rounded-[32px] border-none shadow-sm overflow-hidden ${
                kycInfo.status === 'approved' ? 'bg-secondary/10' : 'bg-yellow-50'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-xl ${
                      kycInfo.status === 'approved' ? 'bg-secondary/20 text-secondary-foreground' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {kycInfo.status === 'approved' ? <ShieldCheck size={20} /> : <RefreshCw size={20} className="animate-spin-slow" />}
                    </div>
                    <span className="font-black text-sm uppercase tracking-wider">Verification</span>
                  </div>
                  <p className="text-xs font-bold mb-4">
                    {kycInfo.status === 'approved' 
                      ? 'Your account is fully verified and trusted.' 
                      : 'We are currently reviewing your documents.'}
                  </p>
                  {kycInfo.status !== 'approved' && (
                    <Button asChild variant="link" className="p-0 h-auto text-xs font-black text-primary uppercase tracking-tighter">
                      <Link href="/kyc">Check Status <ChevronRight size={14} /></Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-8">
            
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Stats Grid */}
                <div className={`grid grid-cols-1 gap-6 ${overviewStats.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                  {overviewStats.map((stat, i) => (
                    <Card key={i} className="rounded-[32px] border-primary/10 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500">
                      <CardContent className="p-8">
                        <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                          <stat.icon size={24} />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-black text-foreground">{stat.value}</h3>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Recent Activity */}
                <Card className="rounded-[40px] border-primary/10 shadow-sm overflow-hidden">
                  <CardHeader className="p-8 border-b border-primary/5 bg-primary/5">
                    <CardTitle className="text-2xl font-black tracking-tight">Recent Activity</CardTitle>
                    <CardDescription className="font-medium">Stay updated with your latest business movements</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <BookingsList role={currentRole} session={session} refreshSignal={bookingsRefreshSignal} />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'bookings' && (
              <Card className="rounded-[40px] border-primary/10 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="p-8 border-b border-primary/5 bg-primary/5 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black tracking-tight">My Bookings</CardTitle>
                    <CardDescription className="font-medium">Manage your service requests and orders</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <BookingsList role={currentRole} session={session} refreshSignal={bookingsRefreshSignal} />
                </CardContent>
              </Card>
            )}

            {activeTab === 'services' && currentRole === 'provider' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center px-4">
                  <h2 className="text-2xl font-black tracking-tight">Service Listings</h2>
                  <Button asChild className="rounded-full px-6 font-black shadow-lg shadow-primary/20">
                    <Link href="/services/new"><Plus className="mr-2 h-5 w-5" /> New Service</Link>
                  </Button>
                </div>
                <ServicesList role={currentRole} session={session} />
              </div>
            )}

            {activeTab === 'portfolio' && currentRole === 'provider' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center px-4">
                  <h2 className="text-2xl font-black tracking-tight">My Portfolio</h2>
                </div>
                <PortfolioList />
              </div>
            )}

            {activeTab === 'availability' && currentRole === 'provider' && (
              <Card className="rounded-[40px] border-primary/10 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="p-8 border-b border-primary/5 bg-primary/5">
                  <CardTitle className="text-2xl font-black tracking-tight">Mark unavailable dates</CardTitle>
                  <CardDescription className="font-medium">
                    Clients see these days blocked when booking your services.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  {userData?.id ? (
                    <ProviderAvailabilityCalendar
                      providerId={userData.id}
                      editable
                      getToken={() =>
                        (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) ||
                        session?.accessToken
                      }
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">Loading profile…</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'settings' && (
              <Card className="rounded-[40px] border-primary/10 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="p-8 border-b border-primary/5 bg-primary/5">
                  <CardTitle className="text-2xl font-black tracking-tight">Account Settings</CardTitle>
                  <CardDescription className="font-medium">Manage your profile and platform preferences</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  {currentRole === "provider" && userData?.id && (
                    <div className="rounded-[28px] border border-primary/15 bg-card p-6 space-y-4">
                      <div>
                        <p className="font-black text-foreground">Fresh flowers guarantee</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Show a “Fresh guaranteed” badge on your profile and listings. Turn this on only if you commit to fresh product on every order.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          How it works: after delivery, clients can submit a freshness report on that booking. Data lives in{" "}
                          <code className="text-xs bg-muted px-1 rounded">FreshnessReport</code> (linked to the booking, client,
                          and you). Admins review pending reports; if one is confirmed, your{" "}
                          <code className="text-xs bg-muted px-1 rounded">freshness_violations</code> count on your account goes up
                          and the guarantee is switched off. Two confirmed violations lock this option.
                        </p>
                      </div>
                      {(userData.freshness_violations ?? 0) > 0 && (userData.freshness_violations ?? 0) < 2 && (
                        <p className="text-sm font-semibold text-amber-800">
                          Confirmed violations on record: {userData.freshness_violations}. One more confirmed report locks the
                          guarantee.
                        </p>
                      )}
                      {(userData.freshness_violations ?? 0) >= 2 ? (
                        <p className="text-sm text-destructive font-semibold">
                          This option is locked after repeated confirmed violations.
                        </p>
                      ) : (
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-primary/30"
                            checked={!!userData.freshness_guarantee}
                            disabled={freshnessBusy}
                            onChange={async () => {
                              const api = getApiBase();
                              const token =
                                (typeof window !== "undefined" ? localStorage.getItem("npw_token") : null) ||
                                session?.accessToken;
                              if (!token) return;
                              setFreshnessBusy(true);
                              try {
                                const res = await fetch(
                                  `${api}/accounts/providers/${userData.id}/freshness-guarantee/`,
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ enabled: !userData.freshness_guarantee }),
                                  }
                                );
                                if (res.ok) {
                                  const st = await fetch(`${api}/accounts/user-status/`, {
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  if (st.ok) setUserData(await st.json());
                                }
                              } finally {
                                setFreshnessBusy(false);
                              }
                            }}
                          />
                          <span className="text-sm font-bold text-foreground">
                            Offer freshness guarantee on bookings
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                  <div className="text-center py-12 bg-muted/20 rounded-[32px] border-2 border-dashed border-primary/10">
                    <Settings className="w-12 h-12 text-primary/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-bold">More profile settings coming in Phase 2.</p>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
