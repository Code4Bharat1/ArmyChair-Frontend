"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes";
import toast from "react-hot-toast";
import Sidebar from "@/components/Superadmin/sidebar";
import { Download, RefreshCw, Calendar, ChevronDown, Menu, Filter } from "lucide-react";

export default function ActivityLogPage() {
  const [mode, setMode] = useState("logs");
  const [dailyData, setDailyData] = useState([]);

  const [logs, setLogs] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);
  const [token, setToken] = useState(null);

  // Mobile states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;

  /* ================= GET TOKEN (CLIENT SAFE) ================= */
  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
  }, []);

  /* ================= LOAD DATA ================= */
  const loadData = async (authToken) => {
    if (!authToken) return;

    const res = await axios.get(`${API.replace("/api", "")}/activity`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setLogs(res.data.data || []);

    const exportsRes = await axios.get(`${API}/activity/files`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setFiles(exportsRes.data.files || []);
  };

  useEffect(() => {
    if (token) loadData(token);
  }, [token]);

  /* ================= CLOSE CALENDAR WHEN CLICKING OUTSIDE ================= */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ================= BUTTON ACTIONS ================= */

  // 1️⃣ Export CSV (current table)
  const exportCSV = () => {
    if (!filteredLogs.length) {
      toast.error("No logs available to export");
      return;
    }

    const headers = ["Time", "User", "Role", "Action", "Module", "Description"];
    const rows = filteredLogs.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      l.user?.name || "",
      l.user?.role || "",
      l.action,
      l.module,
      l.description,
    ]);

    const csv =
      headers.join(",") +
      "\n" +
      rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 2️⃣ Download Excel by date
  const downloadByDate = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    try {
      const res = await fetch(
        `${API}/activity/exports/${selectedDate}?token=${token}`,
      );

      if (!res.ok) {
        toast.error("No activity records found for selected date");
        return;
      }

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity-${selectedDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Excel downloaded successfully");
    } catch (err) {
      toast.error("Failed to download Excel");
    }
  };

  // 3️⃣ Download archived Excel
  const downloadFile = (file) => {
    window.open(`${API}/activity/files/${file}?token=${token}`, "_blank");
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0h 0m";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const filteredLogs = logs.filter((l) => l.action !== "WORK_TIME");

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex h-screen bg-gray-50 text-gray-900">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          <Sidebar />
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Mobile Header Bar */}
          <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={24} className="text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Activity Log</h1>
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Filter size={20} className="text-gray-700" />
            </button>
          </div>

          {/* Desktop HEADER */}
          <div className="hidden lg:block sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <span>Activity Log</span>
              </h1>
              <p className="text-gray-600 mt-2">
                Track all system activities and user actions
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
            {/* BUTTON BAR - Desktop */}
            <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={exportCSV}
                  className="bg-white px-5 py-3 rounded-xl border-2 border-gray-200 shadow-sm hover:border-[#c62d23] hover:shadow-md transition-all duration-200 cursor-pointer group flex items-center gap-2 font-medium"
                >
                  <Download
                    size={18}
                    className="text-[#c62d23] group-hover:scale-110 transition-transform"
                  />
                  Export CSV (Current View)
                </button>

                {/* DATE PICKER */}
                <div className="relative" ref={calendarRef}>
                  <div
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border-2 border-gray-200 shadow-sm hover:border-[#c62d23] hover:shadow-md transition-all duration-200 cursor-pointer group"
                  >
                    <Calendar
                      size={18}
                      className="text-[#c62d23] group-hover:scale-110 transition-transform"
                    />
                    <span className="text-sm font-medium text-gray-900 min-w-[120px]">
                      {new Date(selectedDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-500 transition-transform ${showCalendar ? "rotate-180" : ""}`}
                    />
                  </div>

                  {showCalendar && (
                    <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-4 min-w-[320px]">
                      <CalendarComponent
                        selectedDate={selectedDate}
                        onDateSelect={(date) => {
                          setSelectedDate(date);
                          setShowCalendar(false);
                        }}
                        maxDate={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={downloadByDate}
                  className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <Download size={18} />
                  Download Excel by Date
                </button>

                <button
                  onClick={() => {
                    if (!token) {
                      toast.error("Session expired. Please re-login.");
                      return;
                    }
                    loadData(token);
                    toast.success("Logs refreshed");
                  }}
                  className="bg-white px-5 py-3 rounded-xl border-2 border-gray-200 shadow-sm hover:border-[#c62d23] hover:shadow-md transition-all duration-200 cursor-pointer group flex items-center gap-2 font-medium"
                >
                  <RefreshCw
                    size={18}
                    className="text-[#c62d23] group-hover:scale-110 transition-transform"
                  />
                  Refresh Logs
                </button>

                <button
                  onClick={async () => {
                    if (!token) return toast.error("Session expired");

                    const res = await axios.get(
                      `${API}/work/daily?date=${selectedDate}`,
                      { headers: { Authorization: `Bearer ${token}` } },
                    );

                    setDailyData(res.data.data);
                    setMode("daily");
                  }}
                  className="bg-white px-5 py-3 rounded-xl border-2 border-gray-200 shadow-sm hover:border-[#c62d23]"
                >
                  Daily Login Time
                </button>

                {mode === "daily" && (
                  <button
                    onClick={() => setMode("logs")}
                    className="bg-white px-5 py-3 rounded-xl border-2 border-gray-200 shadow-sm hover:border-[#c62d23]"
                  >
                    Back to Activity Logs
                  </button>
                )}
              </div>
            </div>

            {/* MOBILE ACTION PANEL */}
            {showActions && (
              <div className="lg:hidden bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
                <button
                  onClick={() => {
                    exportCSV();
                    setShowActions(false);
                  }}
                  className="w-full bg-white px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm hover:border-[#c62d23] transition-all cursor-pointer flex items-center gap-2 font-medium text-sm"
                >
                  <Download size={16} className="text-[#c62d23]" />
                  Export CSV
                </button>

                {/* Mobile Date Picker */}
                <div className="relative" ref={calendarRef}>
                  <div
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-full flex items-center gap-2 bg-white px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm hover:border-[#c62d23] transition-all cursor-pointer"
                  >
                    <Calendar size={16} className="text-[#c62d23]" />
                    <span className="text-sm font-medium text-gray-900 flex-1">
                      {new Date(selectedDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-500 transition-transform ${showCalendar ? "rotate-180" : ""}`}
                    />
                  </div>

                  {showCalendar && (
                    <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                      <CalendarComponent
                        selectedDate={selectedDate}
                        onDateSelect={(date) => {
                          setSelectedDate(date);
                          setShowCalendar(false);
                        }}
                        maxDate={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    downloadByDate();
                    setShowActions(false);
                  }}
                  className="w-full bg-[#c62d23] hover:bg-[#a8241c] text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
                >
                  <Download size={16} />
                  Download Excel
                </button>

                <button
                  onClick={() => {
                    if (!token) {
                      toast.error("Session expired. Please re-login.");
                      return;
                    }
                    loadData(token);
                    toast.success("Logs refreshed");
                    setShowActions(false);
                  }}
                  className="w-full bg-white px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm hover:border-[#c62d23] transition-all cursor-pointer flex items-center gap-2 font-medium text-sm"
                >
                  <RefreshCw size={16} className="text-[#c62d23]" />
                  Refresh Logs
                </button>

                <button
                  onClick={async () => {
                    if (!token) return toast.error("Session expired");

                    const res = await axios.get(
                      `${API}/work/daily?date=${selectedDate}`,
                      { headers: { Authorization: `Bearer ${token}` } },
                    );

                    setDailyData(res.data.data);
                    setMode("daily");
                    setShowActions(false);
                  }}
                  className="w-full bg-white px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm hover:border-[#c62d23] text-sm font-medium"
                >
                  Daily Login Time
                </button>

                {mode === "daily" && (
                  <button
                    onClick={() => {
                      setMode("logs");
                      setShowActions(false);
                    }}
                    className="w-full bg-white px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm hover:border-[#c62d23] text-sm font-medium"
                  >
                    Back to Activity Logs
                  </button>
                )}
              </div>
            )}

            {/* TABLE/CARD VIEW */}
            <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                {mode === "logs"
                  ? "Activity Logs"
                  : `Daily Login Summary (${selectedDate})`}
              </h2>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {(mode === "logs"
                        ? [
                            "Time",
                            "User",
                            "Role",
                            "Action",
                            "Module",
                            "Description",
                          ]
                        : ["User", "Role", "Module", "Total Time"]
                      ).map((h) => (
                        <th
                          key={h}
                          className="text-left p-4 font-semibold text-gray-700"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {mode === "logs" &&
                      filteredLogs.map((l, index) => (
                        <tr
                          key={l._id}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="p-4 font-semibold text-gray-700">
                            {new Date(l.createdAt).toLocaleString([], {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-4">{l.user?.name}</td>
                          <td className="p-4">{l.user?.role}</td>
                          <td className="p-4">{l.action}</td>
                          <td className="p-4">{l.module}</td>
                          <td className="p-4">{l.description}</td>
                        </tr>
                      ))}

                    {mode === "daily" &&
                      dailyData.map((d, index) => (
                        <tr
                          key={index}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="p-4">{d.user?.name}</td>
                          <td className="p-4">{d.user?.role}</td>
                          <td className="p-4">{d.module}</td>
                          <td className="p-4 font-semibold">
                            {formatDuration(d.totalSeconds)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {mode === "logs" &&
                  filteredLogs.map((l) => (
                    <div
                      key={l._id}
                      className="border border-gray-200 rounded-lg p-3 bg-white hover:border-[#c62d23] transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm mb-1">
                            {l.user?.name}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                              {l.user?.role}
                            </span>
                            <span className="text-xs bg-blue-50 px-2 py-0.5 rounded text-blue-700">
                              {l.module}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Action:</span>
                          <span className="font-medium text-gray-900">{l.action}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(l.createdAt).toLocaleString([], {
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {l.description && (
                          <div className="pt-1 border-t border-gray-100">
                            <span className="text-gray-600">Description:</span>
                            <p className="text-gray-900 mt-0.5">{l.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                {mode === "daily" &&
                  dailyData.map((d, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-3 bg-white hover:border-[#c62d23] transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm mb-1">
                            {d.user?.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                              {d.user?.role}
                            </span>
                            <span className="text-xs bg-blue-50 px-2 py-0.5 rounded text-blue-700">
                              {d.module}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-600 mb-1">Total Time</div>
                          <div className="text-lg font-bold text-[#c62d23]">
                            {formatDuration(d.totalSeconds)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {mode === "logs" && logs.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No activity logs found
                </div>
              )}

              {mode === "daily" && dailyData.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No work data found for selected date
                </div>
              )}
            </div>

            {/* DAILY ARCHIVES */}
            <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                Daily Archives
              </h2>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {files.map((f) => (
                  <button
                    key={f}
                    onClick={() => downloadFile(f)}
                    className="bg-white px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 shadow-sm hover:border-[#c62d23] hover:shadow-md transition-all duration-200 cursor-pointer group flex items-center gap-2 font-medium text-xs sm:text-sm"
                  >
                    <Download
                      size={14}
                      className="sm:w-4 sm:h-4 text-[#c62d23] group-hover:scale-110 transition-transform"
                    />
                    <span className="truncate max-w-[200px]">{f}</span>
                  </button>
                ))}
                {files.length === 0 && (
                  <div className="text-gray-500 text-sm">
                    No archived files available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/* ================= CALENDAR COMPONENT ================= */
const CalendarComponent = ({ selectedDate, onDateSelect, maxDate }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const selectedDateObj = new Date(selectedDate);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateDisabled = (date) => {
    if (!date) return true;
    const maxDateObj = new Date(maxDate);
    maxDateObj.setHours(23, 59, 59, 999);
    return date > maxDateObj;
  };

  const isDateSelected = (date) => {
    if (!date) return false;
    return (
      date.getDate() === selectedDateObj.getDate() &&
      date.getMonth() === selectedDateObj.getMonth() &&
      date.getFullYear() === selectedDateObj.getFullYear()
    );
  };

  const handleDateClick = (date) => {
    if (!date || isDateDisabled(date)) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    onDateSelect(formattedDate);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <span className="text-lg sm:text-xl font-bold text-gray-600">‹</span>
        </button>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <span className="text-lg sm:text-xl font-bold text-gray-600">›</span>
        </button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] sm:text-xs font-medium text-gray-500 p-1 sm:p-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {days.map((date, index) => {
          const isDisabled = isDateDisabled(date);
          const isSelected = isDateSelected(date);

          return (
            <button
              key={`${currentMonth.getMonth()}-${currentMonth.getFullYear()}-${index}`}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={isDisabled}
              className={`
                aspect-square p-1 sm:p-2 text-xs sm:text-sm rounded-lg transition-all min-h-[32px] sm:min-h-[36px] flex items-center justify-center
                ${!date ? "invisible" : ""}
                ${
                  isSelected
                    ? "bg-[#c62d23] text-white font-semibold shadow-md"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "hover:bg-gray-100 text-gray-700 cursor-pointer"
                }
              `}
            >
              {date?.getDate()}
            </button>
          );
        })}
      </div>

      {/* Quick select buttons */}
      <div className="flex gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => handleDateClick(new Date())}
          className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-1 cursor-pointer"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            handleDateClick(lastWeek);
          }}
          className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-1 cursor-pointer"
        >
          Last Week
        </button>
      </div>
    </div>
  );
};