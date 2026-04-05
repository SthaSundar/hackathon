import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        }
      }
    }),
  ],
  callbacks: {
    // Called whenever a user signs in
    async signIn({ user, account }) {
      try {
        // Sync user with backend (role will be set from backend or default to customer)
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/sync/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            username: user.name,
          }),
        });
      } catch (err) {
        console.error("Failed to sync user with Django:", err);
      }

      return true; // allow sign-in
    },

    // Add JWT custom fields
    async jwt({ token, user, account }) {
      if (account && user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        
        // Exchange Google login info for a backend-signed JWT
        try {
          const tokenRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts/token-by-email/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email }),
          });
          if (tokenRes.ok) {
            const data = await tokenRes.json();
            // Use role and JWT from backend database
            token.role = data.user?.role || "customer";
            token.backendToken = data.token;
          } else {
            // Fallback: only check admin email if backend fails
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
            token.role = token.email && adminEmail && token.email === adminEmail ? "admin" : "customer";
          }
        } catch (err) {
          console.error("Failed to get role from backend:", err);
          // Fallback: only check admin email if backend fails
          const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
          token.role = token.email && adminEmail && token.email === adminEmail ? "admin" : "customer";
        }
      }
      return token;
    },

    // Add custom fields to session object
    async session({ session, token }) {
      session.accessToken = token.backendToken;
      session.role = token.role || "customer";
      session.user = {
        email: token.email,
        name: token.name,
        image: token.picture,
      };
      return session;
    },

    // Redirect after login
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
