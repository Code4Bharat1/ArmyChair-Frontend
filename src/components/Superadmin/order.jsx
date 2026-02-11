"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Upload, Download, Menu } from "lucide-react";
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
  
 const filteredOrders = useMemo(() => {
  const q = search.toLowerCase();

  return orders.filter((o) => {
    // 🔁 Order Type Filter
    if (orderTypeFilter !== "ALL" && o.orderType !== orderTypeFilter) {
      return false;
    }

    // 🔍 Search filter
    const matchesSearch =
      o.orderId?.toLowerCase().includes(q) ||
      (
        typeof o.dispatchedTo === "string"
          ? o.dispatchedTo
          : o.dispatchedTo?.name
      )?.toLowerCase().includes(q) ||
      o.chairModel?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // 📊 Status filter
    switch (statusFilter) {
      case "IN_PROGRESS":
        return (
          !["DISPATCHED", "PARTIAL"].includes(o.progress) &&
          !isDelayed(o)
        );

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


  function isDelayed(order) {
    if (!order.deliveryDate) return false;

    const delivery = new Date(order.deliveryDate);
    delivery.setHours(0, 0, 0, 0);

    return (
      delivery < today && !["DISPATCHED", "PARTIAL"].includes(order.progress)
    );
  }
  const CHAIR_MODELS = chairModels;

  const [formData, setFormData] = useState(initialFormData);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
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

  // useEffect(() => {
  //   fetchOrders();
  // }, []);

  useEffect(() => {
  if (!highlightId || !orders.length) return;

  // ensure order is visible
  setStatusFilter("ALL");
  setSearch("");

  const exists = orders.find((o) => o._id === highlightId);
  if (!exists) return;

  const timer = setTimeout(() => {
    const row = rowRefs.current[highlightId];

    if (row) {
      row.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setExpandedOrderId(highlightId);
      setActiveHighlight(highlightId);

      setTimeout(() => {
        setActiveHighlight(null);
      }, 5000);
    }
  }, 300);

  return () => clearTimeout(timer);
}, [highlightId, orders]);

  const fetchMe = async () => {
    const res = await axios.get(`${API}/auth/me`, { headers });
    setUser(res.data.user || res.data);
  };
  useEffect(() => {
    fetchMe();
  }, []);

  /* ================= FETCH SALES USERS ================= */
  const fetchSalesUsers = async () => {
    const res = await axios.get(`${API}/auth/staff`, { headers });
    const all = res.data.users || res.data;
    setSalesUsers(all.filter((u) => u.role === "sales"));
  };
  useEffect(() => {
    fetchSalesUsers();
  }, []);

  /* ================= FETCH VENDORS ================= */
  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API}/vendors`, { headers });
      console.log("VENDORS:", res.data.vendors || res.data);
      setVendors(res.data.vendors || res.data);
    } catch (err) {
      console.error("Fetch vendors failed", err);
    }
  };

  // useEffect(() => {
  //   fetchOrders();
  //   fetchVendors();
  // }, []);
  useEffect(() => {
  console.log("Highlight ID from URL:", highlightId);
}, [highlightId]);

useEffect(() => {
  console.log("Order IDs:", orders.map(o => o._id));
}, [orders]);

useEffect(() => {
  console.log("Highlight ID:", highlightId);
}, [highlightId]);

  const fetchChairModels = async () => {
    const res = await axios.get(`${API}/inventory`, { headers });

    const inventory = res.data.inventory || [];

    const fullChairs = inventory
      .filter((i) => i.type === "FULL")
      .map((i) => i.chairType);

    const spare = inventory
      .filter((i) => i.type === "SPARE")
      .map((i) => i.partName);

    setChairModels([...new Set(fullChairs)]);
    setSpareParts([...new Set(spare)]);
  };

  useEffect(() => {
    fetchOrders();
    fetchVendors();
    fetchChairModels(); // 👈 add this
  }, []);

  /* ================= EDIT ================= */
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

  /* ================= FORM CHANGE ================= */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= CREATE / UPDATE ================= */
  const handleCreateOrder = async (e) => {
    if (!formData.dispatchedTo) {
      alert("Please select or create a vendor");
      return;
    }

    if (user?.role === "admin" && !formData.salesPerson) {
      alert("Please assign a sales person");
      return;
    }

    e.preventDefault();

    try {
      const payload = {
        dispatchedTo: formData.dispatchedTo,
        chairModel:
          formData.orderType === "FULL"
            ? formData.chairModel
            : formData.partname,
        orderType: formData.orderType,
        orderDate: formData.orderDate || new Date().toISOString().split("T")[0],
        deliveryDate: formData.deliveryDate,
        quantity: Number(formData.quantity),
        salesPerson: formData.salesPerson,
        progress: "ORDER_PLACED",
      };

      if (editingOrderId) {
        await axios.put(`${API}/orders/${editingOrderId}`, payload, {
          headers,
        });
      } else {
        await axios.post(`${API}/orders`, payload, { headers });
      }

      setShowForm(false);
      setEditingOrderId(null);
      setFormData(initialFormData);

      await fetchOrders(); // refresh orders
      await fetchVendors(); // 🔥 refresh vendors automatically
    } catch (err) {
      console.error("Save failed", err?.response?.data || err);
      alert(err?.response?.data?.message || "Failed to save order");
    }
  };

  /* ================= DELETE ================= */
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;

    try {
      await axios.delete(`${API}/orders/${orderId}`, { headers });
      fetchOrders();
    } catch (err) {
      alert("Delete failed");
    }
  };

  /* ================= STATS ================= */
  const totalOrders = filteredOrders.length;
  const delayed = filteredOrders.filter(isDelayed).length;
  const readyToDispatch = filteredOrders.filter(
    (o) => o.progress === "READY_FOR_DISPATCH",
  ).length;
  const completed = filteredOrders.filter(
    (o) => o.progress === "DISPATCHED",
  ).length;
  const inProgress = filteredOrders.filter(
    (o) => !["DISPATCHED", "PARTIAL"].includes(o.progress) && !isDelayed(o),
  ).length;

  /* ================= ORDER STEPS ================= */
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
    return [
      "WAREHOUSE_COLLECTED",
      "FITTING_IN_PROGRESS",
      "FITTING_COMPLETED",
      "READY_FOR_DISPATCH",
      "DISPATCHED",
      "PARTIAL",
    ].includes(progress);
  };

  /* ================= PROGRESS ================= */
 const ProgressTracker = ({ progress, orderType }) => {
  const steps =
    orderType === "FULL" ? FULL_ORDER_STEPS : SPARE_ORDER_STEPS;

  if (progress === "PARTIAL") {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        Partial / On Hold
      </span>
    );
  }

  const currentIndex = steps.findIndex((s) => s.key === progress);
  const safeIndex =
    currentIndex === -1 ? steps.length - 1 : currentIndex;

  const isCompleted = progress === "DISPATCHED";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium border ${
        isCompleted
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-blue-50 text-blue-700 border-blue-200"
      }`}
    >
      {steps[safeIndex]?.label}
    </span>
  );
};

  const handleRowClick = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  /* ================= CSV / FOLDER UPLOAD ================= */
  const handleUploadOrders = async (files) => {
    try {
      setUploading(true);

      const formData = new FormData();

      // supports single csv OR entire folder
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      await axios.post(`${API}/orders/upload`, formData, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data",
        },
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

  /* ================= EXPORT CSV ================= */
  const handleExportCSV = () => {
    if (!orders.length) {
      alert("No orders to export");
      return;
    }

    const headers = [
      "Order ID",
      "Vendor",
      "Product",
      "Order Type",
      "Quantity",
      "Order Date",
      "Delivery Date",
      "Status",
    ];

    const rows = orders.map((o) => [
      o.orderId,
      typeof o.dispatchedTo === "string"
        ? o.dispatchedTo
        : o.dispatchedTo?.name || "",
      o.chairModel,
      o.orderType,
      o.quantity,
      o.orderDate ? new Date(o.orderDate).toLocaleDateString() : "",
      o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "",
      o.progress,
    ]);

    let csvContent =
      headers.join(",") +
      "\n" +
      rows.map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");

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
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <SalesSidebar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* ================= HIDDEN UPLOAD INPUT ================= */}
        <input
          type="file"
          id="orderUploadInput"
          webkitdirectory="true"
          directory=""
          multiple
          hidden
          onChange={(e) => handleUploadOrders(e.target.files)}
        />

        {/* Mobile Header Bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">
            Orders
          </h1>
          <button
            onClick={() => {
              setVendorSearch("");
              setFormData(initialFormData);
              setEditingOrderId(null);
              setShowForm(true);
            }}
            className="bg-[#c62d23] hover:bg-[#a8241c] text-white p-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Desktop HEADER */}
        <div className="hidden lg:block sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Orders Management
              </h1>
              <p className="text-gray-600 mt-2">
                Create, track and manage all orders
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* UPLOAD ORDERS */}
              <button
                onClick={() =>
                  document.getElementById("orderUploadInput").click()
                }
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 border border-gray-300"
              >
                <Upload size={18} />
                <span className="hidden xl:inline">{uploading ? "Uploading..." : "Upload Orders"}</span>
              </button>

              {/* ADD ORDER */}
              <button
                onClick={() => {
                  setVendorSearch("");
                  setFormData(initialFormData);
                  setEditingOrderId(null);
                  setShowForm(true);
                }}
                className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Order</span>
              </button>

              {/* EXPORT CSV */}
              <button
                onClick={handleExportCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all"
              >
                <Download size={18} />
                <span className="hidden xl:inline">Export CSV</span>
              </button>

              {/* PROFILE */}
              <button
                onClick={() => router.push("/profile")}
                title="My Profile"
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <UserCircle size={32} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            <KpiCard
              title="Total Orders"
              value={totalOrders}
              icon={<Package className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("ALL")}
              active={statusFilter === "ALL"}
            />

            <KpiCard
              title="In Progress"
              value={inProgress}
              icon={<Clock className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("IN_PROGRESS")}
              active={statusFilter === "IN_PROGRESS"}
            />

            <KpiCard
              title="Delayed"
              value={delayed}
              icon={<Clock className="text-[#c62d23]" />}
              danger={delayed > 0}
              onClick={() => setStatusFilter("DELAYED")}
              active={statusFilter === "DELAYED"}
            />

            <KpiCard
              title="Ready to Dispatch"
              value={readyToDispatch}
              icon={<Truck className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("READY")}
              active={statusFilter === "READY"}
            />

            <KpiCard
              title="Completed"
              value={completed}
              icon={<CheckCircle className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("COMPLETED")}
              active={statusFilter === "COMPLETED"}
            />
          </div>

          {/* DELAYED ALERT */}
          {delayed > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex gap-2 sm:gap-3 items-center">
              <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
              <span className="text-red-700 font-medium text-sm sm:text-base">
                {delayed} {delayed > 1 ? "orders are" : "order is"} delayed
              </span>
            </div>
          )}

          {/* SEARCH */}
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders..."
                className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              {["ALL", "FULL", "SPARE"].map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderTypeFilter(type)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all
                    ${
                      orderTypeFilter === type
                        ? "bg-[#c62d23] text-white shadow"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                    }
                  `}
                >
                  {type === "ALL"
                    ? "All"
                    : type === "FULL"
                    ? "Full Chairs"
                    : "Spare Parts"}
                </button>
              ))}
            </div>

            {/* Desktop TABLE */}
            <div className="hidden lg:block overflow-auto rounded-lg border border-gray-200">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No orders found
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {[
                        "Order ID",
                        "Dispatched To",
                        "Chair",
                        "Order Date",
                        "Delivery Date",
                        "Qty",
                        "Progress",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left p-4 font-semibold text-gray-700"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((o, index) => (
                      <React.Fragment key={o._id}>
                        {/* MAIN ROW */}
                        <tr
                        ref={(el) => (rowRefs.current[o._id] = el)}

                          onClick={() => handleRowClick(o._id)}
                          className={`transition-all duration-500 cursor-pointer ${
                            activeHighlight === o._id

                              ? "bg-yellow-100 ring-2 ring-yellow-400"
                              : index % 2 === 0
                                ? "bg-white hover:bg-gray-50"
                                : "bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          <td className="p-4 font-medium text-gray-900">
                            {o.orderId}
                          </td>
                          <td className="p-4 text-gray-700">
                            {o.dispatchedTo?.name || o.dispatchedTo}
                          </td>
                          <td className="p-4 text-gray-700">{o.chairModel}</td>
                          <td className="p-4 text-gray-700">
                            {new Date(o.orderDate).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-gray-700">
                            {o.deliveryDate
                              ? new Date(o.deliveryDate).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="p-4 font-semibold text-gray-900">
                            {o.quantity}
                          </td>
                          <td className="p-4"><ProgressTracker 
  progress={o.progress} 
  orderType={o.orderType}
/>

                          </td>
                         <td
  className="p-4 flex gap-2"
  onClick={(e) => e.stopPropagation()}
>
  <button
    onClick={() => handleEditOrder(o)}
    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
    title="Edit"
  >
    <Pencil size={16} className="text-gray-600 hover:text-[#c62d23]" />
  </button>

  <button
    onClick={() => handleDeleteOrder(o._id)}
    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
    title="Delete"
  >
    <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
  </button>
</td>

                        </tr>

                        {/* EXPANDED PROGRESS ROW */}
                        {expandedOrderId === o._id &&
  o.progress !== "PARTIAL" && (
    <tr className="bg-gray-50">
      <td colSpan={8} className="p-6">
        {(() => {
          const steps =
            o.orderType === "FULL"
              ? FULL_ORDER_STEPS
              : SPARE_ORDER_STEPS;

          const currentIndex = steps.findIndex(
            (s) => s.key === o.progress
          );

          const safeIndex =
            currentIndex === -1
              ? steps.length - 1
              : currentIndex;

          const percent =
            ((safeIndex + 1) / steps.length) * 100;

          return (
            <div className="w-full space-y-6">
              <p className="text-sm text-gray-700 font-medium">
                Order Progress
              </p>

              <div className="flex justify-between text-xs text-gray-500">
                {steps.map((step, index) => (
                  <span
                    key={step.key}
                    className={
                      index <= safeIndex
                        ? "text-gray-900 font-medium"
                        : ""
                    }
                  >
                    {step.label}
                  </span>
                ))}
              </div>

              <div className="relative w-full h-10 flex items-center mt-6">
                <div className="absolute left-0 right-0 h-[4px] bg-gray-300 rounded-full" />

                <div
                  className="absolute left-0 h-[4px] rounded-full transition-all duration-500"
                  style={{
                    width: `${percent}%`,
                    background:
                      percent === 100
                        ? "#16a34a"
                        : "linear-gradient(90deg,#16a34a,#c62d23)",
                  }}
                />

                <div
                  className="absolute w-7 h-7 rounded-full border-2 border-white shadow
                  flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    left: `calc(${percent}% - 14px)`,
                    backgroundColor:
                      percent === 100
                        ? "#16a34a"
                        : "#c62d23",
                  }}
                >
                  {safeIndex + 1}
                </div>
              </div>

              <p className="text-sm text-gray-700">
                <span className="font-medium">
                  Current Stage:
                </span>{" "}
                <span className="text-[#c62d23] font-semibold">
                  {steps[safeIndex]?.label}
                </span>
              </p>
            </div>
          );
        })()}
      </td>
    </tr>
)}

                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile CARD VIEW */}
            <div className="lg:hidden space-y-3">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No orders found
                </div>
              ) : (
                filteredOrders.map((o) => (
                  <div
                    key={o._id}
                    ref={(el) => (rowRefs.current[o._id] = el)}
                    className={`border rounded-lg p-3 sm:p-4 transition-all ${
                      activeHighlight === o._id
                        ? "bg-yellow-100 ring-2 ring-yellow-400"
                        : "border-gray-200 hover:border-[#c62d23] bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">
                          {o.orderId}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          {o.dispatchedTo?.name || o.dispatchedTo}
                        </p>
                      </div>
                      <div className="flex gap-1 sm:gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditOrder(o);
                          }}
                          className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Pencil size={14} className="sm:w-4 sm:h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(o._id);
                          }}
                          className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Trash2 size={14} className="sm:w-4 sm:h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Product:</span>
                        <span className="font-medium text-gray-900">{o.chairModel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-semibold text-[#c62d23]">{o.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order Date:</span>
                        <span className="text-gray-900">{new Date(o.orderDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Delivery:</span>
                        <span className="text-gray-900">
                          {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <ProgressTracker progress={o.progress} orderType={o.orderType} />
                    </div>

                    {/* Mobile Progress Detail */}
                    <button
                      onClick={() => handleRowClick(o._id)}
                      className="w-full mt-3 text-xs sm:text-sm text-[#c62d23] hover:text-[#a8241c] font-medium"
                    >
                      {expandedOrderId === o._id ? "Hide Details ▲" : "View Progress ▼"}
                    </button>

                    {/* Expanded Progress */}
                    {expandedOrderId === o._id && o.progress !== "PARTIAL" && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        {(() => {
                          const steps = o.orderType === "FULL" ? FULL_ORDER_STEPS : SPARE_ORDER_STEPS;
                          const currentIndex = steps.findIndex((s) => s.key === o.progress);
                          const safeIndex = currentIndex === -1 ? steps.length - 1 : currentIndex;
                          const percent = ((safeIndex + 1) / steps.length) * 100;

                          return (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                {steps.map((step, index) => (
                                  <div
                                    key={step.key}
                                    className={`text-xs sm:text-sm ${
                                      index <= safeIndex ? "text-gray-900 font-medium" : "text-gray-400"
                                    }`}
                                  >
                                    {index + 1}. {step.label}
                                  </div>
                                ))}
                              </div>

                              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="absolute left-0 top-0 h-full transition-all duration-500"
                                  style={{
                                    width: `${percent}%`,
                                    background: percent === 100 ? "#16a34a" : "#c62d23",
                                  }}
                                />
                              </div>

                              <p className="text-xs sm:text-sm text-gray-700">
                                <span className="font-medium">Current:</span>{" "}
                                <span className="text-[#c62d23] font-semibold">
                                  {steps[safeIndex]?.label}
                                </span>
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[520px] border border-gray-200 shadow-lg max-h-[85vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {editingOrderId ? "Update Order" : "Create Order"}
              </h2>
            </div>

            <div className="space-y-3 sm:space-y-4 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 flex-1">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Dispatched To
                </label>

                <input
                  placeholder="Search or type vendor name"
                  value={vendorSearch}
                  onFocus={() => setShowVendorDropdown(true)}
                  // onBlur={() =>
                  //   setTimeout(() => setShowVendorDropdown(false), 200)
                  // }
                  onChange={(e) => {
                    setVendorSearch(e.target.value);
                  }}
                  className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                />

                {showVendorDropdown && (
                  <div className="bg-white border border-gray-200 mt-1 rounded-lg sm:rounded-xl shadow-lg max-h-48 overflow-auto">
                    {vendors
                      // .filter((v) =>
                      //   v.name
                      //     .toLowerCase()
                      //     .includes(vendorSearch.toLowerCase()),
                      // )
                      .map((v) => (
                        <div
                          key={v._id}
                          onClick={() => {
                            setFormData({ ...formData, dispatchedTo: v._id });
                            setVendorSearch(v.name);
                            setShowVendorDropdown(false);
                          }}
                          className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 text-sm sm:text-base"
                        >
                          {v.name}
                        </div>
                      ))}

                    {vendorSearch &&
                      !vendors.some(
                        (v) =>
                          v.name.toLowerCase() === vendorSearch.toLowerCase(),
                      ) && (
                        <div
                          onClick={() => {
                            setFormData({
                              ...formData,
                              dispatchedTo: vendorSearch.trim(),
                            });
                            setVendorSearch(vendorSearch.trim());
                            setShowVendorDropdown(false);
                          }}
                          className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-0 text-green-700 font-medium text-sm sm:text-base"
                        >
                          ➕ Add "{vendorSearch}" as new vendor
                        </div>
                      )}
                  </div>
                )}
              </div>

              {user?.role === "admin" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Assign Sales Person
                  </label>

                  <select
                    value={formData.salesPerson || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, salesPerson: e.target.value })
                    }
                    className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                  >
                    <option value="">Select Sales Person</option>
                    {salesUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Order Type
                </label>

                <select
                  value={formData.orderType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      orderType: e.target.value,
                      chairModel: "",
                    })
                  }
                  className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                >
                  <option value="FULL">Full Chair</option>
                  <option value="SPARE">Spare Part</option>
                </select>
              </div>

              {/* FULL CHAIR */}
              {formData.orderType === "FULL" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Chair Model
                  </label>

                  <select
                    value={formData.chairModel}
                    onChange={(e) =>
                      setFormData({ ...formData, chairModel: e.target.value })
                    }
                    className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                    required
                  >
                    <option value="">Select Chair Model</option>
                    {chairModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* SPARE PART */}
              {formData.orderType === "SPARE" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Spare Part
                  </label>

                  <select
                    value={formData.partname}
                    onChange={(e) =>
                      setFormData({ ...formData, partname: e.target.value })
                    }
                    className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                    required
                  >
                    <option value="">Select Spare Part</option>
                    {spareParts.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Order Date
                </label>

                <div className="w-full p-2.5 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-300 text-gray-700 text-sm sm:text-base">
                  {formData.orderDate || new Date().toISOString().split("T")[0]}
                </div>
              </div>

              <Input
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleFormChange}
              />

              <Input
                label="Delivery Date"
                name="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={handleFormChange}
              />
            </div>

            <div className="flex justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingOrderId(null);
                  setFormData(initialFormData);
                }}
                className="px-4 sm:px-5 py-2 sm:py-2.5 text-gray-700 font-medium rounded-lg sm:rounded-xl border border-gray-300 hover:bg-gray-100 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateOrder}
                className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-4 sm:px-5 py-2 sm:py-2.5 font-medium rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
              >
                {editingOrderId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const KpiCard = ({ title, value, icon, danger = false, onClick, active }) => (
  <div
    onClick={onClick}
    className={`bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full cursor-pointer ${
      active ? "border-[#c62d23] ring-2 ring-[#c62d23]/20" : ""
    }`}
    style={{
      borderLeft: "4px solid #c62d23",
    }}
  >
    <div className="flex justify-between items-start mb-2 sm:mb-3 lg:mb-4">
      <p className="text-xs sm:text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 18, className: "sm:w-5 sm:h-5 lg:w-6 lg:h-6" })}
    </div>
    <p
      className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-1 ${danger ? "text-red-600" : "text-gray-900"}`}
    >
      {value}
    </p>
  </div>
);

const Input = ({ label, name, value, onChange, type = "text" }) => (
  <div>
    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
    />
  </div>
);