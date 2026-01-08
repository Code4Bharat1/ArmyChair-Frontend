"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Package,
  Clock,
  CheckCircle,
} from "lucide-react";
import axios from "axios";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const initialFormData = {
    dispatchedTo: "",
    chairModel: "",
    orderDate: "",
    quantity: "",
  };

  const [formData, setFormData] = useState(initialFormData);

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
      console.error("Fetch orders failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ================= EDIT ================= */
  const handleEditOrder = (order) => {
    setEditingOrderId(order._id);
    setFormData({
      dispatchedTo: order.dispatchedTo,
      chairModel: order.chairModel,
      orderDate: order.orderDate?.split("T")[0],
      quantity: order.quantity,
    });
    setShowForm(true);
  };

  /* ================= FORM CHANGE ================= */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= CREATE / UPDATE ================= */
  const handleCreateOrder = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        dispatchedTo: formData.dispatchedTo,
        chairModel: formData.chairModel,
        orderDate: formData.orderDate,
        quantity: Number(formData.quantity),
      };

      if (editingOrderId) {
        await axios.put(`${API}/orders/${editingOrderId}`, payload, {
          headers,
        });
      } else {
        await axios.post(`${API}/orders`, payload, { headers });
      }

      setShowForm(false);
      setEditingOrderId(null);
      setFormData(initialFormData);
      fetchOrders();
    } catch (err) {
      console.error("Save failed", err?.response?.data || err);
      alert(err?.response?.data?.message || "Failed to save order");
    }
  };

  /* ================= DELETE ================= */
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;

    try {
      await axios.delete(`${API}/orders/${orderId}`, { headers });
      fetchOrders();
    } catch (err) {
      alert("Delete failed");
    }
  };

  /* ================= FILTER ================= */
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase();
      return (
        o.orderId?.toLowerCase().includes(q) ||
        o.dispatchedTo?.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  /* ================= STATS ================= */
  const totalOrders = filteredOrders.length;
  const inProgress = filteredOrders.filter(
    (o) => !["DISPATCHED", "COMPLETED"].includes(o.progress)
  ).length;
  const completed = filteredOrders.filter(
    (o) => o.progress === "DISPATCHED"
  ).length;

  /* ================= ORDER STEPS ================= */
  const ORDER_STEPS = [
    { key: "ORDER_PLACED", label: "Order Placed" },
    { key: "WAREHOUSE_COLLECTED", label: "Warehouse Collected" },
    { key: "FITTING_IN_PROGRESS", label: "Fitting In Progress" },
    { key: "FITTING_COMPLETED", label: "Fitting Completed" },
    { key: "READY_FOR_DISPATCH", label: "Ready For Dispatch" },
    { key: "DISPATCHED", label: "Dispatched" },
  ];

  const isOrderLocked = (progress) => {
    return ["FITTING_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED"].includes(
      progress
    );
  };

  /* ================= PROGRESS ================= */
  const ProgressTracker = ({ progress, orderId }) => {
    const currentIndex = ORDER_STEPS.findIndex((s) => s.key === progress);

    return (
      <div
        onClick={() =>
          setExpandedOrderId(expandedOrderId === orderId ? null : orderId)
        }
        className="flex items-center gap-2 cursor-pointer"
      >
        {ORDER_STEPS.map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`w-3 h-3 rounded-full ${
                i <= currentIndex ? "bg-amber-500" : "bg-neutral-700"
              }`}
            />
            {i !== ORDER_STEPS.length - 1 && (
              <div className="w-4 h-[2px] bg-neutral-700" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      {/* MAIN */}
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Orders Management</h1>
            <p className="text-sm mb-5 text-neutral-400">
              Create, track and manage all orders
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow"
          >
            <Plus size={16} />
            Add Order
          </button>
        </div>

        {/* STATS */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="Total Orders"
              value={totalOrders}
              icon={<Package />}
            />
            <StatCard
              title="In Progress"
              value={inProgress}
              icon={<Clock />}
              danger={inProgress > 0}
            />
            <StatCard
              title="Completed"
              value={completed}
              icon={<CheckCircle />}
            />
          </div>

          {/* SEARCH */}
          <div className="mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="w-full bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg outline-none focus:border-amber-600"
            />
          </div>

          {/* TABLE */}
          <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700">
            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center text-neutral-400 py-10">
                No orders found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-850 border-b border-neutral-700">
                  <tr>
                    {[
                      "Order ID",
                      "Dispatched To",
                      "Chair",
                      "Date",
                      "Qty",
                      "Progress",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="p-4 text-left text-xs text-neutral-400 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((o) => (
                    <React.Fragment key={o._id}>
                      {/* MAIN ROW */}
                      <tr className="border-b border-neutral-700 hover:bg-neutral-850 transition">
                        <td className="p-4 font-medium">{o.orderId}</td>
                        <td className="p-4">{o.dispatchedTo}</td>
                        <td className="p-4">{o.chairModel}</td>
                        <td className="p-4">
                          {new Date(o.orderDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">{o.quantity}</td>
                        <td className="p-4">
                          <ProgressTracker
                            progress={o.progress}
                            orderId={o._id}
                          />
                        </td>
                        <td className="p-4 flex gap-3">
                          <button
                            onClick={() => handleEditOrder(o)}
                            disabled={isOrderLocked(o.progress)}
                            className={`text-amber-400 hover:text-amber-300 ${
                              isOrderLocked(o.progress)
                                ? "opacity-40 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => handleDeleteOrder(o._id)}
                            disabled={isOrderLocked(o.progress)}
                            className={`text-red-400 hover:text-red-300 ${
                              isOrderLocked(o.progress)
                                ? "opacity-40 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDED PROGRESS ROW */}
                      {expandedOrderId === o._id && (
                        <tr className="bg-neutral-850">
                          <td colSpan={7} className="p-6">
                            {(() => {
                              const currentIndex = ORDER_STEPS.findIndex(
                                (s) => s.key === o.progress
                              );

                              const safeIndex =
                                currentIndex === -1
                                  ? ORDER_STEPS.length - 1
                                  : currentIndex;

                              const percent =
                                (safeIndex / (ORDER_STEPS.length - 1)) * 100;

                              return (
                                <div className="w-full space-y-6">
                                  {/* TITLE */}
                                  <p className="text-sm text-neutral-300 font-medium">
                                    Order Progress
                                  </p>

                                  {/* STEP LABELS */}
                                  <div className="flex justify-between text-xs text-neutral-400">
                                    {ORDER_STEPS.map((step, index) => (
                                      <span
                                        key={step.key}
                                        className={
                                          index <= safeIndex
                                            ? "text-neutral-200 font-medium"
                                            : ""
                                        }
                                      >
                                        {step.label}
                                      </span>
                                    ))}
                                  </div>

                                  {/* TRACK */}
                                  <div className="relative w-full h-10 flex items-center">
                                    {/* BASE LINE */}
                                    <div className="absolute left-0 right-0 h-[4px] bg-neutral-600 rounded-full" />

                                    {/* PROGRESS LINE */}
                                    <div
                                      className="absolute left-0 h-[4px] rounded-full transition-all duration-500"
                                      style={{
                                        width: `${percent}%`,
                                        background:
                                          percent === 100
                                            ? "#22c55e"
                                            : "linear-gradient(90deg, #22c55e, #f59e0b)",
                                      }}
                                    />

                                    {/* CURRENT DOT */}
                                    <div
                                      className="absolute w-4 h-4 rounded-full border-2 border-black shadow"
                                      style={{
                                        left: `calc(${percent}% - 8px)`,
                                        backgroundColor:
                                          safeIndex === ORDER_STEPS.length - 1
                                            ? "#22c55e"
                                            : "#f59e0b",
                                      }}
                                    />
                                  </div>

                                  {/* CURRENT STATUS */}
                                  <p className="text-sm">
                                    <span className="text-neutral-400">
                                      Current Stage:
                                    </span>{" "}
                                    <span className="text-amber-400 font-medium">
                                      {
                                        ORDER_STEPS.find(
                                          (s) => s.key === o.progress
                                        )?.label
                                      }
                                    </span>
                                  </p>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreateOrder}
            className="bg-neutral-900 p-6 rounded-xl w-[380px] border border-neutral-700"
          >
            <h2 className="text-lg font-semibold mb-4">
              {editingOrderId ? "Update Order" : "Create Order"}
            </h2>

            <Input
              label="Dispatched To"
              name="dispatchedTo"
              value={formData.dispatchedTo}
              onChange={handleFormChange}
            />
            <Input
              label="Chair Model"
              name="chairModel"
              value={formData.chairModel}
              onChange={handleFormChange}
            />
            <Input
              label="Order Date"
              name="orderDate"
              type="date"
              value={formData.orderDate}
              onChange={handleFormChange}
            />
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleFormChange}
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingOrderId(null);
                  setFormData(initialFormData);
                }}
                className="px-4 py-2 text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded"
              >
                {editingOrderId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon, danger }) => (
  <div
    className={`p-5 rounded-xl border ${
      danger
        ? "bg-amber-950/40 border-amber-800"
        : "bg-neutral-800 border-neutral-700"
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-neutral-400">{title}</p>
      <span className="text-neutral-400">{icon}</span>
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

const Input = ({ label, name, value, onChange, type = "text" }) => (
  <div className="mb-3">
    <label className="text-xs text-neutral-400">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full mt-1 p-2 bg-neutral-800 rounded outline-none border border-neutral-700 focus:border-amber-600"
    />
  </div>
);
