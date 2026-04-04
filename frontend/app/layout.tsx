'use client'
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth-provider";
import Navigation from "@/components/navigation";
import { usePathname } from "next/navigation";
import Footer from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const hideNav = pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin");
  return (
    <html lang="en" suppressHydrationWarning>
          <body className={inter.className}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AuthProvider>
                {!hideNav && <Navigation />}
                {children}
                <Footer />
                <Toaster />
              </AuthProvider>
            </ThemeProvider>
          </body>
        </html>
  );
}
