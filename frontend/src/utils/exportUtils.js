import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { to12Hour } from "./timeFormat";

/**
 * Export timetable as PDF.
 */
export function exportToPDF({ timetable, slots, roomName }) {
  const doc = new jsPDF({ orientation: "landscape" });
  const { days, generatedPeriods } = timetable;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Timetable — ${roomName}`, 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${days.length} days • ${generatedPeriods.length} periods • ${timetable.periodDuration} min each`,
    14,
    26
  );

  // Build slot lookup
  const slotMap = {};
  slots.forEach((s) => {
    slotMap[`${s.day}-${s.periodNumber}`] = s;
  });

  // Table headers
  const headers = [
    "Day",
    ...generatedPeriods.map(
      (p) => `P${p.periodNumber}\n${to12Hour(p.startTime)} - ${to12Hour(p.endTime)}`
    ),
  ];

  // Table rows
  const body = days.map((day) => [
    day,
    ...generatedPeriods.map((p) => {
      const slot = slotMap[`${day}-${p.periodNumber}`];
      if (!slot || (!slot.subject && !slot.teacher && !slot.departmentId)) return "";
      const parts = [];
      if (slot.departmentId?.name) parts.push(slot.departmentId.name);
      if (slot.subject) parts.push(slot.subject);
      if (slot.teacher) parts.push(slot.teacher);
      return parts.join("\n");
    }),
  ]);

  autoTable(doc, {
    head: [headers],
    body,
    startY: 32,
    theme: "grid",
    headStyles: {
      fillColor: [99, 102, 241],
      fontSize: 7,
      cellPadding: 3,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 3,
      valign: "middle",
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 25 },
    },
    styles: {
      overflow: "linebreak",
      lineWidth: 0.3,
    },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} • Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`Timetable_${roomName.replace(/\s+/g, "_")}.pdf`);
}

/**
 * Export timetable as Excel (.xlsx).
 */
export function exportToExcel({ timetable, slots, roomName }) {
  const { days, generatedPeriods } = timetable;

  // Build slot lookup
  const slotMap = {};
  slots.forEach((s) => {
    slotMap[`${s.day}-${s.periodNumber}`] = s;
  });

  // Header row
  const headers = [
    "Day",
    ...generatedPeriods.map(
      (p) => `Period ${p.periodNumber} (${to12Hour(p.startTime)} - ${to12Hour(p.endTime)})`
    ),
  ];

  // Data rows
  const data = days.map((day) => [
    day,
    ...generatedPeriods.map((p) => {
      const slot = slotMap[`${day}-${p.periodNumber}`];
      if (!slot || (!slot.subject && !slot.teacher && !slot.departmentId)) return "";
      const parts = [];
      if (slot.departmentId?.name) parts.push(slot.departmentId.name);
      if (slot.subject) parts.push(slot.subject);
      if (slot.teacher) parts.push(slot.teacher);
      return parts.join(" | ");
    }),
  ]);

  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-size columns
  ws["!cols"] = headers.map((h, i) => ({
    wch: i === 0 ? 14 : Math.max(h.length, 20),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Timetable");
  XLSX.writeFile(wb, `Timetable_${roomName.replace(/\s+/g, "_")}.xlsx`);
}
