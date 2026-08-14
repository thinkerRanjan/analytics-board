import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import {
  pickDefaultTenantId,
  resolveTenantsForEmail,
} from "@analytics/backend";

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (process.env.USE_MOCK_DATA === "true") {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: {},
      async authorize() {
        return {
          id: "demo",
          name: "Demo User",
          email: "demo@analytics.local",
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      const tenants = resolveTenantsForEmail(user.email);
      return tenants.length > 0;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const tenants = resolveTenantsForEmail(user.email);
        token.email = user.email;
        token.name = user.name;
        token.tenantIds = tenants.map((t) => t.id);
        token.tenantId = pickDefaultTenantId(tenants);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      session.tenantId = (token.tenantId as string | null) ?? null;
      session.tenantIds = (token.tenantIds as string[]) ?? [];
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
});
