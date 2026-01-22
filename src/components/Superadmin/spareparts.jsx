"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  Boxes,
  TrendingDown,
  Warehouse,
  MapPin,
  Building2,
  ArrowLeftRight,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";

/* ================= PAGE ================= */
export default function SparePartsInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const role =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user"))?.role
      : null;

  /* FORM */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    partName: "", // Spare Part Name
    location: "",
    quantity: "",
    maxQuantity: "",
  });

  const VENDORS = ["Ramesh", "Suresh", "Mahesh", "Akash", "Vikram", "Amit"];

  const LOCATIONS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  /* TRANSFER */
  const [showTransfer, setShowTransfer] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [transferItem, setTransferItem] = useState(null);
  const [transfer, setTransfer] = useState({
    toLocation: "",
    quantity: "",
  });

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchParts = async () => {
    try {
      const res = await axios.get(`${API}/inventory/spare-parts`, { headers });
      setItems(res.data.inventory || res.data);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

  /* ================= SAVE ================= */
  const submitPart = async () => {
    try {
      if (!form.partName || !form.location || form.quantity === "") {
        return alert("All fields required");
      }

      const payload = {
        partName: form.partName,
        location: form.location,
        quantity: Number(form.quantity),
      };

      if (role === "admin" && form.maxQuantity !== "") {
        payload.maxQuantity = Number(form.maxQuantity);
      }

      if (editId) {
        await axios.patch(
          `${API}/inventory/spare-parts/update/${editId}`,
          payload,
          { headers },
        );
      } else {
        await axios.post(`${API}/inventory/spare-parts`, payload, { headers });
      }

      setShowForm(false);
      setForm({
        partName: "",
        location: "",
        quantity: "",
        maxQuantity: "",
      });

      setEditId(null);
      fetchParts();
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  /* ================= DELETE ================= */
  const deletePart = async (id) => {
    if (!confirm("Delete this spare part?")) return;
    try {
      await axios.delete(`${API}/inventory/spare-parts/delete/${id}`, {
        headers,
      });
      fetchParts();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  /* ================= TRANSFER ================= */
  const submitTransfer = async () => {
    try {
      if (!transfer.toLocation || transfer.quantity === "") {
        return alert("Destination location and quantity required");
      }

      const qty = Number(transfer.quantity);
      if (qty <= 0) return alert("Quantity must be greater than 0");
      if (qty > transferItem.quantity)
        return alert("Not enough stock in source location");

      const payload = {
        sourceId: transferItem.id, // ✅ ID-based transfer
        toLocation: transfer.toLocation,
        quantity: qty,
      };

      await axios.post(`${API}/transfer`, payload, { headers });

      setShowTransfer(false);
      setTransfer({ toLocation: "", quantity: "" });
      setTransferItem(null);
      fetchParts();
    } catch (err) {
      console.error("Transfer failed", err?.response?.data || err);
      alert(err?.response?.data?.message || "Transfer failed");
    }
  };
  const formatRole = (role) =>
    role ? role.charAt(0).toUpperCase() + role.slice(1) : "—";

  /* ================= DATA ================= */
  const data = useMemo(() => {
    return items.map((i) => ({
      id: i._id,
      name: i.partName,
      source: `${formatRole(i.createdByRole)} - ${i.createdBy?.name || "—"}`,
      location: i.location,
      quantity: i.quantity,
      maxQuantity: i.maxQuantity,
      status: i.status,
    }));
  }, [items]);
  const filteredData = useMemo(() => {
    if (statusFilter === "ALL") return data;

    if (statusFilter === "LOW") {
      return data.filter(
        (i) => i.status === "Low Stock" || i.status === "Critical",
      );
    }

    if (statusFilter === "OVERSTOCK") {
      return data.filter((i) => i.status === "Overstocked");
    }

    return data;
  }, [data, statusFilter]);

  /* ================= LOCATIONS (FOR DROPDOWN) ================= */
  const locations = useMemo(() => {
    const set = new Set(items.map((i) => i.location));
    return Array.from(set);
  }, [items]);

  /* ================= STATS ================= */
  const totalParts = data.length;
const totalQty = data.reduce((s, i) => s + i.quantity, 0);
const lowStock = data.filter(
  (i) => i.status === "Low Stock" || i.status === "Critical"
).length;
const overStock = data.filter((i) => i.status === "Overstocked").length;

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <InventorySidebar />

      {/* MAIN */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Spare Parts Inventory
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your spare parts stock levels and details
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus size={18} /> Add Inventory
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-8 space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KpiCard
  title="Total Parts"
  value={totalParts}
  icon={<Boxes className="text-[#c62d23]" />}
  active={statusFilter === "ALL"}
  onClick={() => setStatusFilter("ALL")}
/>

            <KpiCard
              title="Total Quantity"
              value={totalQty}
              icon={<Warehouse className="text-[#c62d23]" />}
            />
           <KpiCard
  title="Low / Critical"
  value={lowStock}
  icon={<TrendingDown className="text-[#c62d23]" />}
  danger
  active={statusFilter === "LOW"}
  onClick={() => setStatusFilter("LOW")}
/>

            <KpiCard
  title="Overstocked"
  value={overStock}
  icon={<Boxes className="text-blue-600" />}
  info
  active={statusFilter === "OVERSTOCK"}
  onClick={() => setStatusFilter("OVERSTOCK")}
/>

          </div>

          {/* ALERT */}
          {lowStock > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-center">
              <AlertCircle className="text-red-500" />
              <span className="text-red-700 font-medium">
                {lowStock} spare parts need restocking
              </span>
            </div>
          )}

          {/* TABLE */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-lg text-gray-900 mb-6">
              Spare Parts Overview
            </h2>

            <div className="overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-4 font-semibold text-gray-700">
                      Part
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      Source
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      Qty
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      Max Qty
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      Location
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        No spare parts available
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((i, index) => (

                      <tr
                        key={i.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="p-4 font-medium text-gray-900">
                          {i.name}
                        </td>

                        <td className="p-4 text-gray-700 flex items-center gap-2">
                          <Building2 size={16} className="text-gray-400" />
                          {i.source}
                        </td>

                        <td className="p-4 font-semibold text-gray-900">
                          {i.quantity}
                        </td>
                        <td className="p-4 text-gray-700">
                          {i.maxQuantity ?? "—"}
                        </td>

                        <td className="p-4 text-gray-700 flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          {i.location}
                        </td>

                        <td className="p-4">
                          <StatusBadge status={i.status} />
                        </td>

                        <td className="p-4 flex gap-3">
                          {/* EDIT */}
                          <button
                            onClick={() => {
                              setEditId(i.id);
                              setForm({
                                partName: i.name,
                                location: i.location,
                                quantity: i.quantity,
                                maxQuantity: i.maxQuantity ?? "",
                              });

                              setShowForm(true);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Pencil
                              size={16}
                              className="text-gray-600 hover:text-[#c62d23]"
                            />
                          </button>

                          {/* TRANSFER */}
                          <button
                            onClick={() => {
                              setTransferItem(i);
                              setShowTransfer(true);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Transfer Location"
                          >
                            <ArrowLeftRight
                              size={16}
                              className="text-gray-600 hover:text-[#c62d23]"
                            />
                          </button>

                          {/* DELETE */}
                          <button
                            onClick={() => deletePart(i.id)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2
                              size={16}
                              className="text-gray-600 hover:text-red-600"
                            />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md border border-gray-200 shadow-lg">
            <h2 className="font-bold text-xl text-gray-900 mb-6">
              {editId ? "Update Spare Part" : "Add Spare Part"}
            </h2>

            <Input
              label="Spare Part Name"
              value={form.partName}
              onChange={(v) => setForm({ ...form, partName: v })}
              placeholder="Enter part name"
            />

            <Input
              label="Location"
              value={form.location}
              onChange={(v) => setForm({ ...form, location: v })}
              placeholder="Enter location"
            />

            <Input
              label="Quantity"
              type="number"
              value={form.quantity}
              onChange={(v) => setForm({ ...form, quantity: v })}
              placeholder="Enter quantity"
            />
            {role === "admin" && (
              <Input
                label="Max Quantity"
                type="number"
                value={form.maxQuantity}
                onChange={(v) => setForm({ ...form, maxQuantity: v })}
                placeholder="Enter max stock level"
              />
            )}

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm({ partName: "", location: "", quantity: "" });
                }}
                className="px-5 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitPart}
                className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-2.5 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {editId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransfer && transferItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md border border-gray-200 shadow-lg">
            <h2 className="font-bold text-xl text-gray-900 mb-6">
              Transfer Location
            </h2>

            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">Part</p>
              <p className="font-medium text-gray-900">{transferItem.name}</p>
              <p className="text-sm text-gray-600 mt-2">Current Location</p>
              <p className="font-medium text-gray-900">
                {transferItem.location}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Location
                </label>
                <select
                  value={transfer.toLocation}
                  onChange={(e) =>
                    setTransfer({ ...transfer, toLocation: e.target.value })
                  }
                  className="w-full p-3 bg-white rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                >
                  <option value="">Select Location</option>
                  {locations
                    .filter((loc) => loc !== transferItem.location)
                    .map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                </select>
              </div>

              <Input
                label="Quantity"
                type="number"
                value={transfer.quantity}
                onChange={(v) => setTransfer({ ...transfer, quantity: v })}
                placeholder="Enter quantity to transfer"
              />
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTransfer(false);
                  setTransfer({ toLocation: "", quantity: "" });
                  setTransferItem(null);
                }}
                className="px-5 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitTransfer}
                className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-2.5 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const KpiCard = ({
  title,
  value,
  icon,
  danger = false,
  info = false,
  active = false,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`cursor-pointer bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full
      ${active ? "ring-2 ring-[#c62d23]" : "border-gray-200"}
    `}
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>

    <p
      className={`text-3xl font-bold mb-1 ${
        danger
          ? "text-red-600"
          : info
          ? "text-blue-600"
          : "text-gray-900"
      }`}
    >
      {value}
    </p>
  </div>
);


const StatusBadge = ({ status }) => {
  const map = {
    Healthy: "bg-green-100 text-green-800",
    "Low Stock": "bg-amber-100 text-amber-800",
    Critical: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`px-3 py-1.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3 bg-white rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
    />
  </div>
);
