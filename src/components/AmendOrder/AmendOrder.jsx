"use client";

import { useState } from "react";
import axios from "axios";

export default function AmendOrderModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
  dispatchedTo: order.dispatchedTo?.name || "",
  orderDate: order.orderDate?.slice(0, 10),
  deliveryDate: order.deliveryDate?.slice(0, 10),
});

  const submit = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/orders/${order._id}/pre-dispatch-edit`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      onSuccess();
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to amend order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold mb-4">
          Amend Order Before Dispatch
        </h2>

        {/* Dispatched To */}
<label className="block text-sm font-medium mb-1">
  Dispatched To (Vendor)
</label>
<input
  type="text"
  value={form.dispatchedTo}
  onChange={(e) =>
    setForm({ ...form, dispatchedTo: e.target.value })
  }
  placeholder="Enter vendor name"
  className="w-full border rounded-lg px-3 py-2 mb-3"
/>


        {/* Order Date */}
        <label className="block text-sm font-medium mb-1">Order Date</label>
        <input
          type="date"
          value={form.orderDate}
          onChange={(e) =>
            setForm({ ...form, orderDate: e.target.value })
          }
          className="w-full border rounded-lg px-3 py-2 mb-3"
        />

        {/* Delivery Date */}
        <label className="block text-sm font-medium mb-1">Delivery Date</label>
        <input
          type="date"
          value={form.deliveryDate}
          onChange={(e) =>
            setForm({ ...form, deliveryDate: e.target.value })
          }
          className="w-full border rounded-lg px-3 py-2 mb-4"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={submit}
            className="bg-[#c62d23] text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
