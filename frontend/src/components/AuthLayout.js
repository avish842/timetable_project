"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import useAuthStore from "@/store/authStore";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

const emptySubscribe = () => () => {};

export default function AuthLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!mounted) return;
    if (pathname === "/login") return;

    if (!token || !user) {
      router.push("/login");
    }
  }, [mounted, token, user, pathname, router]);

  // Login page - no layout
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Not mounted yet — render nothing to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  // Not authenticated
  if (!token || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-4 md:p-8 pt-16 lg:pt-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
