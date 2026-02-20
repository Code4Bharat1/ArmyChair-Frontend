"use client";

import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";
import { useRouter } from "next/navigation";

/* ================= PAGE ================= */
export default function SparePartsInventory() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 25;

  // Track which parts are expanded (show location details)
  const [expandedParts, setExpandedParts] = useState(new Set());

  const role =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user"))?.role
      : null;

  /* FORM */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    partName: "",
    location: "",
    quantity: "",
    maxQuantity: "",
  });

  const LOCATIONS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  /* TRANSFER */
  const [showTransfer, setShowTransfer] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [transferItem, setTransferItem] = useState(null);
  const [transfer, setTransfer] = useState({
    toLocation: "",
    quantity: "",
  });

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, [page, statusFilter]);

  /* ================= SAVE ================= */
  const submitPart = async () => {
    try {
      if (!form.partName || !form.location || form.quantity === "") {
        return alert("All fields required");
      }

      const payload = {
        partName: form.partName,
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
      } else {
        const res =  await axios.post(`${API}/inventory/spare-parts`, payload, { headers });
        console.log("Create response:", res.data);
      }

      setShowForm(false);
      setForm({
        partName: "",
        location: "",
        quantity: "",
        maxQuantity: "",
      });

      setEditId(null);
      fetchParts();
    } catch (err) {
      console.error("Save failed", err);
    }
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
      if (!transfer.toLocation || transfer.quantity === "") {
        return alert("Destination location and quantity required");
      }

      const qty = Number(transfer.quantity);
      if (qty <= 0) return alert("Quantity must be greater than 0");
      if (qty > transferItem.quantity)
        return alert("Not enough stock in source location");

      const payload = {
        sourceId: transferItem.id,
        toLocation: transfer.toLocation,
        quantity: qty,
      };

      await axios.post(`${API}/transfer`, payload, { headers });

      setShowTransfer(false);
      setTransfer({ toLocation: "", quantity: "" });
      setTransferItem(null);
      fetchParts();
    } catch (err) {
      console.error("Transfer failed", err?.response?.data || err);
      alert(err?.response?.data?.message || "Transfer failed");
    }
  };

  const formatRole = (role) =>
    role ? role.charAt(0).toUpperCase() + role.slice(1) : "—";

  /* ================= GROUP DATA BY PART NAME ================= */
 const groupedParts = useMemo(() => {
  const grouped = new Map();

  items.forEach((item) => {
    const normalizedKey = item.partName.trim().toLowerCase();

    if (!grouped.has(normalizedKey)) {
      grouped.set(normalizedKey, {
        partName: item.partName, // keep original casing for display
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


  console.log(items)

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
                              className={`bg-gray-50/50 border-t border-gray-100 ${
                                idx === part.locations.length - 1
                                  ? "border-b-2 border-gray-200"
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
                                      const item = items.find(
                                        (i) => i._id === loc.id
                                      );
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
{/* 
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
                                  </button> */}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deletePart(loc.id);
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
                                deletePart(loc.id);
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
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm({
                    partName: "",
                    location: "",
                    quantity: "",
                    maxQuantity: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <Input
              label="Spare Part Name"
              value={form.partName}
              onChange={(v) => setForm({ ...form, partName: v })}
              placeholder="Enter part name"
            />

            <Input
              label="Location"
              value={form.location}
              onChange={(v) => setForm({ ...form, location: v })}
              placeholder="Enter location"
            />

            <Input
              label="Quantity"
              type="number"
              value={form.quantity}
              onChange={(v) => setForm({ ...form, quantity: v })}
              placeholder="Enter quantity"
            />

            {role === "admin" && (
              <Input
                label="Max Quantity"
                type="number"
                value={form.maxQuantity}
                onChange={(v) => setForm({ ...form, maxQuantity: v })}
                placeholder="Enter max stock level"
              />
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm({
                    partName: "",
                    location: "",
                    quantity: "",
                    maxQuantity: "",
                  });
                }}
                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-gray-700 font-medium rounded-lg sm:rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={submitPart}
                className="w-full sm:w-auto bg-[#c62d23] hover:bg-[#a8241c] text-white px-4 sm:px-5 py-2.5 font-medium rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
              >
                {editId ? "Update" : "Save"}
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
                onClick={() => {
                  setShowTransfer(false);
                  setTransfer({ toLocation: "", quantity: "" });
                  setTransferItem(null);
                }}
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
                  onChange={(e) =>
                    setTransfer({ ...transfer, toLocation: e.target.value })
                  }
                  className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
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
              </div>

              <Input
                label="Quantity"
                type="number"
                value={transfer.quantity}
                onChange={(v) => setTransfer({ ...transfer, quantity: v })}
                placeholder="Enter quantity to transfer"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTransfer(false);
                  setTransfer({ toLocation: "", quantity: "" });
                  setTransferItem(null);
                }}
                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-gray-700 font-medium rounded-lg sm:rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={submitTransfer}
                className="w-full sm:w-auto bg-[#c62d23] hover:bg-[#a8241c] text-white px-4 sm:px-5 py-2.5 font-medium rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
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

const Input = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div className="mb-3 sm:mb-4">
    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
    />
  </div>
);