import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth-server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Local UI development bypass — never active in production builds.
  if (process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "1") {
    return <Shell admin={{ name: "Ayesha Khan", email: "dev@localhost" }}>{children}</Shell>;
  }

  const session = await getSession();
  if (!session) redirect("/login");

  const email = (session.email ?? "") as string;
  const name =
    ((session.name as string | undefined) ?? "").trim() ||
    email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "Admin";

  return <Shell admin={{ name, email }}>{children}</Shell>;
}
