"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Upload, Download, Menu, X, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import {
  Pencil,
  Trash2,
  Plus,
  Package,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import SalesSidebar from "./sidebar";
import { UserCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Orders() {
  const [salesUsers, setSalesUsers] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [chairModels, setChairModels] = useState([]);
  const [chairSearch, setChairSearch] = useState("");
  const [showChairDropdown, setShowChairDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [orderTypeFilter, setOrderTypeFilter] = useState("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const rowRefs = useRef({});
  const [activeHighlight, setActiveHighlight] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const initialFormData = {
    dispatchedTo: "",
    chairModel: "",
    partname: "",
    orderType: "FULL",
    orderDate: "",
    deliveryDate: "",
    quantity: "",
    salesPerson: "",
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isDelayed(order) {
    if (!order.deliveryDate) return false;
    const delivery = new Date(order.deliveryDate);
    delivery.setHours(0, 0, 0, 0);
    return delivery < today && !["DISPATCHED", "PARTIAL"].includes(order.progress);
  }

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      if (orderTypeFilter !== "ALL" && o.orderType !== orderTypeFilter) return false;

      const matchesSearch =
        o.orderId?.toLowerCase().includes(q) ||
        (typeof o.dispatchedTo === "string"
          ? o.dispatchedTo
          : o.dispatchedTo?.name
        )?.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      switch (statusFilter) {
        case "IN_PROGRESS":
          return !["DISPATCHED", "PARTIAL"].includes(o.progress) && !isDelayed(o);
        case "DELAYED":
          return isDelayed(o);
        case "READY":
          return o.progress === "READY_FOR_DISPATCH";
        case "COMPLETED":
          return o.progress === "DISPATCHED";
        case "ALL":
        default:
          return true;
      }
    });
  }, [orders, search, statusFilter, orderTypeFilter]);

  const [formData, setFormData] = useState(initialFormData);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ── FETCH ── */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers });
      setOrders(res.data.orders || res.data);
    } catch (err) {
      console.error("Fetch orders failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!highlightId || !orders.length) return;
    setStatusFilter("ALL");
    setSearch("");
    const exists = orders.find((o) => o._id === highlightId);
    if (!exists) return;
    const timer = setTimeout(() => {
      const row = rowRefs.current[highlightId];
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        setExpandedOrderId(highlightId);
        setActiveHighlight(highlightId);
        setTimeout(() => setActiveHighlight(null), 5000);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightId, orders]);

  const fetchMe = async () => {
    const res = await axios.get(`${API}/auth/me`, { headers });
    setUser(res.data.user || res.data);
  };
  useEffect(() => { fetchMe(); }, []);

  const fetchSalesUsers = async () => {
    const res = await axios.get(`${API}/auth/staff`, { headers });
    const all = res.data.users || res.data;
    setSalesUsers(all.filter((u) => u.role === "sales"));
  };
  useEffect(() => { fetchSalesUsers(); }, []);

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API}/vendors`, { headers });
      console.log("VENDORS:", res.data.vendors || res.data);
      setVendors(res.data.vendors || res.data);
    } catch (err) {
      console.error("Fetch vendors failed", err);
    }
  };

  useEffect(() => { console.log("Highlight ID from URL:", highlightId); }, [highlightId]);
  useEffect(() => { console.log("Order IDs:", orders.map((o) => o._id)); }, [orders]);
  useEffect(() => { console.log("Highlight ID:", highlightId); }, [highlightId]);

  const fetchChairModels = async () => {
    const res = await axios.get(`${API}/inventory`, { headers });
    const inventory = res.data.inventory || [];
    const fullChairs = inventory.filter((i) => i.type === "FULL").map((i) => i.chairType);
    const spare = inventory.filter((i) => i.type === "SPARE").map((i) => i.partName);
    setChairModels([...new Set(fullChairs)]);
    setSpareParts([...new Set(spare)]);
  };

  useEffect(() => {
    fetchOrders();
    fetchVendors();
    fetchChairModels();
  }, []);

  /* ── EDIT ── */
  const handleEditOrder = (order) => {
    setEditingOrderId(order._id);
    setFormData({
      dispatchedTo: order.dispatchedTo?._id || order.dispatchedTo,
      chairModel: order.chairModel,
      orderType: order.orderType || "FULL",
      orderDate: order.orderDate?.split("T")[0],
      deliveryDate: order.deliveryDate?.split("T")[0] || "",
      quantity: order.quantity,
    });
    setVendorSearch(order.dispatchedTo?.name || "");
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ── CREATE / UPDATE ── */
  const handleCreateOrder = async (e) => {
    if (!formData.dispatchedTo) { alert("Please select or create a vendor"); return; }
    if (user?.role === "admin" && !formData.salesPerson) { alert("Please assign a sales person"); return; }
    e.preventDefault();
    try {
      const payload = {
        dispatchedTo: formData.dispatchedTo,
        chairModel: formData.orderType === "FULL" ? formData.chairModel : formData.partname,
        orderType: formData.orderType,
        orderDate: formData.orderDate || new Date().toISOString().split("T")[0],
        deliveryDate: formData.deliveryDate,
        quantity: Number(formData.quantity),
        salesPerson: formData.salesPerson,
        progress: "ORDER_PLACED",
      };
      if (editingOrderId) {
        await axios.put(`${API}/orders/${editingOrderId}`, payload, { headers });
      } else {
        await axios.post(`${API}/orders`, payload, { headers });
      }
      setShowForm(false);
      setEditingOrderId(null);
      setFormData(initialFormData);
      await fetchOrders();
      await fetchVendors();
    } catch (err) {
      console.error("Save failed", err?.response?.data || err);
      alert(err?.response?.data?.message || "Failed to save order");
    }
  };

  /* ── DELETE ── */
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await axios.delete(`${API}/orders/${orderId}`, { headers });
      fetchOrders();
    } catch (err) {
      alert("Delete failed");
    }
  };

  /* ── UPLOAD ── */
  const handleUploadOrders = async (files) => {
    try {
      setUploading(true);
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append("files", file));
      await axios.post(`${API}/orders/upload`, fd, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      alert("Orders uploaded successfully");
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ── EXPORT CSV ── */
  const handleExportCSV = () => {
    if (!orders.length) { alert("No orders to export"); return; }
    const hdrs = ["Order ID", "Vendor", "Product", "Order Type", "Quantity", "Order Date", "Delivery Date", "Status"];
    const rows = orders.map((o) => [
      o.orderId,
      typeof o.dispatchedTo === "string" ? o.dispatchedTo : o.dispatchedTo?.name || "",
      o.chairModel, o.orderType, o.quantity,
      o.orderDate ? new Date(o.orderDate).toLocaleDateString() : "",
      o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "",
      o.progress,
    ]);
    const csvContent = hdrs.join(",") + "\n" + rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ── STATS ── */
  // Stats always from raw orders — unaffected by tab/search/status filters
  const totalOrders = orders.length;
  const delayed = orders.filter(isDelayed).length;
  const readyToDispatch = orders.filter((o) => o.progress === "READY_FOR_DISPATCH").length;
  const completed = orders.filter((o) => o.progress === "DISPATCHED").length;
  const inProgress = orders.filter(
    (o) => !["DISPATCHED", "PARTIAL"].includes(o.progress) && !isDelayed(o)
  ).length;

  // Tab counts (also from raw orders)
  const allOrdersCount = orders.length;
  const fullChairCount = orders.filter((o) => o.orderType === "FULL").length;
  const sparePartCount = orders.filter((o) => o.orderType === "SPARE").length;

  // Reset page on filter changes
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, orderTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /* ── ORDER STEPS ── */
  const FULL_ORDER_STEPS = [
    { key: "PRODUCTION_PENDING", label: "Production Pending" },
    { key: "PRODUCTION_IN_PROGRESS", label: "Production In Progress" },
    { key: "PRODUCTION_COMPLETED", label: "Production Completed" },
    { key: "FITTING_IN_PROGRESS", label: "Fitting In Progress" },
    { key: "FITTING_COMPLETED", label: "Fitting Completed" },
    { key: "READY_FOR_DISPATCH", label: "Ready For Dispatch" },
    { key: "DISPATCHED", label: "Dispatched" },
  ];

  const SPARE_ORDER_STEPS = [
    { key: "ORDER_PLACED", label: "Order Placed" },
    { key: "WAREHOUSE_COLLECTED", label: "Warehouse Collected" },
    { key: "READY_FOR_DISPATCH", label: "Ready For Dispatch" },
    { key: "DISPATCHED", label: "Dispatched" },
  ];

  const isOrderLocked = (progress) => {
    return ["WAREHOUSE_COLLECTED", "FITTING_IN_PROGRESS", "FITTING_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED", "PARTIAL"].includes(progress);
  };

  const ProgressTracker = ({ progress, orderType }) => {
    const steps = orderType === "FULL" ? FULL_ORDER_STEPS : SPARE_ORDER_STEPS;
    if (progress === "PARTIAL") {
      return <StatusPill variant="warning" label="Partial / On Hold" />;
    }
    const currentIndex = steps.findIndex((s) => s.key === progress);
    const safeIndex = currentIndex === -1 ? steps.length - 1 : currentIndex;
    const isCompleted = progress === "DISPATCHED";
    return (
      <StatusPill
        variant={isCompleted ? "success" : "info"}
        label={steps[safeIndex]?.label}
      />
    );
  };

  const getOrderStatus = (o) => {
    if (isDelayed(o)) return { variant: "danger", label: "Delayed" };
    if (o.progress === "PARTIAL") return { variant: "warning", label: "On Hold" };
    if (o.progress === "READY_FOR_DISPATCH") return { variant: "ready", label: "Ready" };
    if (o.progress === "DISPATCHED") return { variant: "success", label: "Dispatched" };
    return { variant: "info", label: "Processing" };
  };

  const handleRowClick = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="flex h-screen bg-[#f8f7f5] text-gray-900">
      {/* Hidden Upload */}
      <input
        type="file"
        id="orderUploadInput"
        webkitdirectory="true"
        directory=""
        multiple
        hidden
        onChange={(e) => handleUploadOrders(e.target.files)}
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
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <SalesSidebar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* ── MOBILE HEADER ── */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={22} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#c62d23]/10 rounded-lg">
              <Package size={16} className="text-[#c62d23]" />
            </div>
            <h1 className="text-base font-bold text-gray-900">Orders</h1>
          </div>
          <button
            onClick={() => { setVendorSearch(""); setFormData(initialFormData); setEditingOrderId(null); setShowForm(true); }}
            className="bg-[#c62d23] hover:bg-[#a8241c] text-white p-2 rounded-lg transition-colors active:scale-95"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* ── DESKTOP HEADER ── */}
        <header className="hidden lg:block sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
          <div className="px-6 xl:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#c62d23]/10 rounded-xl">
                  <Package size={22} className="text-[#c62d23]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">Orders Management</h1>
                  <p className="text-xs text-gray-500">Create, track and manage all orders</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => document.getElementById("orderUploadInput").click()}
                  className="flex items-center gap-1.5 px-3 xl:px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all"
                >
                  <Upload size={15} />
                  <span className="hidden xl:inline">{uploading ? "Uploading…" : "Upload"}</span>
                </button>

                <button
                  onClick={() => { setVendorSearch(""); setFormData(initialFormData); setEditingOrderId(null); setShowForm(true); }}
                  className="flex items-center gap-1.5 px-3 xl:px-4 py-2 rounded-xl text-sm font-semibold bg-[#c62d23] hover:bg-[#b02620] text-white shadow-sm transition-all active:scale-95"
                >
                  <Plus size={15} />
                  <span>New Order</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 xl:px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95"
                >
                  <Download size={15} />
                  <span className="hidden xl:inline">Export</span>
                </button>

                <button
                  onClick={() => router.push("/profile")}
                  title="My Profile"
                  className="ml-1 text-gray-400 hover:text-[#c62d23] transition-colors"
                >
                  <UserCircle size={32} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <div className="px-4 sm:px-6 lg:px-8 py-5 space-y-5">

          {/* ── STAT CARDS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard title="Total" value={totalOrders} icon={<Package />} onClick={() => setStatusFilter("ALL")} active={statusFilter === "ALL"} accentColor="#c62d23" />
            <StatCard title="In Progress" value={inProgress} icon={<Clock />} onClick={() => setStatusFilter("IN_PROGRESS")} active={statusFilter === "IN_PROGRESS"} accentColor="#3b82f6" />
            <StatCard title="Delayed" value={delayed} icon={<AlertCircle />} onClick={() => setStatusFilter("DELAYED")} active={statusFilter === "DELAYED"} accentColor="#ef4444" danger={delayed > 0} />
            <StatCard title="Ready" value={readyToDispatch} icon={<Truck />} onClick={() => setStatusFilter("READY")} active={statusFilter === "READY"} accentColor="#f59e0b" />
            <StatCard title="Completed" value={completed} icon={<CheckCircle />} onClick={() => setStatusFilter("COMPLETED")} active={statusFilter === "COMPLETED"} accentColor="#22c55e" />
          </div>

          {/* ── DELAYED ALERT ── */}
          {delayed > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2.5">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <span className="text-red-700 font-medium text-sm">
                {delayed} {delayed > 1 ? "orders are" : "order is"} delayed
              </span>
              <button
                onClick={() => setStatusFilter("DELAYED")}
                className="ml-auto text-xs font-semibold text-red-600 hover:text-red-800 underline underline-offset-2"
              >
                View orders
              </button>
            </div>
          )}

          {/* ── TOOLBAR: Search + active filter ── */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order ID, vendor, or product…"
                className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all shadow-sm"
              />
            </div>
            {statusFilter !== "ALL" && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm shrink-0">
                <Filter size={13} className="text-[#c62d23]" />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {statusFilter.toLowerCase().replace(/_/g, " ")}
                </span>
                <button onClick={() => setStatusFilter("ALL")} className="ml-1 text-gray-400 hover:text-[#c62d23]">
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          {/* ── ORDER TYPE TABS ── */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm w-full">
            {[
              { key: "ALL", label: "All Orders", shortLabel: "All", icon: <Package size={14} />, count: allOrdersCount },
              { key: "FULL", label: "Full Chair Orders", shortLabel: "Full", icon: <Package size={14} />, count: fullChairCount },
              { key: "SPARE", label: "Spare Part Orders", shortLabel: "Spare", icon: <Truck size={14} />, count: sparePartCount },
            ].map((tab, idx, arr) => (
              <React.Fragment key={tab.key}>
                <button
                  onClick={() => { setOrderTypeFilter(tab.key); setExpandedOrderId(null); setCurrentPage(1); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 sm:px-4 text-sm font-semibold transition-all duration-200 ${
                    orderTypeFilter === tab.key
                      ? "bg-[#c62d23] text-white"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    orderTypeFilter === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {tab.count}
                  </span>
                </button>
                {idx < arr.length - 1 && <div className="w-px bg-gray-200" />}
              </React.Fragment>
            ))}
          </div>

          {/* ── TABLE ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-gray-100 border-t-[#c62d23] animate-spin" />
                <p className="text-sm text-gray-400">Loading orders…</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                <Package size={44} className="text-gray-200" />
                <p className="text-base font-medium">No orders found</p>
                <p className="text-sm">Try adjusting your search or filter</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {["Order ID", "Dispatched To", "Chair / Part", "Order Date", "Delivery Date", "Qty", "Stage", "Status", "Actions"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedOrders.map((o) => {
                        const status = getOrderStatus(o);
                        const isExpanded = expandedOrderId === o._id;
                        const locked = isOrderLocked(o.progress);
                        return (
                          <React.Fragment key={o._id}>
                            <tr
                              ref={(el) => (rowRefs.current[o._id] = el)}
                              onClick={() => handleRowClick(o._id)}
                              className={`transition-all duration-500 cursor-pointer group ${
                                activeHighlight === o._id
                                  ? "bg-yellow-100 ring-2 ring-inset ring-yellow-400"
                                  : "hover:bg-gray-50/80"
                              }`}
                            >
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-semibold text-gray-900 text-xs bg-gray-100 px-2 py-1 rounded-md">
                                    {o.orderId}
                                  </span>
                                  {isExpanded
                                    ? <ChevronUp size={12} className="text-gray-400 shrink-0" />
                                    : <ChevronDown size={12} className="text-gray-300 group-hover:text-gray-400 shrink-0" />}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-gray-800">
                                {o.dispatchedTo?.name || o.dispatchedTo}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900">
                                {o.chairModel}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-600">
                                {new Date(o.orderDate).toLocaleDateString()}
                              </td>
                              <td className={`px-4 py-3.5 whitespace-nowrap text-sm ${isDelayed(o) ? "text-red-500 font-semibold" : "text-gray-600"}`}>
                                {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "—"}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-gray-900">
                                {o.quantity}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <ProgressTracker progress={o.progress} orderType={o.orderType} />
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <StatusPill variant={status.variant} label={status.label} />
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditOrder(o)}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil size={15} className="text-gray-500 hover:text-[#c62d23]" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(o._id)}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={15} className="text-gray-500 hover:text-red-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Progress */}
                            {isExpanded && o.progress !== "PARTIAL" && (
                              <tr>
                                <td colSpan={9} className="px-4 py-0 bg-gray-50">
                                  <div className="my-3 p-5 bg-white rounded-xl border border-gray-100">
                                    <ExpandedProgress order={o} FULL_ORDER_STEPS={FULL_ORDER_STEPS} SPARE_ORDER_STEPS={SPARE_ORDER_STEPS} />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {paginatedOrders.map((o) => {
                    const status = getOrderStatus(o);
                    const isExpanded = expandedOrderId === o._id;
                    return (
                      <div
                        key={o._id}
                        ref={(el) => (rowRefs.current[o._id] = el)}
                        className={`p-4 transition-all duration-500 ${
                          activeHighlight === o._id
                            ? "bg-yellow-100 ring-2 ring-inset ring-yellow-400"
                            : "bg-white"
                        }`}
                      >
                        {/* Card top row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono text-xs font-bold bg-gray-100 text-gray-900 px-2 py-1 rounded-md">
                                {o.orderId}
                              </span>
                              <StatusPill variant={status.variant} label={status.label} />
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              {o.dispatchedTo?.name || o.dispatchedTo}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{o.chairModel}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); handleEditOrder(o); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                              <Pencil size={14} className="text-gray-500" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(o._id); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                        </div>

                        {/* Details grid */}
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Order Date</p>
                            <p className="text-gray-700">{new Date(o.orderDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Delivery</p>
                            <p className={isDelayed(o) ? "text-red-500 font-semibold" : "text-gray-700"}>
                              {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Qty</p>
                            <p className="text-gray-900 font-bold">{o.quantity}</p>
                          </div>
                        </div>

                        {/* Stage + toggle */}
                        <div className="mt-3 flex items-center justify-between">
                          <ProgressTracker progress={o.progress} orderType={o.orderType} />
                          <button
                            onClick={() => handleRowClick(o._id)}
                            className="text-xs text-[#c62d23] font-medium"
                          >
                            {isExpanded ? "Hide ▲" : "Progress ▼"}
                          </button>
                        </div>

                        {/* Expanded mobile progress */}
                        {isExpanded && o.progress !== "PARTIAL" && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            {(() => {
                              const steps = o.orderType === "FULL" ? FULL_ORDER_STEPS : SPARE_ORDER_STEPS;
                              const currentIndex = steps.findIndex((s) => s.key === o.progress);
                              const safeIndex = currentIndex === -1 ? steps.length - 1 : currentIndex;
                              const percent = ((safeIndex + 1) / steps.length) * 100;
                              return (
                                <div className="space-y-3">
                                  <div className="space-y-1.5">
                                    {steps.map((step, index) => (
                                      <div key={step.key} className={`text-xs flex items-center gap-2 ${index <= safeIndex ? "text-gray-900 font-medium" : "text-gray-300"}`}>
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                          index < safeIndex ? "bg-green-500 text-white" : index === safeIndex ? "bg-[#c62d23] text-white" : "bg-gray-100 text-gray-300"
                                        }`}>
                                          {index < safeIndex ? "✓" : index + 1}
                                        </div>
                                        {step.label}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                                      style={{ width: `${percent}%`, background: percent === 100 ? "#22c55e" : "#c62d23" }}
                                    />
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    Current: <span className="text-[#c62d23] font-semibold">{steps[safeIndex]?.label}</span>
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── PAGINATION ── */}
                <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-gray-400 order-2 sm:order-1">
                    Showing{" "}
                    <span className="font-semibold text-gray-600">
                      {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredOrders.length)}–{Math.min(currentPage * PAGE_SIZE, filteredOrders.length)}
                    </span>{" "}
                    of <span className="font-semibold text-gray-600">{filteredOrders.length}</span> orders
                  </p>
                  <div className="flex items-center gap-1 order-1 sm:order-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c62d23] hover:text-[#c62d23]"
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "..." ? (
                          <span key={`e-${idx}`} className="px-2 text-xs text-gray-400">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`w-8 h-8 text-xs rounded-lg border font-semibold transition-colors ${
                              currentPage === p
                                ? "bg-[#c62d23] text-white border-[#c62d23]"
                                : "border-gray-200 text-gray-600 hover:border-[#c62d23] hover:text-[#c62d23]"
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c62d23] hover:text-[#c62d23]"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#c62d23]/10 rounded-lg">
                  <Package size={18} className="text-[#c62d23]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingOrderId ? "Update Order" : "Create New Order"}
                </h2>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingOrderId(null); setFormData(initialFormData); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
              {/* Vendor */}
              <FormField label="Dispatched To">
                <div className="relative">
                  <input
                    placeholder="Search or type vendor name"
                    value={vendorSearch}
                    onFocus={() => setShowVendorDropdown(true)}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all"
                  />
                  {showVendorDropdown && (
                    <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 mt-1 rounded-xl max-h-44 overflow-auto shadow-xl">
                      {vendors.map((v) => (
                        <div
                          key={v._id}
                          onClick={() => { setFormData({ ...formData, dispatchedTo: v._id }); setVendorSearch(v.name); setShowVendorDropdown(false); }}
                          className="px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                        >
                          {v.name}
                        </div>
                      ))}
                      {vendorSearch && !vendors.some((v) => v.name.toLowerCase() === vendorSearch.toLowerCase()) && (
                        <div
                          onClick={() => { setFormData({ ...formData, dispatchedTo: vendorSearch.trim() }); setVendorSearch(vendorSearch.trim()); setShowVendorDropdown(false); }}
                          className="px-4 py-2.5 bg-gray-50 hover:bg-green-50 cursor-pointer text-green-700 font-medium text-sm transition-colors"
                        >
                          ➕ Add "{vendorSearch}" as new vendor
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </FormField>

              {/* Assign Sales Person (admin only) */}
              {user?.role === "admin" && (
                <FormField label="Assign Sales Person">
                  <select
                    value={formData.salesPerson || ""}
                    onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all"
                  >
                    <option value="">Select Sales Person</option>
                    {salesUsers.map((u) => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                </FormField>
              )}

              {/* Order Type toggle */}
              <FormField label="Order Type">
                <div className="grid grid-cols-2 gap-2">
                  {["FULL", "SPARE"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, orderType: type, chairModel: "", partname: "" }))}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        formData.orderType === type
                          ? "bg-[#c62d23] text-white border-[#c62d23] shadow-sm"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {type === "FULL" ? "Full Chair" : "Spare Part"}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Full Chair model */}
              {formData.orderType === "FULL" && (
                <FormField label="Chair Model">
                  <select
                    value={formData.chairModel}
                    onChange={(e) => setFormData({ ...formData, chairModel: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all"
                    required
                  >
                    <option value="">Select Chair Model…</option>
                    {chairModels.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </FormField>
              )}

              {/* Spare Part */}
              {formData.orderType === "SPARE" && (
                <FormField label="Spare Part">
                  <select
                    value={formData.partname}
                    onChange={(e) => setFormData({ ...formData, partname: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all"
                    required
                  >
                    <option value="">Select Spare Part…</option>
                    {spareParts.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </FormField>
              )}

              {/* Order Date (readonly) */}
              <FormField label="Order Date">
                <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-500 select-none">
                  {formData.orderDate || new Date().toISOString().split("T")[0]}
                </div>
              </FormField>

              {/* Quantity */}
              <FormField label="Quantity">
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleFormChange}
                  min="1"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all"
                />
              </FormField>

              {/* Delivery Date */}
              <FormField label="Delivery Date">
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all"
                />
              </FormField>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingOrderId(null); setFormData(initialFormData); }}
                className="px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all font-medium border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                className="bg-[#c62d23] hover:bg-[#b02620] text-white px-5 py-2.5 rounded-xl text-sm transition-all font-semibold shadow-sm active:scale-95"
              >
                {editingOrderId ? "Save Changes" : "Create Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════ */

function ExpandedProgress({ order, FULL_ORDER_STEPS, SPARE_ORDER_STEPS }) {
  const steps = order.orderType === "FULL" ? FULL_ORDER_STEPS : SPARE_ORDER_STEPS;
  const currentIndex = steps.findIndex((s) => s.key === order.progress);
  const safeIndex = currentIndex === -1 ? steps.length - 1 : currentIndex;
  const percent = ((safeIndex + 1) / steps.length) * 100;
  const isCompleted = order.progress === "DISPATCHED";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Progress</p>
        <span className="text-xs text-gray-500">Step {safeIndex + 1} of {steps.length}</span>
      </div>
      <div className="relative">
        <div className="h-1.5 bg-gray-100 rounded-full w-full" />
        <div
          className="absolute top-0 left-0 h-1.5 rounded-full transition-all duration-700"
          style={{
            width: `${percent}%`,
            background: isCompleted ? "#22c55e" : "linear-gradient(90deg, #22c55e, #c62d23)",
          }}
        />
      </div>
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const done = index < safeIndex;
          const active = index === safeIndex;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                done ? "bg-green-500 border-green-500 text-white"
                  : active ? "bg-[#c62d23] border-[#c62d23] text-white scale-110 shadow-sm"
                  : "bg-white border-gray-200 text-gray-300"
              }`}>
                {done ? "✓" : index + 1}
              </div>
              <span className={`text-[9px] text-center leading-tight max-w-[56px] ${
                active ? "text-[#c62d23] font-semibold" : done ? "text-green-600" : "text-gray-300"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_VARIANTS = {
  danger: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  ready: "bg-violet-50 text-violet-700 border-violet-200",
  success: "bg-green-50 text-green-700 border-green-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

function StatusPill({ variant, label }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_VARIANTS[variant] || STATUS_VARIANTS.info}`}>
      {label}
    </span>
  );
}

function StatCard({ title, value, icon, danger, onClick, active, accentColor }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-xl p-4 sm:p-5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md group ${
        danger ? "border-red-200" : "border-gray-100"
      } ${active ? "ring-2 ring-offset-1" : "hover:border-gray-200"}`}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: accentColor,
        ...(active ? { "--tw-ring-color": accentColor } : {}),
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
          {React.cloneElement(icon, { size: 14 })}
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1.5 group-hover:text-gray-500 transition-colors">
        {active ? "Showing filtered" : "Click to filter"}
      </p>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}