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
  RockingChair,
  UserCircle,
} from "lucide-react";
import axios from "axios";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  /* FILTERS */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVendor, setFilterVendor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [activeStatFilter, setActiveStatFilter] = useState(null);

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
      colour: item.colour || item.color || "",   // ✅ ADD THIS
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

      // Apply stat card filter
      let statFilterMatch = true;
      if (activeStatFilter === "lowStock") {
        statFilterMatch = status === "Low Stock" || status === "Critical";
      }

      return (
        name.includes(term) &&
        (filterVendor === "All" || vendor === filterVendor) &&
        (filterStatus === "All" || status === filterStatus) &&
        statFilterMatch
      );
    });
  }, [inventoryData, searchTerm, filterVendor, filterStatus, activeStatFilter]);

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

  /* ================= STAT CARD CLICK HANDLERS ================= */
  const handleStatCardClick = (filterType) => {
    if (activeStatFilter === filterType) {
      setActiveStatFilter(null);
      setFilterStatus("All");
    } else {
      setActiveStatFilter(filterType);
      if (filterType === "lowStock") {
        setFilterStatus("All");
      }
    }
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER - with padding for mobile hamburger */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6 pl-16 lg:pl-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* LEFT SIDE */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <RockingChair size={28} className="text-[#c62d23] sm:w-8 sm:h-8" />
                <span>Inventory</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Track stock, vendors and availability
              </p>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/profile")}
                title="My Profile"
                className="text-gray-600 hover:text-[#c62d23] transition"
              >
                <UserCircle size={30} className="sm:w-[34px] sm:h-[34px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* ===== TOP CARDS ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            title="Total Stock"
            value={totalStock}
            icon={<Warehouse className="text-[#c62d23]" />}
            onClick={() => handleStatCardClick("totalStock")}
            isActive={activeStatFilter === "totalStock"}
          />
          <StatCard
            title="Total Products"
            value={totalProducts}
            icon={<Boxes className="text-[#c62d23]" />}
            onClick={() => handleStatCardClick("totalProducts")}
            isActive={activeStatFilter === "totalProducts"}
          />
          <StatCard
            title="Low / Critical"
            value={lowStockCount}
            danger
            icon={<TrendingDown className="text-[#c62d23]" />}
            onClick={() => handleStatCardClick("lowStock")}
            isActive={activeStatFilter === "lowStock"}
          />
        </div>

        {/* ===== FILTER BAR ===== */}
        <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex items-center gap-3 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input
                placeholder="Search product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent outline-none text-sm w-full text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Vendor */}
              <div className="flex items-center gap-3 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 flex-1">
                <Building2 size={18} className="text-gray-400 flex-shrink-0" />
                <select
                  value={filterVendor}
                  onChange={(e) => setFilterVendor(e.target.value)}
                  className="bg-transparent outline-none text-sm text-gray-900 font-medium cursor-pointer w-full"
                >
                  {vendorsList.map((v) => (
                    <option key={v._id} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 flex-1">
                <Filter size={18} className="text-gray-400 flex-shrink-0" />
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setActiveStatFilter(null);
                  }}
                  className="bg-transparent outline-none text-sm text-gray-900 font-medium cursor-pointer w-full"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s} className="bg-white">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filter Indicator */}
            {activeStatFilter && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Filter size={14} className="text-[#c62d23]" />
                <span>
                  Filtering by: <span className="font-semibold">
                    {activeStatFilter === "lowStock" ? "Low/Critical Stock" : 
                     activeStatFilter === "totalStock" ? "All Stock" : "All Products"}
                  </span>
                </span>
                <button
                  onClick={() => setActiveStatFilter(null)}
                  className="ml-auto text-gray-400 hover:text-[#c62d23]"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ALERT */}
        {lowStockCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-3 sm:p-4 flex gap-2 sm:gap-3 rounded-xl">
            <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
            <span className="text-xs sm:text-sm text-amber-800 font-medium">
              {lowStockCount} items need immediate restocking
            </span>
          </div>
        )}

        {/* TABLE */}
        <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
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
                    {["Product","color", "Vendor", "Quantity", "Status"].map((h) => (
                      <th
                        key={h}
                        className="p-3 sm:p-4 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap"
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
                      <td className="p-3 sm:p-4 font-medium text-gray-900 text-xs sm:text-sm">
                        {i.name}
                      </td>
                      <td className="p-4 text-gray-700">{i.colour}</td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 text-gray-700 text-xs sm:text-sm">
                          <Building2 size={14} className="text-gray-400 flex-shrink-0 sm:w-4 sm:h-4" />
                          <span className="truncate">{i.vendor?.name || "—"}</span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 font-semibold text-gray-900 text-xs sm:text-sm">
                        {i.quantity}
                      </td>
                      <td className="p-3 sm:p-4">
                        <StatusBadge status={i.status} />
                      </td>
                    </tr>
                  ))}

                  {filteredData.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-gray-500 text-sm"
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
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon, danger, onClick, isActive }) => {
  const safeValue =
    typeof value === "number" && !Number.isNaN(value) ? value : 0;

  return (
    <button
      onClick={onClick}
      className={`bg-white border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full text-left w-full ${
        danger ? "border-amber-300 bg-amber-50" : "border-gray-200"
      } ${isActive ? "ring-2 ring-[#c62d23] ring-offset-2" : ""} hover:scale-[1.02] active:scale-[0.98] cursor-pointer`}
      style={{
        borderLeft: isActive ? "4px solid #c62d23" : "4px solid #e5e7eb",
      }}
    >
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <p className="text-xs sm:text-sm text-gray-600 font-medium">{title}</p>
        {React.cloneElement(icon, { size: 20, className: `${icon.props.className} sm:w-6 sm:h-6` })}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{safeValue}</p>
      {isActive && (
        <p className="text-xs text-[#c62d23] mt-2 font-medium">Active Filter</p>
      )}
    </button>
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
      className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border whitespace-nowrap ${map[status]}`}
    >
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