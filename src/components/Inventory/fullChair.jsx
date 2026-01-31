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
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";

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
    vendor: "",
    quantity: "",
  });

  const router = useRouter();

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory`, { headers });

      const data = res.data.inventory || [];

      const safeData = data.map((i) => ({
        ...i,
        quantity: Number(i.quantity || 0),
      }));

      // ✅ ONLY FULL CHAIRS
      const onlyFullChairs = safeData.filter((i) => i.type === "FULL");

      setInventory(onlyFullChairs);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);
  useEffect(() => {
    const fetchVendors = async () => {
      const res = await axios.get(`${API}/vendors`, { headers });
      setVendorsList(res.data);
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
        vendor: form.vendor, // ObjectId
        quantity: Number(form.quantity),
        minQuantity: 50,
        maxQuantity: 500,
        location: "WAREHOUSE",
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
        vendor: item.vendor || null,
        quantity: qty,
        status,
      };
    });
  }, [inventory]);

  /* ===== FILTER OPTIONS ===== */
  const vendors = useMemo(() => {
    const names = inventoryData.map((i) => i.vendor?.name).filter(Boolean);

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
    [inventoryData],
  );

  const totalProducts = inventoryData.length;

  const lowStockCount = useMemo(
    () => inventoryData.filter((i) => i.status !== "Healthy").length,
    [inventoryData],
  );

  const closeModal = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ chairType: "", vendor: "", quantity: "" });
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <InventorySidebar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-3 sm:p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* LEFT SIDE */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-600 hover:text-[#c62d23] transition p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 truncate">
                  <Package size={20} className="text-[#c62d23] sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />
                  <span className="truncate">Inventory Management</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">
                  Track stock, vendors and availability
                </p>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#c62d23] hover:bg-[#a82419] text-white px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-[#c62d23]/20 font-medium transition-all text-xs sm:text-sm md:text-base"
              >
                <Plus size={16} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Add Inventory</span>
                <span className="sm:hidden">Add</span>
              </button>

              <button
                onClick={() => router.push("/profile")}
                title="My Profile"
                className="text-gray-600 hover:text-[#c62d23] transition p-1 sm:p-0"
              >
                <UserCircle size={28} className="sm:w-8 sm:h-8 md:w-9 md:h-9" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
          {/* ===== TOP CARDS ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <StatCard
              title="Total Stock"
              value={totalStock}
              icon={<Warehouse className="text-[#c62d23]" />}
            />
            <StatCard
              title="Total Products"
              value={totalProducts}
              icon={<Boxes className="text-[#c62d23]" />}
            />
            <StatCard
              title="Low / Critical"
              value={lowStockCount}
              danger
              icon={<TrendingDown className="text-[#c62d23]" />}
            />
          </div>

          {/* ===== FILTER BAR ===== */}
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search */}
              <div className="flex items-center gap-2 sm:gap-3 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 w-full">
                <Search size={16} className="text-gray-400 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
                <input
                  placeholder="Search product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent outline-none text-xs sm:text-sm w-full text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Vendor & Status Filters */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Vendor */}
                <div className="flex items-center gap-2 sm:gap-3 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 flex-1">
                  <Building2 size={16} className="text-gray-400 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
                  <select
                    value={filterVendor}
                    onChange={(e) => setFilterVendor(e.target.value)}
                    className="bg-transparent outline-none text-xs sm:text-sm text-gray-900 font-medium cursor-pointer w-full"
                  >
                    <option value="All">All</option>
{vendorsList.map((v) => (
  <option key={v._id} value={v.name}>
    {v.name}
  </option>
))}

                  </select>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 sm:gap-3 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 flex-1">
                  <Filter size={16} className="text-gray-400 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-transparent outline-none text-xs sm:text-sm text-gray-900 font-medium cursor-pointer w-full"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s} className="bg-white">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ALERT */}
          {lowStockCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 sm:p-4 flex gap-2 sm:gap-3 rounded-lg sm:rounded-xl">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={18} />
              <span className="text-xs sm:text-sm text-amber-800 font-medium">
                {lowStockCount} items need immediate restocking
              </span>
            </div>
          )}

          {/* TABLE - Desktop */}
          <div className="hidden md:block bg-white rounded-xl lg:rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
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
                        "Product",
                        "Vendor",
                        "Quantity",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs lg:text-sm"
                        >
                          {h}
                        </th>
                      ))}
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
                        <td className="p-3 lg:p-4 font-medium text-gray-900 text-xs lg:text-sm">
                          {i.name}
                        </td>
                        <td className="p-3 lg:p-4">
                          <div className="flex items-center gap-2 text-gray-700 text-xs lg:text-sm">
                            <Building2 size={14} className="text-gray-400 lg:w-4 lg:h-4" />
                            {i.vendor?.name || "—"}
                          </div>
                        </td>
                        <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs lg:text-sm">
                          {i.quantity}
                        </td>
                        <td className="p-3 lg:p-4">
                          <StatusBadge status={i.status} />
                        </td>
                        <td className="p-3 lg:p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditId(i.id);
                                setForm({
                                  chairType: i.name,
                                  vendor: i.vendor?._id,
                                  quantity: i.quantity,
                                });
                                setShowForm(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} className="lg:w-4 lg:h-4" />
                            </button>

                            <button
                              onClick={() => deleteInventory(i.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} className="lg:w-4 lg:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredData.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-gray-500 text-xs lg:text-sm"
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

          {/* CARDS - Mobile/Tablet */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500 text-sm">Loading...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200 text-sm">
                No inventory found
              </div>
            ) : (
              filteredData.map((i) => (
                <div
                  key={i.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                        {i.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                        <Building2 size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{i.vendor?.name || "—"}</span>
                      </div>
                    </div>
                    <StatusBadge status={i.status} />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Quantity</p>
                      <p className="font-bold text-gray-900 text-lg">{i.quantity}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditId(i.id);
                          setForm({
                            chairType: i.name,
                            vendor: i.vendor?._id,
                            quantity: i.quantity,
                          });
                          setShowForm(true);
                        }}
                        className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => deleteInventory(i.id)}
                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl sm:rounded-t-2xl">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#c62d23]/10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="text-[#c62d23]" size={18} />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    {editId ? "Update Inventory" : "Add Inventory"}
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <Input
                  label="Chair Type"
                  value={form.chairType}
                  onChange={(v) => setForm({ ...form, chairType: v })}
                  placeholder="Enter chair type"
                />

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                    Vendor
                  </label>
                  <select
                    value={form.vendor}
                    onChange={(e) =>
                      setForm({ ...form, vendor: e.target.value })
                    }
                    className="w-full p-2.5 sm:p-3 bg-white border border-gray-200 rounded-lg sm:rounded-xl outline-none text-gray-900 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-xs sm:text-sm"
                  >
                    <option value="">Select Vendor</option>
                    {vendorsList.map((v) => (
                      <option key={v._id} value={v._id} className="bg-white">
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Quantity"
                  type="number"
                  value={form.quantity}
                  onChange={(v) => setForm({ ...form, quantity: v })}
                  placeholder="Enter quantity"
                />
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 border-t border-gray-200 flex gap-2 sm:gap-3 sticky bottom-0 bg-white z-10 rounded-b-xl sm:rounded-b-2xl">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={submitInventory}
                  className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-[#c62d23] hover:bg-[#a82419] text-white font-medium transition-colors shadow-sm text-sm sm:text-base"
                >
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
  const safeValue =
    typeof value === "number" && !Number.isNaN(value) ? value : 0;

  return (
    <div
      className={`bg-white border rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full ${
        danger ? "border-amber-300 bg-amber-50" : "border-gray-200"
      }`}
      style={{
        borderLeft: "4px solid #c62d23",
      }}
    >
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <p className="text-xs sm:text-sm text-gray-600 font-medium">{title}</p>
        {React.cloneElement(icon, { size: 20, className: `sm:w-6 sm:h-6 ${icon.props.className}` })}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{safeValue}</p>
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
      className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${map[status]} whitespace-nowrap`}
    >
      {status}
    </span>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div>
    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-2.5 sm:p-3 bg-white border border-gray-200 rounded-lg sm:rounded-xl outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-xs sm:text-sm"
    />
  </div>
);