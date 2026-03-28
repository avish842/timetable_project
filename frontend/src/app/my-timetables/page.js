"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { timetableService } from "@/services/timetableService";
import useAuthStore from "@/store/authStore";
import toast from "react-hot-toast";

export default function MyTimetablesPage() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function fetchMine() {
      try {
        const res = await timetableService.getMine();
        setItems(res.data.data || []);
      } catch {
        toast.error("Failed to load your timetables");
      } finally {
        setLoading(false);
      }
    }

    if (user?.role === "SUPER_ADMIN") {
      fetchMine();
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Timetables</h1>
        <p className="text-[var(--text-secondary)] mt-2">
          This page is available only for super admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">My Timetables</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Timetables created by your account
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-40 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl">
          <span className="inline-flex h-14 min-w-14 px-3 rounded-xl border border-[var(--border)] text-sm font-bold tracking-wider items-center justify-center bg-white/70 text-[var(--accent)]">
            TT
          </span>
          <p className="text-[var(--text-secondary)] mt-4">No timetables created yet</p>
          <Link
            href="/timetable-builder"
            className="inline-flex mt-5 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
          >
            Create Timetable
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((tt) => (
            <div
              key={tt._id}
              className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 hover:border-[var(--accent)]/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{tt.roomName}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Created: {new Date(tt.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
                  {tt.daysCount} days
                </span>
              </div>

              <div className="mt-4 space-y-1 text-sm text-[var(--text-secondary)]">
                <p>Periods/Day: {tt.periodsPerDay}</p>
                <p>Duration: {tt.periodDuration} min</p>
                <p>Start Time: {tt.startTime}</p>
                {tt.roomCapacity ? <p>Room Capacity: {tt.roomCapacity}</p> : null}
              </div>

              <Link
                href={`/timetable/${tt.roomId}`}
                className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-[var(--accent-hover)] hover:text-[var(--accent)]"
              >
                Open Timetable →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
