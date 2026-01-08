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
        await axios.put(`${API}/orders/${editingOrderId}`, payload, { headers });
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
    const steps = [
      "ORDER_PLACED",
      "WAREHOUSE_COLLECTED",
      "FITTING_IN_PROGRESS",
      "FITTING_COMPLETED",
      "READY_FOR_DISPATCH",
    ];

    const currentIndex = Math.max(steps.indexOf(progress), 0);
    const isExpanded = expandedOrderId === orderId;

    return (
      <div className="cursor-pointer">
        <div
          onClick={() => setExpandedOrderId(isExpanded ? null : orderId)}
          className="flex items-center gap-2"
        >
          {steps.map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full ${
                  i <= currentIndex ? "bg-amber-500" : "bg-neutral-700"
                }`}
              />
              {i !== steps.length - 1 && (
                <div className="w-4 h-[2px] bg-neutral-700" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

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
                <tr key={o._id} className="border-t border-neutral-700">
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
                    <button onClick={() => handleEditOrder(o)}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDeleteOrder(o._id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
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
