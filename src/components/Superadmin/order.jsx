"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Upload, Download, Menu, X, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import {
  Pencil, Trash2, Plus, Package, Clock, CheckCircle,
  Truck, AlertCircle, UserCircle,
} from "lucide-react";
import axios from "axios";
import SalesSidebar from "./sidebar";
import { useRouter, useSearchParams } from "next/navigation";

export default function Orders() {
  const [salesUsers, setSalesUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [chairModels, setChairModels] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [orderTypeFilter, setOrderTypeFilter] = useState("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [itemSearches, setItemSearches] = useState([""]);
  const [showItemDropdowns, setShowItemDropdowns] = useState([false]);

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
    remark: "",
    orderType: "FULL",
    orderDate: "",
    deliveryDate: "",
    salesPerson: "",
    items: [{ chairModel: "", quantity: "" }],
  };

  const [formData, setFormData] = useState(initialFormData);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isDelayed(order) {
    if (!order.deliveryDate) return false;
    const delivery = new Date(order.deliveryDate);
    delivery.setHours(0, 0, 0, 0);
    return delivery < today && !["DISPATCHED", "PARTIAL"].includes(order.progress);
  }

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ── FETCH ── */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers });
      setOrders(res.data.orders || res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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

  const fetchSalesUsers = async () => {
    const res = await axios.get(`${API}/auth/staff`, { headers });
    const all = res.data.users || res.data;
    setSalesUsers(all.filter((u) => u.role === "sales"));
  };

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API}/vendors`, { headers });
      setVendors(res.data.vendors || res.data);
    } catch (err) { console.error(err); }
  };

  const fetchChairModels = async () => {
    try {
      const res = await axios.get(`${API}/inventory/chair-models`, { headers });
      setChairModels(res.data.models || []);
    } catch {
      try {
        const res = await axios.get(`${API}/inventory`, { headers });
        const inv = res.data.inventory || [];
        setChairModels([...new Set(inv.filter((i) => i.type === "FULL").map((i) => i.chairType))]);
      } catch {}
    }
  };

  const fetchSpareParts = async () => {
    try {
      const res = await axios.get(`${API}/inventory/spare-part-names`, { headers });
      setSpareParts(res.data.parts || []);
    } catch {
      try {
        const res = await axios.get(`${API}/inventory`, { headers });
        const inv = res.data.inventory || [];
        setSpareParts([...new Set(inv.filter((i) => i.type === "SPARE").map((i) => i.partName))]);
      } catch {}
    }
  };

  useEffect(() => {
    fetchMe();
    fetchOrders();
    fetchVendors();
    fetchChairModels();
    fetchSpareParts();
    fetchSalesUsers();
  }, []);

  /* ── FILTER ── */
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      if (orderTypeFilter !== "ALL" && o.orderType !== orderTypeFilter) return false;
      const vendorName = typeof o.dispatchedTo === "string" ? o.dispatchedTo : o.dispatchedTo?.name || "";
      const matchesSearch =
        o.orderId?.toLowerCase().includes(q) ||
        vendorName.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q) ||
        o.items?.some((i) => i.name?.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      switch (statusFilter) {
        case "IN_PROGRESS": return !["DISPATCHED", "PARTIAL"].includes(o.progress) && !isDelayed(o);
        case "DELAYED": return isDelayed(o);
        case "READY": return o.progress === "READY_FOR_DISPATCH";
        case "COMPLETED": return o.progress === "DISPATCHED";
        default: return true;
      }
    });
  }, [orders, search, statusFilter, orderTypeFilter]);

  /* ── EDIT ── */
  const handleEditOrder = (order) => {
    setEditingOrderId(order._id);
    const items = order.items?.length > 0
      ? order.items.map((i) => ({ chairModel: i.name, quantity: i.quantity }))
      : [{ chairModel: order.chairModel, quantity: order.quantity }];
    setFormData({
      dispatchedTo: order.dispatchedTo?._id || order.dispatchedTo,
      remark: order.remark || "",
      orderDate: order.orderDate?.split("T")[0],
      deliveryDate: order.deliveryDate?.split("T")[0] || "",
      orderType: order.orderType || "FULL",
      salesPerson: order.salesPerson?._id || order.salesPerson || "",
      items,
    });
    setVendorSearch(order.dispatchedTo?.name || "");
    setItemSearches(items.map((i) => i.chairModel));
    setShowItemDropdowns(items.map(() => false));
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "orderType") {
      setFormData((prev) => ({ ...prev, orderType: value, items: [{ chairModel: "", quantity: "" }] }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addItem = () => {
    setFormData((prev) => ({ ...prev, items: [...prev.items, { chairModel: "", quantity: "" }] }));
    setItemSearches((prev) => [...prev, ""]);
    setShowItemDropdowns((prev) => [...prev, false]);
  };

  const removeItem = (index) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    setItemSearches((prev) => prev.filter((_, i) => i !== index));
    setShowItemDropdowns((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  /* ── CREATE / UPDATE ── */
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!formData.dispatchedTo) { alert("Please select a vendor"); return; }
    if (user?.role === "admin" && !formData.salesPerson) { alert("Please assign a sales person"); return; }
    const validItems = formData.items.filter((item) => item.chairModel && Number(item.quantity) > 0);
    if (!validItems.length) { alert("Add at least one valid item"); return; }

    const payload = {
      dispatchedTo: formData.dispatchedTo,
      remark: formData.remark || "",
      orderType: formData.orderType,
      orderDate: formData.orderDate || new Date().toISOString().split("T")[0],
      deliveryDate: formData.deliveryDate,
      salesPerson: formData.salesPerson,
      items: validItems.map((item) => ({ name: item.chairModel, quantity: Number(item.quantity) })),
    };

    try {
      if (editingOrderId) {
        await axios.put(`${API}/orders/${editingOrderId}`, payload, { headers });
      } else {
        await axios.post(`${API}/orders`, payload, { headers });
      }
      setShowForm(false);
      setEditingOrderId(null);
      setFormData(initialFormData);
      setItemSearches([""]);
      setShowItemDropdowns([false]);
      fetchOrders(); fetchVendors(); fetchChairModels(); fetchSpareParts();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to save order");
    }
  };

  /* ── DELETE ── */
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await axios.delete(`${API}/orders/${orderId}`, { headers });
      fetchOrders();
    } catch { alert("Delete failed"); }
  };

  /* ── UPLOAD ── */
  const handleUploadOrders = async (files) => {
    try {
      setUploading(true);
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append("files", file));
      await axios.post(`${API}/orders/upload`, fd, { headers: { ...headers, "Content-Type": "multipart/form-data" } });
      alert("Orders uploaded successfully");
      fetchOrders();
    } catch (err) {
      alert(err?.response?.data?.message || "Upload failed");
    } finally { setUploading(false); }
  };

  /* ── EXPORT ── */
  const handleExportCSV = () => {
    if (!orders.length) { alert("No orders to export"); return; }
    const hdrs = ["Order ID", "Vendor", "Product", "Remarks", "Order Type", "Quantity", "Order Date", "Delivery Date", "Status"];
    const rows = [];
    orders.forEach((o) => {
      const vendorName = typeof o.dispatchedTo === "string" ? o.dispatchedTo : o.dispatchedTo?.name || "";
      const orderDate = o.orderDate ? new Date(o.orderDate).toLocaleDateString() : "";
      const deliveryDate = o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "";
      if (o.items?.length > 0) {
        o.items.forEach((item) => rows.push([o.orderId, vendorName, item.name, o.remark || "", o.orderType, item.quantity, orderDate, deliveryDate, o.progress]));
      } else {
        rows.push([o.orderId, vendorName, o.chairModel, o.remark || "", o.orderType, o.quantity, orderDate, deliveryDate, o.progress]);
      }
    });
    const csv = hdrs.join(",") + "\n" + rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  /* ── STATS ── */
  const totalOrders = orders.length;
  const delayed = orders.filter(isDelayed).length;
  const readyToDispatch = orders.filter((o) => o.progress === "READY_FOR_DISPATCH").length;
  const completed = orders.filter((o) => o.progress === "DISPATCHED").length;
  const inProgress = orders.filter((o) => !["DISPATCHED", "PARTIAL"].includes(o.progress) && !isDelayed(o)).length;
  const fullChairCount = orders.filter((o) => o.orderType === "FULL").length;
  const sparePartCount = orders.filter((o) => o.orderType === "SPARE").length;

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, orderTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /* ── PROGRESS STEPS ── */
  const FULL_STEPS = [
    { key: "PRODUCTION_PENDING", label: "Production Pending" },
    { key: "PRODUCTION_IN_PROGRESS", label: "Production In Progress" },
    { key: "PRODUCTION_COMPLETED", label: "Production Completed" },
    { key: "FITTING_IN_PROGRESS", label: "Fitting In Progress" },
    { key: "FITTING_COMPLETED", label: "Fitting Completed" },
    { key: "READY_FOR_DISPATCH", label: "Ready For Dispatch" },
    { key: "DISPATCHED", label: "Dispatched" },
  ];
  const SPARE_STEPS = [
    { key: "ORDER_PLACED", label: "Order Placed" },
    { key: "WAREHOUSE_COLLECTED", label: "Warehouse Collected" },
    { key: "READY_FOR_DISPATCH", label: "Ready For Dispatch" },
    { key: "DISPATCHED", label: "Dispatched" },
  ];

 const getOrderStatus = (o) => {
    if (isDelayed(o)) return { variant: "danger", label: "Delayed" };
    if (o.progress === "PARTIAL") return { variant: "warning", label: "On Hold" };
    if (o.progress === "PARTIALLY_DISPATCHED") return { variant: "warning", label: "Partial" };
    if (o.progress === "READY_FOR_DISPATCH") return { variant: "ready", label: "Ready" };
    if (o.progress === "DISPATCHED") return { variant: "success", label: "Dispatched" };
    if (o.orderType === "FULL" && o.progress === "WAREHOUSE_COLLECTED")
      return { variant: "ready", label: "At Warehouse" };
    return { variant: "info", label: "Processing" };
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingOrderId(null);
    setFormData(initialFormData);
    setItemSearches([""]);
    setShowItemDropdowns([false]);
    setVendorSearch("");
  };

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="flex h-screen bg-[#f8f7f5] text-gray-900">
      <input type="file" id="orderUploadInput" accept=".csv,.xlsx" hidden onChange={(e) => handleUploadOrders(e.target.files)} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <SalesSidebar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">

        {/* ── MOBILE HEADER ── */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu size={22} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#c62d23]/10 rounded-lg">
              <Package size={16} className="text-[#c62d23]" />
            </div>
            <h1 className="text-base font-bold text-gray-900">Orders</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => document.getElementById("orderUploadInput").click()} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
              <Upload size={18} />
            </button>
            <button onClick={() => { setFormData(initialFormData); setEditingOrderId(null); setItemSearches([""]); setShowItemDropdowns([false]); setVendorSearch(""); fetchChairModels(); fetchSpareParts(); setShowForm(true); }}
              className="bg-[#c62d23] hover:bg-[#a8241c] text-white p-2 rounded-lg transition-colors active:scale-95">
              <Plus size={18} />
            </button>
          </div>
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
                <button onClick={() => document.getElementById("orderUploadInput").click()}
                  className="flex items-center gap-1.5 px-3 xl:px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all">
                  <Upload size={15} />
                  <span>{uploading ? "Uploading…" : "Upload"}</span>
                </button>
                <button onClick={() => { setVendorSearch(""); setFormData(initialFormData); setEditingOrderId(null); setItemSearches([""]); setShowItemDropdowns([false]); fetchChairModels(); fetchSpareParts(); setShowForm(true); }}
                  className="flex items-center gap-1.5 px-3 xl:px-4 py-2 rounded-xl text-sm font-semibold bg-[#c62d23] hover:bg-[#b02620] text-white shadow-sm transition-all active:scale-95">
                  <Plus size={15} /><span>New Order</span>
                </button>
                <button onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 xl:px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95">
                  <Download size={15} /><span>Export</span>
                </button>
                <button onClick={() => router.push("/profile")} className="ml-1 text-gray-400 hover:text-[#c62d23] transition-colors">
                  <UserCircle size={32} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4 sm:space-y-5">

          {/* ── STAT CARDS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { title: "Total", value: totalOrders, icon: <Package />, filter: "ALL", accent: "#c62d23" },
              { title: "In Progress", value: inProgress, icon: <Clock />, filter: "IN_PROGRESS", accent: "#3b82f6" },
              { title: "Delayed", value: delayed, icon: <AlertCircle />, filter: "DELAYED", accent: "#ef4444", danger: delayed > 0 },
              { title: "Ready", value: readyToDispatch, icon: <Truck />, filter: "READY", accent: "#f59e0b" },
              { title: "Completed", value: completed, icon: <CheckCircle />, filter: "COMPLETED", accent: "#22c55e" },
            ].map((s) => (
              <StatCard key={s.filter} title={s.title} value={s.value} icon={s.icon} danger={s.danger}
                onClick={() => setStatusFilter(s.filter)} active={statusFilter === s.filter} accentColor={s.accent} />
            ))}
          </div>

          {/* ── DELAYED ALERT ── */}
          {delayed > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2.5">
              <AlertCircle className="text-red-500 shrink-0" size={16} />
              <span className="text-red-700 font-medium text-xs sm:text-sm">
                {delayed} {delayed > 1 ? "orders are" : "order is"} delayed
              </span>
              <button onClick={() => setStatusFilter("DELAYED")}
                className="ml-auto text-xs font-semibold text-red-600 hover:text-red-800 underline underline-offset-2">
                View
              </button>
            </div>
          )}

          {/* ── TOOLBAR ── */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order ID, vendor, or product…"
                className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all shadow-sm" />
            </div>
            {statusFilter !== "ALL" && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm shrink-0">
                <Filter size={13} className="text-[#c62d23]" />
                <span className="text-sm font-medium text-gray-700 capitalize">{statusFilter.toLowerCase().replace(/_/g, " ")}</span>
                <button onClick={() => setStatusFilter("ALL")} className="ml-1 text-gray-400 hover:text-[#c62d23]">
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          {/* ── ORDER TYPE TABS ── */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            {[
              { key: "ALL", label: "All Orders", short: "All", icon: <Package size={14} />, count: totalOrders },
              { key: "FULL", label: "Full Chair Orders", short: "Full", icon: <Package size={14} />, count: fullChairCount },
              { key: "SPARE", label: "Spare Part Orders", short: "Spare", icon: <Truck size={14} />, count: sparePartCount },
            ].map((tab, idx, arr) => (
              <React.Fragment key={tab.key}>
                <button onClick={() => { setOrderTypeFilter(tab.key); setExpandedOrderId(null); setCurrentPage(1); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all ${
                    orderTypeFilter === tab.key ? "bg-[#c62d23] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.short}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${orderTypeFilter === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
                    {tab.count}
                  </span>
                </button>
                {idx < arr.length - 1 && <div className="w-px bg-gray-200" />}
              </React.Fragment>
            ))}
          </div>

          {/* ── TABLE / CARDS ── */}
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
                        {["Order ID", "Dispatched To", "Chair / Part", "Remark", "Sales Person", "Order Date", "Delivery Date", "Qty", "Stage", "Status", "Actions"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedOrders.map((o) => {
                        const status = getOrderStatus(o);
                        const isExpanded = expandedOrderId === o._id;
                        return (
                          <React.Fragment key={o._id}>
                            <tr ref={(el) => (rowRefs.current[o._id] = el)}
                              onClick={() => setExpandedOrderId((p) => (p === o._id ? null : o._id))}
                              className={`transition-all duration-300 cursor-pointer group ${
                                activeHighlight === o._id ? "bg-yellow-50 ring-2 ring-inset ring-yellow-400" : "hover:bg-gray-50/80"}`}>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-semibold text-gray-900 text-xs bg-gray-100 px-2 py-1 rounded-md">{o.orderId}</span>
                                  {isExpanded ? <ChevronUp size={12} className="text-gray-400 shrink-0" /> : <ChevronDown size={12} className="text-gray-300 group-hover:text-gray-400 shrink-0" />}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-gray-800">{o.dispatchedTo?.name || o.dispatchedTo}</td>
                              <td className="px-4 py-3.5 text-sm font-medium text-gray-900">
                                {o.items?.length > 1 ? (
                                  <details onClick={(e) => e.stopPropagation()} className="relative cursor-pointer">
                                    <summary className="list-none flex items-center gap-1 text-[#c62d23] font-semibold">
                                      {o.items.length} items <ChevronDown size={12} />
                                    </summary>
                                    <div className="absolute z-20 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1">
                                      {o.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm px-2 py-1 rounded hover:bg-gray-50">
                                          <span>{item.name}</span><span className="font-semibold">× {item.quantity}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                ) : (
                                  <span>{o.items?.[0]?.name || o.chairModel}</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-gray-600 max-w-[160px] truncate">{o.remark || "—"}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-600">{o.salesPerson?.name || "—"}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-600">{new Date(o.orderDate).toLocaleDateString()}</td>
                              <td className={`px-4 py-3.5 whitespace-nowrap text-sm ${isDelayed(o) ? "text-red-500 font-semibold" : "text-gray-600"}`}>
                                {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "—"}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-gray-900">
                                {o.items ? o.items.reduce((s, i) => s + i.quantity, 0) : o.quantity}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap"><ProgressBadge progress={o.progress} orderType={o.orderType} FULL_STEPS={FULL_STEPS} SPARE_STEPS={SPARE_STEPS} /></td>
                              <td className="px-4 py-3.5 whitespace-nowrap"><StatusPill variant={status.variant} label={status.label} /></td>
                              <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1">
                                  <button onClick={() => handleEditOrder(o)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Edit">
                                    <Pencil size={15} className="text-gray-500 hover:text-[#c62d23]" />
                                  </button>
                                  <button onClick={() => handleDeleteOrder(o._id)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Delete">
                                    <Trash2 size={15} className="text-gray-500 hover:text-red-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && o.progress !== "PARTIAL" && (
                              <tr>
                                <td colSpan={11} className="px-4 py-0 bg-gray-50/60">
                                  <div className="my-3 p-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <ExpandedProgress order={o} FULL_STEPS={FULL_STEPS} SPARE_STEPS={SPARE_STEPS} />
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

                {/* ── MOBILE CARDS ── */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {paginatedOrders.map((o) => {
                    const status = getOrderStatus(o);
                    const isExpanded = expandedOrderId === o._id;
                    return (
                      <div key={o._id} ref={(el) => (rowRefs.current[o._id] = el)}
                        className={`p-4 transition-all duration-300 ${activeHighlight === o._id ? "bg-yellow-50 ring-2 ring-inset ring-yellow-400" : "bg-white"}`}>
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono text-xs font-bold bg-gray-100 text-gray-900 px-2 py-1 rounded-md">{o.orderId}</span>
                              <StatusPill variant={status.variant} label={status.label} />
                              {isDelayed(o) && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">Delayed</span>}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 truncate">{o.dispatchedTo?.name || o.dispatchedTo}</p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {o.items?.length > 1 ? `${o.items.length} items` : o.items?.[0]?.name || o.chairModel}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); handleEditOrder(o); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                              <Pencil size={14} className="text-gray-500" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(o._id); }} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                          <div>
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-0.5" style={{fontSize:"10px"}}>Order Date</p>
                            <p className="text-gray-700 font-medium">{new Date(o.orderDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-0.5" style={{fontSize:"10px"}}>Delivery</p>
                            <p className={`font-medium ${isDelayed(o) ? "text-red-500 font-semibold" : "text-gray-700"}`}>
                              {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-0.5" style={{fontSize:"10px"}}>Qty</p>
                            <p className="text-gray-900 font-bold">{o.items ? o.items.reduce((s, i) => s + i.quantity, 0) : o.quantity}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-medium uppercase tracking-wide mb-0.5" style={{fontSize:"10px"}}>Sales Person</p>
                            <p className="text-gray-700 font-medium truncate">{o.salesPerson?.name || "—"}</p>
                          </div>
                        </div>

                        {/* Remark */}
                        {o.remark && (
                          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3 border border-gray-100 truncate">
                            📝 {o.remark}
                          </p>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <ProgressBadge progress={o.progress} orderType={o.orderType} FULL_STEPS={FULL_STEPS} SPARE_STEPS={SPARE_STEPS} />
                          <button onClick={() => setExpandedOrderId((p) => (p === o._id ? null : o._id))}
                            className="flex items-center gap-1 text-xs text-[#c62d23] font-semibold hover:underline">
                            {isExpanded ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> Progress</>}
                          </button>
                        </div>

                        {/* Expanded on mobile */}
                        {isExpanded && o.progress !== "PARTIAL" && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <ExpandedProgress order={o} FULL_STEPS={FULL_STEPS} SPARE_STEPS={SPARE_STEPS} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── PAGINATION ── */}
                <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-gray-400 order-2 sm:order-1">
                    Showing <span className="font-semibold text-gray-600">
                      {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredOrders.length)}–{Math.min(currentPage * PAGE_SIZE, filteredOrders.length)}
                    </span> of <span className="font-semibold text-gray-600">{filteredOrders.length}</span> orders
                  </p>
                  <div className="flex items-center gap-1 order-1 sm:order-2">
                    <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c62d23] hover:text-[#c62d23] transition-colors">
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, [])
                      .map((p, idx) => p === "..." ? (
                        <span key={`e-${idx}`} className="px-2 text-xs text-gray-400">…</span>
                      ) : (
                        <button key={p} onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 text-xs rounded-lg border font-semibold transition-colors ${currentPage === p ? "bg-[#c62d23] text-white border-[#c62d23]" : "border-gray-200 text-gray-600 hover:border-[#c62d23] hover:text-[#c62d23]"}`}>
                          {p}
                        </button>
                      ))}
                    <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c62d23] hover:text-[#c62d23] transition-colors">
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          MODAL
      ════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[95vh] sm:max-h-[92vh] flex flex-col shadow-2xl border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#c62d23]/10 rounded-lg">
                  <Package size={18} className="text-[#c62d23]" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  {editingOrderId ? "Update Order" : "Create New Order"}
                </h2>
              </div>
              <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1 space-y-4">

              {/* Vendor */}
              <FormField label="Dispatched To">
                <div className="relative">
                  <input placeholder="Search or type vendor name" value={vendorSearch}
                    onFocus={() => setShowVendorDropdown(true)}
                    onBlur={() => setTimeout(() => setShowVendorDropdown(false), 150)}
                    onChange={(e) => { setVendorSearch(e.target.value); setShowVendorDropdown(true); }}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all" />
                  {showVendorDropdown && (
                    <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 mt-1 rounded-xl max-h-44 overflow-auto shadow-xl">
                      {vendors.filter((v) => v.name.toLowerCase().includes(vendorSearch.toLowerCase())).map((v) => (
                        <div key={v._id} onMouseDown={() => { setFormData({ ...formData, dispatchedTo: v._id }); setVendorSearch(v.name); setShowVendorDropdown(false); }}
                          className="px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">
                          {v.name}
                        </div>
                      ))}
                      {vendorSearch && !vendors.some((v) => v.name.toLowerCase() === vendorSearch.toLowerCase()) && (
                        <div onMouseDown={() => { const n = vendorSearch.trim(); setFormData({ ...formData, dispatchedTo: n }); setVendorSearch(n); setVendors((p) => [...p, { _id: n, name: n.toUpperCase() }]); setShowVendorDropdown(false); }}
                          className="px-4 py-2.5 bg-gray-50 hover:bg-green-50 cursor-pointer text-green-700 font-medium text-sm">
                          ➕ Add "{vendorSearch}" as new vendor
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </FormField>

              {/* Sales Person (admin only) */}
              <FormField label="Assign Sales Person">
                <select value={formData.salesPerson || ""} onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all">
                  <option value="">Select Sales Person</option>
                  {salesUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </FormField>

              {/* Order Type */}
              <FormField label="Order Type">
                <div className="grid grid-cols-2 gap-2">
                  {["FULL", "SPARE"].map((type) => (
                    <button key={type} type="button"
                      onClick={() => setFormData((p) => ({ ...p, orderType: type, items: [{ chairModel: "", quantity: "" }] }))}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${formData.orderType === type ? "bg-[#c62d23] text-white border-[#c62d23] shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                      {type === "FULL" ? "Full Chair" : "Spare Part"}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Remark */}
              <FormField label="Remark (Optional)">
                <textarea name="remark" value={formData.remark} onChange={handleFormChange}
                  placeholder="Any special instructions or client changes…" rows={2}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all resize-none" />
              </FormField>

              {/* Dynamic Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {formData.orderType === "FULL" ? "Chair Models" : "Spare Parts"}
                  </label>
                  <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs font-semibold text-[#c62d23] hover:underline">
                    <Plus size={12} /> Add Row
                  </button>
                </div>
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input placeholder={formData.orderType === "FULL" ? "Search chair model…" : "Search spare part…"}
                        value={itemSearches[index] || ""}
                        onFocus={() => { const u = [...showItemDropdowns]; u[index] = true; setShowItemDropdowns(u); }}
                        onBlur={() => setTimeout(() => { const u = [...showItemDropdowns]; u[index] = false; setShowItemDropdowns(u); }, 150)}
                        onChange={(e) => { const u = [...itemSearches]; u[index] = e.target.value; setItemSearches(u); updateItem(index, "chairModel", e.target.value); }}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all" />
                      {showItemDropdowns[index] && (
                        <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 mt-1 rounded-xl max-h-44 overflow-auto shadow-xl">
                          {(formData.orderType === "FULL" ? chairModels : spareParts)
                            .filter((m) => m.toLowerCase().includes((itemSearches[index] || "").toLowerCase()))
                            .map((m) => (
                              <div key={m} onMouseDown={() => { updateItem(index, "chairModel", m); const s = [...itemSearches]; s[index] = m; setItemSearches(s); const d = [...showItemDropdowns]; d[index] = false; setShowItemDropdowns(d); }}
                                className="px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                                {m}
                              </div>
                            ))}
                          {itemSearches[index] && !(formData.orderType === "FULL" ? chairModels : spareParts).some((m) => m.toLowerCase() === (itemSearches[index] || "").toLowerCase()) && (
                            <div onMouseDown={async () => {
                              const newName = itemSearches[index].trim();
                              try {
                                if (formData.orderType === "FULL") {
                                  await axios.post(`${API}/inventory/chair-models`, { name: newName }, { headers });
                                  setChairModels((p) => [...p, newName]);
                                } else {
                                  await axios.post(`${API}/inventory/spare-part-names`, { name: newName }, { headers });
                                  setSpareParts((p) => [...p, newName]);
                                }
                              } catch {}
                              updateItem(index, "chairModel", newName);
                              const d = [...showItemDropdowns]; d[index] = false; setShowItemDropdowns(d);
                            }} className="px-4 py-2.5 bg-gray-50 hover:bg-green-50 cursor-pointer text-green-700 font-medium text-sm">
                              ➕ Add "{itemSearches[index]}" as new {formData.orderType === "FULL" ? "model" : "part"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <input type="number" min="1" placeholder="Qty" value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      className="w-20 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all text-center font-semibold" />
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Order Date */}
              <FormField label="Order Date">
                <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-500 select-none">
                  {formData.orderDate || new Date().toISOString().split("T")[0]}
                </div>
              </FormField>

              {/* Delivery Date */}
              <FormField label="Delivery Date">
                <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleFormChange}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all" />
              </FormField>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 px-5 sm:px-6 py-4 border-t border-gray-100">
              <button type="button" onClick={resetForm}
                className="flex-1 sm:flex-none px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all font-medium border border-gray-200">
                Cancel
              </button>
              <button onClick={handleCreateOrder}
                className="flex-1 sm:flex-none bg-[#c62d23] hover:bg-[#b02620] text-white px-6 py-2.5 rounded-xl text-sm transition-all font-semibold shadow-sm active:scale-95">
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

function ProgressBadge({ progress, orderType, FULL_STEPS, SPARE_STEPS }) {
  if (progress === "PARTIAL") return <StatusPill variant="warning" label="Partial / On Hold" />;
  if (progress === "PARTIALLY_DISPATCHED") return <StatusPill variant="warning" label="Partially Dispatched" />;
  if (orderType === "FULL" && progress === "WAREHOUSE_COLLECTED")
    return <StatusPill variant="info" label="Stock Reserved" />;
  const steps = orderType === "FULL" ? FULL_STEPS : SPARE_STEPS;
  const idx = steps.findIndex((s) => s.key === progress);
  const safeIdx = idx === -1 ? steps.length - 1 : idx;
  return <StatusPill variant={progress === "DISPATCHED" ? "success" : "info"} label={steps[safeIdx]?.label} />;
}

function ExpandedProgress({ order, FULL_STEPS, SPARE_STEPS }) {
  const steps = order.orderType === "FULL" ? FULL_STEPS : SPARE_STEPS;
  const currentIndex = steps.findIndex((s) => s.key === order.progress);
  const safeIndex = currentIndex === -1 ? steps.length - 1 : currentIndex;
  const percent = ((safeIndex + 1) / steps.length) * 100;

  return (
    <div className="space-y-4">
      {order.items?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm">
                <span className="font-medium text-gray-800 truncate">{item.name}</span>
                <span className="font-semibold text-gray-900 ml-2 shrink-0">× {item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Progress</p>
        <span className="text-xs text-gray-500">Step {safeIndex + 1} of {steps.length}</span>
      </div>
      <div className="relative h-1.5 bg-gray-100 rounded-full">
        <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${percent}%`, background: percent === 100 ? "#22c55e" : "linear-gradient(90deg, #22c55e, #c62d23)" }} />
      </div>
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const done = index < safeIndex;
          const active = index === safeIndex;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                done ? "bg-green-500 border-green-500 text-white" : active ? "bg-[#c62d23] border-[#c62d23] text-white scale-110 shadow-sm" : "bg-white border-gray-200 text-gray-300"
              }`}>
                {done ? "✓" : index + 1}
              </div>
              <span className={`text-[9px] text-center leading-tight max-w-[56px] hidden sm:block ${active ? "text-[#c62d23] font-semibold" : done ? "text-green-600" : "text-gray-300"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-600">
        Current: <span className="text-[#c62d23] font-semibold">{steps[safeIndex]?.label}</span>
      </p>
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
    <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${STATUS_VARIANTS[variant] || STATUS_VARIANTS.info}`}>
      {label}
    </span>
  );
}

function StatCard({ title, value, icon, danger, onClick, active, accentColor }) {
  return (
    <div onClick={onClick} className={`bg-white border rounded-xl p-3 sm:p-4 lg:p-5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md group ${danger ? "border-red-200" : "border-gray-100"} ${active ? "ring-2 ring-offset-1" : "hover:border-gray-200"}`}
      style={{ borderLeftWidth: "3px", borderLeftColor: accentColor, ...(active ? { "--tw-ring-color": accentColor } : {}) }}>
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <div className="p-1 sm:p-1.5 rounded-lg" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
          {React.cloneElement(icon, { size: 13 })}
        </div>
      </div>
      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1 group-hover:text-gray-500 transition-colors hidden sm:block">
        {active ? "Showing filtered" : "Click to filter"}
      </p>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}