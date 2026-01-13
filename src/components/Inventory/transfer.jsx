"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Package,
  User,
  Clock,
  MapPin,
  ArrowRightLeft,
  TrendingUp,
} from "lucide-react";
import InventorySidebar from "./sidebar";

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  /* FILTERS */
  const [search, setSearch] = useState("");
  const [fromFilter, setFromFilter] = useState("All");
  const [toFilter, setToFilter] = useState("All");

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchMovements = async () => {
    try {
      const res = await axios.get(`${API}/transfer/stock-movement`, { headers });
      setMovements(res.data.movements || []);
    } catch (err) {
      console.error("Fetch movements failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  /* ================= NORMALIZE ================= */
  const normalized = useMemo(() => {
    return movements.map((m) => ({
      id: m._id,
      part: m.chairType,
      from: m.fromLocation,
      to: m.toLocation,
      qty: m.quantity,
      user: m.movedBy?.name || "System",
      time: m.createdAt,
    }));
  }, [movements]);

  /* ================= LOCATIONS ================= */
  const locations = useMemo(() => {
    const set = new Set();
    normalized.forEach((m) => {
      set.add(m.from);
      set.add(m.to);
    });
    return Array.from(set);
  }, [normalized]);

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    return normalized.filter((m) => {
      const q = search.toLowerCase();

      const matchSearch =
        m.part.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        m.to.toLowerCase().includes(q) ||
        m.user.toLowerCase().includes(q);

      const matchFrom = fromFilter === "All" || m.from === fromFilter;
      const matchTo = toFilter === "All" || m.to === toFilter;

      return matchSearch && matchFrom && matchTo;
    });
  }, [normalized, search, fromFilter, toFilter]);

  /* ================= STATS ================= */
  const totalMovements = filtered.length;
  const totalQty = filtered.reduce((s, m) => s + m.qty, 0);

  const todayCount = filtered.filter((m) => {
    const d = new Date(m.time);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <InventorySidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4">
          <h1 className="text-2xl font-bold">Stock Movement History</h1>
          <p className="text-sm text-neutral-400">
            Track all inventory transfers between locations
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Movements" value={totalMovements} icon={<ArrowRightLeft />} />
            <StatCard title="Total Qty Moved" value={totalQty} icon={<TrendingUp />} />
            <StatCard title="Today" value={todayCount} icon={<Clock />} />
          </div>

          {/* FILTERS */}
          <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search part, location or user..."
              className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded outline-none"
            />

            <select
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded outline-none"
            >
              <option value="All">From (All)</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded outline-none"
            >
              <option value="All">To (All)</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearch("");
                setFromFilter("All");
                setToFilter("All");
              }}
              className="bg-neutral-700 hover:bg-neutral-600 rounded px-3 py-2"
            >
              Reset
            </button>
          </div>

          {/* TABLE */}
          <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700">
            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-neutral-400">
                No stock movements found
              </div>
            ) : (
              <table className="w-full table-fixed">
                <thead className="bg-neutral-850 border-b border-neutral-700">
                  <tr>
                    <th className="p-4 text-left text-xs text-neutral-400 uppercase w-[20%]">Part</th>
                    <th className="p-4 text-left text-xs text-neutral-400 uppercase w-[15%]">From</th>
                    <th className="p-4 text-left text-xs text-neutral-400 uppercase w-[15%]">To</th>
                    <th className="p-4 text-center text-xs text-neutral-400 uppercase w-[10%]">Qty</th>
                    <th className="p-4 text-left text-xs text-neutral-400 uppercase w-[20%]">Moved By</th>
                    <th className="p-4 text-left text-xs text-neutral-400 uppercase w-[20%]">Time</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-neutral-700 hover:bg-neutral-850 transition"
                    >
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-neutral-400" />
                          {m.part}
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-neutral-400" />
                          {m.from}
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-neutral-400" />
                          {m.to}
                        </div>
                      </td>

                      <td className="p-4 text-center font-semibold text-amber-400 whitespace-nowrap">
                        {m.qty}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <User size={14} className="text-neutral-400" />
                          {m.user}
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap text-sm text-neutral-400">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          {new Date(m.time).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon }) => (
  <div className="p-5 rounded-xl border bg-neutral-800 border-neutral-700">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm text-neutral-400">{title}</p>
      <span className="text-neutral-400">{icon}</span>
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);
