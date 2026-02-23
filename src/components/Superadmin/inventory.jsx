"use client";
import { useRouter } from "next/navigation";
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
  Package,
  UserCircle,
  Menu,
  Upload,
  Download,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";

/* ================= CSV EXPORT ================= */
const exportToCSV = (data) => {
  const rows = [
    ["Item Name", "Colour", "Vendor", "Available Qty", "Minimum Stock", "Location", "Status"],
    ...data.map((i) => [
      i.name,
      i.colour || "",
      i.vendor?.name || "",
      i.quantity,
      i.minQuantity,
      i.location,
      i.status,
    ]),
  ];
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* FILTERS */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVendor, setFilterVendor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  /* MODAL STATE */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [vendorsList, setVendorsList] = useState([]);

  const [form, setForm] = useState({
    chairType: "",
    colour: "",
    vendor: "",
    quantity: "",
  });

  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory`, { headers });
      const data = res.data.inventory || [];
      const safeData = data.map((i) => ({ ...i, quantity: Number(i.quantity || 0) }));
      setInventory(safeData.filter((i) => i.type === "FULL"));
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      const res = await axios.get(`${API}/vendors`, { headers });
      setVendorsList([{ _id: "all", name: "All" }, ...res.data]);
    };
    fetchVendors();
  }, []);

  /* ================= CREATE / UPDATE ================= */
  const submitInventory = async () => {
    try {
      if (!form.chairType || !form.vendor || form.quantity === "") {
        return alert("All fields required");
      }
      const payload = {
        type: "FULL",
        chairType: form.chairType,
        colour: form.colour,
        vendor: form.vendor,
        quantity: Number(form.quantity),
        minQuantity: 50,
        maxQuantity: 500,
        location: "WAREHOUSE",
      };
      if (editId) {
        await axios.patch(`${API}/inventory/update/${editId}`, payload, { headers });
      } else {
        await axios.post(`${API}/inventory`, payload, { headers });
      }
      closeModal();
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
      const minQty = Number(item.minQuantity || 0);
      let status = "Healthy";
      if (qty === 0) status = "Critical";
      else if (qty < minQty) status = "Low Stock";
      return {
        id: item._id,
        name: item.chairType || "",
        colour: item.colour || "—",
        vendor: item.vendor || null,
        quantity: qty,
        minQuantity: minQty,
        location: item.location || "—",
        status,
      };
    });
  }, [inventory]);

  const vendors = useMemo(() => {
    const names = inventoryData.map((i) => i.vendor?.name).filter(Boolean);
    return ["All", ...new Set(names)];
  }, [inventoryData]);

  const statuses = ["All", "Healthy", "Low Stock", "Critical"];

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
  const totalStock = useMemo(() => inventoryData.reduce((s, i) => s + Number(i.quantity || 0), 0), [inventoryData]);
  const totalProducts = inventoryData.length;
  const lowStockCount = useMemo(() => inventoryData.filter((i) => i.status !== "Healthy").length, [inventoryData]);

  const closeModal = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ chairType: "", colour: "", vendor: "", quantity: "" });
  };

  const TABLE_HEADERS = ["Item Name", "Colour", "Vendor", "Available Qty", "Minimum Stock", "Location", "Status", "Actions"];

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Hidden bulk-upload input */}
      <input
        type="file"
        accept=".xlsx"
        id="admin-bulk-upload"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const formData = new FormData();
          formData.append("file", file);
          try {
            await axios.post(`${API}/inventory/bulk-upload`, formData, { headers });
            fetchInventory();
            e.target.value = "";
            alert("Bulk upload successful ✅");
          } catch (err) {
            console.error("Bulk upload failed", err);
            alert("Bulk upload failed ❌");
          }
        }}
      />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <InventorySidebar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">

        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-900 hover:text-[#c62d23] p-2 hover:bg-red-50 rounded-lg transition flex-shrink-0"
              >
                <Menu size={22} />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 truncate leading-tight">
                  <Package size={22} className="text-[#c62d23] flex-shrink-0" />
                  <span className="truncate">Inventory</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-700 font-medium mt-0.5 hidden sm:block">
                  Track stock, vendors and availability
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Export CSV */}
              <button
                onClick={() => exportToCSV(filteredData)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition shadow-sm text-xs sm:text-sm"
                title="Export to CSV"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>

              {/* Bulk Upload */}
              <button
                onClick={() => document.getElementById("admin-bulk-upload").click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition shadow-sm text-xs sm:text-sm"
              >
                <Upload size={15} />
                <span className="hidden sm:inline">Bulk Upload</span>
                <span className="sm:hidden">Upload</span>
              </button>

              {/* Add */}
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#c62d23] hover:bg-[#a82419] text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition shadow-sm text-xs sm:text-sm"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Add Inventory</span>
                <span className="sm:hidden">Add</span>
              </button>

              <button onClick={() => router.push("/profile")} title="My Profile" className="text-gray-900 hover:text-[#c62d23] transition p-1">
                <UserCircle size={30} className="sm:w-8 sm:h-8" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-5 md:space-y-6">

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard title="Total Stock"    value={totalStock}    icon={<Warehouse className="text-[#c62d23]" />} />
            <StatCard title="Total Products" value={totalProducts} icon={<Boxes className="text-[#c62d23]" />} />
            <StatCard title="Low / Critical" value={lowStockCount} danger icon={<TrendingDown className="text-[#c62d23]" />} />
          </div>

          {/* FILTER BAR */}
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                <input
                  placeholder="Search product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none bg-gray-50"
                />
              </div>

              {/* Vendor */}
              <div className="relative sm:w-48">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                <select
                  value={filterVendor}
                  onChange={(e) => setFilterVendor(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none bg-gray-50 appearance-none cursor-pointer"
                >
                  <option value="All">All Vendors</option>
                  {vendorsList
                    .filter((v) => v._id !== "all")
                    .map((v) => (
                      <option key={v._id} value={v.name}>{v.name}</option>
                    ))}
                </select>
              </div>

              {/* Status */}
              <div className="relative sm:w-40">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none bg-gray-50 appearance-none cursor-pointer"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Result count */}
              <div className="flex items-center text-sm text-gray-900 font-semibold whitespace-nowrap self-center">
                {filteredData.length} item{filteredData.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* ALERT */}
          {lowStockCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 sm:p-4 flex gap-2 sm:gap-3 rounded-xl items-center">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={17} />
              <span className="text-sm text-amber-800 font-semibold">
                {lowStockCount} item{lowStockCount !== 1 ? "s" : ""} need immediate restocking
              </span>
            </div>
          )}

          {/* ===== DESKTOP TABLE ===== */}
          <div className="hidden md:block bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {loading ? (
              <div className="py-16 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-3 text-gray-700 text-sm font-medium">Loading inventory...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ fontSize: "14px" }}>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {TABLE_HEADERS.map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-3.5 text-sm font-bold text-gray-900 whitespace-nowrap tracking-wide ${
                            h === "Available Qty" || h === "Minimum Stock" ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-14 text-center text-gray-700 text-sm font-medium">
                          No inventory found
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((i, idx) => (
                        <tr
                          key={i.id}
                          className={`transition-colors hover:bg-blue-50/30 ${idx % 2 === 1 ? "bg-gray-50/40" : "bg-white"}`}
                        >
                          <td className="px-4 py-4 font-bold text-gray-900 whitespace-nowrap text-[15px]">
                            {i.name}
                          </td>
                          <td className="px-4 py-4 text-gray-900 font-medium text-sm">{i.colour}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-gray-900 font-medium text-sm">
                              <Building2 size={13} className="text-gray-600 flex-shrink-0" />
                              {i.vendor?.name || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-bold text-gray-900 text-[15px] text-right tabular-nums">
                            {i.quantity}
                          </td>
                          <td className="px-4 py-4 font-semibold text-gray-900 text-sm text-right tabular-nums">
                            {i.minQuantity}
                          </td>
                          <td className="px-4 py-4 font-medium text-gray-900 text-sm">{i.location}</td>
                          <td className="px-4 py-4">
                            <StatusBadge status={i.status} />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditId(i.id);
                                  setForm({
                                    chairType: i.name,
                                    colour: i.colour === "—" ? "" : i.colour,
                                    vendor: i.vendor?._id,
                                    quantity: i.quantity,
                                  });
                                  setShowForm(true);
                                }}
                                className="p-1.5 hover:bg-blue-100 rounded-md transition"
                                title="Edit"
                              >
                                <Pencil size={14} className="text-gray-700 hover:text-blue-600" />
                              </button>
                              <button
                                onClick={() => deleteInventory(i.id)}
                                className="p-1.5 hover:bg-red-100 rounded-md transition"
                                title="Delete"
                              >
                                <Trash2 size={14} className="text-gray-700 hover:text-red-600" />
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

          {/* ===== MOBILE CARDS ===== */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-900 text-sm font-medium">Loading...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <Package size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-700 font-medium">No inventory found</p>
              </div>
            ) : (
              filteredData.map((i) => (
                <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-base truncate">{i.name}</h3>
                      <div className="flex items-center gap-1.5 text-gray-700 font-medium mt-1 text-sm">
                        <Building2 size={13} className="text-gray-600" />
                        <span className="truncate">{i.vendor?.name || "—"}</span>
                      </div>
                    </div>
                    <StatusBadge status={i.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600 mb-0.5 font-medium">Colour</p>
                      <p className="font-semibold text-gray-900">{i.colour}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-0.5 font-medium">Location</p>
                      <p className="font-semibold text-gray-900">{i.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-0.5 font-medium">Min Stock</p>
                      <p className="font-semibold text-gray-900">{i.minQuantity}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-0.5">Quantity</p>
                      <p className="font-bold text-gray-900 text-xl leading-none">{i.quantity}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditId(i.id);
                          setForm({
                            chairType: i.name,
                            colour: i.colour === "—" ? "" : i.colour,
                            vendor: i.vendor?._id,
                            quantity: i.quantity,
                          });
                          setShowForm(true);
                        }}
                        className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition flex items-center gap-1.5 text-sm font-semibold"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => deleteInventory(i.id)}
                        className="p-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ===== MODAL ===== */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#c62d23]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="text-[#c62d23]" size={17} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editId ? "Update Inventory" : "Add Inventory"}
                  </h2>
                </div>
                <button onClick={closeModal} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-5 py-4 space-y-4">
                <Input
                  label="Chair Type *"
                  value={form.chairType}
                  onChange={(v) => setForm({ ...form, chairType: v })}
                  placeholder="Enter chair type"
                />
                <Input
                  label="Colour"
                  value={form.colour}
                  onChange={(v) => setForm({ ...form, colour: v })}
                  placeholder="Enter colour"
                />

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">Vendor *</label>
                  <select
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-sm font-medium text-gray-900 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition"
                  >
                    <option value="">Select Vendor</option>
                    {vendorsList
                      .filter((v) => v._id !== "all")
                      .map((v) => (
                        <option key={v._id} value={v._id}>{v.name}</option>
                      ))}
                  </select>
                </div>

                <Input
                  label="Quantity *"
                  type="number"
                  value={form.quantity}
                  onChange={(v) => setForm({ ...form, quantity: v })}
                  placeholder="Enter quantity"
                />
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white z-10 rounded-b-2xl">
                <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold transition text-sm">
                  Cancel
                </button>
                <button onClick={submitInventory} className="flex-1 py-2.5 rounded-xl bg-[#c62d23] hover:bg-[#a82419] text-white font-semibold transition shadow-sm text-sm">
                  {editId ? "Update" : "Save"}
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
  const safeValue = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  return (
    <div
      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between h-full ${
        danger ? "border-amber-200 bg-amber-50/50" : "border-gray-200"
      }`}
      style={{ borderLeft: "4px solid #c62d23" }}
    >
      <div className="flex justify-between items-start mb-3">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <p className={`text-3xl sm:text-4xl font-bold ${danger ? "text-red-600" : "text-gray-900"}`}>
        {safeValue}
      </p>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    Healthy:     "bg-green-50 text-green-800 border border-green-200 font-semibold",
    "Low Stock": "bg-amber-50 text-amber-800 border border-amber-200 font-semibold",
    Critical:    "bg-red-50 text-red-800 border border-red-200 font-semibold",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${map[status] || "bg-gray-100 text-gray-900 border border-gray-200 font-semibold"}`}>
      {status}
    </span>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-900 mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e) => { if (type === "number" && (e.key === "-" || e.key === "e")) e.preventDefault(); }}
      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-sm font-medium text-gray-900 placeholder-gray-500 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition"
    />
  </div>
);