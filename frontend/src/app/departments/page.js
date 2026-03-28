"use client";
import { useState, useEffect } from "react";
import { departmentService } from "@/services/departmentService";
import useAuthStore from "@/store/authStore";
import toast from "react-hot-toast";

export default function DepartmentsPage() {
  const user = useAuthStore((s) => s.user);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    hodName: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data.data);
    } catch {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const resetForm = () => {
    setForm({ name: "", code: "", email: "", phone: "", hodName: "", description: "" });
    setEditingDept(null);
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setForm({
      name: dept.name || "",
      code: dept.code || "",
      email: dept.email || "",
      phone: dept.phone || "",
      hodName: dept.hodName || "",
      description: dept.description || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSubmitting(true);
    try {
      if (editingDept) {
        await departmentService.update(editingDept._id, form);
        toast.success("Department updated successfully");
      } else {
        await departmentService.create(form);
        toast.success("Department created successfully");
      }
      resetForm();
      setShowForm(false);
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 placeholder-[var(--text-secondary)]/40";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Departments</h1>
          <p className="text-[var(--text-secondary)] mt-1">Manage departments and their details</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => {
              if (showForm) { setShowForm(false); resetForm(); }
              else { resetForm(); setShowForm(true); }
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-white text-sm font-semibold tracking-wide shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            {showForm ? "Cancel" : "+ Add Department"}
          </button>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            {editingDept ? `Editing: ${editingDept.name}` : "New Department"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Department Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="e.g. Computer Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Code
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className={inputClass}
                placeholder="e.g. CS"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                placeholder="e.g. cs@university.edu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Phone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
                placeholder="e.g. +91 9876543210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Head of Department
              </label>
              <input
                type="text"
                value={form.hodName}
                onChange={(e) => setForm({ ...form, hodName: e.target.value })}
                className={inputClass}
                placeholder="e.g. Dr. Rajesh Kumar"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputClass}
                placeholder="Brief description of department"
                maxLength={500}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Saving..." : editingDept ? "Update Department" : "Create Department"}
            </button>
            {editingDept && (
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(false); }}
                className="px-6 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      {/* Departments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-16">
          <span className="inline-flex h-14 min-w-14 px-3 rounded-xl border border-[var(--border)] text-sm font-bold tracking-wider items-center justify-center bg-white/70 text-[var(--accent)]">DP</span>
          <p className="text-[var(--text-secondary)] mt-4">No departments yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {departments.map((dept) => (
            <div
              key={dept._id}
              className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 hover:border-[var(--accent)]/30 hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center text-white font-bold text-sm tracking-wide flex-shrink-0">
                  {dept.code || dept.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                        {dept.name}
                      </h3>
                      {dept.code && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 border border-[var(--accent)]/20">
                          {dept.code}
                        </span>
                      )}
                    </div>
                    {isSuperAdmin && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-all">
                        <button
                          onClick={() => handleEdit(dept)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-[var(--accent-hover)] bg-[var(--accent-subtle)] hover:bg-[var(--accent)]/18 transition-all cursor-pointer flex-shrink-0"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to delete ${dept.name}?`)) {
                              try {
                                await departmentService.delete(dept._id);
                                toast.success("Department deleted successfully");
                                fetchDepartments();
                              } catch (err) {
                                toast.error(err.response?.data?.message || "Failed to delete department");
                              }
                            }
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-all cursor-pointer flex-shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  {dept.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
                      {dept.description}
                    </p>
                  )}
                  <div className="mt-3 space-y-1.5">
                    {dept.hodName && (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="inline-flex h-4 min-w-4 px-1 rounded border border-[var(--border)] text-[9px] font-bold items-center justify-center bg-white/60">HD</span>
                        <span>HOD: <span className="text-[var(--text-primary)]">{dept.hodName}</span></span>
                      </div>
                    )}
                    {dept.email && (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="inline-flex h-4 min-w-4 px-1 rounded border border-[var(--border)] text-[9px] font-bold items-center justify-center bg-white/60">EM</span>
                        <span className="text-[var(--text-primary)]">{dept.email}</span>
                      </div>
                    )}
                    {dept.phone && (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="inline-flex h-4 min-w-4 px-1 rounded border border-[var(--border)] text-[9px] font-bold items-center justify-center bg-white/60">PH</span>
                        <span className="text-[var(--text-primary)]">{dept.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
