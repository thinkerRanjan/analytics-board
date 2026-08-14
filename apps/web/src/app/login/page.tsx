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
    <div className="flex min-h-full flex-1 items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-teal-800">
          Analytics Board
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Multi-tenant GA4 dashboards powered by BigQuery.
        </p>

        {error ? (
          <p
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
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
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
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
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-md border border-teal-700 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-900 hover:bg-teal-100"
              >
                Continue with demo data
              </button>
            </form>
          ) : null}

          {!googleEnabled && !demoEnabled ? (
            <p className="text-sm text-slate-600">
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
