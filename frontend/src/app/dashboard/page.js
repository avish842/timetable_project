"use client";
import { useState, useEffect } from "react";
import useAuthStore from "@/store/authStore";
import { roomService } from "@/services/roomService";
import { departmentService } from "@/services/departmentService";
import { analyticsService } from "@/services/analyticsService";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

/* ─── colour helpers ─── */
const utilColor = (v) =>
  v >= 70 ? "#22c55e" : v >= 40 ? "#f59e0b" : "#ef4444";

const DEPT_COLORS = [
  "#6366f1", "#06b6d4", "#f59e0b", "#ef4444", "#22c55e",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

/* ─── custom recharts tooltip ─── */
function ChartTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-2 shadow-lg text-sm">
      <p className="font-semibold text-[var(--text-primary)]">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="mt-0.5">
          {p.name}: <span className="font-bold">{p.value}{suffix}</span>
        </p>
      ))}
    </div>
  );
}

/* ─── stat card ─── */
function StatCard({ title, value, icon, gradient, loading, isText }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-gradient-to-br ${gradient} opacity-12`} />
      <div className="relative">
        <span className="inline-flex h-8 min-w-8 px-2 rounded-md border border-[var(--border)] text-[11px] font-bold tracking-wider items-center justify-center bg-white/70">
          {icon}
        </span>
        <p className="text-sm text-[var(--text-secondary)] mt-3 font-medium">{title}</p>
        {loading && !isText ? (
          <div className="h-9 w-20 rounded-lg bg-[var(--bg-hover)] animate-pulse mt-1" />
        ) : (
          <p className={`font-bold mt-1 ${isText ? "text-xl" : "text-3xl"} text-[var(--text-primary)]`}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── chart card wrapper ─── */
function ChartCard({ title, subtitle, children, isEmpty }) {
  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-lg">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        {subtitle && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {isEmpty ? (
        <div className="flex items-center justify-center h-48 text-[var(--text-secondary)] text-sm">
          No data available yet
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/* ─── pie label ─── */
const renderPieLabel = ({ name, percent }) =>
  `${name} (${(percent * 100).toFixed(0)}%)`;

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [stats, setStats] = useState({ rooms: 0, departments: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  /* fetch basic stats (all users) */
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

  /* fetch analytics (super admin only) */
  useEffect(() => {
    if (!isSuperAdmin) {
      setAnalyticsLoading(false);
      return;
    }
    async function fetchAnalytics() {
      try {
        const res = await analyticsService.getDashboard();
        setAnalytics(res.data.data);
      } catch {
        // silently fail
      } finally {
        setAnalyticsLoading(false);
      }
    }
    fetchAnalytics();
  }, [isSuperAdmin]);

  /* ── stat cards ── */
  const statCards = isSuperAdmin
    ? [
        {
          title: "Total Rooms",
          value: analytics?.summary?.rooms ?? stats.rooms,
          icon: "🏠",
          gradient: "from-[var(--accent)] to-sky-800",
        },
        {
          title: "Departments",
          value: analytics?.summary?.departments ?? stats.departments,
          icon: "🏢",
          gradient: "from-amber-700 to-amber-900",
        },
        {
          title: "Timetables",
          value: analytics?.summary?.timetables ?? "—",
          icon: "📅",
          gradient: "from-violet-500 to-purple-700",
        },
        {
          title: "Overall Fill Rate",
          value: analytics ? `${analytics.summary.overallFillRate}%` : "—",
          icon: "📊",
          gradient: "from-emerald-500 to-teal-600",
          isText: true,
        },
        {
          title: "Unique Teachers",
          value: analytics?.summary?.uniqueTeachers ?? "—",
          icon: "👩‍🏫",
          gradient: "from-pink-500 to-rose-600",
        },
        {
          title: "Pending Swaps",
          value: analytics?.summary?.pendingSwaps ?? "—",
          icon: "🔁",
          gradient: "from-orange-500 to-red-600",
        },
      ]
    : [
        {
          title: "Total Rooms",
          value: stats.rooms,
          icon: "🏠",
          gradient: "from-[var(--accent)] to-sky-800",
        },
        {
          title: "Departments",
          value: stats.departments,
          icon: "🏢",
          gradient: "from-amber-700 to-amber-900",
        },
        {
          title: "Your Role",
          value: "Dept Admin",
          icon: "🔐",
          gradient: "from-emerald-500 to-teal-600",
          isText: true,
        },
      ];

  /* ── quick links ── */
  const quickLinks =
    isSuperAdmin
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

  /* ── chart data ── */
  const roomData = analytics?.roomUtilization ?? [];
  const teacherData = analytics?.teacherWorkload ?? [];
  const deptData = analytics?.departmentDistribution ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          {isSuperAdmin
            ? "Analytics overview of your timetable management system"
            : "Overview of your timetable management system"}
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className={`grid gap-5 ${isSuperAdmin ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" : "grid-cols-1 md:grid-cols-3"}`}>
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            gradient={card.gradient}
            loading={isSuperAdmin ? analyticsLoading : loading}
            isText={card.isText}
          />
        ))}
      </div>

      {/* ── Charts (SUPER_ADMIN only) ── */}
      {isSuperAdmin && (
        <>
          {analyticsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-lg ${i === 1 ? "lg:col-span-2" : ""}`}>
                  <div className="h-5 w-40 rounded bg-[var(--bg-hover)] animate-pulse mb-4" />
                  <div className="h-64 rounded-xl bg-[var(--bg-hover)] animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ── Room Utilization (full width) ── */}
              <ChartCard
                title="Room Utilization"
                subtitle="Percentage of slots filled per room"
                isEmpty={!roomData.length}
              >
                <div style={{ width: "100%", height: Math.max(200, roomData.length * 44) }}>
                  <ResponsiveContainer>
                    <BarChart data={roomData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} unit="%" />
                      <YAxis
                        type="category"
                        dataKey="roomName"
                        width={100}
                        tick={{ fontSize: 12, fill: "var(--text-primary)" }}
                      />
                      <Tooltip content={<ChartTooltip suffix="%" />} />
                      <Bar dataKey="utilization" name="Utilization" radius={[0, 6, 6, 0]} barSize={24}>
                        {roomData.map((entry, i) => (
                          <Cell key={i} fill={utilColor(entry.utilization)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* ── Department Distribution (pie) ── */}
              <ChartCard
                title="Department Distribution"
                subtitle="Slot share per department"
                isEmpty={!deptData.length}
              >
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={deptData}
                        dataKey="slotCount"
                        nameKey="departmentName"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={3}
                        label={renderPieLabel}
                        labelLine={{ stroke: "var(--text-secondary)", strokeWidth: 1 }}
                      >
                        {deptData.map((_, i) => (
                          <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0];
                          return (
                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-2 shadow-lg text-sm">
                              <p className="font-semibold" style={{ color: d.payload.fill }}>{d.name}</p>
                              <p className="text-[var(--text-primary)]">{d.value} slots</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* ── Teacher Workload (full width) ── */}
              <ChartCard
                title="Teacher Workload"
                subtitle="Total periods assigned per teacher (top 20)"
                isEmpty={!teacherData.length}
              >
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={teacherData} margin={{ left: 10, right: 20, top: 5, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="teacher"
                        tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                        label={{ value: "Periods", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "var(--text-secondary)" } }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="totalPeriods" name="Periods" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={28}>
                        {teacherData.map((_, i) => (
                          <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* ── Swap Requests summary ── */}
              <ChartCard
                title="Swap Requests"
                subtitle="Current status breakdown"
                isEmpty={!analytics?.summary}
              >
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
                      <span className="text-sm text-[var(--text-primary)]">Pending</span>
                    </div>
                    <span className="text-2xl font-bold text-[var(--text-primary)]">{analytics?.summary?.pendingSwaps ?? 0}</span>
                  </div>
                  <div className="h-px bg-[var(--border)]" />
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
                      <span className="text-sm text-[var(--text-primary)]">Completed</span>
                    </div>
                    <span className="text-2xl font-bold text-[var(--text-primary)]">{analytics?.summary?.completedSwaps ?? 0}</span>
                  </div>
                </div>
              </ChartCard>
            </div>
          )}
        </>
      )}

      {/* ── Quick Actions ── */}
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

      {/* ── Account Security / Change Password ── */}
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
                const toast = (await import("react-hot-toast")).default;
                toast.error("New passwords do not match!");
                return;
              }

              try {
                const { authService } = await import("@/services/authService");
                const toast = (await import("react-hot-toast")).default;
                await authService.changePassword({ currentPassword, newPassword });
                toast.success("Password changed successfully!");
                e.target.reset();
              } catch (err) {
                const toast = (await import("react-hot-toast")).default;
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
