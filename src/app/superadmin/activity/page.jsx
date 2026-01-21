"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes";
import toast from "react-hot-toast";

import Sidebar from "@/components/Superadmin/sidebar";
export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [token, setToken] = useState(null);

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
    setLogs(res.data.logs || []);

    const exportsRes = await axios.get(`${API}/activity/files`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setFiles(exportsRes.data.files || []);
  };

  useEffect(() => {
    if (token) loadData(token);
  }, [token]);

  /* ================= BUTTON ACTIONS ================= */

  // 1️⃣ Export CSV (current table)
  const exportCSV = () => {
    if (!logs.length) {
      toast.error("No logs available to export");
      return;
    }

    const headers = ["Time", "User", "Role", "Action", "Module", "Description"];
    const rows = logs.map((l) => [
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

 
    return (
  <ProtectedRoute allowedRoles={["admin"]}>
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Activity Log</h1>

        {/* 🔘 BUTTON BAR */}
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={exportCSV}
            className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded"
          >
            Export CSV (Current View)
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 px-3 py-2 rounded"
          />

          <button
            onClick={downloadByDate}
            className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded"
          >
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
            className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded"
          >
            Refresh Logs
          </button>
        </div>

        {/* 📋 TABLE */}
        <div className="bg-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900">
              <tr>
                {["Time", "User", "Role", "Action", "Module", "Description"].map(
                  (h) => (
                    <th key={h} className="p-3 text-left text-neutral-400">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-b border-neutral-700">
                  <td className="p-3">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">{l.user?.name}</td>
                  <td className="p-3">{l.user?.role}</td>
                  <td className="p-3">{l.action}</td>
                  <td className="p-3">{l.module}</td>
                  <td className="p-3">{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 📦 DAILY ARCHIVES */}
        <div className="bg-neutral-800 p-4 rounded-xl">
          <h2 className="font-semibold mb-3">Daily Archives</h2>
          <div className="flex flex-wrap gap-3">
            {files.map((f) => (
              <button
                key={f}
                onClick={() => downloadFile(f)}
                className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </ProtectedRoute>
);

}
