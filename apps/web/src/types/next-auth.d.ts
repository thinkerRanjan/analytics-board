import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    tenantId: string | null;
    tenantIds: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string | null;
    tenantIds?: string[];
  }
}
