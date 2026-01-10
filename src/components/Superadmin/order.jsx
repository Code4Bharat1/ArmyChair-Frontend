"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Package,
  Clock,
  CheckCircle,
  Pencil,
  Trash2,
  Plus,
  User,
} from "lucide-react";
import axios from "axios";
import Sidebar from "./sidebar";
import { useRouter } from "next/navigation";

export default function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const initialFormData = {
    dispatchedTo: "",
    chairModel: "",
    orderDate: "",
    deliveryDate: "",
    quantity: "",
    isPartial: false,
  };

  const CHAIR_MODELS = [
    "Army Chair - Basic",
    "Army Chair - Premium",
    "Office Chair",
    "Folding Chair",
    "Plastic Chair",
    "Metal Chair",
  ];

  const [formData, setFormData] = useState(initialFormData);

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
  const handleCreateOrder = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        dispatchedTo: formData.dispatchedTo,
        chairModel: formData.chairModel,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate,
        quantity: Number(formData.quantity),
        isPartial: formData.isPartial,
      };

      await axios.post(`${API}/orders`, payload, { headers });

      setShowForm(false);
      setFormData(initialFormData);
      fetchOrders();
    } catch (err) {
      alert("Failed to create order");
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

    const isDispatched = progress === "DISPATCHED";

    return (
      <span
        className={`text-sm font-medium ${
          isDispatched ? "text-green-600" : "text-amber-400"
        }`}
      >
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

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowForm(true)}
              className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow"
            >
              <Plus size={16} />
              Add Order
            </button>

            <button
              onClick={() => router.push("/sales/profile")}
              className="w-10 h-10 rounded-full bg-amber-600 text-black flex items-center justify-center font-bold hover:ring-2 hover:ring-amber-500"
            >
              <User size={18} />
            </button>
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
                <tr className="text-center">
                  <th className="p-4  text-center">ORDER ID</th>
                  <th className="p-4 ">DISPATCHED TO</th>
                  <th className="p-4 ">CHAIR</th>
                  <th className="p-4 ">ORDER DATE</th>
                  <th className="p-4 ">DELIVERY DATE</th>
                  <th className="p-4 ">QTY</th>
                  <th className="p-4 ">PROGRESS</th>
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
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 p-8 rounded-2xl w-full max-w-[520px] border-2 border-amber-600">
            <h2 className="text-2xl font-bold mb-6 text-amber-400">
              Create Order
            </h2>

            <div className="space-y-4">
              <Input
                label="Dispatched To"
                name="dispatchedTo"
                value={formData.dispatchedTo}
                onChange={(e) =>
                  setFormData({ ...formData, dispatchedTo: e.target.value })
                }
              />

              <select
                value={formData.chairModel}
                onChange={(e) =>
                  setFormData({ ...formData, chairModel: e.target.value })
                }
                className="w-full px-4 py-3 bg-neutral-800 border-2 border-neutral-600 rounded-lg"
              >
                <option value="">Select Chair Model</option>
                {CHAIR_MODELS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>

              <Input
                label="Order Date"
                type="date"
                value={formData.orderDate}
                onChange={(e) =>
                  setFormData({ ...formData, orderDate: e.target.value })
                }
              />

              <Input
                label="Delivery Date"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryDate: e.target.value })
                }
              />

              <Input
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2 border border-neutral-600 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateOrder}
                className="bg-amber-600 px-6 py-2 rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
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
const Input = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label className="text-sm text-neutral-300 block mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg"
    />
  </div>
);
