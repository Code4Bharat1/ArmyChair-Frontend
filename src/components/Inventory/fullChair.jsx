//warehouse fullchair inventory page - list, add, update, delete, export csv, bulk upload, filter by vendor/status/search
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
  Clock,
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
        maxQuantity: 500,
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
      color: item.colour || "",
      mesh: item.mesh || "",
      remark: item.remark || "",
      chalanNo: item.chalanNo || "",
      status: item.status || "Healthy",
      location: item.location || "",
      createdAt: item.createdAt || null,
    }));
  }, [inventory]);

  const vendors = useMemo(() => {
    const names = inventoryData.map((i) => i.vendor?.name).filter(Boolean);
    return ["All", ...new Set(names)];
  }, [inventoryData]);

  const statuses = ["All", "Healthy", "Low Stock", "Critical"];

  const filteredData = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();
    return inventoryData.filter((i) => {
      return (
        (i.name || "").toLowerCase().includes(term) &&
        (filterVendor === "All" ||
          (i.vendor?.name || "") === filterVendor) &&
        (filterStatus === "All" || (i.status || "") === filterStatus)
      );
    });
  }, [inventoryData, searchTerm, filterVendor, filterStatus]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterVendor, filterStatus, pageSize]);

  /* ================= PAGINATION ================= */
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const paginatedData = filteredData.slice(startIdx, endIdx);

  const goToPage = (p) =>
    setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  const pageNumbers = useMemo(() => {
    const pages = [];
    const delta = 2;
    const left = Math.max(1, safePage - delta);
    const right = Math.min(totalPages, safePage + delta);
    for (let i = left; i <= right; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

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
  const healthyCount = useMemo(
    () => inventoryData.filter((i) => i.status === "Healthy").length,
    [inventoryData]
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
      color: "",
      mesh: "",
      remark: "",
      location: "",
      locationDisplay: "",
      chalanNo: "",
    });
  };

  const TABLE_HEADERS = [
    "Product",
    "Color",
    "Mesh",
    "Remark",
    "Vendor",
    "Location",
    "Chalan No",
    "Quantity",
    "Min Qty",
    "Status",
    "Created",
    "Actions",
  ];

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
                onClick={() => exportToCSV(filteredData)}
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
              title="Total Products"
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
                {filteredData.length} item
                {filteredData.length !== 1 ? "s" : ""}
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
                {lowStockCount} item{lowStockCount !== 1 ? "s" : ""} need
                immediate restocking
              </span>
            </div>
          )}

          {/* ===== DESKTOP TABLE ===== */}
          <div className="hidden md:block bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
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
                        {TABLE_HEADERS.map((h) => (
                          <th
                            key={h}
                            className={`px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${
                              h === "Quantity" || h === "Min Qty" ? "text-right" : "text-left"
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {paginatedData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={TABLE_HEADERS.length}
                            className="py-14 text-center text-gray-400 text-sm"
                          >
                            No inventory found
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((i, idx) => (
                          <tr
                            key={i.id}
                            className={`transition-colors hover:bg-blue-50/30 ${
                              idx % 2 === 1 ? "bg-gray-50/40" : "bg-white"
                            }`}
                          >
                            <td className="px-3 py-2 font-semibold text-gray-900 text-sm whitespace-nowrap">
                              {i.name}
                            </td>
                            <td className="px-3 py-2 text-gray-600 text-xs">
                              {i.color || "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-600 text-xs">
                              {i.mesh || "—"}
                            </td>
                            <td
                              className="px-3 py-2 text-gray-500 text-xs max-w-[160px] truncate"
                              title={i.remark}
                            >
                              {i.remark || "—"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                                <Building2
                                  size={12}
                                  className="text-gray-400 flex-shrink-0"
                                />
                                {i.vendor?.name || "—"}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1 text-gray-600 text-xs">
                                <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                                {i.location || "—"}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-gray-600 text-xs font-medium">
                              {i.chalanNo || "—"}
                            </td>
                            <td className="px-3 py-2 font-bold text-gray-900 text-sm text-right tabular-nums">
                              {i.quantity}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              <span className={`text-xs font-semibold ${i.quantity <= i.minQuantity && i.minQuantity > 0 ? "text-red-600" : "text-gray-400"}`}>
                                {i.minQuantity > 0 ? i.minQuantity : "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge status={i.status} />
                            </td>
                            <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">
                              {i.createdAt
                                ? new Date(i.createdAt).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditId(i.id);
                                    setForm({
                                      chairType: i.name,
                                      chairTypeId: i.name,
                                      vendor: i.vendor?._id || "",
                                      vendorName: i.vendor?.name || "",
                                      quantity: i.quantity,
                                      minQuantity: i.minQuantity ?? "",
                                      color: i.color || "",
                                      mesh: i.mesh || "",
                                      remark: i.remark || "",
                                      location: i.location || "",
                                      locationDisplay: i.location || "",
                                      chalanNo: i.chalanNo || "",
                                    });
                                    setShowForm(true);
                                  }}
                                  className="p-1 hover:bg-blue-100 rounded-md transition"
                                  title="Edit"
                                >
                                  <Pencil
                                    size={13}
                                    className="text-gray-400 hover:text-blue-600"
                                  />
                                </button>
                                <button
                                  onClick={() => deleteInventory(i.id)}
                                  className="p-1 hover:bg-red-100 rounded-md transition"
                                  title="Delete"
                                >
                                  <Trash2
                                    size={13}
                                    className="text-gray-400 hover:text-red-600"
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ===== PAGINATION BAR ===== */}
                {totalItems > 0 && (
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
                      <PagBtn
                        onClick={() => goToPage(1)}
                        disabled={safePage === 1}
                        title="First page"
                      >
                        <ChevronsLeft size={14} />
                      </PagBtn>
                      <PagBtn
                        onClick={() => goToPage(safePage - 1)}
                        disabled={safePage === 1}
                        title="Previous page"
                      >
                        <ChevronLeft size={14} />
                      </PagBtn>

                      {pageNumbers[0] > 1 && (
                        <>
                          <PagBtn onClick={() => goToPage(1)}>1</PagBtn>
                          {pageNumbers[0] > 2 && (
                            <span className="px-1 text-gray-400 text-xs">
                              …
                            </span>
                          )}
                        </>
                      )}

                      {pageNumbers.map((p) => (
                        <PagBtn
                          key={p}
                          onClick={() => goToPage(p)}
                          active={p === safePage}
                        >
                          {p}
                        </PagBtn>
                      ))}

                      {pageNumbers[pageNumbers.length - 1] < totalPages && (
                        <>
                          {pageNumbers[pageNumbers.length - 1] <
                            totalPages - 1 && (
                            <span className="px-1 text-gray-400 text-xs">
                              …
                            </span>
                          )}
                          <PagBtn onClick={() => goToPage(totalPages)}>
                            {totalPages}
                          </PagBtn>
                        </>
                      )}

                      <PagBtn
                        onClick={() => goToPage(safePage + 1)}
                        disabled={safePage === totalPages}
                        title="Next page"
                      >
                        <ChevronRight size={14} />
                      </PagBtn>
                      <PagBtn
                        onClick={() => goToPage(totalPages)}
                        disabled={safePage === totalPages}
                        title="Last page"
                      >
                        <ChevronsRight size={14} />
                      </PagBtn>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ===== MOBILE CARDS ===== */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500 text-sm">Loading...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-200 text-sm">
                No inventory found
              </div>
            ) : (
              <>
                {paginatedData.map((i) => (
                  <div
                    key={i.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                          {i.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                          <Building2
                            size={11}
                            className="text-gray-400 flex-shrink-0"
                          />
                          <span className="truncate">
                            {i.vendor?.name || "—"}
                          </span>
                        </div>
                        {i.location && (
                          <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                            <MapPin size={10} className="flex-shrink-0" />
                            {i.location}
                          </div>
                        )}
                        {i.chalanNo && (
                          <div className="text-gray-400 text-xs mt-0.5">
                            Chalan:{" "}
                            <span className="font-medium text-gray-600">
                              {i.chalanNo}
                            </span>
                          </div>
                        )}
                      </div>
                      <StatusBadge status={i.status} />
                    </div>

                    {(i.color || i.mesh || i.remark) && (
                      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                        {i.color && (
                          <div>
                            <p className="text-gray-400 mb-0.5">Color</p>
                            <p className="font-medium text-gray-700">
                              {i.color}
                            </p>
                          </div>
                        )}
                        {i.mesh && (
                          <div>
                            <p className="text-gray-400 mb-0.5">Mesh</p>
                            <p className="font-medium text-gray-700">
                              {i.mesh}
                            </p>
                          </div>
                        )}
                        {i.remark && (
                          <div>
                            <p className="text-gray-400 mb-0.5">Remark</p>
                            <p className="font-medium text-gray-700 truncate">
                              {i.remark}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {i.createdAt && (
                      <p className="text-[10px] text-gray-400 mb-2">
                        Added: {new Date(i.createdAt).toLocaleDateString()}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-end gap-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Quantity</p>
                          <p className="font-bold text-gray-900 text-xl leading-none">
                            {i.quantity}
                          </p>
                        </div>
                        {i.minQuantity > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Min Qty</p>
                            <p className={`font-semibold text-sm leading-none ${i.quantity <= i.minQuantity ? "text-red-600" : "text-gray-500"}`}>
                              {i.minQuantity}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditId(i.id);
                            setForm({
                              chairType: i.name,
                              chairTypeId: i.name,
                              vendor: i.vendor?._id || "",
                              vendorName: i.vendor?.name || "",
                              quantity: i.quantity,
                              minQuantity: i.minQuantity ?? "",
                              color: i.color || "",
                              mesh: i.mesh || "",
                              remark: i.remark || "",
                              location: i.location || "",
                              locationDisplay: i.location || "",
                              chalanNo: i.chalanNo || "",
                            });
                            setShowForm(true);
                          }}
                          className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition flex items-center gap-1.5 text-xs font-medium"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => deleteInventory(i.id)}
                          className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Mobile Pagination */}
                {totalItems > 0 && (
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
                )}
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
                    onSelect={(val, label) =>
                      setForm((f) => ({
                        ...f,
                        chairType: label || val,
                        chairTypeId: val,
                      }))
                    }
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
const StatusBadge = ({ status }) => {
  const map = {
    Healthy: "bg-green-100 text-green-800",
    "Low Stock": "bg-amber-100 text-amber-800",
    Critical: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
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
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition text-sm"
    />
  </div>
);