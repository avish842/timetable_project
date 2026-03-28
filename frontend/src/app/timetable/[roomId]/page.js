"use client";
import { useState, useEffect, use } from "react";
import { timetableService } from "@/services/timetableService";
import { slotService } from "@/services/slotService";
import { departmentService } from "@/services/departmentService";
import { exportToPDF, exportToExcel } from "@/utils/exportUtils";
import TimetableGrid from "@/components/TimetableGrid";
import Link from "next/link";
import toast from "react-hot-toast";
import useAuthStore from "@/store/authStore";

export default function TimetableViewPage({ params }) {
  const { roomId } = use(params);
  const user = useAuthStore((s) => s.user);
  const [timetable, setTimetable] = useState(null);
  const [slots, setSlots] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterDeptId, setFilterDeptId] = useState("");
  const [loading, setLoading] = useState(true);
  const [noTimetable, setNoTimetable] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);

  const fetchData = async () => {
    try {
      const [ttRes, deptRes] = await Promise.all([
        timetableService.getByRoom(roomId),
        departmentService.getAll(),
      ]);
      const tt = ttRes.data.data;
      setTimetable(tt);
      setDepartments(deptRes.data.data);

      const slotsRes = await slotService.getByTimetable(tt._id);
      setSlots(slotsRes.data.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setNoTimetable(true);
      } else {
        toast.error("Failed to load timetable");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [roomId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-60 rounded-lg bg-[var(--bg-card)] animate-pulse" />
        <div className="h-96 rounded-2xl bg-[var(--bg-card)] animate-pulse" />
      </div>
    );
  }

  if (noTimetable) {
    return (
      <div className="text-center py-20">
        <span className="inline-flex h-16 min-w-16 px-3 rounded-xl border border-[var(--border)] text-sm font-bold tracking-wider items-center justify-center bg-white/70 text-[var(--accent)]">TT</span>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mt-6">
          No Timetable Found
        </h2>
        <p className="text-[var(--text-secondary)] mt-2">
          This room doesn&apos;t have a timetable yet.
        </p>
        <Link
          href="/timetable-builder"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-white text-sm font-semibold tracking-wide shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 hover:scale-[1.01] transition-all"
        >
          Create Timetable
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/rooms"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← Rooms
            </Link>
            <span className="text-[var(--text-secondary)]">/</span>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {timetable.roomId?.name || "Room"}
            </h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {timetable.days?.length} days • {timetable.periodsPerDay} periods •{" "}
            {timetable.periodDuration} min each
          </p>
        </div>

        {/* Department Filter + Export */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterDeptId}
            onChange={(e) => setFilterDeptId(e.target.value)}
            className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const roomName = timetable.roomId?.name || "Room";
              exportToPDF({ timetable, slots, roomName });
              toast.success("PDF downloaded!");
            }}
            className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all cursor-pointer"
          >
            PDF
          </button>
          <button
            onClick={() => {
              const roomName = timetable.roomId?.name || "Room";
              exportToExcel({ timetable, slots, roomName });
              toast.success("Excel downloaded!");
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all cursor-pointer"
          >
            Excel
          </button>

          {user?.role === "SUPER_ADMIN" && (
            <button
              onClick={async () => {
                try {
                  setSendingEmails(true);
                  const res = await timetableService.sendDepartmentEmails(timetable._id);
                  const payload = res.data?.data || {};
                  toast.success(
                    `Email sent to ${payload.sentCount || 0} department(s)` +
                      ((payload.failedCount || 0) > 0
                        ? `, failed for ${payload.failedCount}`
                        : "")
                  );
                } catch (err) {
                  toast.error(err.response?.data?.message || "Failed to send department emails");
                } finally {
                  setSendingEmails(false);
                }
              }}
              disabled={sendingEmails}
              className="px-4 py-2 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-300 text-sm font-medium hover:bg-sky-500/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendingEmails ? "Sending..." : "Send Email To Included Departments"}
            </button>
          )}
          
          {user?.role === "SUPER_ADMIN" && (
            <button
              onClick={async () => {
                if (window.confirm("Are you sure you want to delete this timetable and all its assigned slots?")) {
                  try {
                    await timetableService.delete(timetable._id);
                    toast.success("Timetable deleted successfully");
                    window.location.href = "/rooms";
                  } catch (err) {
                    toast.error(err.response?.data?.message || "Failed to delete timetable");
                  }
                }
              }}
              className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 shadow-lg shadow-red-500/25 ml-2 transition-all cursor-pointer"
            >
              Delete Timetable
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <TimetableGrid
            timetable={timetable}
            slots={slots}
            onRefresh={fetchData}
            filterDeptId={filterDeptId}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[var(--bg-primary)] border border-[var(--border)]" />
          <span>Empty</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-indigo-500/20 border border-indigo-500/30" />
          <span>Assigned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-3 min-w-3 px-1 rounded border border-[var(--border)] text-[8px] font-bold items-center justify-center bg-white/60">LK</span>
          <span>Restricted</span>
        </div>
      </div>
    </div>
  );
}
