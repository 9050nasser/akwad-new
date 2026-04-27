"use client";

import { useCallback, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { GhostButton } from "@/components/ui-fields";
import { downloadTextFile, rootTablesToCsv, sanitizeReportFilename } from "@/lib/report-export-csv";

type ReportExportToolbarProps = {
  fileSlug: string;
  /** للوصولية فقط */
  reportTitle: string;
};

export function ReportExportToolbar({ fileSlug, reportTitle }: ReportExportToolbarProps) {
  const [busy, setBusy] = useState<null | "pdf">(null);

  const baseName = sanitizeReportFilename(fileSlug);

  const onPrint = useCallback(() => {
    window.print();
  }, []);

  const onExcel = useCallback(() => {
    const root = document.getElementById("report-export-root");
    if (!root) return;
    const csv = rootTablesToCsv(root);
    if (!csv.trim()) {
      window.alert("لا توجد جداول للتصدير في هذا التقرير.");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`${baseName}_${stamp}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  }, [baseName]);

  const onPdf = useCallback(async () => {
    const root = document.getElementById("report-export-root");
    if (!root) return;
    setBusy("pdf");
    try {
      const canvas = await html2canvas(root, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const w = canvas.width;
      const h = canvas.height;
      const margin = 40;
      const pdf = new jsPDF({
        unit: "px",
        format: [w + margin * 2, h + margin * 2],
        orientation: h >= w ? "p" : "l",
        compress: true,
      });
      pdf.addImage(imgData, "JPEG", margin, margin, w, h);
      const stamp = new Date().toISOString().slice(0, 10);
      pdf.save(`${baseName}_${stamp}.pdf`);
    } catch (e) {
      console.error(e);
      window.alert("تعذر إنشاء ملف PDF. جرّب الطباعة ثم «حفظ كـ PDF» من المتصفح.");
    } finally {
      setBusy(null);
    }
  }, [baseName]);

  return (
    <div
      className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-sm"
      aria-label={`تصدير: ${reportTitle}`}
    >
      <span className="me-1 text-xs font-semibold text-slate-600">تصدير</span>
      <GhostButton type="button" className="!px-3 !py-1.5 text-xs font-semibold" onClick={onPrint}>
        طباعة
      </GhostButton>
      <GhostButton type="button" className="!px-3 !py-1.5 text-xs font-semibold" onClick={onExcel}>
        Excel (CSV)
      </GhostButton>
      <GhostButton
        type="button"
        className="!px-3 !py-1.5 text-xs font-semibold"
        onClick={() => void onPdf()}
        disabled={busy === "pdf"}
      >
        {busy === "pdf" ? "جاري PDF…" : "PDF"}
      </GhostButton>
    </div>
  );
}
