"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuthStore from "@/store/authStore";
import { useState } from "react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["SUPER_ADMIN", "DEPT_ADMIN"],
  },
  {
    label: "Rooms",
    href: "/rooms",
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Departments",
    href: "/departments",
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Users",
    href: "/users",
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Create Timetable",
    href: "/timetable-builder",
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "My Timetables",
    href: "/my-timetables",
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Swap Requests",
    href: "/swap-requests",
    roles: ["SUPER_ADMIN", "DEPT_ADMIN"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <>
      {/* Mobile Menu Button - visible only on sm/md screens */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-3 left-4 z-50 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] shadow-md"
      >
        {isOpen ? "✖️" : "☰"}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - sliding on mobile, fixed on desktop */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col z-40 transition-transform duration-300 ease-in-out shadow-xl shadow-black/5 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-[var(--border)] mt-12 lg:mt-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center text-white font-bold text-sm">
              TM
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
                Timetable
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">
                Management
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p className="px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
            Menu
          </p>
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)] shadow-sm border border-[var(--accent)]/20"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center text-white text-xs font-bold">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {user.username}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {user.role === "SUPER_ADMIN" ? "Super Admin" : "Dept Admin"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
