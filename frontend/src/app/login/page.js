"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore";
import { authService } from "@/services/authService";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login(username, password);
      const { token, user } = res.data.data;
      login(user, token);
      toast.success(`Welcome back, ${user.username}!`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-[-12%] w-[52%] h-[10rem] rotate-[-10deg] bg-[var(--accent)]/12" />
        <div className="absolute bottom-[-3rem] right-[-10%] w-[48%] h-[9rem] rotate-[8deg] bg-[var(--accent)]/10" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.65)_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] shadow-lg shadow-[var(--accent)]/20 mb-4">
            <span className="text-white text-2xl font-bold">TM</span>
          </div>
          <h1 className="text-[1.85rem] font-bold text-[var(--text-primary)] leading-tight tracking-tight">
            Timetable Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--bg-secondary)] rounded-2xl p-8 border border-[var(--border)] shadow-xl shadow-slate-900/10"
        >
          <div className="mb-5 pb-4 border-b border-[var(--border)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Access Portal</p>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition-all text-sm"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition-all text-sm"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-white font-semibold text-sm tracking-wide shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 hover:scale-[1.01] active:scale-[0.99] duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "SIGN IN"
            )}
          </button>

          <div className="mt-6 pt-5 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-secondary)] text-center">
              Demo credentials
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                onClick={() => { setUsername("superadmin"); setPassword("admin123"); }}
                className="px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--accent-hover)] hover:border-[var(--accent)]/30 transition-all cursor-pointer"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => { setUsername("cs_admin"); setPassword("dept123"); }}
                className="px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--accent-hover)] hover:border-[var(--accent)]/30 transition-all cursor-pointer"
              >
                Dept Admin
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
