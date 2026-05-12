"use client";

import { useState } from "react";
// استدعي الـ Action اللي عملناها في الخطوة اللي فاتت
import { fetchOldAttendanceLogs } from "@/app/actions/devices"; 

interface Device {
  serialNumber: string;
  name: string;
}

export default function PullOldLogsForm({ devices }: { devices: Device[] }) {
  const [deviceSn, setDeviceSn] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    if (!deviceSn || !startDate || !endDate) {
      setMessage({ type: "error", text: "الرجاء تعبئة جميع الحقول" });
      setIsLoading(false);
      return;
    }

    // تحويل صيغة التاريخ من HTML (YYYY-MM-DDTHH:MM) 
    // إلى الصيغة اللي بيفهمها جهاز البصمة (YYYY-MM-DD HH:MM:SS)
    const formattedStart = startDate.replace("T", " ") + ":00";
    const formattedEnd = endDate.replace("T", " ") + ":59";

    try {
      const result = await fetchOldAttendanceLogs(deviceSn, formattedStart, formattedEnd);
      
      if (result.success) {
        setMessage({ type: "success", text: result.message || "تم إرسال الأمر بنجاح" });
        // تفريغ الحقول بعد النجاح
        setStartDate("");
        setEndDate("");
      } else {
        setMessage({ type: "error", text: result.error || "حدث خطأ" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "خطأ في الاتصال بالخادم" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-sm border space-y-4 max-w-md">
      <h3 className="text-lg font-semibold text-gray-800">سحب الحركات القديمة من الجهاز</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">اختر الجهاز</label>
        <select 
          value={deviceSn} 
          onChange={(e) => setDeviceSn(e.target.value)}
          className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- اختر جهاز --</option>
          {devices.map((dev) => (
            dev.serialNumber ? (
              <option key={dev.serialNumber} value={dev.serialNumber}>
                {dev.name} ({dev.serialNumber})
              </option>
            ) : null
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
          <input 
            type="datetime-local" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
          <input 
            type="datetime-local" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
          />
        </div>
      </div>

      {message.text && (
        <div className={`p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <button 
        type="submit" 
        disabled={isLoading}
        className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? "جاري الإرسال..." : "إرسال أمر السحب للجهاز"}
      </button>
    </form>
  );
}