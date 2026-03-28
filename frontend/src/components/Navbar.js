"use client";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore";

export default function Navbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <header className="h-16 bg-[var(--bg-secondary)]/90 backdrop-blur-xl border-b border-[var(--border)] flex items-center justify-end lg:justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm">
      <div className="hidden lg:block">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
          Welcome back, <span className="text-[var(--accent-hover)]">{user.username}</span>
        </h2>
      </div>
      <div className="flex items-center gap-3 lg:gap-4">
        <span className="px-2.5 py-1 lg:px-3 lg:py-1 rounded-full text-[10px] lg:text-xs font-semibold bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
          {user.role === "SUPER_ADMIN" ? "Super Admin" : "Dept Admin"}
        </span>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs lg:text-sm font-semibold text-[var(--text-secondary)] hover:text-[#9f1d1d] hover:bg-red-500/10 hover:border-red-500/30 border border-transparent cursor-pointer"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
