"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Package,
  Clock,
  CheckCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import axios from "axios";
import Sidebar from "./sidebar";

export default function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  /* ================= API ================= */
  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers });
      setOrders(res.data.orders || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ================= FILTER ================= */
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderId?.toLowerCase().includes(q) ||
        o.dispatchedTo?.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  /* ================= COUNTS ================= */
  const totalOrders = orders.length;
  const completed = orders.filter((o) => o.progress === "DISPATCHED").length;
  const inProgress = totalOrders - completed;

  /* ================= ORDER STEPS ================= */
  const ORDER_STEPS = [
    { key: "ORDER_PLACED", label: "Order Placed" },
    { key: "WAREHOUSE_COLLECTED", label: "Warehouse Collected" },
    { key: "FITTING_IN_PROGRESS", label: "Fitting In Progress" },
    { key: "FITTING_COMPLETED", label: "Fitting Completed" },
    { key: "READY_FOR_DISPATCH", label: "Ready For Dispatch" },
    { key: "DISPATCHED", label: "Dispatched" },
    // { key: "COMPLETED", label: "Completed" },
  ];
  /* ================= PROGRESS TEXT ================= */
  const ProgressTracker = ({ progress }) => {
    const currentIndex = ORDER_STEPS.findIndex((s) => s.key === progress);
    const safeIndex =
      currentIndex === -1 ? ORDER_STEPS.length - 1 : currentIndex;

    return (
      <span className="text-sm font-medium text-amber-400">
        {ORDER_STEPS[safeIndex]?.label}
      </span>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Orders Management</h1>
            <p className="text-sm text-neutral-400">
              Create, track and manage all orders
            </p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Orders"
            value={totalOrders}
            icon={<Package />}
          />
          <StatCard
            title="In Progress"
            value={inProgress}
            icon={<Clock />}
            highlight
          />
          <StatCard
            title="Completed"
            value={completed}
            icon={<CheckCircle />}
          />
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm"
          />
        </div>

        {/* TABLE */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-6">Loading...</p>
          ) : (
            <table className="w-full text-center">
              <thead className="bg-neutral-900 text-neutral-400 text-sm text-center">
                <tr>
                  <th className="p-4 text-left text-center">ORDER ID</th>
                  <th className="p-4 text-left">DISPATCHED TO</th>
                  <th className="p-4 text-left">CHAIR</th>
                  <th className="p-4 text-left">ORDER DATE</th>
                  <th className="p-4 text-left">DELIVERY DATE</th>
                  <th className="p-4 text-left">QTY</th>
                  <th className="p-4 text-left">PROGRESS</th>
                  {/* <th className="p-4 text-right">ACTIONS</th> */}
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((o) => {
                  const currentIndex = ORDER_STEPS.findIndex(
                    (s) => s.key === o.progress
                  );
                  const safeIndex =
                    currentIndex === -1 ? ORDER_STEPS.length - 1 : currentIndex;
                  const percent = (safeIndex / (ORDER_STEPS.length - 1)) * 100;

                  return (
                    <React.Fragment key={o._id}>
                      {/* MAIN ROW */}
                      <tr
                        onClick={() =>
                          setExpandedOrderId(
                            expandedOrderId === o._id ? null : o._id
                          )
                        }
                        className="border-t border-neutral-700 hover:bg-neutral-700/30 cursor-pointer"
                      >
                        <td className="p-4">{o.orderId}</td>
                        <td className="p-4">{o.dispatchedTo}</td>
                        <td className="p-4">{o.chairModel}</td>
                        <td className="p-4">
                          {new Date(o.orderDate).toLocaleDateString()}
                        </td>

                        <td className="p-4">
                          {o.deliveryDate
                            ? new Date(o.deliveryDate).toLocaleDateString()
                            : "-"}
                        </td>

                        <td className="p-4">{o.quantity}</td>

                        <td className="p-4">
                          <ProgressTracker
                            progress={o.progress}
                            orderId={o._id}
                          />
                        </td>
                      </tr>

                      {/* EXPANDED ROW */}
                      {expandedOrderId === o._id && (
                        <tr className="bg-neutral-850">
                          <td colSpan={7} className="p-6 space-y-6">
                            <div className="flex justify-between text-xs text-neutral-400">
                              {ORDER_STEPS.map((step, i) => (
                                <span
                                  key={step.key}
                                  className={
                                    i <= safeIndex
                                      ? "text-neutral-200 font-medium"
                                      : ""
                                  }
                                >
                                  {step.label}
                                </span>
                              ))}
                            </div>

                            <div className="relative w-full h-10 flex items-center">
                              <div className="absolute left-0 right-0 h-[4px] bg-neutral-600 rounded-full" />
                              <div
                                className="absolute left-0 h-[4px] rounded-full transition-all duration-500"
                                style={{
                                  width: `${percent}%`,
                                  background:
                                    percent === 100
                                      ? "#22c55e"
                                      : "linear-gradient(90deg,#22c55e,#f59e0b)",
                                }}
                              />
                              <div
                                className="absolute w-4 h-4 rounded-full border-2 border-black"
                                style={{
                                  left: `calc(${percent}% - 8px)`,
                                  backgroundColor:
                                    percent === 100 ? "#22c55e" : "#f59e0b",
                                }}
                              />
                            </div>

                            <p className="text-sm">
                              <span className="text-neutral-400">
                                Current Stage:
                              </span>{" "}
                              <span className="text-amber-400 font-medium">
                                {
                                  ORDER_STEPS.find((s) => s.key === o.progress)
                                    ?.label
                                }
                              </span>
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD ================= */
function StatCard({ title, value, icon, highlight }) {
  return (
    <div
      className={`rounded-xl p-5 border ${
        highlight
          ? "bg-gradient-to-r from-amber-900/60 to-black border-amber-700"
          : "bg-neutral-800 border-neutral-700"
      }`}
    >
      <div className="flex justify-between items-center text-neutral-400">
        <span className="text-sm">{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}
