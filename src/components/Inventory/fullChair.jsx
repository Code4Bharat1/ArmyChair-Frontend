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
  Search,
  Filter,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  /* FILTERS */
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

  const VENDORS = [
  "Ramesh",
  "Suresh",
  "Mahesh",
  "Akash",
  "Vikram",
  "Amit",
];


  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory`, { headers });

      const data = res.data.inventory || res.data || [];

      // 🔥 normalize quantity immediately
      const safeData = data.map((i) => ({
        ...i,
        quantity: Number(i.quantity || 0),
      }));

      setInventory(safeData);
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
  vendor: form.vendor,      // vendor NAME (backend converts to ObjectId)
  quantity: Number(form.quantity),
  color: "Default",         // REQUIRED
  minQuantity: 50,          // REQUIRED
  type: "FULL",
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
      const qty = Number(item.quantity || 0);

      let status = "Healthy";
      if (qty === 0) status = "Critical";
      else if (qty < 100) status = "Low Stock";

      return {
  id: item._id,
  name: item.chairType || "",
  vendor: item.vendor || null, // keep the OBJECT
  quantity: qty,
  status,
};

    });
  }, [inventory]);

  /* ===== FILTER OPTIONS ===== */
  const vendors = useMemo(() => {
  const names = inventoryData
    .map((i) => i.vendor?.name)
    .filter(Boolean);

  return ["All", ...new Set(names)];
}, [inventoryData]);


  const statuses = ["All", "Healthy", "Low Stock", "Critical"];

  /* ================= FILTER ================= */
  const filteredData = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();

    return inventoryData.filter((i) => {
      const name = (i.name || "").toLowerCase();
      const vendor = i.vendor?.name || "";
      const status = i.status || "";

      return (
        name.includes(term) &&
        (filterVendor === "All" || vendor === filterVendor) &&
        (filterStatus === "All" || status === filterStatus)
      );
    });
  }, [inventoryData, searchTerm, filterVendor, filterStatus]);

  /* ================= STATS ================= */
  const totalStock = useMemo(
    () => inventoryData.reduce((s, i) => s + Number(i.quantity || 0), 0),
    [inventoryData]
  );

  const totalProducts = inventoryData.length;

  const lowStockCount = useMemo(
    () => inventoryData.filter((i) => i.status !== "Healthy").length,
    [inventoryData]
  );

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <InventorySidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inventory Management</h1>
            <p className="text-sm text-neutral-400">
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

        <div className="p-6">
          {/* ===== TOP CARDS ===== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard title="Total Stock" value={totalStock} icon={<Warehouse />} />
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

          {/* ===== FILTER BAR ===== */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex items-center gap-2 bg-neutral-900 px-3 py-2 rounded-lg flex-1">
              <Search size={16} className="text-neutral-400" />
              <input
                placeholder="Search product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent outline-none text-sm w-full"
              />
            </div>

            {/* Vendor */}
            <div className="flex items-center gap-2 bg-neutral-900 px-3 py-2 rounded-lg">
              <Building2 size={16} className="text-neutral-400" />
              <select
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
                className="bg-transparent outline-none text-sm"
              >
                {vendors.map((v) => (
                  <option key={v} value={v} className="bg-neutral-900">
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 bg-neutral-900 px-3 py-2 rounded-lg">
              <Filter size={16} className="text-neutral-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent outline-none text-sm"
              >
                {statuses.map((s) => (
                  <option key={s} value={s} className="bg-neutral-900">
                    {s}
                  </option>
                ))}
              </select>
            </div>
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
                        {i.vendor?.name || "-"}
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
                              vendor: i.vendor?.name,
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

                  {filteredData.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-6 text-center text-neutral-400"
                      >
                        No inventory found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-neutral-900 p-6 rounded-xl w-[380px] border border-neutral-700">
              <h2 className="text-lg font-semibold mb-4">
                {editId ? "Update Inventory" : "Add Inventory"}
              </h2>

              <Input
                label="Chair Type"
                value={form.chairType}
                onChange={(v) => setForm({ ...form, chairType: v })}
              />
              <div className="mb-3">
  <label className="text-xs text-neutral-400">Vendor</label>

  <select
    value={form.vendor}
    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
    className="w-full mt-1 p-2 bg-neutral-800 rounded outline-none text-white"
  >
    <option value="">Select Vendor</option>
    {VENDORS.map((v) => (
      <option key={v} value={v} className="bg-neutral-900">
        {v}
      </option>
    ))}
  </select>
</div>

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
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon, danger }) => {
  const safeValue =
    typeof value === "number" && !Number.isNaN(value) ? value : 0;

  return (
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
      <p className="text-3xl font-bold">{safeValue}</p>
    </div>
  );
};

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
