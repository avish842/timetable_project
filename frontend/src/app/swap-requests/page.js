"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import useAuthStore from "@/store/authStore";
import { roomService } from "@/services/roomService";
import { timetableService } from "@/services/timetableService";
import { swapService } from "@/services/swapService";

const statusClasses = {
  PENDING_TARGET: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  PENDING_ADMIN: "bg-sky-500/15 border-sky-500/30 text-sky-300",
  COMPLETED: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  REJECTED: "bg-rose-500/15 border-rose-500/30 text-rose-300",
  CANCELLED: "bg-slate-500/15 border-slate-500/30 text-slate-300",
};

const slotLabel = (slot) => {
  const teacher = slot.teacher || "No Teacher";
  const dept = slot.departmentName ? ` - ${slot.departmentName}` : "";
  const subject = slot.subject ? ` - ${slot.subject}` : "";
  return `${slot.day} P${slot.periodNumber} - ${teacher}${dept}${subject}`;
};

export default function SwapRequestsPage() {
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [timetableOptions, setTimetableOptions] = useState([]);
  const [eligibleSlots, setEligibleSlots] = useState([]);
  const [form, setForm] = useState({
    timetableId: "",
    sourceSlotId: "",
    targetSlotId: "",
    reason: "",
  });

  const sourceOptions = useMemo(
    () => eligibleSlots.filter((slot) => slot.canBeSource),
    [eligibleSlots]
  );

  const targetOptions = useMemo(
    () =>
      eligibleSlots.filter(
        (slot) => slot.canBeTarget && slot._id !== form.sourceSlotId
      ),
    [eligibleSlots, form.sourceSlotId]
  );

  const fetchRequests = async () => {
    const res = await swapService.getAll();
    setRequests(res.data.data || []);
  };

  const fetchTimetableOptions = async () => {
    const roomsRes = await roomService.getAll();
    const allRooms = roomsRes.data.data || [];

    let allowedRoomIds = null;
    if (user?.role === "DEPT_ADMIN") {
      const idsRes = await timetableService.getMyDepartmentRoomIds();
      allowedRoomIds = new Set(idsRes.data.data || []);
    }

    const candidateRooms =
      user?.role === "DEPT_ADMIN"
        ? allRooms.filter((r) => allowedRoomIds.has(r._id))
        : allRooms;

    const results = await Promise.all(
      candidateRooms.map((room) =>
        timetableService
          .getByRoom(room._id)
          .then((resp) => ({ room, timetable: resp.data.data }))
          .catch(() => null)
      )
    );

    const options = results
      .filter(Boolean)
      .map((x) => ({
        timetableId: x.timetable._id,
        roomId: x.room._id,
        roomName: x.room.name,
      }));

    setTimetableOptions(options);
  };

  const loadInitial = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchRequests(), fetchTimetableOptions()]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load swap data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (!form.timetableId) {
      setEligibleSlots([]);
      setForm((prev) => ({ ...prev, sourceSlotId: "", targetSlotId: "" }));
      return;
    }

    let active = true;
    const loadSlots = async () => {
      try {
        const res = await swapService.getEligibleSlots(form.timetableId);
        if (!active) return;
        setEligibleSlots(res.data.data || []);
        setForm((prev) => ({ ...prev, sourceSlotId: "", targetSlotId: "" }));
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load eligible slots");
      }
    };

    loadSlots();
    return () => {
      active = false;
    };
  }, [form.timetableId]);

  const createRequest = async (e) => {
    e.preventDefault();
    if (!form.sourceSlotId || !form.targetSlotId) {
      toast.error("Select both source and target slots");
      return;
    }

    try {
      setSubmitting(true);
      await swapService.create({
        sourceSlotId: form.sourceSlotId,
        targetSlotId: form.targetSlotId,
        reason: form.reason,
      });
      toast.success("Swap request created");
      setForm((prev) => ({ ...prev, sourceSlotId: "", targetSlotId: "", reason: "" }));
      await fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create swap request");
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (actionFn, successMessage) => {
    try {
      await actionFn();
      toast.success(successMessage);
      await fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded-lg bg-[var(--bg-card)] animate-pulse" />
        <div className="h-48 rounded-2xl bg-[var(--bg-card)] animate-pulse" />
        <div className="h-72 rounded-2xl bg-[var(--bg-card)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Class Swap Requests</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Teachers can request swaps, target side approves, then super admin finalizes.
        </p>
      </div>

      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Create Swap Request
        </h2>

        {timetableOptions.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No available timetables found for creating swap requests.
          </p>
        ) : (
          <form onSubmit={createRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Timetable</label>
              <select
                value={form.timetableId}
                onChange={(e) => setForm((prev) => ({ ...prev, timetableId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm"
              >
                <option value="">Select timetable</option>
                {timetableOptions.map((opt) => (
                  <option key={opt.timetableId} value={opt.timetableId}>
                    {opt.roomName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Source Slot (Your Slot)</label>
              <select
                value={form.sourceSlotId}
                onChange={(e) => setForm((prev) => ({ ...prev, sourceSlotId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm"
                disabled={!form.timetableId}
              >
                <option value="">Select source slot</option>
                {sourceOptions.map((slot) => (
                  <option key={slot._id} value={slot._id}>
                    {slotLabel(slot)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Target Slot</label>
              <select
                value={form.targetSlotId}
                onChange={(e) => setForm((prev) => ({ ...prev, targetSlotId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm"
                disabled={!form.sourceSlotId}
              >
                <option value="">Select target slot</option>
                {targetOptions.map((slot) => (
                  <option key={slot._id} value={slot._id}>
                    {slotLabel(slot)}
                  </option>
                ))}
              </select>
              {form.sourceSlotId && targetOptions.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">
                  No other assigned slots available as target in this timetable.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Reason (optional)</label>
              <textarea
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                maxLength={500}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm"
                placeholder="Reason for swap request"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? "Creating..." : "Submit Swap Request"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Requests
        </h2>

        {requests.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No swap requests yet.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req._id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-[var(--text-primary)] font-semibold">
                    {req.sourceSnapshot.teacher} ⇄ {req.targetSnapshot.teacher}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${statusClasses[req.status] || ""}`}
                  >
                    {req.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="mt-2 text-xs text-[var(--text-secondary)] space-y-1">
                  <p>
                    Source: {req.sourceSnapshot.roomName} • {req.sourceSnapshot.day} P{req.sourceSnapshot.periodNumber} • {req.sourceSnapshot.subject || "-"}
                  </p>
                  <p>
                    Target: {req.targetSnapshot.roomName} • {req.targetSnapshot.day} P{req.targetSnapshot.periodNumber} • {req.targetSnapshot.subject || "-"}
                  </p>
                  {req.reason && <p>Reason: {req.reason}</p>}
                  {req.rejectionReason && <p>Rejection: {req.rejectionReason}</p>}
                  {req.cancelReason && <p>Cancel reason: {req.cancelReason}</p>}
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  {req.permissions?.canTargetApprove && (
                    <>
                      <button
                        onClick={() => runAction(() => swapService.targetApprove(req._id), "Target approved")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-semibold"
                      >
                        Target Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = window.prompt("Reason for rejection (optional)") || "";
                          runAction(
                            () => swapService.targetReject(req._id, reason),
                            "Request rejected"
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-semibold"
                      >
                        Target Reject
                      </button>
                    </>
                  )}

                  {req.permissions?.canAdminFinalize && (
                    <>
                      <button
                        onClick={() => {
                          const note = window.prompt("Admin note (optional)") || "";
                          runAction(
                            () => swapService.adminFinalize(req._id, note),
                            "Swap finalized"
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/25 text-sky-300 text-xs font-semibold"
                      >
                        Finalize Swap
                      </button>
                      <button
                        onClick={() => {
                          const reason = window.prompt("Reason for rejection") || "";
                          runAction(
                            () => swapService.adminReject(req._id, reason),
                            "Rejected by admin"
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-semibold"
                      >
                        Admin Reject
                      </button>
                    </>
                  )}

                  {req.permissions?.canCancel && (
                    <button
                      onClick={() => {
                        const reason = window.prompt("Cancel reason (optional)") || "";
                        runAction(() => swapService.cancel(req._id, reason), "Request cancelled");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-500/15 border border-slate-500/25 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
