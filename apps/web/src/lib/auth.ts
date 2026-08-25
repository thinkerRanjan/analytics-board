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

function resolveEmailFromAuth(
  user?: { email?: string | null } | null,
  profile?: { email?: string | null } | null,
  tokenEmail?: string | null,
): string | null {
  const email = user?.email ?? profile?.email ?? tokenEmail ?? null;
  return email?.trim().toLowerCase() ?? null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, profile }) {
      const email = resolveEmailFromAuth(user, profile);
      const tenants = resolveTenantsForEmail(email);
      return tenants.length > 0;
    },
    async jwt({ token, user, profile }) {
      const email = resolveEmailFromAuth(user, profile, token.email as string);
      if (email) {
        const tenants = resolveTenantsForEmail(email);
        token.email = email;
        token.name = user?.name ?? token.name;
        const picture =
          user?.image ??
          (typeof profile === "object" &&
          profile &&
          "picture" in profile &&
          typeof profile.picture === "string"
            ? profile.picture
            : undefined);
        if (picture) token.picture = picture;
        token.tenantIds = tenants.map((t) => t.id);
        token.tenantId = pickDefaultTenantId(tenants);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image =
          (typeof token.picture === "string" ? token.picture : null) ??
          session.user.image;
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
