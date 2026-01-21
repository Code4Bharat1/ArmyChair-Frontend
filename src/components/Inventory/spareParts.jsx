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
  X,
  Package,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";

/* ================= PAGE ================= */
export default function SparePartsInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  /* FORM */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    partName: "",
    location: "",
    quantity: "",
  });

  const VENDORS = ["Ramesh", "Suresh", "Mahesh", "Akash", "Vikram", "Amit"];

  const LOCATIONS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  /* TRANSFER */
  const [showTransfer, setShowTransfer] = useState(false);
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
      setForm({ partName: "", location: "", quantity: "" });
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
        sourceId: transferItem.id,
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
    return items.map((i) => {
      let status = "Healthy";
      if (i.quantity === 0) status = "Critical";
      else if (i.quantity < 50) status = "Low Stock";

      return {
        id: i._id,
        name: i.partName,
        source: `${formatRole(i.createdByRole)} - ${i.createdBy?.name || "—"}`,
        location: i.location,
        quantity: i.quantity,
        status,
      };
    });
  }, [items]);

  /* ================= LOCATIONS (FOR DROPDOWN) ================= */
  const locations = useMemo(() => {
    const set = new Set(items.map((i) => i.location));
    return Array.from(set);
  }, [items]);

  /* ================= STATS ================= */
  const totalParts = data.length;
  const totalQty = data.reduce((s, i) => s + i.quantity, 0);
  const lowStock = data.filter((i) => i.status !== "Healthy").length;

  /* ================= FILTERED DATA ================= */
  const displayData = useMemo(() => {
    if (showLowStockOnly) {
      return data.filter((i) => i.status !== "Healthy");
    }
    return data;
  }, [data, showLowStockOnly]);

  const closeModal = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ partName: "", location: "", quantity: "" });
  };

  const closeTransferModal = () => {
    setShowTransfer(false);
    setTransfer({ toLocation: "", quantity: "" });
    setTransferItem(null);
  };

  /* ================= UI ================= */
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <InventorySidebar />

      {/* MAIN */}
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={32} className="text-[#c62d23]" />
                <span>Spare Parts Inventory</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your spare parts stock levels and details
              </p>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="bg-[#c62d23] hover:bg-[#a82419] text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c62d23]/20 font-medium transition-all"
            >
              <Plus size={18} /> Add Spare Part
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Total Parts" 
              value={totalParts} 
              icon={<Boxes className="text-[#c62d23]" />} 
            />
            <StatCard
              title="Total Quantity"
              value={totalQty}
              icon={<Warehouse className="text-[#c62d23]" />}
            />
            <StatCard
              title="Low / Critical"
              value={lowStock}
              danger
              icon={<TrendingDown className="text-[#c62d23]" />}
              clickable={true}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              active={showLowStockOnly}
            />
          </div>

          {/* FILTER BADGE */}
          {showLowStockOnly && (
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 border border-amber-300 px-4 py-2 rounded-xl flex items-center gap-2">
                <AlertCircle className="text-amber-700" size={18} />
                <span className="text-sm font-medium text-amber-800">
                  Showing only low stock items
                </span>
              </div>
              <button
                onClick={() => setShowLowStockOnly(false)}
                className="text-sm text-gray-600 hover:text-[#c62d23] font-medium"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* ALERT */}
          {lowStock > 0 && !showLowStockOnly && (
            <div className="bg-amber-50 border border-amber-200 p-4 flex gap-3 rounded-xl">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
              <div className="flex-1">
                <span className="text-sm text-amber-800 font-medium">
                  {lowStock} spare parts need restocking
                </span>
                <button
                  onClick={() => setShowLowStockOnly(true)}
                  className="ml-3 text-sm text-amber-700 hover:text-amber-900 font-semibold underline"
                >
                  View items
                </button>
              </div>
            </div>
          )}

          {/* TABLE */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500">Loading...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        "Part Name",
                        "Source",
                        "Quantity",
                        "Location",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-4 text-left font-semibold text-gray-700"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {displayData.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-500">
                          {showLowStockOnly ? "No low stock items" : "No spare parts found"}
                        </td>
                      </tr>
                    ) : (
                      displayData.map((i, index) => (
                        <tr
                          key={i.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="p-4 font-medium text-gray-900">{i.name}</td>

                          <td className="p-4">
                            <div className="flex items-center gap-2 text-gray-700 text-sm">
                              <Building2 size={16} className="text-gray-400" />
                              {i.source}
                            </div>
                          </td>

                          <td className="p-4 font-semibold text-gray-900">{i.quantity}</td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-gray-700">
                              <MapPin size={16} className="text-gray-400" />
                              {i.location}
                            </div>
                          </td>

                          <td className="p-4">
                            <StatusBadge status={i.status} />
                          </td>

                          <td className="p-4">
                            <div className="flex gap-2">
                              {/* EDIT */}
                              <button
                                onClick={() => {
                                  setEditId(i.id);
                                  setForm({
                                    partName: i.name,
                                    location: i.location,
                                    quantity: i.quantity,
                                  });
                                  setShowForm(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>

                              {/* DELETE */}
                              <button
                                onClick={() => deletePart(i.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>

                              {/* TRANSFER */}
                              <button
                                onClick={() => {
                                  setTransferItem(i);
                                  setShowTransfer(true);
                                }}
                                title="Transfer Location"
                                className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                              >
                                <ArrowLeftRight size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ADD / EDIT MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#c62d23]/10 rounded-xl flex items-center justify-center">
                    <Package className="text-[#c62d23]" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editId ? "Update Spare Part" : "Add Spare Part"}
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
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
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPart}
                  className="flex-1 py-3 rounded-xl bg-[#c62d23] hover:bg-[#a82419] text-white font-medium transition-colors shadow-sm"
                >
                  {editId ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TRANSFER MODAL */}
        {showTransfer && transferItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                    <ArrowLeftRight className="text-sky-600" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Transfer Location</h2>
                </div>
                <button
                  onClick={closeTransferModal}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium">Part Name</p>
                      <p className="text-gray-900 font-semibold">{transferItem.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">From Location</p>
                      <p className="text-gray-900 font-semibold">{transferItem.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Available Qty</p>
                      <p className="text-gray-900 font-semibold">{transferItem.quantity}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    To Location
                  </label>
                  <select
                    value={transfer.toLocation}
                    onChange={(e) =>
                      setTransfer({ ...transfer, toLocation: e.target.value })
                    }
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none text-gray-900 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
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
                  label="Quantity to Transfer"
                  type="number"
                  value={transfer.quantity}
                  onChange={(v) => setTransfer({ ...transfer, quantity: v })}
                  placeholder={`Max: ${transferItem.quantity}`}
                />
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={closeTransferModal}
                  className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTransfer}
                  className="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors shadow-sm"
                >
                  Transfer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon, danger, clickable, onClick, active }) => (
  <div
    onClick={clickable ? onClick : undefined}
    className={`bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full ${
      danger ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
    } ${clickable ? 'cursor-pointer hover:bg-gray-50 hover:border-[#c62d23]' : ''} ${
      active ? 'ring-2 ring-[#c62d23]' : ''
    }`}
    style={{
      borderLeft: '4px solid #c62d23'
    }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    {clickable && (
      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
        <span>{active ? 'Click to show all' : 'Click to view details'}</span>
        <span className="text-[#c62d23]">→</span>
      </div>
    )}
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    Healthy: "bg-green-50 text-green-700 border-green-200",
    "Low Stock": "bg-amber-50 text-amber-700 border-amber-200",
    Critical: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${map[status]}`}>
      {status}
    </span>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-900 mb-2">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
    />
  </div>
);