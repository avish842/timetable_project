"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { roomService } from "@/services/roomService";
import { timetableService } from "@/services/timetableService";
import { to12Hour } from "@/utils/timeFormat";
import useAuthStore from "@/store/authStore";
import toast from "react-hot-toast";

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetableBuilderPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [roomStatusMap, setRoomStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [form, setForm] = useState({
    roomId: "",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    periodsPerDay: 6,
    startTime: "09:00",
    periodDuration: 60,
  });

  useEffect(() => {
    async function fetchRooms() {
      try {
        const [roomsRes, statusRes] = await Promise.all([
          roomService.getAll(),
          timetableService.getRoomStatus(),
        ]);

        const roomsData = roomsRes.data.data || [];
        const statusData = statusRes.data.data || [];

        setRooms(roomsData);
        setRoomStatusMap(
          statusData.reduce((acc, row) => {
            acc[row.roomId] = row;
            return acc;
          }, {})
        );
      } catch {
        toast.error("Failed to load rooms");
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, []);

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.roomId) {
      toast.error("Please select a room");
      return;
    }
    if (form.days.length === 0) {
      toast.error("Please select at least one day");
      return;
    }

    setSubmitting(true);
    try {
      await timetableService.create(form);
      toast.success("Timetable created successfully!");
      router.push(`/timetable/${form.roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create timetable");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.error("Only super admin can import timetables");
      return;
    }
    if (!form.roomId) {
      toast.error("Please select a room");
      return;
    }
    if (!importFile) {
      toast.error("Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("roomId", form.roomId);
    formData.append("file", importFile);

    setImporting(true);
    try {
      const res = await timetableService.importFromExcel(formData);
      const summary = res.data?.data;
      const cleared = summary?.teacherClearedCount || 0;
      const skipped = summary?.skippedCellsCount || 0;
      if (cleared > 0 || skipped > 0) {
        toast.success(
          `Imported ${summary?.slotsUpdated || 0} slots. Cleared teacher in ${cleared} slot(s), skipped ${skipped} out-of-structure cell(s).`
        );
      } else {
        toast.success(
          `Imported ${summary?.slotsUpdated || 0} slots from ${summary?.rowsProcessed || 0} day rows`
        );
      }
      router.push(`/timetable/${form.roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to import timetable");
    } finally {
      setImporting(false);
    }
  };

  // Preview periods
  const previewPeriods = () => {
    const periods = [];
    const [hours, minutes] = form.startTime.split(":").map(Number);
    let current = hours * 60 + minutes;

    for (let i = 1; i <= form.periodsPerDay; i++) {
      const startH = String(Math.floor(current / 60)).padStart(2, "0");
      const startM = String(current % 60).padStart(2, "0");
      const endTotal = current + form.periodDuration;
      const endH = String(Math.floor(endTotal / 60)).padStart(2, "0");
      const endM = String(endTotal % 60).padStart(2, "0");
      periods.push({
        number: i,
        time: `${to12Hour(`${startH}:${startM}`)} – ${to12Hour(`${endH}:${endM}`)}`,
      });
      current = endTotal;
    }
    return periods;
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Timetable Builder</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Create a new timetable for a room
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Room Selection */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Select Room
          </h2>
          {loading ? (
            <div className="h-12 rounded-xl bg-[var(--bg-hover)] animate-pulse" />
          ) : (
            <select
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 cursor-pointer"
            >
              <option value="">Choose a room...</option>
              {rooms.map((room) => (
                <option key={room._id} value={room._id}>
                  {room.name} {room.capacity ? `(${room.capacity} seats)` : ""}
                  {roomStatusMap[room._id]?.hasTimetable ? " - Timetable exists" : ""}
                </option>
              ))}
            </select>
          )}
          {form.roomId && roomStatusMap[form.roomId]?.hasTimetable && (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm text-amber-600">
                Selected room already has a timetable. Creating or importing again will be blocked until existing timetable is deleted.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/timetable/${form.roomId}`)}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Open Existing Timetable
              </button>
            </div>
          )}
        </div>

        {isSuperAdmin && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Import From Excel
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Upload an exported timetable Excel file to auto-create timetable structure and slot assignments.
            </p>

            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full md:w-auto block text-sm text-[var(--text-secondary)] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent)]/15 file:text-[var(--accent-hover)] hover:file:bg-[var(--accent)]/25"
              />
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="px-5 py-2.5 rounded-xl bg-emerald-500/90 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all disabled:opacity-60 cursor-pointer"
              >
                {importing ? "Importing..." : "Upload Excel & Create"}
              </button>
            </div>
          </div>
        )}

        {/* Days */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Select Days
          </h2>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  form.days.includes(day)
                    ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25"
                    : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/30"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Time Config */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Time Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                Periods per Day
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={form.periodsPerDay}
                onChange={(e) => setForm({ ...form, periodsPerDay: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="10"
                max="180"
                value={form.periodDuration}
                onChange={(e) => setForm({ ...form, periodDuration: parseInt(e.target.value) || 60 })}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Period Preview
          </h2>
          <div className="flex flex-wrap gap-2">
            {previewPeriods().map((p) => (
              <div
                key={p.number}
                className="px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-xs"
              >
                <span className="font-semibold text-[var(--accent-hover)]">P{p.number}</span>
                <span className="text-[var(--text-secondary)] ml-2">{p.time}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-white font-semibold tracking-wide text-sm shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
        >
          {submitting ? "Creating Timetable..." : "Create Timetable"}
        </button>
      </form>
    </div>
  );
}
