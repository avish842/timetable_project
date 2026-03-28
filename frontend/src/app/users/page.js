"use client";
import { useState, useEffect } from "react";
import { userService } from "@/services/userService";
import { departmentService } from "@/services/departmentService";
import useAuthStore from "@/store/authStore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function UsersPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "DEPT_ADMIN",
    departmentId: "",
  });

  useEffect(() => {
    // Only SUPER_ADMIN allowed
    if (user && user.role !== "SUPER_ADMIN") {
      toast.error("Unauthorized access");
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        userService.getAll(),
        departmentService.getAll(),
      ]);
      setUsers(usersRes.data.data);
      setDepartments(deptsRes.data.data);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error("Username and password are required");
      return;
    }
    if (form.role === "DEPT_ADMIN" && !form.departmentId) {
      toast.error("Department is required for Department Admins");
      return;
    }

    setSubmitting(true);
    try {
      await userService.create(form);
      toast.success("User created successfully");
      setShowForm(false);
      setForm({ username: "", password: "", role: "DEPT_ADMIN", departmentId: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (targetUser) => {
    if (targetUser._id === user.id) {
      toast.error("You cannot delete yourself");
      return;
    }

    if (window.confirm(`Are you sure you want to delete user "${targetUser.username}"?`)) {
      try {
        await userService.delete(targetUser._id);
        toast.success("User deleted successfully");
        fetchData();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete user");
      }
    }
  };

  if (!user || user.role !== "SUPER_ADMIN") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Users</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage system administrators
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-white text-sm font-semibold tracking-wide shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          {showForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {/* Create User Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 space-y-4 shadow-xl shadow-black/5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Username *
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                placeholder="e.g. jsmith"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Password *
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              >
                <option value="DEPT_ADMIN">Department Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            {form.role === "DEPT_ADMIN" && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Department *
                </label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} {d.code ? `(${d.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Creating..." : "Create User"}
          </button>
        </form>
      )}

      {/* Users List */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[var(--bg-hover)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-secondary)]">
            No users found.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {u.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      u.role === "SUPER_ADMIN" 
                        ? "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/20" 
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    }`}>
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {u.departmentId ? u.departmentId.name : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u._id !== user.id && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
