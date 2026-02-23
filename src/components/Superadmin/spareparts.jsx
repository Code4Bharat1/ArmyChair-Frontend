"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Package,
  Search,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";

/* ================= ANIMATIONS ================= */
const animStyles = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .anim-slideInRight { animation: slideInRight 0.3s ease-out; }
  .anim-scaleIn      { animation: scaleIn 0.2s ease-out; }
  .anim-fadeIn       { animation: fadeIn 0.2s ease-in-out; }
`;

/* ================= CSV EXPORT ================= */
const exportToCSV = (filteredGroupedParts, items) => {
  const rows = [["Part Name", "Vendor", "Location", "Quantity", "Max Quantity", "Status", "Remark"]];
  filteredGroupedParts.forEach((part) => {
    part.locations.forEach((loc) => {
      rows.push([part.partName, loc.vendorName, loc.location, loc.quantity, loc.maxQuantity ?? "", loc.status, loc.remark || ""]);
    });
  });
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spare-parts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ================= NOTIFICATION ================= */
const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-green-50 border-green-200 text-green-800",
    error:   "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  };
  const icons = {
    success: <CheckCircle className="text-green-600 flex-shrink-0" size={20} />,
    error:   <XCircle className="text-red-600 flex-shrink-0" size={20} />,
    warning: <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />,
  };

  return (
    <div className={`fixed top-4 right-4 z-[100] max-w-sm w-full border rounded-xl p-4 shadow-lg flex items-start gap-3 anim-slideInRight ${colors[type]}`}>
      {icons[type]}
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={16} /></button>
    </div>
  );
};

/* ================= CONFIRM DIALOG ================= */
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText, isDeleting }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 anim-fadeIn">
      <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md border border-gray-100 shadow-2xl anim-scaleIn">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="text-red-600" size={28} />
          </div>
          <h2 className="font-bold text-xl text-gray-900">{title}</h2>
        </div>
        <p className="text-gray-900 mb-8 leading-relaxed text-base">{message}</p>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button onClick={onClose} disabled={isDeleting} className="px-5 py-2.5 text-gray-900 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 font-medium rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 min-w-[100px]">
            {isDeleting ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Deleting...</> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= PAGE ================= */
export default function SparePartsInventory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [items,           setItems]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [vendors,         setVendors]         = useState([]);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [search,          setSearch]          = useState("");
  const [page,            setPage]            = useState(1);
  const [totalPages,      setTotalPages]      = useState(1);
  const [expandedParts,   setExpandedParts]   = useState(new Set());
  const [statusFilter,    setStatusFilter]    = useState("ALL");
  const [notification,    setNotification]    = useState(null);
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [deleteConfirm,   setDeleteConfirm]   = useState(null);
  const [deleting,        setDeleting]        = useState(false);
  const rowRefs = useRef({});
  const LIMIT = 25;

  const role = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("user"))?.role
    : null;

  /* FORM */
  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [savingPart,  setSavingPart]  = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const firstInputRef = useRef(null);
  const [form, setForm] = useState({
    partName: "", vendor: "", remark: "", location: "", quantity: "", maxQuantity: "",
  });

  /* TRANSFER */
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferItem, setTransferItem] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [transfer,     setTransfer]     = useState({ toLocation: "", quantity: "" });

  const API     = process.env.NEXT_PUBLIC_API_URL;
  const token   = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const showNotification = (message, type = "success") => setNotification({ message, type });

  /* ================= FETCH ================= */
  const fetchParts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/inventory/spare-parts`, {
        params: { page, limit: LIMIT, status: statusFilter === "ALL" ? undefined : statusFilter },
        headers,
      });
      setItems(res.data.inventory || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Fetch failed", err);
      showNotification("Failed to load spare parts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchParts(); }, [page, statusFilter]);

  useEffect(() => {
    axios.get(`${API}/vendors`, { headers })
      .then((res) => setVendors(res.data))
      .catch((err) => console.error("Vendor fetch failed", err));
  }, []);

  /* Highlight scroll */
  useEffect(() => {
    if (!highlightId || !items.length) return;
    const exists = items.find((i) => i._id === highlightId);
    if (!exists) return;
    const timer = setTimeout(() => {
      const row = rowRefs.current[highlightId];
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        setActiveHighlight(highlightId);
        setTimeout(() => setActiveHighlight(null), 5000);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightId, items]);

  /* Focus first input when form opens */
  useEffect(() => {
    if (showForm && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [showForm]);

  /* ESC key */
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (showForm)      handleFormClose();
      if (showTransfer)  closeTransfer();
      if (deleteConfirm) setDeleteConfirm(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showForm, showTransfer, deleteConfirm, formTouched, form]);

  /* ================= SAVE ================= */
  const submitPart = async () => {
    if (!form.partName || !form.vendor || !form.location || form.quantity === "") {
      return showNotification("All required fields must be filled", "error");
    }
    setSavingPart(true);
    try {
      const payload = {
        partName: form.partName.trim(),
        vendor:   form.vendor,
        remark:   form.remark?.trim() || "",
        location: form.location,
        quantity: Number(form.quantity),
      };
      if (form.maxQuantity !== "") payload.maxQuantity = Number(form.maxQuantity);

      if (editId) {
        await axios.patch(`${API}/inventory/spare-parts/update/${editId}`, payload, { headers });
        showNotification("Spare part updated successfully!", "success");
      } else {
        await axios.post(`${API}/inventory/spare-parts`, payload, { headers });
        showNotification("Spare part added successfully!", "success");
      }
      closeForm();
      fetchParts();
    } catch (err) {
      showNotification(err?.response?.data?.message || "Failed to save spare part", "error");
    } finally {
      setSavingPart(false);
    }
  };

  const closeForm = () => {
    setShowForm(false); setEditId(null); setFormTouched(false);
    setForm({ partName: "", vendor: "", remark: "", location: "", quantity: "", maxQuantity: "" });
  };

  const handleFormClose = () => {
    if (formTouched && (form.partName || form.location || form.quantity)) {
      if (confirm("You have unsaved changes. Close anyway?")) closeForm();
    } else {
      closeForm();
    }
  };

  /* ================= DELETE ================= */
  const deletePart = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/inventory/spare-parts/delete/${deleteConfirm.id}`, { headers });
      showNotification("Spare part deleted successfully!", "success");
      setDeleteConfirm(null);
      fetchParts();
    } catch (err) {
      showNotification(err?.response?.data?.message || "Failed to delete spare part", "error");
    } finally {
      setDeleting(false);
    }
  };

  /* ================= TRANSFER ================= */
  const submitTransfer = async () => {
    if (!transfer.toLocation || transfer.quantity === "") return showNotification("Destination and quantity required", "warning");
    const qty = Number(transfer.quantity);
    if (qty <= 0) return showNotification("Quantity must be greater than 0", "warning");
    if (qty > transferItem.quantity) return showNotification("Not enough stock in source location", "warning");
    setTransferring(true);
    try {
      await axios.post(`${API}/transfer`, { sourceId: transferItem.id, toLocation: transfer.toLocation, quantity: qty }, { headers });
      showNotification("Transfer completed successfully!", "success");
      closeTransfer();
      fetchParts();
    } catch (err) {
      showNotification(err?.response?.data?.message || "Transfer failed", "error");
    } finally {
      setTransferring(false);
    }
  };

  const closeTransfer = () => {
    setShowTransfer(false); setTransfer({ toLocation: "", quantity: "" }); setTransferItem(null);
  };

  /* ================= GROUP DATA ================= */
  const groupedParts = useMemo(() => {
    const grouped = new Map();
    items.forEach((item) => {
      const key = item.partName.trim().toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, { partName: item.partName, locations: [], totalQuantity: 0, totalMaxQuantity: 0, worstStatus: "Healthy", locationCount: 0 });
      }
      const g = grouped.get(key);
      g.locations.push({
        id:          item._id,
        location:    item.location,
        quantity:    item.quantity,
        maxQuantity: item.maxQuantity,
        status:      item.status,
        remark:      item.remark || "",
        vendorName:  item.vendor?.name || "—",
      });
      g.totalQuantity    += item.quantity;
      g.totalMaxQuantity += item.maxQuantity || 0;
      g.locationCount     = g.locations.length;
      const priority = { Critical: 4, "Low Stock": 3, Overstocked: 2, Healthy: 1 };
      if ((priority[item.status] || 0) > (priority[g.worstStatus] || 0)) g.worstStatus = item.status;
    });
    return Array.from(grouped.values()).sort((a, b) =>
      a.partName.localeCompare(b.partName, undefined, { sensitivity: "base" })
    );
  }, [items]);

  /* ================= FILTER ================= */
  const filteredGroupedParts = useMemo(() => {
    let filtered = groupedParts;
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      filtered = filtered.filter((p) => p.partName.toLowerCase().includes(s));
    }
    if (statusFilter === "LOW")            filtered = filtered.filter((p) => p.worstStatus === "Low Stock" || p.worstStatus === "Critical");
    else if (statusFilter === "OVERSTOCK") filtered = filtered.filter((p) => p.worstStatus === "Overstocked");
    return filtered;
  }, [groupedParts, statusFilter, search]);

  const toggleExpand = (partName) => {
    const next = new Set(expandedParts);
    next.has(partName) ? next.delete(partName) : next.add(partName);
    setExpandedParts(next);
  };

  /* ================= STATS ================= */
  const totalParts = groupedParts.length;
  const totalQty   = groupedParts.reduce((s, p) => s + p.totalQuantity, 0);
  const lowStock   = groupedParts.filter((p) => p.worstStatus === "Low Stock" || p.worstStatus === "Critical").length;
  const overStock  = groupedParts.filter((p) => p.worstStatus === "Overstocked").length;

  const locations = useMemo(() => Array.from(new Set(items.map((i) => i.location))), [items]);

  /* helper for edit prefill */
  const openEdit = (loc, partName) => {
    const raw = items.find((i) => i._id === loc.id);
    setEditId(loc.id);
    setForm({
      partName,
      vendor:      raw?.vendor?._id || "",
      location:    loc.location,
      quantity:    loc.quantity,
      maxQuantity: loc.maxQuantity ?? "",
      remark:      raw?.remark || "",
    });
    setShowForm(true);
  };

  /* ================= UI ================= */
  return (
    <>
      <style>{animStyles}</style>

      <div className="flex h-screen bg-gray-50 text-gray-900">

        {/* Hidden bulk-upload input */}
        <input
          type="file" accept=".xlsx" id="bulk-upload-input" className="hidden"
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const fd = new FormData();
            fd.append("file", file);
            try {
              await axios.post(`${API}/inventory/spare-parts/bulk-upload`, fd, { headers });
              showNotification("Bulk upload successful!", "success");
              fetchParts();
            } catch {
              showNotification("Bulk upload failed", "error");
            }
            e.target.value = "";
          }}
        />

        {/* Notifications */}
        {notification && (
          <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
        )}

        {/* Delete Confirm */}
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={deletePart}
          title="Delete Spare Part"
          message={`Are you sure you want to delete "${deleteConfirm?.name}" from location ${deleteConfirm?.location}? This action cannot be undone.`}
          confirmText="Delete"
          isDeleting={deleting}
        />

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
          <InventorySidebar />
        </div>

        {/* MAIN */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">

          {/* HEADER */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-900 hover:text-[#c62d23] p-2 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                  <Menu size={22} />
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate leading-tight">
                    Spare Parts Inventory
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 hidden sm:block font-medium">
                    Manage your spare parts stock levels and details
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => exportToCSV(filteredGroupedParts, items)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition shadow-sm text-xs sm:text-sm" title="Export to CSV">
                  <Download size={15} />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">CSV</span>
                </button>
                <button onClick={() => document.getElementById("bulk-upload-input").click()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition shadow-sm text-xs sm:text-sm">
                  <Upload size={15} />
                  <span className="hidden sm:inline">Bulk Upload</span>
                  <span className="sm:hidden">Upload</span>
                </button>
                <button onClick={() => setShowForm(true)} className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition shadow-sm text-xs sm:text-sm">
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

          {/* CONTENT */}
          <div className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-5 md:space-y-6">

            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard title="Unique Parts"   value={totalParts} icon={<Package className="text-[#c62d23]" />}     active={statusFilter === "ALL"}       onClick={() => setStatusFilter("ALL")} />
              <KpiCard title="Total Stock"    value={totalQty}   icon={<Warehouse className="text-[#c62d23]" />} />
              <KpiCard title="Low / Critical" value={lowStock}   icon={<TrendingDown className="text-[#c62d23]" />} danger active={statusFilter === "LOW"}  onClick={() => setStatusFilter("LOW")} />
              <KpiCard title="Overstocked"    value={overStock}  icon={<Boxes className="text-blue-600" />}         info   active={statusFilter === "OVERSTOCK"} onClick={() => setStatusFilter("OVERSTOCK")} />
            </div>

            {/* ALERT */}
            {lowStock > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 flex gap-2 sm:gap-3 items-center">
                <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
                <span className="text-red-700 font-semibold text-sm sm:text-base">
                  {lowStock} part{lowStock !== 1 ? "s" : ""} need restocking
                </span>
              </div>
            )}

            {/* ===== DESKTOP TABLE ===== */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                  <input
                    type="text" placeholder="Search part name..." value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64 pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none bg-white"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-900 font-semibold">
                  {filteredGroupedParts.length} part{filteredGroupedParts.length !== 1 ? "s" : ""} &bull; {items.length} location entries
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ fontSize: "14px" }}>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-10 px-4 py-3.5"></th>
                      {/* ↑ increased th font + made black */}
                      <th className="px-4 py-3.5 text-left font-bold text-gray-900 tracking-wide text-sm">Part Name</th>
                      <th className="px-4 py-3.5 text-left font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Vendor</th>
                      <th className="px-4 py-3.5 text-left font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Remark</th>
                      <th className="px-4 py-3.5 text-left font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Locations</th>
                      <th className="px-4 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Total Stock</th>
                      <th className="px-4 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Total Max</th>
                      <th className="px-4 py-3.5 text-left font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Status</th>
                      <th className="px-4 py-3.5 text-left font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan="9" className="py-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                        <p className="mt-3 text-gray-700 text-sm font-medium">Loading inventory...</p>
                      </td></tr>
                    ) : filteredGroupedParts.length === 0 ? (
                      <tr><td colSpan="9" className="py-16 text-center text-gray-700 text-sm font-medium">No parts found</td></tr>
                    ) : (
                      filteredGroupedParts.map((part) => (
                        <React.Fragment key={part.partName}>
                          {/* MASTER ROW */}
                          <tr className="hover:bg-gray-50/80 cursor-pointer transition-colors group" onClick={() => toggleExpand(part.partName)}>
                            <td className="px-4 py-4 text-center text-gray-900 group-hover:text-gray-600 transition-colors">
                              {expandedParts.has(part.partName)
                                ? <ChevronDown size={16} />
                                : <ChevronRight size={16} />}
                            </td>
                            {/* Part name — bold, black, larger */}
                            <td className="px-4 py-4 font-bold text-gray-900 whitespace-nowrap text-[15px]">{part.partName}</td>
                            {/* Vendor — now dark */}
                            <td className="px-4 py-4 text-gray-900 font-medium text-sm">
                              {[...new Set(part.locations.map((l) => l.vendorName))].join(", ") || "—"}
                            </td>
                            <td className="px-4 py-4 text-gray-700 text-sm">—</td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-gray-900 rounded-md font-semibold text-sm">
                                <MapPin size={11} className="text-[#c62d23]" />{part.locationCount}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-gray-900 tabular-nums text-[15px]">{part.totalQuantity}</td>
                            <td className="px-4 py-4 text-right font-semibold text-gray-900 tabular-nums text-sm">{part.totalMaxQuantity || "—"}</td>
                            <td className="px-4 py-4"><StatusBadge status={part.worstStatus} /></td>
                            <td className="px-4 py-4"></td>
                          </tr>

                          {/* LOCATION DETAIL ROWS */}
                          {expandedParts.has(part.partName) && part.locations.map((loc, idx) => (
                            <tr
                              key={loc.id}
                              ref={(el) => (rowRefs.current[loc.id] = el)}
                              className={`bg-slate-50/60 hover:bg-slate-100/50 transition-colors ${
                                idx === part.locations.length - 1 ? "border-b-2 border-gray-200" : ""
                              } ${activeHighlight === loc.id ? "ring-2 ring-inset ring-[#c62d23] bg-red-50" : ""}`}
                            >
                              <td className="px-4 py-3"></td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 text-gray-900 pl-4 font-medium text-sm">
                                  <Building2 size={12} className="text-gray-500" />
                                  <span>{loc.vendorName}</span>
                                </div>
                              </td>
                              {/* vendor col in detail row */}
                              <td className="px-4 py-3 text-gray-900 font-medium text-sm">{loc.vendorName}</td>
                              <td className="px-4 py-3 text-gray-800 max-w-[160px] truncate text-sm font-medium" title={loc.remark}>
                                {loc.remark || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 font-semibold text-gray-900 text-sm">
                                  <MapPin size={12} className="text-[#c62d23]" />{loc.location}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums text-[15px]">{loc.quantity}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums text-sm">{loc.maxQuantity ?? "—"}</td>
                              <td className="px-4 py-3"><StatusBadge status={loc.status} size="sm" /></td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); openEdit(loc, part.partName); }} className="p-1.5 hover:bg-blue-100 rounded-md transition" title="Edit">
                                    <Pencil size={14} className="text-gray-700 hover:text-blue-600" />
                                  </button>
                                  {/* <button onClick={(e) => { e.stopPropagation(); setTransferItem({ id: loc.id, name: part.partName, location: loc.location, quantity: loc.quantity }); setShowTransfer(true); }} className="p-1.5 hover:bg-green-100 rounded-md transition" title="Transfer">
                                    <ArrowLeftRight size={14} className="text-gray-700 hover:text-green-600" />
                                  </button> */}
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: loc.id, name: part.partName, location: loc.location }); }} className="p-1.5 hover:bg-red-100 rounded-md transition" title="Delete">
                                    <Trash2 size={14} className="text-gray-700 hover:text-red-600" />
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

              {/* Pagination */}
              <div className="flex justify-between items-center px-5 py-3.5 border-t border-gray-100 bg-gray-50/30">
                <span className="text-sm font-semibold text-gray-900">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition text-sm font-medium text-gray-900">← Prev</button>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition text-sm font-medium text-gray-900">Next →</button>
                </div>
              </div>
            </div>

            {/* ===== MOBILE CARDS ===== */}
            <div className="md:hidden space-y-3">
              <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={15} />
                  <input
                    type="text" placeholder="Search part name..." value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none text-sm font-medium text-gray-900 bg-white"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"><X size={13} /></button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                  <p className="mt-2 text-gray-900 text-sm font-medium">Loading...</p>
                </div>
              ) : filteredGroupedParts.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-700 border border-gray-200 text-sm font-medium">No spare parts found</div>
              ) : (
                filteredGroupedParts.map((part) => (
                  <div key={part.partName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 cursor-pointer" onClick={() => toggleExpand(part.partName)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {expandedParts.has(part.partName)
                            ? <ChevronDown size={16} className="text-gray-700 flex-shrink-0" />
                            : <ChevronRight size={16} className="text-gray-700 flex-shrink-0" />}
                          <h3 className="font-bold text-gray-900 text-base truncate">{part.partName}</h3>
                        </div>
                        <StatusBadge status={part.worstStatus} />
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-700 text-sm mb-3 pl-6 font-medium">
                        <MapPin size={12} className="text-gray-500" />
                        <span>{part.locationCount} location{part.locationCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm pl-6">
                        <div>
                          <p className="text-gray-600 mb-0.5 font-medium">Total Stock</p>
                          <p className="font-bold text-gray-900 text-xl leading-none">{part.totalQuantity}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-0.5 font-medium">Total Max</p>
                          <p className="font-bold text-gray-900 text-base">{part.totalMaxQuantity || "—"}</p>
                        </div>
                      </div>
                    </div>

                    {expandedParts.has(part.partName) && (
                      <div className="border-t border-gray-200 divide-y divide-gray-100 bg-gray-50/50">
                        {part.locations.map((loc) => (
                          <div key={loc.id} ref={(el) => (rowRefs.current[loc.id] = el)} className={`p-4 ${activeHighlight === loc.id ? "bg-red-50 ring-2 ring-inset ring-[#c62d23]" : ""}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <MapPin size={14} className="text-[#c62d23]" />
                                <span className="font-bold text-gray-900 text-base">{loc.location}</span>
                              </div>
                              <StatusBadge status={loc.status} size="sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-2 text-sm">
                              <div><p className="text-gray-600 mb-0.5 font-medium">Quantity</p><p className="font-bold text-gray-900 text-lg">{loc.quantity}</p></div>
                              <div><p className="text-gray-600 mb-0.5 font-medium">Max Qty</p><p className="font-bold text-gray-900 text-base">{loc.maxQuantity ?? "—"}</p></div>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-gray-900 font-medium mb-1">
                              <Building2 size={13} className="text-gray-600" /><span>{loc.vendorName}</span>
                            </div>
                            {loc.remark && <p className="text-sm text-gray-700 italic mb-2 font-medium">{loc.remark}</p>}
                            <div className="flex gap-2 mt-3">
                              <button onClick={(e) => { e.stopPropagation(); openEdit(loc, part.partName); }} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 text-sm font-semibold">
                                <Pencil size={14} />Edit
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setTransferItem({ id: loc.id, name: part.partName, location: loc.location, quantity: loc.quantity }); setShowTransfer(true); }} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 text-sm font-semibold">
                                <ArrowLeftRight size={14} />Transfer
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: loc.id, name: part.partName, location: loc.location }); }} className="bg-red-50 hover:bg-red-100 text-red-700 py-2 px-3 rounded-lg transition flex items-center justify-center">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ===== ADD / EDIT MODAL ===== */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 anim-fadeIn">
            <div className="bg-white p-5 sm:p-6 rounded-2xl w-full max-w-md border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto anim-scaleIn">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg text-gray-900">{editId ? "Update Spare Part" : "Add Spare Part"}</h2>
                <button onClick={handleFormClose} className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-100 rounded-lg transition"><X size={18} /></button>
              </div>

              <Input ref={firstInputRef} label="Spare Part Name *" value={form.partName} onChange={(v) => { setForm({ ...form, partName: v }); setFormTouched(true); }} placeholder="Enter part name" />

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Vendor *</label>
                <select value={form.vendor} onChange={(e) => { setForm({ ...form, vendor: e.target.value }); setFormTouched(true); }}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
                </select>
              </div>

              <Input label="Location *"   value={form.location}    onChange={(v) => { setForm({ ...form, location: v });    setFormTouched(true); }} placeholder="Enter location" />
              <Input label="Remark"       value={form.remark}      onChange={(v) => { setForm({ ...form, remark: v });      setFormTouched(true); }} placeholder="Optional remark" />
              <Input label="Quantity *"   type="number" value={form.quantity}    onChange={(v) => { setForm({ ...form, quantity: v });    setFormTouched(true); }} placeholder="Enter quantity" />
              <Input label="Max Quantity" type="number" value={form.maxQuantity} onChange={(v) => { setForm({ ...form, maxQuantity: v }); setFormTouched(true); }} placeholder="Enter max stock level (optional)" />

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={handleFormClose} disabled={savingPart} className="px-5 py-2.5 text-gray-900 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition text-sm disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={submitPart} disabled={savingPart} className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-2.5 font-semibold rounded-xl transition shadow-sm hover:shadow-md text-sm disabled:opacity-50 flex items-center gap-2 min-w-[90px] justify-center">
                  {savingPart ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />{editId ? "Updating..." : "Saving..."}</> : (editId ? "Update" : "Save")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== TRANSFER MODAL ===== */}
        {showTransfer && transferItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 anim-fadeIn">
            <div className="bg-white p-5 sm:p-6 rounded-2xl w-full max-w-md border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto anim-scaleIn">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg text-gray-900">Transfer Location</h2>
                <button onClick={closeTransfer} className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-100 rounded-lg transition"><X size={18} /></button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-600 text-xs mb-0.5 font-medium">Part</p><p className="font-bold text-gray-900">{transferItem.name}</p></div>
                  <div><p className="text-gray-600 text-xs mb-0.5 font-medium">Current Location</p><p className="font-bold text-gray-900">{transferItem.location}</p></div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">To Location *</label>
                <select value={transfer.toLocation} onChange={(e) => setTransfer({ ...transfer, toLocation: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none"
                >
                  <option value="">Select Location</option>
                  {locations.filter((loc) => loc !== transferItem.location).map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <Input label="Quantity *" type="number" value={transfer.quantity} onChange={(v) => setTransfer({ ...transfer, quantity: v })} placeholder="Enter quantity to transfer" />

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={closeTransfer} disabled={transferring} className="px-5 py-2.5 text-gray-900 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition text-sm disabled:opacity-50">Cancel</button>
                <button onClick={submitTransfer} disabled={transferring} className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-2.5 font-semibold rounded-xl transition shadow-sm text-sm disabled:opacity-50 flex items-center gap-2 min-w-[100px] justify-center">
                  {transferring ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Transferring...</> : "Transfer"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

/* ================= SMALL COMPONENTS ================= */

const KpiCard = ({ title, value, icon, danger = false, info = false, active = false, onClick }) => (
  <div
    onClick={onClick}
    className={`cursor-pointer bg-white border rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full
      ${active ? "ring-2 ring-[#c62d23] border-[#c62d23]/30" : "border-gray-200"}`}
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-3">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <p className={`text-3xl sm:text-4xl font-bold ${danger ? "text-red-600" : info ? "text-blue-600" : "text-gray-900"}`}>
      {value}
    </p>
  </div>
);

const StatusBadge = ({ status, size = "default" }) => {
  const map = {
    Healthy:     "bg-green-50 text-green-800 border border-green-200 font-semibold",
    "Low Stock": "bg-amber-50 text-amber-800 border border-amber-200 font-semibold",
    Critical:    "bg-red-50 text-red-800 border border-red-200 font-semibold",
    Overstocked: "bg-blue-50 text-blue-800 border border-blue-200 font-semibold",
  };
  const sizeClasses = size === "sm"
    ? "px-2.5 py-0.5 text-xs"
    : "px-3 py-1 text-xs";
  return (
    <span className={`${sizeClasses} rounded-full whitespace-nowrap ${map[status] || "bg-gray-100 text-gray-900 border border-gray-200 font-semibold"}`}>
      {status}
    </span>
  );
};

const Input = React.forwardRef(({ label, value, onChange, type = "text", placeholder = "" }, ref) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-900 mb-1.5">{label}</label>
    <input
      ref={ref} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      onKeyDown={(e) => { if (type === "number" && (e.key === "-" || e.key === "e")) e.preventDefault(); }}
      className="w-full p-2.5 bg-white rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition text-sm font-medium text-gray-900 placeholder-gray-500"
    />
  </div>
));
Input.displayName = "Input";