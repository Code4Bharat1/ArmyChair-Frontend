//warehouse spare parts inventory page - list, add, update, delete, export csv, bulk upload, filter by vendor/status/search
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Menu,
  X,
  UserCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Search,
  Upload,
  Download,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";
import { useRouter } from "next/navigation";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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

  const getLabel = (o) => (typeof o === "string" ? o : o.label || o.name || "");
  const getValue = (o) => (typeof o === "string" ? o : o.value || o._id || o);

  const filtered = options.filter((o) =>
    getLabel(o).toLowerCase().includes(search.toLowerCase()),
  );

  const exactMatch = options.some(
    (o) => getLabel(o).toLowerCase() === search.toLowerCase(),
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
                getValue(o) === value
                  ? "bg-red-50 text-[#c62d23] font-medium"
                  : ""
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

/* ================= CSV EXPORT UTIL ================= */
const exportToCSV = (groupedParts, items) => {
  const rows = [];
  rows.push([
    "Part Name",
    "Vendor",
    "Location",
    "Available",
    "Max Quantity",
    "Min Quantity",
    "Status",
    "Remark",
    "Chalan / Bill No",
    "Created At",
  ]);
  groupedParts.forEach((part) => {
    part.locations.forEach((loc) => {
      rows.push([
        part.partName,
        loc.vendorName,
        loc.location,
        loc.quantity,
        loc.maxQuantity ?? "",
        loc.minQuantity ?? "",
        loc.status,
        loc.remark || "",
        loc.chalanNo || "",
        loc.createdAt ? new Date(loc.createdAt).toLocaleDateString() : "",
      ]);
    });
  });
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spare-parts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ================= PAGE ================= */
export default function SparePartsInventory() {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Part name list (fetched dynamically from data)
  const [partNamesList, setPartNamesList] = useState([]);

  // Server-side pagination
  const [serverPage, setServerPage] = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const SERVER_LIMIT = 100;

  // Client-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [expandedParts, setExpandedParts] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState("ALL");

  const role =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user"))?.role
      : null;

  /* FORM */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    partName: "",
    partNameDisplay: "",
    vendor: "",
    vendorName: "",
    remark: "",
    location: "",
    locationDisplay: "",
    quantity: "",
    minQuantity: "",
    maxQuantity: "",
    chalanNo: "",
  });

  /* TRANSFER */
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferItem, setTransferItem] = useState(null);
  const [transfer, setTransfer] = useState({ toLocation: "", quantity: "" });

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchParts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/inventory/spare-parts`, {
        params: {
          page: serverPage,
          limit: SERVER_LIMIT,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        },
        headers,
      });
      setItems(res.data.inventory || []);
      setServerTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, [serverPage, statusFilter]);

  useEffect(() => {
    axios
      .get(`${API}/vendors`, { headers })
      .then((res) => setVendors(res.data.vendors || res.data))
      .catch(console.error);
  }, []);

  // Build part names list from fetched items
  useEffect(() => {
    if (items.length > 0) {
      const names = [
        ...new Set(items.map((i) => i.partName?.trim()).filter(Boolean)),
      ].sort();
      setPartNamesList(names);
    }
  }, [items]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, pageSize]);

  /* ================= SAVE ================= */
  const submitPart = async () => {
    try {
      if (
        !form.partName ||
        !form.vendor ||
        !form.location ||
        form.quantity === "" ||
        !form.chalanNo
      ) {
        alert("All fields required");
        return;
      }

      let vendorId = form.vendor;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(form.vendor);

      if (!isObjectId) {
        const res = await axios.post(
          `${API}/vendors`,
          { name: form.vendor },
          { headers },
        );
        vendorId = res.data._id || res.data.vendor?._id;
      }

      const payload = {
        partName: form.partName,
        vendor: vendorId,
        remark: form.remark?.trim() || "",
        location: form.location,
        quantity: Number(form.quantity),
        minQuantity: Number(form.minQuantity || 0),
        chalanNo: form.chalanNo,
      };

     if (form.maxQuantity !== "") {
  payload.maxQuantity = Number(form.maxQuantity);
}

      if (editId) {
        await axios.patch(
          `${API}/inventory/spare-parts/update/${editId}`,
          payload,
          { headers },
        );
      } else {
        await axios.post(`${API}/inventory/spare-parts`, payload, { headers });
      }

      resetForm();
      fetchParts();
    } catch (err) {
      console.error("Save failed", err?.response?.data || err);
      alert(err?.response?.data?.message || "Failed to save spare part");
    }
  };

  /* ================= ADD NEW PART NAME ================= */
  const handleAddNewPartName = (name) => {
    setPartNamesList((prev) =>
      prev.includes(name) ? prev : [...prev, name].sort(),
    );
    setForm((f) => ({ ...f, partName: name, partNameDisplay: name }));
  };

  /* ================= ADD NEW VENDOR ================= */
  const handleAddNewVendor = async (name) => {
    try {
      const res = await axios.post(`${API}/vendors`, { name }, { headers });
      const newVendor = res.data.vendor || res.data;
      setVendors((prev) => [...prev, newVendor]);
      setForm((f) => ({
        ...f,
        vendor: newVendor._id,
        vendorName: newVendor.name,
      }));
    } catch {
      setForm((f) => ({ ...f, vendor: name, vendorName: name }));
    }
  };

  /* ================= ADD NEW LOCATION ================= */
  const handleAddNewLocation = (name) => {
    const upper = name.toUpperCase();
    setForm((f) => ({ ...f, location: upper, locationDisplay: upper }));
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
      if (!transfer.toLocation || transfer.quantity === "")
        return alert("Destination location and quantity required");
      const qty = Number(transfer.quantity);
      if (qty <= 0) return alert("Quantity must be greater than 0");
      if (qty > transferItem.quantity)
        return alert("Not enough stock in source location");
      await axios.post(
        `${API}/transfer`,
        {
          sourceId: transferItem.id,
          toLocation: transfer.toLocation,
          quantity: qty,
        },
        { headers },
      );
      setShowTransfer(false);
      setTransfer({ toLocation: "", quantity: "" });
      setTransferItem(null);
      fetchParts();
    } catch (err) {
      console.error("Transfer failed", err?.response?.data || err);
      alert(err?.response?.data?.message || "Transfer failed");
    }
  };

  /* ================= GROUP DATA ================= */
  const groupedParts = useMemo(() => {
    const grouped = new Map();
    items.forEach((item) => {
      const normalizedKey = item.partName.trim().toLowerCase();
      if (!grouped.has(normalizedKey)) {
        grouped.set(normalizedKey, {
          partName: item.partName,
          locations: [],
          totalQuantity: 0,
          totalMinQuantity: 0,
          totalMaxQuantity: 0,
          worstStatus: "Healthy",
          locationCount: 0,
        });
      }
      const group = grouped.get(normalizedKey);
      group.locations.push({
        id: item._id,
        location: item.location,
        quantity: item.quantity,
        minQuantity: item.minQuantity || 0,
        maxQuantity: item.maxQuantity,
        status: item.status,
        remark: item.remark || "",
        chalanNo: item.chalanNo || "",
        vendorName: item.vendor?.name || "—",
        createdAt: item.createdAt || null,
      });

      group.totalMinQuantity += item.minQuantity || 0;
      group.totalQuantity += item.quantity;
      group.totalMaxQuantity += item.maxQuantity || 0;
      group.locationCount = group.locations.length;
      const statusPriority = {
        Critical: 4,
        "Low Stock": 3,
        Overstocked: 2,
        Healthy: 1,
      };
      if (statusPriority[item.status] > statusPriority[group.worstStatus])
        group.worstStatus = item.status;
    });
    return Array.from(grouped.values());
  }, [items]);

  /* ================= FILTER ================= */
  const filteredGroupedParts = useMemo(() => {
    let filtered = groupedParts;
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      filtered = filtered.filter((p) => p.partName.toLowerCase().includes(s));
    }
    if (statusFilter === "LOW")
      filtered = filtered.filter(
        (p) => p.worstStatus === "Low Stock" || p.worstStatus === "Critical",
      );
    else if (statusFilter === "OVERSTOCK")
      filtered = filtered.filter((p) => p.worstStatus === "Overstocked");
    return filtered;
  }, [groupedParts, statusFilter, search]);

  /* ================= LOCATIONS FROM DATA ================= */
  const locations = useMemo(
    () => Array.from(new Set(items.map((i) => i.location).filter(Boolean))),
    [items],
  );

  /* ================= CLIENT PAGINATION ================= */
  const totalItems = filteredGroupedParts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const paginatedParts = filteredGroupedParts.slice(startIdx, endIdx);

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  const pageNumbers = useMemo(() => {
    const pages = [];
    const delta = 2;
    const left = Math.max(1, safePage - delta);
    const right = Math.min(totalPages, safePage + delta);
    for (let i = left; i <= right; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  /* ================= TOGGLE EXPAND ================= */
  const toggleExpand = (partName) => {
    const newExpanded = new Set(expandedParts);
    newExpanded.has(partName)
      ? newExpanded.delete(partName)
      : newExpanded.add(partName);
    setExpandedParts(newExpanded);
  };

  /* ================= STATS ================= */
  const totalParts = groupedParts.length;
  const totalQty = groupedParts.reduce((s, p) => s + p.totalQuantity, 0);
  const lowStock = groupedParts.filter(
    (p) => p.worstStatus === "Low Stock" || p.worstStatus === "Critical",
  ).length;
  const overStock = groupedParts.filter(
    (p) => p.worstStatus === "Overstocked",
  ).length;

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({
      partName: "",
      partNameDisplay: "",
      vendor: "",
      vendorName: "",
      location: "",
      locationDisplay: "",
      remark: "",
      quantity: "",
      maxQuantity: "",
      minQuantity: "",
      chalanNo: "",
    });
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <input
        type="file"
        accept=".xlsx"
        id="bulk-upload-input"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const formData = new FormData();
          formData.append("file", file);
          try {
            await axios.post(
              `${API}/inventory/spare-parts/bulk-upload`,
              formData,
              { headers },
            );
            fetchParts();
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
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate leading-tight">
                  Spare Parts Inventory
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">
                  Manage your spare parts stock levels and details
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => exportToCSV(filteredGroupedParts, items)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md text-xs sm:text-sm"
                title="Export to CSV"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>
              <button
                onClick={() =>
                  document.getElementById("bulk-upload-input").click()
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md text-xs sm:text-sm"
              >
                <Upload size={15} />
                <span className="hidden sm:inline">Bulk Upload</span>
                <span className="sm:hidden">Upload</span>
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md text-xs sm:text-sm"
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
          {/* STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              title="Unique Parts"
              value={totalParts}
              icon={<Package className="text-[#c62d23]" />}
              active={statusFilter === "ALL"}
              onClick={() => setStatusFilter("ALL")}
            />
            <KpiCard
              title="Total Stock"
              value={totalQty}
              icon={<Warehouse className="text-[#c62d23]" />}
            />
            <KpiCard
              title="Low / Critical"
              value={lowStock}
              icon={<TrendingDown className="text-[#c62d23]" />}
              danger
              active={statusFilter === "LOW"}
              onClick={() => setStatusFilter("LOW")}
            />
            <KpiCard
              title="Overstocked"
              value={overStock}
              icon={<Boxes className="text-blue-600" />}
              info
              active={statusFilter === "OVERSTOCK"}
              onClick={() => setStatusFilter("OVERSTOCK")}
            />
          </div>

          {/* ALERT */}
          {lowStock > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 flex gap-2 sm:gap-3 items-center">
              <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
              <span className="text-red-700 font-medium text-xs sm:text-sm">
                {lowStock} part{lowStock !== 1 ? "s" : ""} need restocking
              </span>
            </div>
          )}

          {/* ===== DESKTOP TABLE ===== */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search part name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none bg-white"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {filteredGroupedParts.length} part
                {filteredGroupedParts.length !== 1 ? "s" : ""} &bull;{" "}
                {items.length} location entries
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-10 px-4 py-3 text-left"></th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      Part Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      Remark
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      Locations
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">
                      Total Min
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">
                      Available Qty
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">
                      Total Max
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="py-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                        <p className="mt-3 text-gray-400 text-sm">
                          Loading inventory...
                        </p>
                      </td>
                    </tr>
                  ) : paginatedParts.length === 0 ? (
                    <tr>
                      <td
                        colSpan="10"
                        className="py-16 text-center text-gray-400 text-sm"
                      >
                        No parts found
                      </td>
                    </tr>
                  ) : (
                    paginatedParts.map((part) => (
                      <React.Fragment key={part.partName}>
                        {/* MASTER ROW */}
                        <tr
                          className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                          onClick={() => toggleExpand(part.partName)}
                        >
                          <td className="px-4 py-3 text-center">
                            <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                              {expandedParts.has(part.partName) ? (
                                <ChevronDown size={15} />
                              ) : (
                                <ChevronRight size={15} />
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                            {part.partName}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {[
                              ...new Set(
                                part.locations.map((l) => l.vendorName),
                              ),
                            ].join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm italic">
                            —
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-sm font-medium">
                              <MapPin size={11} className="text-[#c62d23]" />
                              {part.locationCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {part.totalMinQuantity || "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                            {part.totalQuantity}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                            {part.totalMaxQuantity || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={part.worstStatus} />
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>

                        {/* LOCATION DETAIL ROWS */}
                        {expandedParts.has(part.partName) &&
                          part.locations.map((loc, idx) => (
                            <tr
                              key={loc.id}
                              className={`bg-slate-50/70 transition-colors hover:bg-slate-100/60 ${
                                idx === part.locations.length - 1
                                  ? "border-b-2 border-gray-200"
                                  : ""
                              }`}
                            >
                              <td className="px-4 py-2.5"></td>
                              <td className="px-4 py-2.5">
                                {loc.chalanNo && (
                                  <span className="text-lg text-gray-900">
                                    Chalan:{" "}
                                    <span className="font-medium text-gray-600">
                                      {loc.chalanNo}
                                    </span>
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-gray-500">
                                {loc.vendorName}
                              </td>
                              <td
                                className="px-4 py-2.5 text-sm text-gray-500 max-w-[160px] truncate"
                                title={loc.remark}
                              >
                                {loc.remark || "—"}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
                                  <MapPin
                                    size={12}
                                    className="text-[#c62d23]"
                                  />
                                  {loc.location}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right text-gray-500 text-sm">
                                {loc.minQuantity || "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums text-sm">
                                {loc.quantity}
                              </td>
                              <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums text-sm">
                                {loc.maxQuantity ?? "—"}
                              </td>
                              <td className="px-4 py-2.5">
                                <StatusBadge status={loc.status} size="sm" />
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  {loc.createdAt && (
                                    <span className="text-[10px] text-gray-400 mr-1 whitespace-nowrap">
                                      {new Date(
                                        loc.createdAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const original = items.find(
                                        (i) => i._id === loc.id,
                                      );
                                      setEditId(loc.id);
                                      setForm({
                                        partName: part.partName,
                                        partNameDisplay: part.partName,
                                        vendor: original?.vendor?._id || "",
                                        vendorName: original?.vendor?.name || "",
                                        location: loc.location,
                                        locationDisplay: loc.location,
                                        quantity: loc.quantity,
                                        minQuantity: loc.minQuantity || "",
                                        maxQuantity: loc.maxQuantity ?? "",
                                        remark: original?.remark || "",
                                        chalanNo: loc.chalanNo || "",
                                      });
                                      setShowForm(true);
                                    }}
                                    className="p-1.5 hover:bg-blue-100 rounded-md transition"
                                    title="Edit"
                                  >
                                    <Pencil
                                      size={13}
                                      className="text-gray-400 hover:text-blue-600"
                                    />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deletePart(loc.id);
                                    }}
                                    className="p-1.5 hover:bg-red-100 rounded-md transition"
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
                          ))}
                      </React.Fragment>
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
                        <span className="px-1 text-gray-400 text-xs">…</span>
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
                      {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                        <span className="px-1 text-gray-400 text-xs">…</span>
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
          </div>

          {/* ===== MOBILE CARDS ===== */}
          <div className="md:hidden space-y-3">
            {/* Mobile Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={15}
                />
                <input
                  type="text"
                  placeholder="Search part name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none text-sm bg-white"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
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
            ) : paginatedParts.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-200 text-sm">
                No spare parts found
              </div>
            ) : (
              <>
                {paginatedParts.map((part) => (
                  <div
                    key={part.partName}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpand(part.partName)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {expandedParts.has(part.partName) ? (
                            <ChevronDown
                              size={15}
                              className="text-gray-400 flex-shrink-0"
                            />
                          ) : (
                            <ChevronRight
                              size={15}
                              className="text-gray-400 flex-shrink-0"
                            />
                          )}
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            {part.partName}
                          </h3>
                        </div>
                        <StatusBadge status={part.worstStatus} />
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3 pl-5">
                        <MapPin size={11} className="text-gray-400" />
                        <span>
                          {part.locationCount} location
                          {part.locationCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs pl-5">
                        <div>
                          <p className="text-gray-400 mb-0.5">Total Stock</p>
                          <p className="font-bold text-gray-900 text-lg leading-none">
                            {part.totalQuantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Total Max</p>
                          <p className="font-semibold text-gray-900">
                            {part.totalMaxQuantity || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {expandedParts.has(part.partName) && (
                      <div className="border-t border-gray-200 divide-y divide-gray-100 bg-gray-50/50">
                        {part.locations.map((loc) => (
                          <div key={loc.id} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <MapPin size={13} className="text-[#c62d23]" />
                                <span className="font-medium text-sm">
                                  {loc.location}
                                </span>
                              </div>
                              <StatusBadge status={loc.status} size="sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-2 text-xs">
                              <div>
                                <p className="text-gray-400 mb-0.5">Quantity</p>
                                <p className="font-bold text-gray-900">
                                  {loc.quantity}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400 mb-0.5">Max Qty</p>
                                <p className="font-semibold text-gray-900">
                                  {loc.maxQuantity ?? "—"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                              <Building2 size={11} />
                              <span>{loc.vendorName}</span>
                            </div>
                            {loc.chalanNo && (
                              <p className="text-xs text-gray-400 mb-1">
                                Chalan:{" "}
                                <span className="font-medium text-gray-600">
                                  {loc.chalanNo}
                                </span>
                              </p>
                            )}
                            {loc.remark && (
                              <p className="text-xs text-gray-400 italic mb-1">
                                {loc.remark}
                              </p>
                            )}
                            {loc.createdAt && (
                              <p className="text-[10px] text-gray-400 mb-2">
                                Added:{" "}
                                {new Date(loc.createdAt).toLocaleDateString()}
                              </p>
                            )}
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const original = items.find(
                                    (i) => i._id === loc.id,
                                  );
                                  setEditId(loc.id);
                                  setForm({
                                    partName: part.partName,
                                    partNameDisplay: part.partName,
                                    vendor: original?.vendor?._id || "",
                                    vendorName: original?.vendor?.name || "",
                                    location: loc.location,
                                    locationDisplay: loc.location,
                                    quantity: loc.quantity,
                                    minQuantity: loc.minQuantity || "",
                                    maxQuantity: loc.maxQuantity ?? "",
                                    remark: original?.remark || "",
                                    chalanNo: loc.chalanNo || "",
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
                                  deletePart(loc.id);
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
      </div>

      {/* ===== ADD / EDIT MODAL ===== */}
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
                  {editId ? "Update Spare Part" : "Add Spare Part"}
                </h2>
              </div>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Spare Part Name — Searchable Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Spare Part Name <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  value={form.partName}
                  displayValue={form.partNameDisplay}
                  options={partNamesList}
                  onSelect={(val, label) => {
  const existingEntry = items.find(
    (i) => i.partName?.trim().toLowerCase() === (label || val).trim().toLowerCase()
  );
  setForm((f) => ({
    ...f,
    partName: label || val,
    partNameDisplay: label || val,
    minQuantity: existingEntry?.minQuantity
      ? String(existingEntry.minQuantity)
      : f.minQuantity,
    maxQuantity: existingEntry?.maxQuantity
      ? String(existingEntry.maxQuantity)
      : f.maxQuantity,
  }));
}}
                  onAddNew={handleAddNewPartName}
                  placeholder="Search or type part name..."
                  addNewLabel="Add new part"
                />
              </div>

              {/* Vendor — Searchable Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Vendor : <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  value={form.vendor}
                  displayValue={form.vendorName}
                  options={vendors.map((v) => ({
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
                  onAddNew={handleAddNewVendor}
                  placeholder="Search vendor..."
                  addNewLabel="Add new vendor"
                />
              </div>

              {/* Location — Searchable Dropdown from data */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Location <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  value={form.location}
                  displayValue={form.locationDisplay}
                  options={locations}
                  onSelect={(val) =>
                    setForm((f) => ({
                      ...f,
                      location: val,
                      locationDisplay: val,
                    }))
                  }
                  onAddNew={handleAddNewLocation}
                  placeholder="Search or add location..."
                  addNewLabel="Add new location"
                />
              </div>

              {/* Remark */}
              <ModalInput
                label="Remark"
                value={form.remark}
                onChange={(v) => setForm({ ...form, remark: v })}
                placeholder="Optional remark"
              />

              {/* Min Quantity */}
              <ModalInput
                label="Min Quantity"
                type="number"
                value={form.minQuantity}
                onChange={(v) => setForm({ ...form, minQuantity: v })}
                placeholder="Minimum stock level"
              />

              {/* Quantity */}
              <ModalInput
                label="Quantity"
                type="number"
                value={form.quantity}
                onChange={(v) => setForm({ ...form, quantity: v })}
                placeholder="Enter quantity"
                required
              />

              {/* Chalan / Bill No */}
              <ModalInput
                label="Chalan / Bill No"
                value={form.chalanNo}
                onChange={(v) => setForm({ ...form, chalanNo: v })}
                placeholder="Enter chalan or bill number"
                required
              />

              {/* Max Quantity — admin only */}
               {/* Max Quantity */}
              <ModalInput
                label="Max Quantity"
                type="number"
                value={form.maxQuantity}
                onChange={(v) => setForm({ ...form, maxQuantity: v })}
                placeholder="Enter max stock level"
              />
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white z-10 rounded-b-2xl">
              <button
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitPart}
                className="flex-1 py-2.5 rounded-xl bg-[#c62d23] hover:bg-[#a8241c] text-white font-medium transition shadow-sm text-sm"
              >
                {editId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TRANSFER MODAL ===== */}
      {showTransfer && transferItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-5 sm:p-6 rounded-2xl w-full max-w-md border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-gray-900">
                Transfer Location
              </h2>
              <button
                onClick={() => {
                  setShowTransfer(false);
                  setTransfer({ toLocation: "", quantity: "" });
                  setTransferItem(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">Part</p>
                  <p className="font-medium text-gray-900">
                    {transferItem.name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">
                    Current Location
                  </p>
                  <p className="font-medium text-gray-900">
                    {transferItem.location}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                To Location
              </label>
              <SearchableDropdown
                value={transfer.toLocation}
                displayValue={transfer.toLocation}
                options={locations.filter(
                  (loc) => loc !== transferItem.location,
                )}
                onSelect={(val) =>
                  setTransfer({ ...transfer, toLocation: val })
                }
                onAddNew={(name) => {
                  const upper = name.toUpperCase();
                  setTransfer({ ...transfer, toLocation: upper });
                }}
                placeholder="Search or add destination..."
                addNewLabel="Add new location"
              />
            </div>

            <ModalInput
              label="Quantity"
              type="number"
              value={transfer.quantity}
              onChange={(v) => setTransfer({ ...transfer, quantity: v })}
              placeholder="Enter quantity to transfer"
            />
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowTransfer(false);
                  setTransfer({ toLocation: "", quantity: "" });
                  setTransferItem(null);
                }}
                className="px-5 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitTransfer}
                className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-2.5 font-medium rounded-xl transition shadow-sm hover:shadow-md text-sm"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}
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

/* ================= SMALL COMPONENTS ================= */
const KpiCard = ({
  title,
  value,
  icon,
  danger = false,
  info = false,
  active = false,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`cursor-pointer bg-white border rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full
      ${active ? "ring-2 ring-[#c62d23] border-[#c62d23]/30 shadow-md" : "border-gray-200"}
    `}
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-3">
      <p className="text-xs sm:text-sm text-gray-500 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <p
      className={`text-2xl sm:text-3xl font-bold ${
        danger ? "text-red-600" : info ? "text-blue-600" : "text-gray-900"
      }`}
    >
      {value}
    </p>
  </div>
);

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

const ModalInput = ({
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
      className="w-full p-2.5 bg-white rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition text-sm"
    />
  </div>
);