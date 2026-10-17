import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { requireAdmin, AuthError } from "@/lib/auth-server";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let account;
  try { account = await requireAdmin(); }
  catch (error) {
    if (error instanceof AuthError) redirect("/login");
    return <main style={{ padding: 40 }}><h1>Connect the dashboard</h1><p>The server needs Firebase Admin credentials for the same project as the mobile app.</p><a href="/login">Return to sign in</a></main>;
  }
  const email = account.email ?? "";
  const name = (typeof account.name === "string" ? account.name.trim() : "") || email.split("@")[0] || "Administrator";
  return <Shell admin={{ name, email }}>{children}</Shell>;
}

