"use client";
import { formatDate } from "@/utils/formatDate";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Package,
  User,
  Clock,
  MapPin,
  ArrowRightLeft,
  TrendingUp,
  X,
  AlertCircle,
} from "lucide-react";
import InventorySidebar from "./sidebar";

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  /* FILTERS */
  const [search, setSearch] = useState("");
  const [fromFilter, setFromFilter] = useState("All");
  const [toFilter, setToFilter] = useState("All");
  const [activeStatFilter, setActiveStatFilter] = useState("ALL");

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
  return movements.map((m) => {
    // Extract quantity safely from description
    const qtyMatch = m.description.match(/Transferred\s(\d+)/i);
    const qty = qtyMatch ? Number(qtyMatch[1]) : 0;

    return {
      id: m._id,
      part: m.description,
      from: m.sourceLocation,
      to: m.destination,
      qty,
      user: m.userName,
      time: m.createdAt,
    };
  });
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
    const q = search.toLowerCase();

    let data = normalized.filter((m) => {
      const matchSearch =
        (m.part ?? "").toLowerCase().includes(q) ||
        (m.from ?? "").toLowerCase().includes(q) ||
        (m.to ?? "").toLowerCase().includes(q) ||
        (m.user ?? "").toLowerCase().includes(q);

      const matchFrom = fromFilter === "All" || m.from === fromFilter;
      const matchTo = toFilter === "All" || m.to === toFilter;

      return matchSearch && matchFrom && matchTo;
    });

    // Apply stat filter
    if (activeStatFilter === "TODAY") {
      data = data.filter((m) => {
        const d = new Date(m.time);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      });
    }

    return data;
  }, [normalized, search, fromFilter, toFilter, activeStatFilter]);

  /* ================= STATS ================= */
  const totalMovements = normalized.length;
  const totalQty = normalized.reduce((s, m) => s + m.qty, 0);

  const todayCount = normalized.filter((m) => {
    const d = new Date(m.time);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <InventorySidebar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowRightLeft size={32} className="text-[#c62d23]" />
                <span>Stock Movement History</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Track all inventory transfers between locations
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Total Movements" 
              value={totalMovements} 
              icon={<ArrowRightLeft className="text-[#c62d23]" />}
              clickable={true}
              active={activeStatFilter === "ALL"}
              onClick={() => setActiveStatFilter("ALL")}
            />
            <StatCard 
              title="Total Qty Moved" 
              value={totalQty} 
              icon={<TrendingUp className="text-[#c62d23]" />}
              clickable={false}
            />
            <StatCard 
              title="Today" 
              value={todayCount} 
              icon={<Clock className="text-[#c62d23]" />}
              clickable={true}
              active={activeStatFilter === "TODAY"}
              onClick={() => setActiveStatFilter("TODAY")}
            />
          </div>

          {/* FILTER BADGE */}
          {activeStatFilter !== "ALL" && (
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 border border-amber-300 px-4 py-2 rounded-xl flex items-center gap-2">
                <AlertCircle className="text-amber-700" size={18} />
                <span className="text-sm font-medium text-amber-800">
                  Showing only today's movements
                </span>
              </div>
              <button
                onClick={() => setActiveStatFilter("ALL")}
                className="text-sm text-gray-600 hover:text-[#c62d23] font-medium"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* FILTERS */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search part, location or user..."
              className="bg-white border border-gray-200 px-4 py-3 rounded-xl outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
            />

            <select
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
              className="bg-white border border-gray-200 px-4 py-3 rounded-xl outline-none text-gray-900 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
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
              className="bg-white border border-gray-200 px-4 py-3 rounded-xl outline-none text-gray-900 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
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
                setActiveStatFilter("ALL");
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium transition-all"
            >
              Reset All Filters
            </button>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500">Loading...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No stock movements found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 text-left font-semibold text-gray-700">Part</th>
                      <th className="p-4 text-left font-semibold text-gray-700">From</th>
                      <th className="p-4 text-left font-semibold text-gray-700">To</th>
                      <th className="p-4 text-center font-semibold text-gray-700">Qty</th>
                      <th className="p-4 text-left font-semibold text-gray-700">Moved By</th>
                      <th className="p-4 text-left font-semibold text-gray-700">Time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((m, index) => (
                      <tr
                        key={m.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Package size={16} className="text-gray-400" />
                            <span className="font-medium text-gray-900">{m.part}</span>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin size={16} className="text-gray-400" />
                            {m.from}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin size={16} className="text-gray-400" />
                            {m.to}
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <span className="font-semibold text-[#c62d23]">{m.qty}</span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <User size={16} className="text-gray-400" />
                            {m.user}
                          </div>
                        </td>

                        <td className="p-4 text-gray-700">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            {formatDate(m.time)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon, clickable, active, onClick }) => (
  <div
    onClick={clickable ? onClick : undefined}
    className={`bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full border-gray-200 ${
      clickable ? 'cursor-pointer hover:bg-gray-50 hover:border-[#c62d23]' : ''
    } ${
      active ? 'ring-2 ring-[#c62d23]' : ''
    }`}
    style={{
      borderLeft: '4px solid #c62d23'
    }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    {clickable && (
      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
        <span>{active ? 'Click to show all' : 'Click to view details'}</span>
        <span className="text-[#c62d23]">→</span>
      </div>
    )}
  </div>
);