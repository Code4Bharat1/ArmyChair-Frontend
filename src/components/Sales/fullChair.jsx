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
  X,
} from "lucide-react";
import axios from "axios";

export default function SalesInventory() {
    const [activeStat, setActiveStat] = useState("ALL");

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
        vendor: form.vendor,
        quantity: Number(form.quantity),
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

      // Handle vendor - it might be an object or string
      const vendorName =
        typeof item.vendor === "object" && item.vendor?.name
          ? item.vendor.name
          : item.vendor || "Internal";

      return {
        id: item._id,
        name: item.chairType || "",
        vendor: vendorName,
        quantity: qty,
        status,
      };
    });
  }, [inventory]);

  /* ===== FILTER OPTIONS ===== */
  const vendors = useMemo(() => {
    return [
      "All",
      ...new Set(inventoryData.map((i) => i.vendor || "Internal")),
    ];
  }, [inventoryData]);

  const statuses = ["All", "Healthy", "Low Stock", "Critical"];

  /* ================= FILTER ================= */
  const filteredData = useMemo(() => {
  const term = (searchTerm || "").toLowerCase();

  return inventoryData.filter((i) => {
    const name = (i.name || "").toLowerCase();
    const vendor = i.vendor || "";
    const status = i.status || "";

    const matchesSearch = name.includes(term);
    const matchesVendor =
      filterVendor === "All" || vendor === filterVendor;
    const matchesStatus =
      filterStatus === "All" || status === filterStatus;

    const matchesStat =
      activeStat === "ALL"
        ? true
        : activeStat === "LOW"
        ? status !== "Healthy"
        : true;

    return matchesSearch && matchesVendor && matchesStatus && matchesStat;
  });
}, [inventoryData, searchTerm, filterVendor, filterStatus, activeStat]);

  /* ================= STATS ================= */
  const totalStock = useMemo(
    () => inventoryData.reduce((s, i) => s + Number(i.quantity || 0), 0),
    [inventoryData],
  );

  const totalProducts = inventoryData.length;

  const lowStockCount = useMemo(
    () => inventoryData.filter((i) => i.status !== "Healthy").length,
    [inventoryData],
  );

  /* ================= UI ================= */
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {" "}
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Warehouse size={32} className="text-[#c62d23]" />
                <span>Full Chair Inventory</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Track stock, vendors and availability
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* ===== TOP CARDS ===== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
  title="Total Stock"
  value={totalStock}
  icon={<Warehouse className="text-[#c62d23]" />}
  active={activeStat === "ALL"}
  onClick={() => setActiveStat("ALL")}
/>

<StatCard
  title="Total Products"
  value={totalProducts}
  icon={<Boxes className="text-[#c62d23]" />}
  active={activeStat === "ALL"}
  onClick={() => setActiveStat("ALL")}
/>

<StatCard
  title="Low / Critical"
  value={lowStockCount}
  danger={lowStockCount > 0}
  icon={<TrendingDown className="text-[#c62d23]" />}
  active={activeStat === "LOW"}
  onClick={() => setActiveStat("LOW")}
/>

          </div>

          {/* ===== FILTER BAR ===== */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl flex-1 border border-gray-200">
                <Search size={16} className="text-gray-400" />
                <input
                  placeholder="Search product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent outline-none text-sm w-full text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Vendor */}
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                <Building2 size={16} className="text-gray-400" />
                <select
                  value={filterVendor}
                  onChange={(e) => setFilterVendor(e.target.value)}
                  className="bg-transparent outline-none text-sm text-gray-900"
                >
                  {vendors.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-transparent outline-none text-sm text-gray-900"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ALERT */}
          {lowStockCount > 0 && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3">
              <AlertCircle className="text-red-600" size={20} />
              <span className="text-sm text-red-800 font-medium">
                {lowStockCount} items need immediate restocking
              </span>
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
                      {["Product", "Vendor", "Qty", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            className="p-4 text-left font-semibold text-gray-700"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredData.map((i, index) => (
                      <tr
                        key={i.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="p-4 font-medium text-gray-900">
                          {i.name}
                        </td>
                        <td className="p-4 flex items-center gap-2 text-gray-700">
                          <Building2 size={14} className="text-gray-400" />
                          {i.vendor}
                        </td>
                        <td className="p-4 font-semibold text-gray-900">
                          {i.quantity}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={i.status} />
                        </td>
                      </tr>
                    ))}

                    {filteredData.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-gray-500"
                        >
                          No inventory found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon, danger, onClick, active }) => {
  const safeValue =
    typeof value === "number" && !Number.isNaN(value) ? value : 0;

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full
        ${
          active
            ? "ring-2 ring-[#c62d23] border-[#c62d23]"
            : "border-gray-200"
        }
        ${danger ? "bg-red-50 border-red-300" : ""}
      `}
      style={{
        borderLeft: "4px solid #c62d23",
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{safeValue}</p>
    </div>
  );
};


const StatusBadge = ({ status }) => {
  const map = {
    Healthy: "bg-green-50 text-green-700 border-green-200",
    "Low Stock": "bg-amber-50 text-amber-700 border-amber-200",
    Critical: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium border ${map[status]}`}
    >
      {status}
    </span>
  );
};

const Input = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label className="text-sm text-gray-700 font-semibold block mb-2">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-gray-900"
    />
  </div>
);
