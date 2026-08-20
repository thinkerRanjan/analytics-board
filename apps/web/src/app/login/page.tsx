import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/dashboard";
  const error = params.error;
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  const demoEnabled = process.env.USE_MOCK_DATA === "true";

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="surface-card w-full max-w-md p-8">
        <div className="flex items-center gap-3">
          <span className="shell-brand-mark">AB</span>
          <div>
            <p className="text-sm font-semibold text-foreground">Analytics Board</p>
            <p className="text-xs text-muted">GA4 · BigQuery</p>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-muted">
          Multi-tenant GA4 dashboards powered by BigQuery.
        </p>

        {error ? (
          <p
            className="mt-4 rounded-md border border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-3 py-2 text-sm text-accent"
            role="alert"
          >
            {error === "AccessDenied"
              ? "Your account is not assigned to any client."
              : "Sign-in failed. Try again."}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          {googleEnabled ? (
            <form
              action={async () => {
                "use server";
                try {
                  await signIn("google", { redirectTo: callbackUrl });
                } catch (err) {
                  if (err instanceof AuthError) {
                    redirect(`/login?error=${err.type}`);
                  }
                  throw err;
                }
              }}
            >
              <button type="submit" className="btn-accent w-full">
                Continue with Google
              </button>
            </form>
          ) : null}

          {demoEnabled ? (
            <form
              action={async () => {
                "use server";
                try {
                  await signIn("demo", { redirectTo: callbackUrl });
                } catch (err) {
                  if (err instanceof AuthError) {
                    redirect(`/login?error=${err.type}`);
                  }
                  throw err;
                }
              }}
            >
              <button type="submit" className="btn-outline w-full">
                Continue with demo data
              </button>
            </form>
          ) : null}

          {!googleEnabled && !demoEnabled ? (
            <p className="text-sm text-muted">
              Configure <code className="text-xs">AUTH_GOOGLE_ID</code> and{" "}
              <code className="text-xs">AUTH_GOOGLE_SECRET</code>, or set{" "}
              <code className="text-xs">USE_MOCK_DATA=true</code> for demo login.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
