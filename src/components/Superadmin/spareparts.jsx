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
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";

/* ================= ANIMATIONS (Inline CSS) ================= */
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInRight {
    from { 
      transform: translateX(100%);
      opacity: 0;
    }
    to { 
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  
  @keyframes scaleIn {
    from { 
      transform: scale(0.95);
      opacity: 0;
    }
    to { 
      transform: scale(1);
      opacity: 1;
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-in-out;
  }
  
  .animate-slideInRight {
    animation: slideInRight 0.3s ease-out;
  }
  
  .animate-slideInLeft {
    animation: slideInLeft 0.3s ease-out;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.2s ease-out;
  }
`;

/* ================= NOTIFICATION COMPONENT ================= */
const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  };

  const icons = {
    success: <CheckCircle className="text-green-600" size={20} />,
    error: <XCircle className="text-red-600" size={20} />,
    warning: <AlertTriangle className="text-amber-600" size={20} />,
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[100] max-w-md w-full mx-4 md:mx-0 border rounded-xl p-4 shadow-lg flex items-start gap-3 animate-slideInRight ${styles[type]}`}
    >
      {icons[type]}
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
};

/* ================= CONFIRMATION MODAL ================= */
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText, isDeleting }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md border border-gray-100 shadow-2xl animate-scaleIn">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="text-red-600" size={28} />
          </div>
          <h2 className="font-bold text-xl text-gray-900">{title}</h2>
        </div>

        <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[100px]"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= LOADING SKELETON ================= */
const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    ))}
  </div>
);

