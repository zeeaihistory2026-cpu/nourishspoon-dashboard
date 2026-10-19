import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { requireAdmin, AuthError } from "@/lib/auth-server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Local UI development bypass — never active in production builds.
  if (process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "1") {
    return <Shell admin={{ name: "Tayyaba", email: "dev@localhost", role: "admin" }}>{children}</Shell>;
  }

  // Never let a session-check failure become a 500: log it and fall through
  // to the login redirect, which is the correct unauthenticated behaviour.
  try {
    const session = await requireAdmin();
    const email = (session.email ?? "") as string;
    return (
      <Shell
        admin={{ name: session.displayName, email, role: session.role }}
      >
        {children}
      </Shell>
    );
  } catch (err) {
    if (err instanceof AuthError) {
      console.error("[admin layout] not authorized, redirecting to login:", err.message);
    } else {
      console.error("[admin layout] session check failed, redirecting to login:", err);
    }
    redirect("/login");
  }
}
