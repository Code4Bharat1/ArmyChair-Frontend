//warehouse fullchair inventory page - list, add, update, delete, export csv, bulk upload, filter by vendor/status/search
// GROUPED by product name with expandable rows (like spare parts page)
"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";

const PAGE_SIZE_OPTIONS = [20, 25, 50, 100];

/* ================= CSV EXPORT ================= */
const exportToCSV = (data) => {
  const rows = [
    [
      "Product",
      "Color",
      "Mesh",
      "Remark",
      "Vendor",
      "Quantity",
      "Min Quantity",
      "Status",
      "Location",
      "Chalan / Bill No",
      "Created At",
    ],
    ...data.map((i) => [
      i.name,
      i.color || "",
      i.mesh || "",
      i.remark || "",
      i.vendor?.name || "",
      i.quantity,
      i.minQuantity ?? "",
      i.status,
      i.location || "",
      i.chalanNo || "",
      i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "",
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

/* ================= SEARCHABLE DROPDOWN ================= */
function SearchableDropdown({
  value,
  displayValue,
  options,
  onSelect,
  onAddNew,
  placeholder = "Search...",
  addNewLabel = "Add new",
}) {
  const [search, setSearch] = useState(displayValue || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setSearch(displayValue || "");
  }, [displayValue]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = options.filter((o) =>
    (typeof o === "string" ? o : o.label || o.name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const getLabel = (o) =>
    typeof o === "string" ? o : o.label || o.name || "";
  const getValue = (o) => (typeof o === "string" ? o : o.value || o._id || o);

  const exactMatch = options.some(
    (o) => getLabel(o).toLowerCase() === search.toLowerCase()
  );

  return (
    <div className="relative" ref={ref}>
      <input
        placeholder={placeholder}
        value={search}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition text-sm"
      />
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-auto">
          {filtered.length === 0 && !search && (
            <div className="px-4 py-3 text-sm text-gray-400">
              No options available
            </div>
          )}
          {filtered.map((o) => (
            <div
              key={getValue(o)}
              onMouseDown={() => {
                onSelect(getValue(o), getLabel(o));
                setSearch(getLabel(o));
                setOpen(false);
              }}
              className={`px-4 py-2.5 text-sm cursor-pointer border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50 ${
                getValue(o) === value ? "bg-red-50 text-[#c62d23] font-medium" : ""
              }`}
            >
              {getLabel(o)}
            </div>
          ))}
          {search && !exactMatch && onAddNew && (
            <div
              onMouseDown={() => {
                onAddNew(search.trim());
                setSearch(search.trim());
                setOpen(false);
              }}
              className="px-4 py-2.5 bg-gray-50 hover:bg-green-50 cursor-pointer text-green-700 font-medium text-sm transition-colors"
            >
              ➕ {addNewLabel} "{search.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterVendor, setFilterVendor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Pagination state
  // const [currentPage, setCurrentPage] = useState(1);
  // const [pageSize, setPageSize] = useState(25);

  // Expanded rows (by product name key)
  const [expandedProducts, setExpandedProducts] = useState(new Set());

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [vendorsList, setVendorsList] = useState([]);
  const [chairModelsList, setChairModelsList] = useState([]);
  const [locationsList, setLocationsList] = useState([
    "WAREHOUSE",
    "SHOWROOM",
    "FACTORY",
    "GODOWN",
  ]);

  // Form state
  const [form, setForm] = useState({
    chairType: "",
    chairTypeId: "",
    vendor: "",
    vendorName: "",
    quantity: "",
    minQuantity: "",
    maxQuantity: "",
    color: "",
    mesh: "",
    remark: "",
    location: "",
    locationDisplay: "",
    chalanNo: "",
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
      setInventory(safeData.filter((i) => i.type === "FULL"));
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChairModels = async () => {
    try {
      const res = await axios.get(`${API}/inventory/chair-models`, { headers });
      setChairModelsList(res.data.models || []);
    } catch (err) {
      console.error("Fetch chair models failed", err);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchChairModels();
  }, []);

  useEffect(() => {
    axios
      .get(`${API}/vendors`, { headers })
      .then((res) => setVendorsList(res.data.vendors || res.data))
      .catch(console.error);
  }, []);

  /* ================= ADD NEW CHAIR MODEL ================= */
  const handleAddNewChairModel = async (name) => {
    try {
      await axios.post(`${API}/inventory/chair-models`, { name }, { headers });
      setChairModelsList((prev) => [...prev, name]);
    } catch {
      setChairModelsList((prev) => [...prev, name]);
    }
    setForm((f) => ({ ...f, chairType: name, chairTypeId: name }));
  };

  /* ================= ADD NEW LOCATION ================= */
  const handleAddNewLocation = (name) => {
    const upper = name.toUpperCase();
    setLocationsList((prev) =>
      prev.includes(upper) ? prev : [...prev, upper]
    );
    setForm((f) => ({ ...f, location: upper, locationDisplay: upper }));
  };

  /* ================= SAVE ================= */
  const submitInventory = async () => {
    try {
      if (
        !form.chairType ||
        !form.vendor ||
        !form.color ||
        form.quantity === "" ||
        !form.chalanNo
      ) {
        return alert("Please fill all required fields");
      }
      const payload = {
        type: "FULL",
        chairType: form.chairType,
        vendor: form.vendor,
        quantity: Number(form.quantity),
        minQuantity: form.minQuantity !== "" ? Number(form.minQuantity) : 0,
        colour: form.color,
        mesh: form.mesh,
        remark: form.remark,
        chalanNo: form.chalanNo,
        maxQuantity: form.maxQuantity !== "" ? Number(form.maxQuantity) : 0,
        location: form.location || "WAREHOUSE",
      };
      if (editId) {
        await axios.patch(`${API}/inventory/update/${editId}`, payload, {
          headers,
        });
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
    return inventory.map((item) => ({
      id: item._id,
      name: item.chairType || "",
      vendor: item.vendor || null,
      quantity: Number(item.quantity || 0),
      minQuantity: item.minQuantity ?? 0,
      maxQuantity: item.maxQuantity ?? null,
      color: item.colour || "",
      mesh: item.mesh || "",
      remark: item.remark || "",
      chalanNo: item.chalanNo || "",
      status: item.status || "Healthy",
      location: item.location || "",
      createdAt: item.createdAt || null,
    }));
  }, [inventory]);

  /* ================= GROUP DATA (like spare parts) ================= */
  const groupedProducts = useMemo(() => {
    const grouped = new Map();
    inventoryData.forEach((item) => {
      const key = item.name.trim().toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, {
          productName: item.name,
          entries: [],
          totalQuantity: 0,
          totalMinQuantity: 0,
          totalMaxQuantity: 0,
          worstStatus: "Healthy",
          vendorNames: new Set(),
          locationCount: 0,
        });
      }
      const group = grouped.get(key);
      group.entries.push(item);
      group.totalQuantity += item.quantity;
      group.totalMinQuantity += item.minQuantity || 0;
      group.totalMaxQuantity += item.maxQuantity || 0;
      group.vendorNames.add(item.vendor?.name || "");
      group.locationCount = group.entries.length;

      const statusPriority = {
        Critical: 4,
        "Low Stock": 3,
        Overstocked: 2,
        Healthy: 1,
      };
      if ((statusPriority[item.status] || 0) > (statusPriority[group.worstStatus] || 0)) {
        group.worstStatus = item.status;
      }
    });
    return Array.from(grouped.values());
  }, [inventoryData]);

  const vendors = useMemo(() => {
    const names = inventoryData.map((i) => i.vendor?.name).filter(Boolean);
    return ["All", ...new Set(names)];
  }, [inventoryData]);

  const statuses = ["All", "Healthy", "Low Stock", "Critical"];

  /* ================= FILTER (on grouped) ================= */
  const filteredGrouped = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();
    return groupedProducts.filter((g) => {
      const matchSearch = g.productName.toLowerCase().includes(term);
      const matchVendor =
        filterVendor === "All" ||
        g.entries.some((e) => (e.vendor?.name || "") === filterVendor);
      const matchStatus =
        filterStatus === "All" ||
        g.worstStatus === filterStatus ||
        g.entries.some((e) => e.status === filterStatus);
      return matchSearch && matchVendor && matchStatus;
    });
  }, [groupedProducts, searchTerm, filterVendor, filterStatus]);

  const paginatedGroups = filteredGrouped;
  
  // Reset to page 1 when filters change
  // useEffect(() => {
  //   setCurrentPage(1);
  // }, [searchTerm, filterVendor, filterStatus, pageSize]);

  /* ================= PAGINATION ================= */
  // const totalItems = filteredGrouped.length;
  // const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  // const safePage = Math.min(currentPage, totalPages);
  // const startIdx = (safePage - 1) * pageSize;
  // const endIdx = Math.min(startIdx + pageSize, totalItems);
  // const paginatedGroups = filteredGrouped.slice(startIdx, endIdx);

  // const goToPage = (p) =>
  //   setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  // const pageNumbers = useMemo(() => {
  //   const pages = [];
  //   const delta = 2;
  //   const left = Math.max(1, safePage - delta);
  //   const right = Math.min(totalPages, safePage + delta);
  //   for (let i = left; i <= right; i++) pages.push(i);
  //   return pages;
  // }, [safePage, totalPages]);

  /* ================= TOGGLE EXPAND ================= */
  const toggleExpand = (productName) => {
    const newExpanded = new Set(expandedProducts);
    newExpanded.has(productName)
      ? newExpanded.delete(productName)
      : newExpanded.add(productName);
    setExpandedProducts(newExpanded);
  };

  /* ================= STATS ================= */
  const totalStock = useMemo(
    () => inventoryData.reduce((s, i) => s + Number(i.quantity || 0), 0),
    [inventoryData]
  );
  const totalProducts = groupedProducts.length;
  const lowStockCount = useMemo(
    () => groupedProducts.filter((g) => g.worstStatus === "Low Stock" || g.worstStatus === "Critical").length,
    [groupedProducts]
  );
  const healthyCount = useMemo(
    () => groupedProducts.filter((g) => g.worstStatus === "Healthy").length,
    [groupedProducts]
  );

  const closeModal = () => {
    setShowForm(false);
    setEditId(null);
    setForm({
      chairType: "",
      chairTypeId: "",
      vendor: "",
      vendorName: "",
      quantity: "",
      minQuantity: "",
      maxQuantity: "",
      color: "",
      mesh: "",
      remark: "",
      location: "",
      locationDisplay: "",
      chalanNo: "",
    });
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <input
        type="file"
        accept=".xlsx"
        id="full-bulk-upload"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const formData = new FormData();
          formData.append("file", file);
          try {
            await axios.post(`${API}/inventory/full/bulk-upload`, formData, {
              headers,
            });
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
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <InventorySidebar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-500 hover:text-[#c62d23] p-2 hover:bg-red-50 rounded-lg transition flex-shrink-0"
              >
                <Menu size={22} />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 truncate leading-tight">
                  <Package size={22} className="text-[#c62d23] flex-shrink-0" />
                  <span className="truncate">Inventory Management</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">
                  Track stock, vendors and availability
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => exportToCSV(inventoryData)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md text-xs sm:text-sm"
                title="Export to CSV"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>

              <button
                onClick={() =>
                  document.getElementById("full-bulk-upload").click()
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md text-xs sm:text-sm"
              >
                <Upload size={15} />
                <span className="hidden sm:inline">Bulk Upload</span>
                <span className="sm:hidden">Upload</span>
              </button>

              <button
                onClick={() => {
                  fetchChairModels();
                  setShowForm(true);
                }}
                className="bg-[#c62d23] hover:bg-[#a82419] text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md text-xs sm:text-sm"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Add Inventory</span>
                <span className="sm:hidden">Add</span>
              </button>

              <button
                onClick={() => router.push("/profile")}
                title="My Profile"
                className="text-gray-500 hover:text-[#c62d23] transition p-1"
              >
                <UserCircle size={30} className="sm:w-8 sm:h-8" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-5 md:space-y-6">
          {/* STATS — clickable cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Total Stock"
              value={totalStock}
              icon={<Warehouse className="text-[#c62d23]" />}
              onClick={() => setFilterStatus("All")}
              active={filterStatus === "All"}
              accentColor="#c62d23"
            />
            <StatCard
              title="Unique Products"
              value={totalProducts}
              icon={<Boxes className="text-[#c62d23]" />}
              onClick={() => setFilterStatus("All")}
              active={false}
              accentColor="#6366f1"
            />
            <StatCard
              title="Healthy"
              value={healthyCount}
              icon={<CheckCircle className="text-green-600" />}
              onClick={() => setFilterStatus("Healthy")}
              active={filterStatus === "Healthy"}
              accentColor="#22c55e"
            />
            <StatCard
              title="Low / Critical"
              value={lowStockCount}
              danger
              icon={<TrendingDown className="text-[#c62d23]" />}
              onClick={() => setFilterStatus("Low Stock")}
              active={filterStatus === "Low Stock" || filterStatus === "Critical"}
              accentColor="#f59e0b"
            />
          </div>

          {/* FILTER BAR */}
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  placeholder="Search product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none bg-gray-50"
                />
              </div>

              <div className="relative sm:w-48">
                <Building2
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <select
                  value={filterVendor}
                  onChange={(e) => setFilterVendor(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none bg-gray-50 appearance-none cursor-pointer"
                >
                  <option value="All">All Vendors</option>
                  {vendorsList.map((v) => (
                    <option key={v._id} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative sm:w-40">
                <Filter
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none bg-gray-50 appearance-none cursor-pointer"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active filter pill */}
              {filterStatus !== "All" && (
                <button
                  onClick={() => setFilterStatus("All")}
                  className="flex items-center gap-2 bg-red-50 border border-red-200 text-[#c62d23] rounded-lg px-3 py-2 text-xs font-medium hover:bg-red-100 transition whitespace-nowrap self-center"
                >
                  <Filter size={12} />
                  {filterStatus}
                  <X size={12} />
                </button>
              )}

              <div className="flex items-center text-xs text-gray-400 font-medium whitespace-nowrap self-center">
                {filteredGrouped.length} product{filteredGrouped.length !== 1 ? "s" : ""} &bull; {inventoryData.length} entries
              </div>
            </div>
          </div>

          {/* ALERT */}
          {lowStockCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 sm:p-4 flex gap-2 sm:gap-3 rounded-xl items-center">
              <AlertCircle
                className="text-amber-600 flex-shrink-0"
                size={17}
              />
              <span className="text-xs sm:text-sm text-amber-800 font-medium">
                {lowStockCount} product{lowStockCount !== 1 ? "s" : ""} need
                immediate restocking
              </span>
            </div>
          )}

          {/* ===== DESKTOP TABLE ===== */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-3 text-gray-400 text-sm">
                  Loading inventory...
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
  <tr className="bg-gray-50 border-b border-gray-200">
    <th className="w-10 px-3 py-2 text-left"></th>
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Product</th>
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Color</th>
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Mesh</th>
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Remark</th>
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Vendor</th>
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Location</th>
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Chalan No</th>
    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 whitespace-nowrap">Min Qty</th>
    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 whitespace-nowrap">Quantity</th>
    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 whitespace-nowrap">Max Qty</th>
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Status</th>
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Created</th>
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Actions</th>
  </tr>
</thead>

                    <tbody className="divide-y divide-gray-100">
                      {paginatedGroups.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-14 text-center text-gray-400 text-sm">
                            No inventory found
                          </td>
                        </tr>
                      ) : (
                        paginatedGroups.map((group) => (
                          <React.Fragment key={group.productName}>
                            {/* MASTER ROW */}
<tr
  className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
  onClick={() => toggleExpand(group.productName)}
>
  <td className="px-3 py-3 text-center">
    <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
      {expandedProducts.has(group.productName) ? (
        <ChevronDown size={15} />
      ) : (
        <ChevronRight size={15} />
      )}
    </span>
  </td>
  <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">{group.productName}</td>
  <td className="px-3 py-3 text-gray-400 text-xs italic">—</td>
  <td className="px-3 py-3 text-gray-400 text-xs italic">—</td>
  <td className="px-3 py-3 text-gray-400 text-xs italic">—</td>
  <td className="px-3 py-3 text-gray-500 text-xs">{[...group.vendorNames].filter(Boolean).join(", ") || "—"}</td>
  <td className="px-3 py-3">
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
      <MapPin size={10} className="text-[#c62d23]" />
      {group.locationCount} entr{group.locationCount !== 1 ? "ies" : "y"}
    </span>
  </td>
  <td className="px-3 py-3 text-gray-400 text-xs italic">—</td>
    <td className="px-3 py-3 text-right text-gray-500 text-xs">{group.totalMinQuantity || "—"}</td>
  <td className="px-3 py-3 text-right font-bold text-gray-900 tabular-nums">{group.totalQuantity}</td>
<td className="px-3 py-3 text-right text-gray-500 text-xs">{group.totalMaxQuantity || "—"}</td>
  <td className="px-3 py-3"><StatusBadge status={group.worstStatus} /></td>
  <td className="px-3 py-3 text-gray-400 text-xs">—</td>
  <td className="px-3 py-3"></td>
</tr>

                            {/* DETAIL ROWS */}
                            {expandedProducts.has(group.productName) &&
                              group.entries.map((item, idx) => (
                                <tr 
  key={item.id}
  className={`bg-slate-50/70 transition-colors hover:bg-slate-100/60 ${
    idx === group.entries.length - 1 ? "border-b-2 border-gray-200" : ""
  }`}
>
  <td className="px-3 py-2.5"></td>
  <td className="px-3 py-2.5 text-gray-500 text-xs pl-6">—</td>
  <td className="px-3 py-2.5 text-gray-600 text-xs">{item.color || "—"}</td>
  <td className="px-3 py-2.5 text-gray-600 text-xs">{item.mesh || "—"}</td>
  <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[120px] truncate" title={item.remark}>{item.remark || "—"}</td>
  <td className="px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-gray-600 text-xs">
      <Building2 size={11} className="text-gray-400 flex-shrink-0" />
      {item.vendor?.name || "—"}
    </div>
  </td>
  <td className="px-3 py-2.5">
    <div className="flex items-center gap-1 text-gray-600 text-xs">
      <MapPin size={11} className="text-gray-400 flex-shrink-0" />
      {item.location || "—"}
    </div>
  </td>
  <td className="px-3 py-2.5 text-gray-600 text-xs font-medium">{item.chalanNo || "—"}</td>
  <td className="px-3 py-2.5 text-right tabular-nums">
    <span className={`text-xs font-semibold ${item.quantity <= item.minQuantity && item.minQuantity > 0 ? "text-red-600" : "text-gray-400"}`}>
      {item.minQuantity > 0 ? item.minQuantity : "—"}
    </span>
  </td>
  <td className="px-3 py-2.5 font-semibold text-gray-900 text-sm text-right tabular-nums">{item.quantity}</td>
  <td className="px-3 py-2.5 text-right tabular-nums">
  <span className="text-xs font-semibold text-gray-400">
    {item.maxQuantity ?? "—"}
  </span>
</td>
  <td className="px-3 py-2.5"><StatusBadge status={item.status} size="sm" /></td>
  <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">
    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
  </td>
  <td className="px-3 py-2.5">
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditId(item.id);
          setForm({
            chairType: item.name,
            chairTypeId: item.name,
            vendor: item.vendor?._id || "",
            vendorName: item.vendor?.name || "",
            quantity: item.quantity,
            minQuantity: item.minQuantity ?? "",
            color: item.color || "",
            mesh: item.mesh || "",
            remark: item.remark || "",
            location: item.location || "",
            locationDisplay: item.location || "",
            chalanNo: item.chalanNo || "",
          });
          setShowForm(true);
        }}
        className="p-1.5 hover:bg-blue-100 rounded-md transition"
        title="Edit"
      >
        <Pencil size={13} className="text-gray-400 hover:text-blue-600" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); deleteInventory(item.id); }}
        className="p-1.5 hover:bg-red-100 rounded-md transition"
        title="Delete"
      >
        <Trash2 size={13} className="text-gray-400 hover:text-red-600" />
      </button>
    </div>
  </td>
</tr>
                              ))}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ===== PAGINATION BAR ===== */}
                {/* {totalItems > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Rows per page:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#c62d23] cursor-pointer"
                        >
                          {PAGE_SIZE_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-xs text-gray-400">
                        {startIdx + 1}–{endIdx} of {totalItems}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <PagBtn onClick={() => goToPage(1)} disabled={safePage === 1} title="First page">
                        <ChevronsLeft size={14} />
                      </PagBtn>
                      <PagBtn onClick={() => goToPage(safePage - 1)} disabled={safePage === 1} title="Previous page">
                        <ChevronLeft size={14} />
                      </PagBtn>

                      {pageNumbers[0] > 1 && (
                        <>
                          <PagBtn onClick={() => goToPage(1)}>1</PagBtn>
                          {pageNumbers[0] > 2 && (
                            <span className="px-1 text-gray-400 text-xs">…</span>
                          )}
                        </>
                      )}

                      {pageNumbers.map((p) => (
                        <PagBtn key={p} onClick={() => goToPage(p)} active={p === safePage}>
                          {p}
                        </PagBtn>
                      ))}

                      {pageNumbers[pageNumbers.length - 1] < totalPages && (
                        <>
                          {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                            <span className="px-1 text-gray-400 text-xs">…</span>
                          )}
                          <PagBtn onClick={() => goToPage(totalPages)}>{totalPages}</PagBtn>
                        </>
                      )}

                      <PagBtn onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages} title="Next page">
                        <ChevronRight size={14} />
                      </PagBtn>
                      <PagBtn onClick={() => goToPage(totalPages)} disabled={safePage === totalPages} title="Last page">
                        <ChevronsRight size={14} />
                      </PagBtn>
                    </div>
                  </div>
                )} */}
              </>
            )}
          </div>

          {/* ===== MOBILE CARDS ===== */}
          <div className="md:hidden space-y-3">
            {/* Mobile Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
                <input
                  type="text"
                  placeholder="Search product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none text-sm bg-white"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500 text-sm">Loading...</p>
              </div>
            ) : paginatedGroups.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-200 text-sm">
                No inventory found
              </div>
            ) : (
              <>
                {paginatedGroups.map((group) => (
                  <div
                    key={group.productName}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpand(group.productName)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {expandedProducts.has(group.productName) ? (
                            <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />
                          )}
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            {group.productName}
                          </h3>
                        </div>
                        <StatusBadge status={group.worstStatus} />
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3 pl-5">
                        <Package size={11} className="text-gray-400" />
                        <span>
                          {group.locationCount} entr{group.locationCount !== 1 ? "ies" : "y"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs pl-5">
                        <div>
                          <p className="text-gray-400 mb-0.5">Total Stock</p>
                          <p className="font-bold text-gray-900 text-lg leading-none">
                            {group.totalQuantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Vendors</p>
                          <p className="font-semibold text-gray-900 text-xs">
                            {[...group.vendorNames].filter(Boolean).join(", ") || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {expandedProducts.has(group.productName) && (
                      <div className="border-t border-gray-200 divide-y divide-gray-100 bg-gray-50/50">
                        {group.entries.map((item) => (
                          <div key={item.id} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <MapPin size={13} className="text-[#c62d23]" />
                                <span className="font-medium text-sm">{item.location || "—"}</span>
                              </div>
                              <StatusBadge status={item.status} size="sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-2 text-xs">
                              <div>
                                <p className="text-gray-400 mb-0.5">Quantity</p>
                                <p className="font-bold text-gray-900">{item.quantity}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 mb-0.5">Min Qty</p>
                                <p className={`font-semibold ${item.quantity <= item.minQuantity && item.minQuantity > 0 ? "text-red-600" : "text-gray-900"}`}>
                                  {item.minQuantity > 0 ? item.minQuantity : "—"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                              <Building2 size={11} />
                              <span>{item.vendor?.name || "—"}</span>
                            </div>
                            {(item.color || item.mesh) && (
                              <div className="flex gap-1.5 mb-1">
                                {item.color && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{item.color}</span>}
                                {item.mesh && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{item.mesh}</span>}
                              </div>
                            )}
                            {item.chalanNo && (
                              <p className="text-xs text-gray-400 mb-1">
                                Chalan: <span className="font-medium text-gray-600">{item.chalanNo}</span>
                              </p>
                            )}
                            {item.remark && (
                              <p className="text-xs text-gray-400 italic mb-1">{item.remark}</p>
                            )}
                            {item.createdAt && (
                              <p className="text-[10px] text-gray-400 mb-2">
                                Added: {new Date(item.createdAt).toLocaleDateString()}
                              </p>
                            )}
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditId(item.id);
                                  setForm({
                                    chairType: item.name,
                                    chairTypeId: item.name,
                                    vendor: item.vendor?._id || "",
                                    vendorName: item.vendor?.name || "",
                                    quantity: item.quantity,
                                    minQuantity: item.minQuantity ?? "",
                                    maxQuantity: item.maxQuantity ?? "",
                                    color: item.color || "",
                                    mesh: item.mesh || "",
                                    remark: item.remark || "",
                                    location: item.location || "",
                                    locationDisplay: item.location || "",
                                    chalanNo: item.chalanNo || "",
                                  });
                                  setShowForm(true);
                                }}
                                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 text-xs font-medium"
                              >
                                <Pencil size={13} /> Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteInventory(item.id);
                                }}
                                className="bg-red-50 hover:bg-red-100 text-red-700 py-2 px-3 rounded-lg transition flex items-center justify-center"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Mobile Pagination */}
                {/* {totalItems > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between shadow-sm">
                    <span className="text-xs text-gray-500">
                      {startIdx + 1}–{endIdx} of {totalItems}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => goToPage(safePage - 1)}
                        disabled={safePage === 1}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-xs text-gray-700 font-medium px-1">
                        Page {safePage} / {totalPages}
                      </span>
                      <button
                        onClick={() => goToPage(safePage + 1)}
                        disabled={safePage === totalPages}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )} */}
              </>
            )}
          </div>
        </div>

        {/* ===== MODAL ===== */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#c62d23]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="text-[#c62d23]" size={17} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editId ? "Update Inventory" : "Add Inventory"}
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Chair Type — searchable dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Chair Type <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    value={form.chairTypeId}
                    displayValue={form.chairType}
                    options={chairModelsList}
                    onSelect={(val, label) => {
  const normalized = (label || val).trim().toLowerCase();
  const entryWithMin = inventoryData.find(
    (i) => i.name.trim().toLowerCase() === normalized && i.minQuantity
  );
  const entryWithMax = inventoryData.find(
    (i) => i.name.trim().toLowerCase() === normalized && i.maxQuantity
  );
  setForm((f) => ({
    ...f,
    chairType: label || val,
    chairTypeId: val,
    minQuantity: entryWithMin ? String(entryWithMin.minQuantity) : f.minQuantity,
    maxQuantity: entryWithMax ? String(entryWithMax.maxQuantity) : f.maxQuantity,
  }));
}}
                    onAddNew={handleAddNewChairModel}
                    placeholder="Search chair type..."
                    addNewLabel="Add new chair type"
                  />
                </div>

                {/* Vendor — searchable dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Vendor <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    value={form.vendor}
                    displayValue={form.vendorName}
                    options={vendorsList.map((v) => ({
                      value: v._id,
                      label: v.name,
                      _id: v._id,
                      name: v.name,
                    }))}
                    onSelect={(val, label) =>
                      setForm((f) => ({
                        ...f,
                        vendor: val,
                        vendorName: label,
                      }))
                    }
                    onAddNew={async (name) => {
                      const res = await axios.post(
                        `${API}/vendors`,
                        { name },
                        { headers }
                      );
                      const vendor = res.data.vendor;
                      setVendorsList((prev) => [...prev, vendor]);
                      setForm((f) => ({
                        ...f,
                        vendor: vendor._id,
                        vendorName: vendor.name,
                      }));
                    }}
                    placeholder="Search vendor..."
                    addNewLabel="Add new vendor"
                  />
                </div>

                {/* Color */}
                <Input
                  label="Color"
                  value={form.color}
                  onChange={(v) => setForm({ ...form, color: v })}
                  placeholder="Enter chair color"
                  required
                />

                {/* Mesh */}
                <Input
                  label="Mesh"
                  value={form.mesh}
                  onChange={(v) => setForm({ ...form, mesh: v })}
                  placeholder="e.g. Net / Fabric"
                />

                {/* Remark */}
                <Input
                  label="Remark"
                  value={form.remark}
                  onChange={(v) => setForm({ ...form, remark: v })}
                  placeholder="Any notes…"
                />

                {/* Quantity */}
                <Input
                  label="Quantity"
                  type="number"
                  value={form.quantity}
                  onChange={(v) => setForm({ ...form, quantity: v })}
                  placeholder="Enter quantity"
                  required
                />

                {/* Min Quantity */}
                <Input
                  label="Min Quantity"
                  type="number"
                  value={form.minQuantity}
                  onChange={(v) => setForm({ ...form, minQuantity: v })}
                  placeholder="Alert threshold (optional)"
                />

                {/* Max Quantity */}
                <Input
                  label="Max Quantity"
                  type="number"
                  value={form.maxQuantity}
                  onChange={(v) => setForm({ ...form, maxQuantity: v })}
                  placeholder="Enter max stock level"
                />

                {/* Chalan / Bill No */}
                <Input
                  label="Chalan / Bill No"
                  value={form.chalanNo}
                  onChange={(v) => setForm({ ...form, chalanNo: v })}
                  placeholder="Enter chalan or bill number"
                  required
                />

                {/* Location — searchable dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Location
                  </label>
                  <SearchableDropdown
                    value={form.location}
                    displayValue={form.locationDisplay}
                    options={locationsList}
                    onSelect={(val) =>
                      setForm((f) => ({
                        ...f,
                        location: val,
                        locationDisplay: val,
                      }))
                    }
                    onAddNew={handleAddNewLocation}
                    placeholder="Search location..."
                    addNewLabel="Add new location"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white z-10 rounded-b-2xl">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={submitInventory}
                  className="flex-1 py-2.5 rounded-xl bg-[#c62d23] hover:bg-[#a82419] text-white font-medium transition shadow-sm text-sm"
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

/* ================= PAGINATION BUTTON ================= */
const PagBtn = ({ children, onClick, disabled, active, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center
      ${
        active
          ? "bg-[#c62d23] text-white shadow-sm"
          : "text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200"
      }
      ${disabled ? "opacity-35 cursor-not-allowed pointer-events-none" : "cursor-pointer"}
    `}
  >
    {children}
  </button>
);

/* ================= STAT CARD ================= */
const StatCard = ({ title, value, icon, danger, onClick, active, accentColor }) => {
  const safeValue =
    typeof value === "number" && !Number.isNaN(value) ? value : 0;
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all shadow-sm cursor-pointer group
        ${danger ? "border-amber-200 bg-amber-50/50" : "border-gray-200"}
        ${active ? "ring-2 ring-offset-1" : "hover:shadow-md hover:border-gray-300"}
      `}
      style={{
        borderLeft: `4px solid ${accentColor || "#c62d23"}`,
        ...(active ? { "--tw-ring-color": accentColor || "#c62d23" } : {}),
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <p className="text-xs sm:text-sm text-gray-500 font-medium">{title}</p>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <p
        className={`text-2xl sm:text-3xl font-bold ${
          danger ? "text-amber-700" : "text-gray-900"
        }`}
      >
        {safeValue}
      </p>
      <p className="text-[10px] text-gray-400 mt-1 group-hover:text-gray-500 transition-colors">
        {active ? "Showing filtered" : "Click to filter"}
      </p>
    </div>
  );
};

/* ================= STATUS BADGE ================= */
const StatusBadge = ({ status, size = "default" }) => {
  const map = {
    Healthy: "bg-green-100 text-green-800",
    "Low Stock": "bg-amber-100 text-amber-800",
    Critical: "bg-red-100 text-red-800",
    Overstocked: "bg-blue-100 text-blue-800",
  };
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";
  return (
    <span
      className={`${sizeClasses} rounded-full font-semibold whitespace-nowrap ${
        map[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
};

/* ================= INPUT ================= */
const Input = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}) => (
  <div>
    <label className="block text-sm font-semibold text-gray-900 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition text-sm"
    />
  </div>
);