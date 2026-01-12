"use client";
import React, { useEffect, useState } from "react";
import {
  Boxes,
  Warehouse,
  AlertCircle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import Sidebar from "./sidebar";

/* ================= MOCK DATA ================= */
const mockPerformance = {
  "2026-01-10": { totalOrders: 120, completed: 85, pending: 35 },
  "2026-01-09": { totalOrders: 90, completed: 70, pending: 20 },
  "2026-01-08": { totalOrders: 150, completed: 130, pending: 20 },
  "2026-01-07": { totalOrders: 60, completed: 45, pending: 15 },
};

export default function Dashboard() {
  const [daily, setDaily] = useState({
    totalOrders: 0,
    completed: 0,
    pending: 0,
  });

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [loading, setLoading] = useState(true);

  /* ================= FETCH DAILY PERFORMANCE (MOCK) ================= */
  const fetchDailyPerformance = () => {
    setLoading(true);

    setTimeout(() => {
      const data =
        mockPerformance[selectedDate] || {
          totalOrders: 0,
          completed: 0,
          pending: 0,
        };

      setDaily(data);
      setLoading(false);
    }, 600); // simulate API delay
  };

  useEffect(() => {
    fetchDailyPerformance();
  }, [selectedDate]);

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
            <p className="text-sm text-neutral-400">
              Factory performance by date
            </p>
          </div>

          <div className="flex items-center gap-3 bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-700">
            <Calendar size={16} className="text-neutral-400" />
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="p-6">
          {/* ===== DAILY PERFORMANCE ===== */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
              <TrendingUp className="text-amber-400" />
              Performance for {selectedDate}
            </h2>

            {loading ? (
              <div className="text-center py-6 text-neutral-400">
                Loading data...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Orders Received"
                  value={daily.totalOrders}
                  icon={<Boxes />}
                />

                <StatCard
                  title="Orders Completed"
                  value={daily.completed}
                  icon={<Warehouse />}
                />

                <StatCard
                  title="Orders Pending"
                  value={daily.pending}
                  danger={daily.pending > 0}
                  icon={<AlertCircle />}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= UI COMPONENTS ================= */

const StatCard = ({ title, value, icon, danger }) => (
  <div
    className={`p-5 rounded-xl border transition hover:shadow-md ${
      danger
        ? "bg-red-950/40 border-red-800"
        : "bg-neutral-900 border-neutral-700"
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-neutral-400">{title}</p>
      <span className="text-neutral-400">{icon}</span>
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);