/* ================= PAGE ================= */
export default function SparePartsInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 25;
  const [notification, setNotification] = useState(null);
  const router = useRouter();

  // Track which parts are expanded (show location details)
  const [expandedParts, setExpandedParts] = useState(new Set());

  const role =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user"))?.role
      : null;

  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const rowRefs = useRef({});
  const [activeHighlight, setActiveHighlight] = useState(null);

  /* FORM */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [savingPart, setSavingPart] = useState(false);
  const [errors, setErrors] = useState({});
  const firstInputRef = useRef(null);
  const [form, setForm] = useState({
    partName: "",
    location: "",
    quantity: "",
    maxQuantity: "",
  });
  const [formTouched, setFormTouched] = useState(false);

  const LOCATIONS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  /* TRANSFER */
  const [showTransfer, setShowTransfer] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [transferItem, setTransferItem] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [transfer, setTransfer] = useState({
    toLocation: "",
    quantity: "",
  });
  const [transferErrors, setTransferErrors] = useState({});

  /* DELETE CONFIRMATION */
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= NOTIFICATIONS ================= */
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  /* ================= FETCH ================= */
  const fetchParts = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/inventory/spare-parts`, {
        params: {
          page,
          limit: LIMIT,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        },
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

  useEffect(() => {
    fetchParts();
  }, [page, statusFilter]);

  useEffect(() => {
    if (!highlightId || !items.length) return;

    const exists = items.find((i) => i._id === highlightId);
    if (!exists) return;

    const timer = setTimeout(() => {
      const row = rowRefs.current[highlightId];

      if (row) {
        row.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        setActiveHighlight(highlightId);

        setTimeout(() => {
          setActiveHighlight(null);
        }, 5000);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [highlightId, items]);

  /* ================= FORM VALIDATION ================= */
  const validateForm = () => {
    const newErrors = {};

    if (!form.partName.trim()) {
      newErrors.partName = "Part name is required";
    }
    if (!form.location) {
      newErrors.location = "Location is required";
    }
    if (form.quantity === "" || form.quantity < 0) {
      newErrors.quantity = "Valid quantity is required";
    }
    if (role === "admin" && form.maxQuantity !== "" && form.maxQuantity < 0) {
      newErrors.maxQuantity = "Max quantity must be positive";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= SAVE ================= */
  const submitPart = async () => {
    if (!validateForm()) return;

    setSavingPart(true);
    try {
      const payload = {
        partName: form.partName.trim(),
        location: form.location,
        quantity: Number(form.quantity),
      };

      if (role === "admin" && form.maxQuantity !== "") {
        payload.maxQuantity = Number(form.maxQuantity);
      }

      if (editId) {
        await axios.patch(
          `${API}/inventory/spare-parts/update/${editId}`,
          payload,
          { headers }
        );
        showNotification("Spare part updated successfully!", "success");
      } else {
        await axios.post(`${API}/inventory/spare-parts`, payload, { headers });
        showNotification("Spare part added successfully!", "success");
      }

      closeForm();
      fetchParts();
    } catch (err) {
      console.error("Save failed", err);
      showNotification(
        err?.response?.data?.message || "Failed to save spare part",
        "error"
      );
    } finally {
      setSavingPart(false);
    }
  };

  /* ================= CLOSE FORM ================= */
  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ partName: "", location: "", quantity: "", maxQuantity: "" });
    setErrors({});
    setFormTouched(false);
  };

  const handleFormClose = () => {
    if (formTouched && (form.partName || form.location || form.quantity)) {
      if (
        confirm(
          "You have unsaved changes. Are you sure you want to close this form?"
        )
      ) {
        closeForm();
      }
    } else {
      closeForm();
    }
  };

  /* ================= DELETE ================= */
  const deletePart = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      await axios.delete(
        `${API}/inventory/spare-parts/delete/${deleteConfirm.id}`,
        { headers }
      );
      showNotification("Spare part deleted successfully!", "success");
      setDeleteConfirm(null);
      fetchParts();
    } catch (err) {
      console.error("Delete failed", err);
      showNotification(
        err?.response?.data?.message || "Failed to delete spare part",
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  /* ================= TRANSFER VALIDATION ================= */
  const validateTransfer = () => {
    const newErrors = {};

    if (!transfer.toLocation) {
      newErrors.toLocation = "Destination location is required";
    }
    if (transfer.toLocation === transferItem?.location) {
      newErrors.toLocation = "Cannot transfer to the same location";
    }
    if (transfer.quantity === "" || transfer.quantity <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }
    if (Number(transfer.quantity) > transferItem?.quantity) {
      newErrors.quantity = "Not enough stock in source location";
    }

    setTransferErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= TRANSFER ================= */
  const submitTransfer = async () => {
    if (!validateTransfer()) return;

    setTransferring(true);
    try {
      const payload = {
        sourceId: transferItem.id,
        toLocation: transfer.toLocation,
        quantity: Number(transfer.quantity),
      };

      await axios.post(`${API}/transfer`, payload, { headers });
      showNotification("Transfer completed successfully!", "success");

      closeTransfer();
      fetchParts();
    } catch (err) {
      console.error("Transfer failed", err?.response?.data || err);
      showNotification(
        err?.response?.data?.message || "Transfer failed",
        "error"
      );
    } finally {
      setTransferring(false);
    }
  };

  const closeTransfer = () => {
    setShowTransfer(false);
    setTransfer({ toLocation: "", quantity: "" });
    setTransferItem(null);
    setTransferErrors({});
  };

  /* ================= KEYBOARD HANDLERS ================= */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (showForm) handleFormClose();
        if (showTransfer) closeTransfer();
        if (deleteConfirm) setDeleteConfirm(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showForm, showTransfer, deleteConfirm, formTouched, form]);

  useEffect(() => {
    if (showForm && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [showForm]);

  const formatRole = (role) =>
    role ? role.charAt(0).toUpperCase() + role.slice(1) : "—";

  /* ================= GROUP DATA BY PART NAME ================= */
  const groupedParts = useMemo(() => {
    const grouped = new Map();

    items.forEach((item) => {
      const normalizedKey = item.partName.trim().toLowerCase();

      if (!grouped.has(normalizedKey)) {
        grouped.set(normalizedKey, {
          partName: item.partName,
          locations: [],
          totalQuantity: 0,
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
        maxQuantity: item.maxQuantity,
        status: item.status,
        source: `${formatRole(item.createdByRole)} - ${
          item.createdBy?.name || "—"
        }`,
      });

      group.totalQuantity += item.quantity;
      group.totalMaxQuantity += item.maxQuantity || 0;
      group.locationCount = group.locations.length;

      const statusPriority = {
        Critical: 4,
        "Low Stock": 3,
        Overstocked: 2,
        Healthy: 1,
      };

      if (
        statusPriority[item.status] >
        statusPriority[group.worstStatus]
      ) {
        group.worstStatus = item.status;
      }
    });

    return Array.from(grouped.values());
  }, [items]);

  /* ================= FILTERED DATA ================= */
  const filteredGroupedParts = useMemo(() => {
    let filtered = groupedParts;

    // Apply search filter (frontend)
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filtered = filtered.filter((part) =>
        part.partName.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter === "LOW") {
      filtered = filtered.filter(
        (p) => p.worstStatus === "Low Stock" || p.worstStatus === "Critical"
      );
    } else if (statusFilter === "OVERSTOCK") {
      filtered = filtered.filter((p) => p.worstStatus === "Overstocked");
    }

    return filtered;
  }, [groupedParts, statusFilter, search]);

  /* ================= TOGGLE EXPAND ================= */
  const toggleExpand = (partName) => {
    const newExpanded = new Set(expandedParts);
    if (newExpanded.has(partName)) {
      newExpanded.delete(partName);
    } else {
      newExpanded.add(partName);
    }
    setExpandedParts(newExpanded);
  };

  /* ================= STATS ================= */
  const totalParts = groupedParts.length;
  const totalQty = groupedParts.reduce((s, p) => s + p.totalQuantity, 0);
  const lowStock = groupedParts.filter(
    (p) => p.worstStatus === "Low Stock" || p.worstStatus === "Critical"
  ).length;
  const overStock = groupedParts.filter(
    (p) => p.worstStatus === "Overstocked"
  ).length;

  /* ================= LOCATIONS (FOR DROPDOWN) ================= */
  const locations = useMemo(() => {
    const set = new Set(items.map((i) => i.location));
    return Array.from(set);
  }, [items]);

  /* ================= UI ================= */
  return (
    <>
      {/* Inject animations */}
      <style>{styles}</style>
      
      <div className="flex h-screen bg-gray-50 text-gray-900">
        {/* NOTIFICATIONS */}
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        {/* DELETE CONFIRMATION */}
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={deletePart}
          title="Delete Spare Part"
          message={`Are you sure you want to delete "${deleteConfirm?.name}" from location ${deleteConfirm?.location}? This action cannot be undone.`}
          confirmText="Delete"
          isDeleting={deleting}
        />

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

        {/* MAIN */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
          {/* HEADER */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-3 sm:p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden text-gray-600 hover:text-[#c62d23] transition p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
                >
                  <Menu size={24} />
                </button>

                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
                    Spare Parts Inventory
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-2 hidden sm:block">
                    Manage your spare parts stock levels and details
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 sm:gap-2 transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm md:text-base"
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

          {/* CONTENT */}
          <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
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
              <div className="bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex gap-2 sm:gap-3 items-center">
                <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
                <span className="text-red-700 font-medium text-xs sm:text-sm">
                  {lowStock} parts need restocking
                </span>
              </div>
            )}

            {/* DESKTOP TABLE - GROUPED */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm">
              {/* Search Bar */}
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search part name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-72 pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                <div className="text-sm text-gray-600">
                  {filteredGroupedParts.length} parts • {items.length} locations
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="text-left p-4 w-8"></th>
                      <th className="text-left p-4">Part Name</th>
                      <th className="text-left p-4">Locations</th>
                      <th className="text-left p-4">Total Stock</th>
                      <th className="text-left p-4">Total Max</th>
                      <th className="text-left p-4">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center">
                          Loading...
                        </td>
                      </tr>
                    ) : filteredGroupedParts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center">
                          No parts found
                        </td>
                      </tr>
                    ) : (
                      filteredGroupedParts.map((part) => (
                        <React.Fragment key={part.partName}>
                          {/* MASTER ROW */}
                          <tr
                            className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleExpand(part.partName)}
                          >
                            <td className="p-4">
                              {expandedParts.has(part.partName) ? (
                                <ChevronDown size={16} className="text-gray-500" />
                              ) : (
                                <ChevronRight size={16} className="text-gray-500" />
                              )}
                            </td>
                            <td className="p-4 font-semibold text-gray-900">
                              {part.partName}
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                                <MapPin size={12} />
                                {part.locationCount}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-gray-900">
                              {part.totalQuantity}
                            </td>
                            <td className="p-4 text-gray-600">
                              {part.totalMaxQuantity || "—"}
                            </td>
                            <td className="p-4">
                              <StatusBadge status={part.worstStatus} />
                            </td>
                          </tr>

                          {/* LOCATION DETAIL ROWS */}
                          {expandedParts.has(part.partName) &&
                            part.locations.map((loc, idx) => (
                              <tr
                                key={loc.id}
                                ref={(el) => (rowRefs.current[loc.id] = el)}
                                className={`bg-gray-50/50 border-t border-gray-100 ${
                                  idx === part.locations.length - 1
                                    ? "border-b-2 border-gray-200"
                                    : ""
                                } ${
                                  activeHighlight === loc.id
                                    ? "ring-2 ring-[#c62d23] bg-red-50"
                                    : ""
                                }`}
                              >
                                <td className="p-4"></td>
                                <td className="p-4 pl-12">
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Building2 size={12} />
                                    {loc.source}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
                                    <MapPin size={14} className="text-[#c62d23]" />
                                    {loc.location}
                                  </span>
                                </td>
                                <td className="p-4 font-semibold">{loc.quantity}</td>
                                <td className="p-4">{loc.maxQuantity ?? "—"}</td>
                                <td className="p-4">
                                  <StatusBadge status={loc.status} size="sm" />
                                </td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditId(loc.id);
                                        setForm({
                                          partName: part.partName,
                                          location: loc.location,
                                          quantity: loc.quantity,
                                          maxQuantity: loc.maxQuantity ?? "",
                                        });
                                        setShowForm(true);
                                      }}
                                      className="p-1.5 hover:bg-blue-100 rounded transition"
                                      title="Edit"
                                    >
                                      <Pencil
                                        size={14}
                                        className="text-gray-500 hover:text-blue-600"
                                      />
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTransferItem({
                                          id: loc.id,
                                          name: part.partName,
                                          location: loc.location,
                                          quantity: loc.quantity,
                                        });
                                        setShowTransfer(true);
                                      }}
                                      className="p-1.5 hover:bg-green-100 rounded transition"
                                      title="Transfer"
                                    >
                                      <ArrowLeftRight
                                        size={14}
                                        className="text-gray-500 hover:text-green-600"
                                      />
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({
                                          id: loc.id,
                                          name: part.partName,
                                          location: loc.location,
                                        });
                                      }}
                                      className="p-1.5 hover:bg-red-100 rounded transition"
                                      title="Delete"
                                    >
                                      <Trash2
                                        size={14}
                                        className="text-gray-500 hover:text-red-600"
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

              {/* Pagination */}
              <div className="flex justify-between items-center p-4 border-t border-gray-100 text-sm">
                <div>
                  Page {page} of {totalPages}
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 border rounded disabled:opacity-40"
                  >
                    Prev
                  </button>

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 border rounded disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* MOBILE CARDS - GROUPED */}
            <div className="md:hidden space-y-3">
              {/* Mobile Search Bar */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search part name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none text-sm"
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
              </div>

              {loading ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                  <p className="mt-2 text-gray-500 text-sm">Loading...</p>
                </div>
              ) : filteredGroupedParts.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200 text-sm">
                  No spare parts available
                </div>
              ) : (
                filteredGroupedParts.map((part) => (
                  <div
                    key={part.partName}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    {/* MASTER CARD */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpand(part.partName)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {expandedParts.has(part.partName) ? (
                              <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronRight size={16} className="text-gray-500 flex-shrink-0" />
                            )}
                            <h3 className="font-semibold text-gray-900 text-sm truncate">
                              {part.partName}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                            <MapPin size={12} className="text-gray-400" />
                            <span>{part.locationCount} locations</span>
                          </div>
                        </div>
                        <StatusBadge status={part.worstStatus} />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500 mb-0.5">Total Stock</p>
                          <p className="font-bold text-gray-900 text-lg">
                            {part.totalQuantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-0.5">Total Max</p>
                          <p className="font-semibold text-gray-900">
                            {part.totalMaxQuantity || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* LOCATION DETAILS */}
                    {expandedParts.has(part.partName) && (
                      <div className="border-t border-gray-200 bg-gray-50/50">
                        {part.locations.map((loc, idx) => (
                          <div
                            key={loc.id}
                            className={`p-4 ${
                              idx !== part.locations.length - 1
                                ? "border-b border-gray-200"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-[#c62d23]" />
                                <span className="font-medium text-sm">
                                  {loc.location}
                                </span>
                              </div>
                              <StatusBadge status={loc.status} size="sm" />
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                              <div>
                                <p className="text-gray-500 mb-0.5">Quantity</p>
                                <p className="font-bold text-gray-900">
                                  {loc.quantity}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-0.5">Max Qty</p>
                                <p className="font-semibold text-gray-900">
                                  {loc.maxQuantity ?? "—"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
                              <Building2 size={12} />
                              <span>{loc.source}</span>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditId(loc.id);
                                  setForm({
                                    partName: part.partName,
                                    location: loc.location,
                                    quantity: loc.quantity,
                                    maxQuantity: loc.maxQuantity ?? "",
                                  });
                                  setShowForm(true);
                                }}
                                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                              >
                                <Pencil size={14} />
                                Edit
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferItem({
                                    id: loc.id,
                                    name: part.partName,
                                    location: loc.location,
                                    quantity: loc.quantity,
                                  });
                                  setShowTransfer(true);
                                }}
                                className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                              >
                                <ArrowLeftRight size={14} />
                                Transfer
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm({
                                    id: loc.id,
                                    name: part.partName,
                                    location: loc.location,
                                  });
                                }}
                                className="bg-red-50 hover:bg-red-100 text-red-700 py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                              >
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

        {/* ADD / EDIT MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl w-full max-w-md border border-gray-200 shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="font-bold text-lg sm:text-xl text-gray-900">
                  {editId ? "Update Spare Part" : "Add Spare Part"}
                </h2>
                <button
                  onClick={handleFormClose}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <Input
                ref={firstInputRef}
                label="Spare Part Name"
                value={form.partName}
                onChange={(v) => {
                  setForm({ ...form, partName: v });
                  setFormTouched(true);
                  if (errors.partName) setErrors({ ...errors, partName: "" });
                }}
                placeholder="Enter part name"
                error={errors.partName}
                disabled={savingPart}
              />

              <Input
                label="Location"
                value={form.location}
                onChange={(v) => {
                  setForm({ ...form, location: v });
                  setFormTouched(true);
                  if (errors.location) setErrors({ ...errors, location: "" });
                }}
                placeholder="Enter location"
                error={errors.location}
                disabled={savingPart}
              />

              <Input
                label="Quantity"
                type="number"
                value={form.quantity}
                onChange={(v) => {
                  setForm({ ...form, quantity: v });
                  setFormTouched(true);
                  if (errors.quantity) setErrors({ ...errors, quantity: "" });
                }}
                placeholder="Enter quantity"
                min="0"
                step="1"
                error={errors.quantity}
                disabled={savingPart}
              />

              {role === "admin" && (
                <Input
                  label="Max Quantity"
                  type="number"
                  value={form.maxQuantity}
                  onChange={(v) => {
                    setForm({ ...form, maxQuantity: v });
                    setFormTouched(true);
                    if (errors.maxQuantity)
                      setErrors({ ...errors, maxQuantity: "" });
                  }}
                  placeholder="Enter max stock level"
                  min="0"
                  step="1"
                  error={errors.maxQuantity}
                  disabled={savingPart}
                />
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                <button
                  onClick={handleFormClose}
                  disabled={savingPart}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-gray-700 font-medium rounded-lg sm:rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPart}
                  disabled={savingPart}
                  className="w-full sm:w-auto bg-[#c62d23] hover:bg-[#a8241c] text-white px-4 sm:px-5 py-2.5 font-medium rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base disabled:opacity-50 flex items-center justify-center gap-2 min-w-[100px]"
                >
                  {savingPart ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      {editId ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    <>{editId ? "Update" : "Save"}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TRANSFER MODAL */}
        {showTransfer && transferItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl w-full max-w-md border border-gray-200 shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="font-bold text-lg sm:text-xl text-gray-900">
                  Transfer Location
                </h2>
                <button
                  onClick={closeTransfer}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                <p className="text-xs sm:text-sm text-gray-600">Part</p>
                <p className="font-medium text-gray-900 text-sm sm:text-base">
                  {transferItem.name}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-2">
                  Current Location
                </p>
                <p className="font-medium text-gray-900 text-sm sm:text-base">
                  {transferItem.location}
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    To Location
                  </label>
                  <select
                    value={transfer.toLocation}
                    onChange={(e) => {
                      setTransfer({ ...transfer, toLocation: e.target.value });
                      if (transferErrors.toLocation)
                        setTransferErrors({ ...transferErrors, toLocation: "" });
                    }}
                    disabled={transferring}
                    className={`w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border ${
                      transferErrors.toLocation
                        ? "border-red-500"
                        : "border-gray-300"
                    } focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base disabled:opacity-50`}
                  >
                    <option value="">Select Location</option>
                    {locations
                      .filter((loc) => loc !== transferItem.location)
                      .map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                  </select>
                  {transferErrors.toLocation && (
                    <p className="text-red-500 text-xs mt-1">
                      {transferErrors.toLocation}
                    </p>
                  )}
                </div>

                <Input
                  label="Quantity"
                  type="number"
                  value={transfer.quantity}
                  onChange={(v) => {
                    setTransfer({ ...transfer, quantity: v });
                    if (transferErrors.quantity)
                      setTransferErrors({ ...transferErrors, quantity: "" });
                  }}
                  placeholder="Enter quantity to transfer"
                  min="1"
                  max={transferItem.quantity}
                  step="1"
                  error={transferErrors.quantity}
                  disabled={transferring}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                <button
                  onClick={closeTransfer}
                  disabled={transferring}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-gray-700 font-medium rounded-lg sm:rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTransfer}
                  disabled={transferring}
                  className="w-full sm:w-auto bg-[#c62d23] hover:bg-[#a8241c] text-white px-4 sm:px-5 py-2.5 font-medium rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base disabled:opacity-50 flex items-center justify-center gap-2 min-w-[120px]"
                >
                  {transferring ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Transferring...
                    </>
                  ) : (
                    "Transfer"
                  )}
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
    className={`cursor-pointer bg-white border rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full
      ${active ? "ring-2 ring-[#c62d23]" : "border-gray-200"}
    `}
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-3 sm:mb-4">
      <p className="text-xs sm:text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, {
        size: 20,
        className: `sm:w-6 sm:h-6 ${icon.props.className}`,
      })}
    </div>

    <p
      className={`text-2xl sm:text-3xl font-bold mb-1 ${
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
    size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : "px-2 sm:px-3 py-0.5 sm:py-1.5 text-[10px] sm:text-xs";

  return (
    <span
      className={`${sizeClasses} rounded-full font-medium whitespace-nowrap ${
        map[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
};

const Input = React.forwardRef(
  (
    {
      label,
      value,
      onChange,
      type = "text",
      placeholder = "",
      error,
      disabled,
      min,
      max,
      step,
    },
    ref
  ) => (
    <div className="mb-3 sm:mb-4">
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
        {label}
      </label>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        onKeyDown={(e) => {
          if (type === "number") {
            if (e.key === "-" || e.key === "e") {
              e.preventDefault();
            }
          }
        }}
        className={`w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border ${
          error ? "border-red-500" : "border-gray-300"
        } focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
);

Input.displayName = "Input";