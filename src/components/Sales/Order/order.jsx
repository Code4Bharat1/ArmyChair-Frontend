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
    deliveryDate: "", // ✅ NEW
    quantity: "",
    isPartial: false, // ✅ NEW (checkbox)
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
  const markInventoryReady = async (orderId) => {
    try {
      await axios.put(
        `${API}/orders/${orderId}`,
        { isPartial: false },
        { headers }
      );
      fetchOrders();
    } catch (err) {
      alert("Failed to mark order as complete");
    }
  };

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
        deliveryDate: formData.deliveryDate, // ✅
        quantity: Number(formData.quantity),
        isPartial: formData.isPartial, // ✅
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

  const handleRowClick = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
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
                      "Delivery Date",
                      "Qty",
                      "Progress",
                      "Order Status", // ✅ NEW
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
                      <tr
                        onClick={() => handleRowClick(o._id)}
                        className="border-b border-neutral-700 hover:bg-neutral-850 transition cursor-pointer"
                      >
                        <td className="p-4 font-medium">{o.orderId}</td>
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
                        <td className="p-4">
                          {o.isPartial ? (
                            <span className="px-3 py-1 rounded-full text-xs bg-amber-900/40 text-amber-400 border border-amber-700">
                              Inventory Incomplete
                            </span>
                          ) : o.progress === "READY_FOR_DISPATCH" ? (
                            <span className="px-3 py-1 rounded-full text-xs bg-green-900/40 text-green-400 border border-green-700">
                              Inventory Ready
                            </span>
                          ) : o.progress === "DISPATCHED" ? (
                            <span className="px-3 py-1 rounded-full text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-700">
                              Dispatched
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs bg-blue-900/40 text-blue-400 border border-blue-700">
                              Inventory Ready – Processing
                            </span>
                          )}
                        </td>

                        <td className="p-4 flex gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // ⛔ prevent row click
                              handleEditOrder(o);
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrder(o._id);
                            }}
                            disabled={isOrderLocked(o.progress)}
                            className={`text-red-400 hover:text-red-300 ${
                              isOrderLocked(o.progress)
                                ? "opacity-40 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {o.isPartial && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markInventoryReady(o._id);
                              }}
                              title="Mark inventory ready"
                              className="text-green-400 hover:text-green-300 transition"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* EXPANDED PROGRESS ROW */}
                      {expandedOrderId === o._id && (
                        <tr className="bg-neutral-850">
                          <td colSpan={9} className="p-6">
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
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-neutral-900 p-8 rounded-2xl w-full max-w-[520px] border-2 border-amber-600 shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-amber-400">
        {editingOrderId ? "Update Order" : "Create Order"}
      </h2>

      <div className="space-y-4">
        <Input
          label="Dispatched To"
          name="dispatchedTo"
          value={formData.dispatchedTo}
          onChange={handleFormChange}
        />

        {/* CHAIR MODEL DROPDOWN */}
        <div>
          <label className="block text-base text-neutral-300 mb-2 font-semibold">
            Chair Model
          </label>
          <select
            name="chairModel"
            value={formData.chairModel}
            onChange={handleFormChange}
            className="w-full px-4 py-3 bg-neutral-800 border-2 border-neutral-600 rounded-lg text-base text-neutral-100 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/50 outline-none"
            required
          >
            <option value="" className="bg-neutral-800">Select Chair Model</option>
            {CHAIR_MODELS.map((model) => (
              <option key={model} value={model} className="bg-neutral-800">
                {model}
              </option>
            ))}
          </select>
        </div>

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

        <Input
          label="Delivery Date"
          name="deliveryDate"
          type="date"
          value={formData.deliveryDate}
          onChange={handleFormChange}
        />

        {/* PARTIAL ORDER CHECKBOX */}
        <div className="flex items-center gap-3 mt-2 bg-neutral-800 p-4 rounded-lg border-2 border-neutral-700">
          <input
            type="checkbox"
            id="isPartial"
            checked={formData.isPartial}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                isPartial: e.target.checked,
              }))
            }
            className="w-5 h-5 accent-amber-600"
          />

          <label
            htmlFor="isPartial"
            className="text-base text-neutral-200 cursor-pointer font-semibold"
          >
            Is this a partial order?
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-8">
        <button
          type="button"
          onClick={() => {
            setShowForm(false);
            setEditingOrderId(null);
            setFormData(initialFormData);
          }}
          className="px-6 py-2.5 text-base text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition font-medium border-2 border-neutral-700"
        >
          Cancel
        </button>

        <button
          onClick={handleCreateOrder}
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-lg transition font-semibold shadow-lg text-base border-2 border-amber-500"
        >
          {editingOrderId ? "Update" : "Create"}
        </button>
      </div>
    </div>
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
  <div>
    <label className="text-base text-neutral-300 font-semibold block mb-2">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 bg-neutral-800 rounded-lg outline-none border-2 border-neutral-600 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/50 text-base text-neutral-100"
    />
  </div>
);
