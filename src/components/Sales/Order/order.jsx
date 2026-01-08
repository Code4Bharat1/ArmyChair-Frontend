"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, Pencil, Trash2 } from "lucide-react";
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

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

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
const isOrderLocked = (progress) => {
  return (
    progress === "FITTING_COMPLETED" ||
    progress === "READY_FOR_DISPATCH"
  );
};

  const ORDER_STEPS = [
    { key: "ORDER_PLACED", label: "Order Placed" },
    { key: "WAREHOUSE_COLLECTED", label: "Warehouse Collected" },
    { key: "FITTING_IN_PROGRESS", label: "Fitting In Progress" },
    { key: "FITTING_COMPLETED", label: "Fitting Completed" },
    { key: "READY_FOR_DISPATCH", label: "Ready For Dispatch" },
  ];

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6 flex justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg"
          />

          <button
            onClick={() => setShowForm(true)}
            className="bg-amber-600 px-4 py-2 rounded-lg text-black"
          >
            Add Order
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="w-full border border-neutral-700">
            <thead>
              <tr className="bg-neutral-800">
                <th className="p-3 text-left">Order ID</th>
                <th className="p-3 text-left">Dispatched To</th>
                <th className="p-3 text-left">Chair</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Qty</th>
                <th className="p-3 text-left">Progress</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((o) => (
                <React.Fragment key={o._id}>
                  {/* MAIN ROW */}
                  <tr className="border-t border-neutral-700">
                    <td className="p-3">{o.orderId}</td>
                    <td className="p-3">{o.dispatchedTo}</td>
                    <td className="p-3">{o.chairModel}</td>
                    <td className="p-3">
                      {new Date(o.orderDate).toLocaleDateString()}
                    </td>
                    <td className="p-3">{o.quantity}</td>
                    <td className="p-3">
                      <ProgressTracker progress={o.progress} orderId={o._id} />
                    </td>
                    <td className="p-3 flex gap-3">
                      <button
                        onClick={() => handleEditOrder(o)}
                        disabled={isOrderLocked(o.progress)}
                        className={
                          isOrderLocked(o.progress)
                            ? "opacity-40 cursor-not-allowed"
                            : ""
                        }
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteOrder(o._id)}
                        disabled={isOrderLocked(o.progress)}
                        className={
                          isOrderLocked(o.progress)
                            ? "opacity-40 cursor-not-allowed"
                            : ""
                        }
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

        const percent =
          currentIndex <= 0
            ? 0
            : (currentIndex / (ORDER_STEPS.length - 1)) * 100;

        return (
          <div className="w-full space-y-6">
            {/* TITLE */}
            <p className="text-sm text-neutral-300">
              Order Progress
            </p>

            {/* STEP LABELS */}
            <div className="flex justify-between text-xs text-neutral-400">
              {ORDER_STEPS.map((step, index) => (
                <span
                  key={step.key}
                  className={
                    index <= currentIndex
                      ? "text-neutral-200"
                      : ""
                  }
                >
                  {step.label}
                </span>
              ))}
            </div>

            {/* TRACK */}
            <div className="relative w-full h-4">
              {/* BASE LINE */}
              <div className="absolute top-1/2 w-full h-[4px] bg-neutral-700 rounded-full -translate-y-1/2" />

              {/* PROGRESS LINE (GRADIENT) */}
              <div
                className="absolute top-1/2 h-[4px] rounded-full transition-all duration-500 -translate-y-1/2"
                style={{
                  width: `${percent}%`,
                  background:
                    "linear-gradient(90deg, #22c55e, #f59e0b)",
                }}
              />

              {/* CURRENT DOT */}
              <div
                className="absolute top-1/2 w-4 h-4 rounded-full shadow border-2 border-black -translate-y-1/2"
                style={{
                  left: `calc(${percent}% - 8px)`,
                  backgroundColor:
                    currentIndex === ORDER_STEPS.length - 1
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

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <form
            onSubmit={handleCreateOrder}
            className="bg-neutral-800 p-6 rounded-xl space-y-4 w-full max-w-md"
          >
            <input
              name="dispatchedTo"
              value={formData.dispatchedTo}
              onChange={handleFormChange}
              placeholder="Dispatched To"
              className="w-full px-4 py-2 bg-neutral-900 border border-neutral-600"
            />
            <input
              name="chairModel"
              value={formData.chairModel}
              onChange={handleFormChange}
              placeholder="Chair Model"
              className="w-full px-4 py-2 bg-neutral-900 border border-neutral-600"
            />
            <input
              type="date"
              name="orderDate"
              value={formData.orderDate}
              onChange={handleFormChange}
              className="w-full px-4 py-2 bg-neutral-900 border border-neutral-600"
            />
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleFormChange}
              className="w-full px-4 py-2 bg-neutral-900 border border-neutral-600"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingOrderId(null);
                  setFormData(initialFormData);
                }}
              >
                Cancel
              </button>
              <button className="bg-amber-600 px-4 py-2 text-black rounded-lg">
                {editingOrderId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
