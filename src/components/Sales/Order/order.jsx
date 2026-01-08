"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, User, ChevronDown } from "lucide-react";
import axios from "axios";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrders, setSelectedOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
  orderId: "",
  dispatchedTo: "",
  chairModel: "",
  chairDetail: "",
  orderDate: "",
  deliveryDate: "",
  quantity: "",       // ✅ ADD THIS
  onTime: true,
  assembly: "Unassembled",
  amount: "",
});


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
      amount: Number(formData.amount),
    };

    await axios.post(`${API}/orders`, payload, { headers });

    setShowForm(false);
    setFormData({
      orderId: "",
      dispatchedTo: "",
      chairModel: "",
      chairDetail: "",
      orderDate: "",
      deliveryDate: "",
      onTime: true,
      assembly: "Unassembled",
      amount: "",
    });

    fetchOrders();
  } catch (err) {
  if (axios.isAxiosError(err)) {
    console.error(
      "Create order failed:",
      err.response?.data || err.message
    );
  } else {
    console.error("Unexpected error:", err);
  }
  alert("Failed to create order");
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
const ProgressTracker = ({ progress }) => {
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
      : steps.indexOf(progress);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={`w-3 h-3 rounded-full ${
              index <= currentIndex
                ? "bg-amber-500"
                : "bg-neutral-700"
            }`}
          />
          {index !== steps.length - 1 && (
            <div className="w-4 h-[2px] bg-neutral-700" />
          )}
        </div>
      ))}
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

      <td className="p-4">
        <ProgressTracker progress={order.progress} />
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

      {/* FLOATING BUTTON
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-neutral-950 border border-neutral-700 rounded-full text-2xl text-white hover:bg-neutral-800"
      >
        +
      </button> */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Create Dispatch Order
            </h2>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  name="orderId"
                  value={formData.orderId}
                  onChange={handleFormChange}
                  placeholder="Order ID"
                  required
                  className="input"
                />
                <input
                  name="dispatchedTo"
                  value={formData.dispatchedTo}
                  onChange={handleFormChange}
                  placeholder="Dispatched To"
                  required
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="chairModel"
                  value={formData.chairModel}
                  onChange={handleFormChange}
                  placeholder="Chair Model"
                  required
                  className="input"
                />
                <input
                  name="chairDetail"
                  value={formData.chairDetail}
                  onChange={handleFormChange}
                  placeholder="Chair Detail"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  name="orderDate"
                  value={formData.orderDate}
                  onChange={handleFormChange}
                  required
                  className="input"
                />
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleFormChange}
                  required
                  className="input"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                 <input
    type="number"
    name="quantity"
    value={formData.quantity}
    onChange={handleFormChange}
    placeholder="Quantity"
    required
    min="1"
    className="input"
  />
                <select
                  name="assembly"
                  value={formData.assembly}
                  onChange={handleFormChange}
                  className="input"
                >
                  <option value="Assembled">Assembled</option>
                  <option value="Unassembled">Unassembled</option>
                </select>

                <label className="flex items-center gap-2 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    name="onTime"
                    checked={formData.onTime}
                    onChange={handleFormChange}
                    className="accent-amber-600"
                  />
                  On Time
                </label>

                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleFormChange}
                  placeholder="Amount"
                  required
                  className="input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border border-neutral-700 rounded-lg text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 rounded-lg text-black font-medium"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
