"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  Boxes,
  Warehouse,
  TrendingDown,
  Building2,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  /* FILTERS (future ready) */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVendor, setFilterVendor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  /* MODAL STATE */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    chairType: "",
    vendor: "",
    quantity: "",
  });

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken")
      : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory`, { headers });
      setInventory(res.data.inventory || res.data);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  /* ================= CREATE / UPDATE ================= */
  const submitInventory = async () => {
    try {
      if (!form.chairType || !form.vendor || form.quantity === "") {
        return alert("All fields required");
      }

      const payload = {
        chairType: form.chairType,
        vendor: form.vendor,
        quantity: Number(form.quantity),
      };

      if (editId) {
        await axios.patch(`${API}/inventory/update/${editId}`, payload, {
          headers,
        });
      } else {
        await axios.post(`${API}/inventory`, payload, { headers });
      }

      setShowForm(false);
      setForm({ chairType: "", vendor: "", quantity: "" });
      setEditId(null);
      fetchInventory();
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  /* ================= DELETE ================= */
  const deleteInventory = async (id) => {
    if (!confirm("Delete this inventory item?")) return;
    try {
      await axios.delete(`${API}/inventory/delete/${id}`, { headers });
      fetchInventory();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  /* ================= TRANSFORM ================= */
  const inventoryData = useMemo(() => {
    return inventory.map((item) => {
      let status = "Healthy";
      if (item.quantity === 0) status = "Critical";
      else if (item.quantity < 100) status = "Low Stock";

      return {
        id: item._id,
        name: item.chairType,
        vendor: item.vendor || item.createdByRole || "Internal",
        quantity: item.quantity,
        status,
        lastUpdated: new Date(item.updatedAt).toLocaleString(),
      };
    });
  }, [inventory]);

  const filteredData = inventoryData.filter((i) => {
    return (
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterVendor === "All" || i.vendor === filterVendor) &&
      (filterStatus === "All" || i.status === filterStatus)
    );
  });

  /* ================= STATS (DYNAMIC) ================= */
  const totalStock = inventoryData.reduce((s, i) => s + i.quantity, 0);
  const totalProducts = inventoryData.length;
  const lowStockCount = inventoryData.filter(
    (i) => i.status !== "Healthy"
  ).length;

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <InventorySidebar />

      <div className="flex-1 overflow-auto  ">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between ">
          <div>
            <h1 className="text-2xl font-bold">Inventory Management</h1>
            <p className="text-sm mb-5 text-neutral-400">
              Track stock, vendors and availability
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow"
          >
            <Plus size={16} /> Add Inventory
          </button>
        </div>

        {/* ===== TOP CARDS ===== */}
        <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <StatCard
            title="Total Stock"
            value={totalStock}
            icon={<Warehouse />}
          />
          <StatCard
            title="Total Products"
            value={totalProducts}
            icon={<Boxes />}
          />
          <StatCard
            title="Low / Critical"
            value={lowStockCount}
            danger
            icon={<TrendingDown />}
          />
        </div>

        {/* ALERT */}
        {lowStockCount > 0 && (
          <div className="bg-amber-950/60 border border-amber-800 p-4 mb-5 flex gap-3 rounded-lg">
            <AlertCircle className="text-amber-400" />
            <span className="text-sm">
              {lowStockCount} items need immediate restocking
            </span>
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
                  {["Product", "Vendor", "Qty", "Status", "Actions"].map((h) => (
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
                {filteredData.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-neutral-700 hover:bg-neutral-850 transition"
                  >
                    <td className="p-4 font-medium">{i.name}</td>
                    <td className="p-4 flex items-center gap-2 text-sm">
                      <Building2 size={14} className="text-neutral-400" />
                      {i.vendor}
                    </td>
                    <td className="p-4">{i.quantity}</td>
                    <td className="p-4">
                      <StatusBadge status={i.status} />
                    </td>
                    <td className="p-4 flex gap-3">
                      <button
                        onClick={() => {
                          setEditId(i.id);
                          setForm({
                            chairType: i.name,
                            vendor: i.vendor,
                            quantity: i.quantity,
                          });
                          setShowForm(true);
                        }}
                        className="text-amber-400 hover:text-amber-300"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => deleteInventory(i.id)}
                        className="text-red-400 hover:text-red-300"
                      >
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
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-neutral-900 p-6 rounded-xl w-[380px] border border-neutral-700">
              <h2 className="text-lg font-semibold mb-4">
                {editId ? "Update Inventory" : "Add Inventory"}
              </h2>

              <label className="text-xs text-neutral-400">Chair Type</label>
              <input
                value={form.chairType}
                onChange={(e) =>
                  setForm({ ...form, chairType: e.target.value })
                }
                className="w-full mb-3 mt-1 p-2 bg-neutral-800 rounded outline-none"
              />

              <label className="text-xs text-neutral-400">Vendor</label>
              <input
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className="w-full mb-3 mt-1 p-2 bg-neutral-800 rounded outline-none"
              />

              <label className="text-xs text-neutral-400">Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: e.target.value })
                }
                className="w-full mb-5 mt-1 p-2 bg-neutral-800 rounded outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditId(null);
                  }}
                  className="px-4 py-2 text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={submitInventory}
                  className="bg-amber-600 px-4 py-2 rounded hover:bg-amber-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon, danger }) => (
  <div
    className={`p-5 rounded-xl border transition hover:shadow-md ${
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
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
};
