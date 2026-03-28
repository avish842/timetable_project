"use client";
import { useState, useEffect } from "react";
import { roomService } from "@/services/roomService";
import { timetableService } from "@/services/timetableService";
import useAuthStore from "@/store/authStore";
import Link from "next/link";
import toast from "react-hot-toast";

export default function RoomsPage() {
  const user = useAuthStore((s) => s.user);
  const [rooms, setRooms] = useState([]);
  const [departmentRoomIds, setDepartmentRoomIds] = useState([]);
  const [deptFilterMode, setDeptFilterMode] = useState("my-department");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRooms = async () => {
    try {
      const roomsReq = roomService.getAll();
      const deptRoomsReq =
        user?.role === "DEPT_ADMIN" ? timetableService.getMyDepartmentRoomIds() : null;

      const [roomsRes, deptRoomsRes] = await Promise.all([roomsReq, deptRoomsReq]);
      setRooms(roomsRes.data.data || []);
      setDepartmentRoomIds(deptRoomsRes?.data?.data || []);
    } catch {
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.role) return;
    fetchRooms();
  }, [user?.role]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Room name is required");
      return;
    }
    setSubmitting(true);
    try {
      await roomService.create({
        name: name.trim(),
        capacity: capacity ? parseInt(capacity) : null,
      });
      toast.success("Room created successfully");
      setName("");
      setCapacity("");
      setShowForm(false);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create room");
    } finally {
      setSubmitting(false);
    }
  };

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isDeptAdmin = user?.role === "DEPT_ADMIN";

  const visibleRooms =
    isDeptAdmin && deptFilterMode === "my-department"
      ? rooms.filter((room) => departmentRoomIds.includes(room._id))
      : rooms;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Rooms</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage rooms and view their timetables
          </p>
        </div>
        {isDeptAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">Filter:</span>
            <select
              value={deptFilterMode}
              onChange={(e) => setDeptFilterMode(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)]"
            >
              <option value="my-department">My Department Timetables</option>
              <option value="all">All Rooms</option>
            </select>
          </div>
        )}
        {isSuperAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-white text-sm font-semibold tracking-wide shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            {showForm ? "Cancel" : "+ Add Room"}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Room Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                placeholder="e.g. Room 101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Capacity
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                placeholder="e.g. 60"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Creating..." : "Create Room"}
          </button>
        </form>
      )}

      {/* Rooms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : visibleRooms.length === 0 ? (
        <div className="text-center py-16">
          <span className="inline-flex h-14 min-w-14 px-3 rounded-xl border border-[var(--border)] text-sm font-bold tracking-wider items-center justify-center bg-white/70 text-[var(--accent)]">RM</span>
          <p className="text-[var(--text-secondary)] mt-4">
            {isDeptAdmin && deptFilterMode === "my-department"
              ? "No timetable contains your department yet"
              : "No rooms yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleRooms.map((room) => (
            <div
              key={room._id}
              className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 hover:border-[var(--accent)]/30 hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {room.name}
                  </h3>
                  {room.capacity && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      Capacity: {room.capacity}
                    </p>
                  )}
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      if (window.confirm(`Delete ${room.name} and ALL its associated timetables?\nThis cannot be undone.`)) {
                        try {
                          await roomService.delete(room._id);
                          toast.success("Room deleted successfully");
                          fetchRooms();
                        } catch (err) {
                          toast.error(err.response?.data?.message || "Failed to delete room");
                        }
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-all cursor-pointer flex-shrink-0"
                  >
                    Delete
                  </button>
                )}
              </div>
              <Link
                href={`/timetable/${room._id}`}
                className="inline-flex items-center gap-1 mt-4 text-sm text-[var(--accent-hover)] hover:text-[var(--accent)] font-semibold transition-colors"
              >
                View Timetable →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
