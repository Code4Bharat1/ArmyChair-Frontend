"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, User, ChevronDown, Pencil, Trash2 } from "lucide-react";
import axios from "axios";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [selectedOrders, setSelectedOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const initialFormData = {
    orderId: "",
    dispatchedTo: "",
    chairModel: "",
    chairDetail: "",
    orderDate: "",
    deliveryDate: "",
    quantity: "",
    onTime: true,
    assembly: "Unassembled",
    amount: "",
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleEditOrder = (order) => {
    setEditingOrderId(order._id);
    setFormData({
      orderId: order.orderId,
      dispatchedTo: order.dispatchedTo,
      chairModel: order.chairModel,
      chairDetail: order.chairDetail || "",
      orderDate: order.orderDate.split("T")[0],
      deliveryDate: order.deliveryDate.split("T")[0],
      quantity: order.quantity,
      onTime: order.onTime,
      assembly: order.assembly,
      amount: order.amount,
    });
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        amount: Number(formData.amount),
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
      console.error("Save failed", err);
      alert("Failed to save order");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this order?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API}/orders/${orderId}`, { headers });
      fetchOrders();
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete order");
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

  /* ================= SELECT ================= */
  const handleSelectOrder = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
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
  const totalDispatches = orders.length;

  const onTimeCount = orders.filter((o) => o.onTime === true).length;
  const onTimePercent =
    totalDispatches === 0
      ? 0
      : Math.round((onTimeCount / totalDispatches) * 100);

  const delayedCount = orders.filter((o) => o.onTime === false).length;

  /* ================= STYLES ================= */
  const getDeliveryStyle = (onTime) =>
    onTime ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300";

  const getAssemblyStyle = (assembly) =>
    assembly === "Assembled"
      ? "bg-amber-900 text-amber-300"
      : "bg-neutral-700 text-neutral-300";

  const ProgressTracker = ({ progress, orderId }) => {
    const steps = [
      "warehouse",
      "fitting",
      "order_ready",
      "dispatched",
      "delivered",
    ];

    const currentIndex =
      typeof progress === "number"
        ? progress - 1
        : Math.max(steps.indexOf(progress), 0);

    const isExpanded = expandedOrderId === orderId;

    return (
      <div className="cursor-pointer">
        {/* COMPACT VIEW */}
        <div
          onClick={() => setExpandedOrderId(isExpanded ? null : orderId)}
          className="flex items-center gap-2"
        >
          {steps.map((_, index) => (
            <div key={index} className="flex items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full ${
                  index <= currentIndex ? "bg-amber-500" : "bg-neutral-700"
                }`}
              />
              {index !== steps.length - 1 && (
                <div className="w-4 h-[2px] bg-neutral-700" />
              )}
            </div>
          ))}
        </div>

        {/* EXPANDED VIEW */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? "max-h-40 opacity-100 mt-3" : "max-h-0 opacity-0"
          }`}
        >
          <div
            className={`space-y-2 transition-transform duration-300 ${
              isExpanded ? "translate-y-0" : "-translate-y-2"
            }`}
          >
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-3 text-sm">
                <div
                  className={`w-3 h-3 rounded-full ${
                    index <= currentIndex ? "bg-amber-500" : "bg-neutral-700"
                  }`}
                />
                <span
                  className={
                    index <= currentIndex
                      ? "text-amber-400"
                      : "text-neutral-400"
                  }
                >
                  {step.replace("_", " ").toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders or dispatch location..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {/* TITLE */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Sales Dispatch Orders
              </h1>
              <p className="text-sm text-neutral-400">
                Track dispatch, delivery timeliness, and assembly status.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded-lg text-sm">
                Export CSV
              </button>

              <button
                onClick={() => setShowForm(true)}
                className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm font-medium text-black"
              >
                Add Order
              </button>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase mb-2">
                TOTAL DISPATCHES
              </div>
              <div className="text-3xl font-bold text-white">
                {totalDispatches}
              </div>
              <div className="text-xs text-neutral-400">All time</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase mb-2">
                ON-TIME DELIVERIES
              </div>
              <div className="text-3xl font-bold text-green-400">
                {onTimePercent}%
              </div>
              <div className="text-xs text-neutral-400">Based on records</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase mb-2">
                DELAYED
              </div>
              <div className="text-3xl font-bold text-red-500">
                {delayedCount}
              </div>
              <div className="text-xs text-red-400">Needs attention</div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-neutral-700 flex justify-between">
              <h2 className="text-lg font-semibold text-white">
                Dispatch Orders
              </h2>
              <button className="text-sm text-amber-500">View Filters</button>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6 text-center">Loading...</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-700 bg-neutral-850">
                      {[
                        "Order ID",
                        "Dispatched To",
                        "Chairs",
                        "Order Date",
                        "Quantity",
                        "Progress",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-4 text-xs text-neutral-400 uppercase text-left"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order._id}
                        className="border-b border-neutral-700 hover:bg-neutral-750"
                      >
                        <td className="p-4 text-sm text-neutral-300">
                          {order.orderId}
                        </td>

                        <td className="p-4 text-sm text-neutral-300">
                          {order.dispatchedTo}
                        </td>

                        <td className="p-4 text-sm text-white">
                          {order.chairModel}
                        </td>

                        <td className="p-4 text-sm text-neutral-300">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </td>

                        <td className="p-4 text-sm text-neutral-300">
                          {order.quantity}
                        </td>

                        <td className="p-4 align-top">
                          <div className="relative">
                            <ProgressTracker
                              progress={order.progress}
                              orderId={order._id}
                            />
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="text-amber-400 hover:text-amber-300 transition"
                              title="Edit Order"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              onClick={() => handleDeleteOrder(order._id)}
                              className="text-red-500 hover:text-red-400 transition"
                              title="Delete Order"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* FOOTER ACTION */}
          <div className="mt-4 flex justify-end">
            <button className="text-sm text-amber-500">Sort by Date</button>
          </div>
        </div>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-800 border border-neutral-600 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-neutral-800 border-b border-neutral-700 p-6 z-10">
              <h2 className="text-2xl font-bold text-white">
                {editingOrderId ? "Update Order" : "Create New Order"}
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                {editingOrderId
                  ? "Modify the order details below"
                  : "Fill in the details to create a new dispatch order"}
              </p>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
              {/* Order Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider">
                  Order Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Order ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="orderId"
                      value={formData.orderId}
                      onChange={handleFormChange}
                      placeholder="e.g., ORD-2024-001"
                      required
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Dispatched To <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="dispatchedTo"
                      value={formData.dispatchedTo}
                      onChange={handleFormChange}
                      placeholder="e.g., Mumbai Warehouse"
                      required
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider">
                  Product Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Chair Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="chairModel"
                      value={formData.chairModel}
                      onChange={handleFormChange}
                      placeholder="e.g., Executive Pro X1"
                      required
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Chair Detail
                    </label>
                    <input
                      name="chairDetail"
                      value={formData.chairDetail}
                      onChange={handleFormChange}
                      placeholder="e.g., Black leather, adjustable"
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider">
                  Scheduling
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Order Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="orderDate"
                      value={formData.orderDate}
                      onChange={handleFormChange}
                      required
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-neutral-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="deliveryDate"
                      value={formData.deliveryDate}
                      onChange={handleFormChange}
                      required
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-neutral-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider">
                  Order Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleFormChange}
                      placeholder="1"
                      required
                      min="1"
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>

                  {/* <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleFormChange}
                      placeholder="0"
                      required
                      min="0"
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div> */}

                  {/* <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Assembly Status
                    </label>
                    <select
                      name="assembly"
                      value={formData.assembly}
                      onChange={handleFormChange}
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-neutral-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    >
                      <option value="Assembled">Assembled</option>
                      <option value="Unassembled">Unassembled</option>
                    </select>
                  </div> */}
                </div>

                <div className="flex items-center gap-3 p-4 bg-neutral-900 rounded-lg border border-neutral-600">
                  <input
                    type="checkbox"
                    name="onTime"
                    id="onTimeCheckbox"
                    checked={formData.onTime}
                    onChange={handleFormChange}
                    className="w-5 h-5 accent-amber-600 cursor-pointer"
                  />
                  <label
                    htmlFor="onTimeCheckbox"
                    className="text-sm font-medium text-neutral-300 cursor-pointer"
                  >
                    Mark as On-Time Delivery
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-neutral-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingOrderId(null);
                    setFormData(initialFormData);
                  }}
                  className="px-6 py-2.5 text-sm font-medium border border-neutral-600 rounded-lg text-neutral-300 hover:bg-neutral-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 rounded-lg text-black transition shadow-lg shadow-amber-600/20"
                >
                  {editingOrderId ? "Update Order" : "Create Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}