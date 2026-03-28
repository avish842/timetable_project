"use client";
import { useState, useEffect } from "react";
import useAuthStore from "@/store/authStore";
import { departmentService } from "@/services/departmentService";
import { slotService } from "@/services/slotService";
import toast from "react-hot-toast";

export default function SlotModal({ slot, onClose, onSaved }) {
  const user = useAuthStore((s) => s.user);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    departmentId: slot?.departmentId?._id || slot?.departmentId || "",
    subject: slot?.subject || "",
    teacher: slot?.teacher || "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchDepts() {
      try {
        const res = await departmentService.getAll();
        setDepartments(res.data.data);
      } catch {
        // silent
      }
    }
    fetchDepts();
  }, []);

  // Determine if user can edit
  const canEdit = () => {
    if (user?.role === "SUPER_ADMIN") return true;
    if (user?.role === "DEPT_ADMIN") {
      const slotDeptId = slot?.departmentId?._id || slot?.departmentId;
      if (!slotDeptId) return false; // unassigned can only be assigned by super admin
      return slotDeptId === user.departmentId;
    }
    return false;
  };

  const editable = canEdit();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await slotService.update(slot._id, {
        departmentId: form.departmentId || null,
        subject: form.subject,
        teacher: form.teacher,
      });
      toast.success("Slot updated successfully");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update slot");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {editable ? "Edit Slot" : "View Slot"}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {slot.day} • Period {slot.periodNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!editable && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
              <span>🔒</span>
              <span>Only SUPER_ADMIN can assign empty slots. Department admin can edit only own assigned slots.</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Department
            </label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              disabled={!editable || user?.role === "DEPT_ADMIN"}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">No department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Subject
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              disabled={!editable}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g. Data Structures"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Teacher
            </label>
            <input
              type="text"
              value={form.teacher}
              onChange={(e) => setForm({ ...form, teacher: e.target.value })}
              disabled={!editable}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g. Dr. Smith"
            />
          </div>

          {editable && (
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
