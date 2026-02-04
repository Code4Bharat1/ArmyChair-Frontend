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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

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
      const res = await axios.get(`${API}/inventory/spare-parts`, { headers });
      setItems(res.data.inventory || res.data);
    } catch (err) {
      console.error("Fetch failed", err);
      showNotification("Failed to load spare parts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

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

  /* ================= DATA ================= */
  const data = useMemo(() => {
    const grouped = {};

    items.forEach((i) => {
      if (!grouped[i.partName]) {
        grouped[i.partName] = {
          id: i.partName,
          name: i.partName,
          totalQuantity: 0,
          locations: [],
        };
      }

      grouped[i.partName].totalQuantity += i.quantity;

      grouped[i.partName].locations.push({
        id: i._id,
        location: i.location,
        locationType: i.locationType,
        quantity: i.quantity,
        status: i.status,
      });
    });

    return Object.values(grouped);
  }, [items]);

  const filteredData = useMemo(() => {
    let filtered = data;

    // Status filter
    if (statusFilter === "LOW") {
      filtered = filtered.filter((part) =>
        part.locations.some(
          (loc) => loc.status === "Low Stock" || loc.status === "Critical"
        )
      );
    } else if (statusFilter === "OVERSTOCK") {
      filtered = filtered.filter((part) =>
        part.locations.some((loc) => loc.status === "Overstocked")
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((part) =>
        part.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [data, statusFilter, searchQuery]);

  /* ================= LOCATIONS (FOR DROPDOWN) ================= */
  const locations = useMemo(() => {
    const set = new Set(items.map((i) => i.location));
    return Array.from(set);
  }, [items]);

  /* ================= STATS ================= */
  const totalParts = data.length;
  const totalQty = data.reduce((s, i) => s + i.totalQuantity, 0);

  const lowStock = data.filter((part) =>
    part.locations.some(
      (loc) => loc.status === "Low Stock" || loc.status === "Critical"
    )
  ).length;

  const overStock = data.filter((part) =>
    part.locations.some((loc) => loc.status === "Overstocked")
  ).length;

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

      {/* DESKTOP SIDEBAR */}
      <div className="hidden lg:block">
        <InventorySidebar />
      </div>

      {/* MOBILE SIDEBAR OVERLAY */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="lg:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out">
            <div className="animate-slideInLeft">
              <InventorySidebar onClose={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </>
      )}

      {/* MAIN */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              {/* LEFT - TITLE */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Package
                    size={24}
                    className="text-[#c62d23] flex-shrink-0 sm:w-8 sm:h-8"
                  />
                  <span className="truncate">Spare Parts</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">
                  Manage your spare parts stock levels and details
                </p>
              </div>

              {/* DESKTOP ACTIONS */}
              <div className="hidden md:flex items-center gap-4">
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Plus size={20} strokeWidth={2.5} /> Add Inventory
                </button>

                <button
                  onClick={() => router.push("/profile")}
                  title="My Profile"
                  className="text-gray-600 hover:text-[#c62d23] transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label="My Profile"
                >
                  <UserCircle size={36} />
                </button>
              </div>

              {/* MOBILE MENU BUTTON */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-gray-600 hover:text-[#c62d23] transition p-2"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          {/* STATS - RESPONSIVE GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <KpiCard
              title="Total Parts"
              value={totalParts}
              icon={<Boxes className="text-[#c62d23]" />}
              active={statusFilter === "ALL"}
              onClick={() => setStatusFilter("ALL")}
            />

            <KpiCard
              title="Total Quantity"
              value={totalQty}
              icon={<Warehouse className="text-[#c62d23]" />}
            />

            <KpiCard
              title={`Low / Critical ${lowStock > 0 ? `(${lowStock})` : ""}`}
              value={lowStock}
              icon={<TrendingDown className="text-[#c62d23]" />}
              danger
              active={statusFilter === "LOW"}
              onClick={() => setStatusFilter("LOW")}
            />

            <KpiCard
              title={`Overstocked ${overStock > 0 ? `(${overStock})` : ""}`}
              value={overStock}
              icon={<Boxes className="text-blue-600" />}
              info
              active={statusFilter === "OVERSTOCK"}
              onClick={() => setStatusFilter("OVERSTOCK")}
            />
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <input
              type="search"
              placeholder="Search spare parts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-4 pl-12 bg-white rounded-2xl border border-gray-200 focus:border-[#c62d23] focus:ring-4 focus:ring-[#c62d23]/10 outline-none transition-all text-sm md:text-base shadow-sm hover:shadow-md"
            />
            <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>

          {/* MOBILE ADD BUTTON */}
          <button
            onClick={() => setShowForm(true)}
            className="md:hidden w-full bg-[#c62d23] hover:bg-[#a8241c] text-white px-6 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
          >
            <Plus size={20} strokeWidth={2.5} /> Add Inventory
          </button>

          {/* ALERT */}
          {lowStock > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-2xl p-4 md:p-5 flex gap-4 items-center animate-fadeIn shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="text-red-600" size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm md:text-base text-red-900 font-semibold">
                  {lowStock} spare part{lowStock > 1 ? "s" : ""} need restocking
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  Review inventory levels to prevent stockouts
                </p>
              </div>
            </div>
          )}

          {/* TABLE - DESKTOP */}
          <div className="hidden md:block bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-xl text-gray-900">
                Spare Parts Overview
              </h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredData.length} items
              </span>
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : filteredData.length === 0 ? (
              <EmptyState
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onClearFilters={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
              />
            ) : (
              <div className="overflow-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 font-semibold text-gray-700 uppercase tracking-wide text-xs">
                        Part Name
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-700 uppercase tracking-wide text-xs">
                        Total Qty
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-700 uppercase tracking-wide text-xs">
                        Locations
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredData.map((part, idx) => (
                      <React.Fragment key={part.id}>
                        {/* MAIN ROW */}
                        <tr
                          className="border-b border-gray-100 cursor-pointer hover:bg-gray-50/50 transition-all duration-200 group"
                          onClick={() =>
                            setExpanded(expanded === part.id ? null : part.id)
                          }
                          style={{
                            animationDelay: `${idx * 30}ms`,
                          }}
                        >
                          <td className="p-4 font-semibold text-gray-900 group-hover:text-[#c62d23] transition-colors" title={part.name}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                expanded === part.id ? "bg-[#c62d23]" : "bg-gray-300"
                              }`} />
                              {part.name}
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-gray-900">
                              {part.totalQuantity}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className="text-gray-600 text-sm">
                              {part.locations.length} Location{part.locations.length > 1 ? "s" : ""}
                            </span>
                          </td>
                        </tr>

                        {/* EXPANDED ROW */}
                        {expanded === part.id &&
                          part.locations.map((loc, locIdx) => (
                            <tr
                              key={loc.id}
                              ref={(el) => (rowRefs.current[loc.id] = el)}
                              className={`bg-gray-50/50 border-b border-gray-100 transition-all duration-300 animate-fadeIn ${
                                activeHighlight === loc.id
                                  ? "ring-2 ring-[#c62d23] bg-red-50"
                                  : ""
                              }`}
                              style={{
                                animationDelay: `${locIdx * 50}ms`,
                              }}
                            >
                              <td className="p-4 pl-12 text-sm text-gray-700">
                                <div className="flex items-center gap-2">
                                  <MapPin size={14} className="text-gray-400" />
                                  {loc.location}
                                </div>
                              </td>

                              <td className="p-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white border border-gray-200">
                                  {loc.quantity} units
                                </span>
                              </td>

                              <td className="p-4">
                                <div className="flex gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditId(loc.id);
                                      setForm({
                                        partName: part.name,
                                        location: loc.location,
                                        quantity: loc.quantity,
                                        maxQuantity: "",
                                      });
                                      setShowForm(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline transition-all flex items-center gap-1"
                                    aria-label={`Edit ${part.name}`}
                                  >
                                    <Pencil size={14} />
                                    Edit
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTransferItem({
                                        id: loc.id,
                                        name: part.name,
                                        location: loc.location,
                                        quantity: loc.quantity,
                                      });
                                      setShowTransfer(true);
                                    }}
                                    className="text-purple-600 hover:text-purple-800 font-medium text-sm hover:underline transition-all flex items-center gap-1"
                                    aria-label={`Transfer ${part.name}`}
                                  >
                                    <ArrowLeftRight size={14} />
                                    Transfer
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm({
                                        id: loc.id,
                                        name: part.name,
                                        location: loc.location,
                                      });
                                    }}
                                    className="text-red-600 hover:text-red-800 font-medium text-sm hover:underline transition-all flex items-center gap-1"
                                    aria-label={`Delete ${part.name}`}
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-4">
            {loading ? (
              <LoadingSkeleton />
            ) : filteredData.length === 0 ? (
              <EmptyState
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onClearFilters={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
              />
            ) : (
              filteredData.map((part, idx) => (
                <div
                  key={part.id}
                  className="rounded-2xl p-5 bg-white border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 animate-fadeIn"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-lg text-gray-900">{part.name}</h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-900">
                      {part.totalQuantity}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                    <MapPin size={14} />
                    {part.locations.length} Location{part.locations.length > 1 ? "s" : ""}
                  </p>

                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    {part.locations.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex justify-between items-center text-sm py-2 px-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-700">{loc.location}</span>
                        <span className="font-bold text-gray-900">{loc.quantity} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ADD / EDIT MODAL - RESPONSIVE */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleFormClose();
          }}
        >
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md border border-gray-100 shadow-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <h2 className="font-bold text-lg md:text-xl text-gray-900 mb-4 md:mb-6">
              {editId ? "Update Spare Part" : "Add Spare Part"}
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitPart();
              }}
            >
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  value={form.location}
                  onChange={(e) => {
                    setForm({ ...form, location: e.target.value });
                    setFormTouched(true);
                    if (errors.location) setErrors({ ...errors, location: "" });
                  }}
                  disabled={savingPart}
                  className={`w-full p-3 bg-white rounded-xl border ${
                    errors.location ? "border-red-500" : "border-gray-300"
                  } focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">Select Location</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                {errors.location && (
                  <p className="text-red-500 text-xs mt-1">{errors.location}</p>
                )}
              </div>

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
                  label="Max Quantity (Optional)"
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

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleFormClose}
                  disabled={savingPart}
                  className="px-5 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPart}
                  className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-2.5 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[100px] active:scale-95"
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
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL - RESPONSIVE */}
      {showTransfer && transferItem && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTransfer();
          }}
        >
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md border border-gray-100 shadow-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <h2 className="font-bold text-lg md:text-xl text-gray-900 mb-4 md:mb-6">
              Transfer Location
            </h2>

            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">Part</p>
              <p className="font-medium text-gray-900">{transferItem.name}</p>
              <p className="text-sm text-gray-600 mt-2">Current Location</p>
              <p className="font-medium text-gray-900">
                {transferItem.location}
              </p>
              <p className="text-sm text-gray-600 mt-2">Available Stock</p>
              <p className="font-medium text-gray-900">
                {transferItem.quantity} units
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitTransfer();
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className={`w-full p-3 bg-white rounded-xl border ${
                      transferErrors.toLocation
                        ? "border-red-500"
                        : "border-gray-300"
                    } focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed`}
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

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeTransfer}
                  disabled={transferring}
                  className="px-5 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-2.5 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px] active:scale-95"
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
            </form>
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
    className={`group cursor-pointer bg-white rounded-2xl p-5 md:p-6 transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden
      ${active 
        ? "ring-2 ring-[#c62d23] shadow-lg scale-[1.02]" 
        : "border border-gray-100 shadow-md hover:shadow-xl hover:scale-[1.02]"
      }
    `}
  >
    {/* Left accent bar */}
    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
      danger ? "bg-red-500" : info ? "bg-blue-500" : "bg-[#c62d23]"
    } transition-all duration-300 group-hover:w-1.5`} />
    
    <div className="flex justify-between items-start mb-4 md:mb-5">
      <p className="text-xs md:text-sm text-gray-500 font-semibold uppercase tracking-wide">
        {title}
      </p>
      <div className={`p-2 rounded-lg transition-all duration-300 ${
        danger ? "bg-red-50 group-hover:bg-red-100" : 
        info ? "bg-blue-50 group-hover:bg-blue-100" : 
        "bg-red-50 group-hover:bg-red-100"
      }`}>
        {React.cloneElement(icon, { size: 20, className: "md:w-5 md:h-5" })}
      </div>
    </div>

    <p
      className={`text-3xl md:text-4xl font-bold transition-all duration-300 ${
        danger ? "text-red-600" : info ? "text-blue-600" : "text-gray-900"
      }`}
    >
      {value}
    </p>
  </div>
);

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
    <div className="mb-5">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
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
        className={`w-full px-4 py-3.5 bg-white rounded-xl border-2 ${
          error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:border-[#c62d23] focus:ring-[#c62d23]/20"
        } focus:ring-4 outline-none transition-all text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50`}
      />
      {error && <p className="text-red-600 text-xs mt-2 font-medium">{error}</p>}
    </div>
  )
);

Input.displayName = "Input";

const EmptyState = ({ searchQuery, statusFilter, onClearFilters }) => {
  const hasFilters = searchQuery || statusFilter !== "ALL";

  return (
    <div className="p-8 text-center bg-white rounded-xl border border-gray-200">
      <Package size={48} className="mx-auto mb-3 text-gray-300" />
      <p className="text-gray-500 mb-3">
        {hasFilters
          ? "No spare parts match your filters"
          : "No spare parts available"}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="text-[#c62d23] hover:underline font-medium"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
};