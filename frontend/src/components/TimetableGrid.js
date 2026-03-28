"use client";
import { useState } from "react";
import useAuthStore from "@/store/authStore";
import SlotModal from "./SlotModal";
import { to12Hour } from "@/utils/timeFormat";

// Color palette for departments
const DEPT_COLORS = [
  { bg: "bg-indigo-500/15", border: "border-indigo-500/30", text: "text-indigo-300" },
  { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-300" },
  { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-300" },
  { bg: "bg-pink-500/15", border: "border-pink-500/30", text: "text-pink-300" },
  { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-300" },
  { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-300" },
  { bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-300" },
  { bg: "bg-teal-500/15", border: "border-teal-500/30", text: "text-teal-300" },
];

export default function TimetableGrid({
  timetable,
  slots,
  onRefresh,
  filterDeptId,
}) {
  const user = useAuthStore((s) => s.user);
  const [selectedSlot, setSelectedSlot] = useState(null);

  if (!timetable) return null;

  const { days, generatedPeriods } = timetable;

  // Build a lookup for quick slot access
  const slotMap = {};
  slots.forEach((slot) => {
    const key = `${slot.day}-${slot.periodNumber}`;
    slotMap[key] = slot;
  });

  // Build color map for departments
  const deptColorMap = {};
  let colorIdx = 0;
  slots.forEach((s) => {
    const deptId = s.departmentId?._id || s.departmentId;
    if (deptId && !deptColorMap[deptId]) {
      deptColorMap[deptId] = DEPT_COLORS[colorIdx % DEPT_COLORS.length];
      colorIdx++;
    }
  });

  const canEditSlot = (slot) => {
    if (user?.role === "SUPER_ADMIN") return true;
    if (user?.role === "DEPT_ADMIN") {
      const deptId = slot.departmentId?._id || slot.departmentId;
      if (!deptId) return false;
      return deptId === user.departmentId;
    }
    return false;
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--bg-secondary)] px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border)] min-w-[100px]">
                Day
              </th>
              {generatedPeriods.map((period) => (
                <th
                  key={period.periodNumber}
                  className="px-3 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border)] min-w-[140px]"
                >
                  <div className="text-[var(--accent-hover)]">Period {period.periodNumber}</div>
                  <div className="text-[10px] mt-0.5 font-normal">
                    {to12Hour(period.startTime)} – {to12Hour(period.endTime)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day} className="group">
                <td className="sticky left-0 z-10 bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border)]">
                  {day}
                </td>
                {generatedPeriods.map((period) => {
                  const key = `${day}-${period.periodNumber}`;
                  const slot = slotMap[key];
                  const isEmpty = !slot?.subject && !slot?.teacher && !slot?.departmentId;
                  const deptId = slot?.departmentId?._id || slot?.departmentId;
                  const colors = deptId ? deptColorMap[deptId] : null;
                  const editable = slot ? canEditSlot(slot) : false;

                  // Filter check
                  if (filterDeptId && deptId && deptId !== filterDeptId) {
                    return (
                      <td
                        key={key}
                        className="px-2 py-2 border-b border-[var(--border)]"
                      >
                        <div className="h-20 rounded-xl bg-[var(--bg-primary)]/30 border border-[var(--border)]/50 opacity-30" />
                      </td>
                    );
                  }

                  return (
                    <td
                      key={key}
                      className="px-2 py-2 border-b border-[var(--border)]"
                    >
                      <button
                        onClick={() => slot && setSelectedSlot(slot)}
                        disabled={!slot}
                        className={`w-full h-20 rounded-xl border p-2.5 text-left transition-all duration-200 cursor-pointer ${
                          isEmpty
                            ? "bg-[var(--bg-primary)]/50 border-[var(--border)]/50 hover:border-indigo-500/30 hover:bg-[var(--accent-subtle)]"
                            : `${colors?.bg || "bg-[var(--bg-primary)]"} ${colors?.border || "border-[var(--border)]"} hover:scale-[1.02] shadow-sm`
                        } ${!editable ? "opacity-60" : ""} disabled:cursor-default`}
                      >
                        {!isEmpty && (
                          <div className="h-full flex flex-col justify-between">
                            <div>
                              {slot.departmentId?.name && (
                                <p className={`text-[10px] font-semibold uppercase tracking-wider ${colors?.text || "text-[var(--text-secondary)]"}`}>
                                  {slot.departmentId.name}
                                </p>
                              )}
                              {slot.subject && (
                                <p className="text-xs font-medium text-[var(--text-primary)] mt-0.5 truncate">
                                  {slot.subject}
                                </p>
                              )}
                            </div>
                            {slot.teacher && (
                              <p className="text-[10px] text-[var(--text-secondary)] truncate">
                                👤 {slot.teacher}
                              </p>
                            )}
                            {!editable && (
                              <span className="absolute top-1.5 right-1.5 text-[10px] opacity-50">🔒</span>
                            )}
                          </div>
                        )}
                        {isEmpty && (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-[var(--text-secondary)]/30 text-xs">+</span>
                          </div>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slot Edit Modal */}
      {selectedSlot && (
        <SlotModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSaved={() => {
            setSelectedSlot(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
