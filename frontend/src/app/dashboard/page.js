"use client";
import { useState, useEffect } from "react";
import useAuthStore from "@/store/authStore";
import { roomService } from "@/services/roomService";
import { departmentService } from "@/services/departmentService";
import Link from "next/link";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState({ rooms: 0, departments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [roomsRes, deptsRes] = await Promise.all([
          roomService.getAll(),
          departmentService.getAll(),
        ]);
        setStats({
          rooms: roomsRes.data.data.length,
          departments: deptsRes.data.data.length,
        });
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Rooms",
      value: stats.rooms,
      icon: "RM",
      gradient: "from-[var(--accent)] to-sky-800",
      shadow: "shadow-[var(--accent)]/20",
    },
    {
      title: "Departments",
      value: stats.departments,
      icon: "DP",
      gradient: "from-amber-700 to-amber-900",
      shadow: "shadow-amber-900/20",
    },
    {
      title: "Your Role",
      value: user?.role === "SUPER_ADMIN" ? "Super Admin" : "Dept Admin",
      icon: "RL",
      gradient: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/20",
      isText: true,
    },
  ];

  const quickLinks =
    user?.role === "SUPER_ADMIN"
      ? [
          { label: "Manage Rooms", href: "/rooms", icon: "🏠", desc: "Add and manage rooms" },
          { label: "Manage Departments", href: "/departments", icon: "🏢", desc: "Add departments" },
          { label: "Build Timetable", href: "/timetable-builder", icon: "🛠️", desc: "Create timetables" },
          { label: "My Timetables", href: "/my-timetables", icon: "📚", desc: "View timetables you created" },
          { label: "Swap Requests", href: "/swap-requests", icon: "🔁", desc: "Review and finalize class swaps" },
        ]
      : [
          { label: "View Timetables", href: "/rooms", icon: "📅", desc: "View room timetables" },
          { label: "Swap Requests", href: "/swap-requests", icon: "🔁", desc: "Request and track class swaps" },
        ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Overview of your timetable management system
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className={`relative overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-lg ${card.shadow} hover:-translate-y-0.5 transition-all duration-300`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-gradient-to-br ${card.gradient} opacity-12`} />
            <div className="relative">
              <span className="inline-flex h-8 min-w-8 px-2 rounded-md border border-[var(--border)] text-[11px] font-bold tracking-wider items-center justify-center bg-white/70">{card.icon}</span>
              <p className="text-sm text-[var(--text-secondary)] mt-3 font-medium">{card.title}</p>
              {loading && !card.isText ? (
                <div className="h-9 w-20 rounded-lg bg-[var(--bg-hover)] animate-pulse mt-1" />
              ) : (
                <p className={`font-bold mt-1 ${card.isText ? "text-xl" : "text-3xl"} text-[var(--text-primary)]`}>
                  {card.value}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-4 p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent-subtle)] hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="inline-flex h-9 min-w-9 px-2 rounded-md border border-[var(--border)] text-[11px] font-bold tracking-wider items-center justify-center bg-white/70 group-hover:border-[var(--accent)]/30 transition-transform">
                {link.icon}
              </span>
              <div>
                <p className="font-medium text-[var(--text-primary)] text-sm">{link.label}</p>
                <p className="text-xs text-[var(--text-secondary)]">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Account Settings / Change Password */}
      <div className="pt-4 border-t border-[var(--border)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Account Security</h2>
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 max-w-md">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const currentPassword = formData.get("currentPassword");
              const newPassword = formData.get("newPassword");
              const confirmPassword = formData.get("confirmPassword");

              if (newPassword !== confirmPassword) {
                toast.error("New passwords do not match!");
                return;
              }

              try {
                const { authService } = await import("@/services/authService");
                const toast = await import("react-hot-toast").then(m => m.default);
                await authService.changePassword({ currentPassword, newPassword });
                toast.success("Password changed successfully!");
                e.target.reset();
              } catch (err) {
                const toast = await import("react-hot-toast").then(m => m.default);
                toast.error(err.response?.data?.message || "Failed to change password");
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent-hover)] text-sm font-semibold tracking-wide cursor-pointer w-full text-[var(--text-secondary)]"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
