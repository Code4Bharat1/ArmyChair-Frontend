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

  /* FORM */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    partName: "", // Spare Part Name
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

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <InventorySidebar />

      {/* MAIN */}
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between ">
          <div>
            <h1 className="text-2xl font-bold">Spare Parts Inventory</h1>
            <p className="text-sm mb-5 text-neutral-400">
              Manage your spare parts stock levels and details
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow"
          >
            <Plus size={16} /> Add Inventory
          </button>
        </div>

        {/* STATS */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard title="Total Parts" value={totalParts} icon={<Boxes />} />
            <StatCard
              title="Total Quantity"
              value={totalQty}
              icon={<Warehouse />}
            />
            <StatCard
              title="Low / Critical"
              value={lowStock}
              danger
              icon={<TrendingDown />}
            />
          </div>

          {/* ALERT */}
          {lowStock > 0 && (
            <div className="bg-amber-950/60 border border-amber-800 p-4 mb-4 flex gap-3 rounded-lg">
              <AlertCircle className="text-amber-400" />
              {lowStock} spare parts need restocking
            </div>
          )}

          {/* TABLE */}
          <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700">
            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-850 border-b border-neutral-700">
                  <tr>
                    {[
                      "Part",
                      "Source",
                      "Qty",
                      "Location",
                      "Status",
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
                  {data.map((i) => (
                    <tr
                      key={i.id}
                      className="border-b border-neutral-700 hover:bg-neutral-850 transition"
                    >
                      <td className="p-4 font-medium">{i.name}</td>

                      <td className="p-4 flex items-center gap-2 text-sm">
                        <Building2 size={14} className="text-neutral-400" />
                        {i.source}
                      </td>

                      <td className="p-4">{i.quantity}</td>
                      <td className="p-4 flex items-center gap-2 text-sm">
                        <MapPin size={14} className="text-neutral-400" />
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
                            });

                            setShowForm(true);
                          }}
                          className="text-amber-400 hover:text-amber-300"
                        >
                          <Pencil size={16} />
                        </button>

                        {/* DELETE */}
                        <button
                          onClick={() => deletePart(i.id)}
                          className="text-red-400 hover:text-red-300"
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
                          className="text-sky-400 hover:text-sky-300"
                        >
                          <ArrowLeftRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ADD / EDIT MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-neutral-900 p-6 rounded-xl w-[380px] border border-neutral-700">
              <h2 className="text-lg font-semibold mb-4">
                {editId ? "Update Spare Part" : "Add Spare Part"}
              </h2>

             

              <Input  
                label="Spare Part Name"
                value={form.partName}
                onChange={(v) => setForm({ ...form, partName: v })}
              />

              <Input
                label="Location"
                value={form.location}
                onChange={(v) => setForm({ ...form, location: v })}
              />
              <Input
                label="Quantity"
                type="number"
                value={form.quantity}
                onChange={(v) => setForm({ ...form, quantity: v })}
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditId(null);
                  }}
                  className="px-4 py-2 text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPart}
                  className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TRANSFER MODAL */}
        {showTransfer && transferItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-neutral-900 p-6 rounded-xl w-[380px] border border-neutral-700">
              <h2 className="text-lg font-semibold mb-4">Transfer Location</h2>

              <p className="text-sm text-neutral-400 mb-2">
                Part:{" "}
                <span className="text-neutral-200">{transferItem.name}</span>
              </p>
              <p className="text-sm text-neutral-400 mb-4">
                From:{" "}
                <span className="text-neutral-200">
                  {transferItem.location}
                </span>
              </p>

              {/* DROPDOWN LOCATION */}
              <div className="mb-3">
                <label className="text-xs text-neutral-400">To Location</label>
                <select
                  value={transfer.toLocation}
                  onChange={(e) =>
                    setTransfer({ ...transfer, toLocation: e.target.value })
                  }
                  className="w-full mt-1 p-2 bg-neutral-800 rounded outline-none"
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
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowTransfer(false);
                    setTransfer({ toLocation: "", quantity: "" });
                    setTransferItem(null);
                  }}
                  className="px-4 py-2 text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTransfer}
                  className="bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded"
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

const StatCard = ({ title, value, icon, danger }) => (
  <div
    className={`p-5 rounded-xl border ${
      danger
        ? "bg-red-950/40 border-red-800"
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

const StatusBadge = ({ status }) => {
  const map = {
    Healthy: "bg-green-900 text-green-300",
    "Low Stock": "bg-amber-900 text-amber-300",
    Critical: "bg-red-900 text-red-300",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${map[status]}`}
    >
      {status}
    </span>
  );
};

const Input = ({ label, value, onChange, type = "text" }) => (
  <div className="mb-3">
    <label className="text-xs text-neutral-400">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full mt-1 p-2 bg-neutral-800 rounded outline-none"
    />
  </div>
);
