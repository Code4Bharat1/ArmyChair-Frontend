"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import CountUp from "react-countup";
import {
  Calendar, TrendingUp, Users, Package, X, ChevronDown, Menu,
  Armchair, Wrench, ShoppingCart, RotateCcw, ClipboardCheck,
  Activity, CheckCircle2, Clock, Box, AlertCircle,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
  Minus, Percent, Target, Warehouse, Briefcase, Star, User, Settings,
} from "lucide-react";
import Sidebar from "./sidebar";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, CartesianGrid, Line,
  AreaChart, Area,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL;
const BRAND = "#c62d23";
const COLORS = ["#c62d23", "#1f2937", "#4B5563", "#6B7280", "#9CA3AF", "#D1D5DB"];

/* ─── tiny helpers ─── */
const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) : "0.0");
const safe = (v) => (Array.isArray(v) ? v : []);

/* ════════════════════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [staff, setStaff] = useState([]);
  const [products, setProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [token, setToken] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const calendarRef = useRef(null);
  const [inwardFull, setInwardFull] = useState([]);
  const [inwardSpare, setInwardSpare] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("overview");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") setToken(localStorage.getItem("token"));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) setShowCalendar(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const from = new Date(new Date(selectedDate).setDate(1)).toISOString();
  const to = new Date(selectedDate).toISOString();

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [staffAnalyticsRes, allStaffRes, productsRes, inventoryRes, ordersRes, returnsRes, tasksRes] =
        await Promise.all([
          axios.get(`${API}/orders/analytics/staff`, { headers, params: { from, to } }),
          axios.get(`${API}/auth/staff`, { headers }),
          axios.get(`${API}/orders/analytics/products`, { headers, params: { from, to } }),
          axios.get(`${API}/inventory`, { headers }),
          axios.get(`${API}/orders`, { headers, params: { from, to } }),
          axios.get(`${API}/returns`, { headers, params: { from, to } }).catch(() => ({ data: { returns: [] } })),
          axios.get(`${API}/tasks/all`, { headers }).catch(() => ({ data: [] })),
        ]);

      const analyticsStaff = staffAnalyticsRes.data || [];
      const analyticsMap = analyticsStaff.reduce((acc, s) => {
        acc[s._id] = s.orders || 0;
        return acc;
      }, {});

      const mergedStaff = (allStaffRes.data || []).map((s) => ({
        ...s,
        orders: analyticsMap[s._id] || 0,
      }));

      const inventory = inventoryRes.data.inventory || [];
      setInwardFull(inventory.filter((x) => x.type === "FULL"));
      setInwardSpare(inventory.filter((x) => x.type === "SPARE"));
      setStaff(mergedStaff);
      setProducts(productsRes.data || []);
      setAllOrders(ordersRes.data.orders || []);
      setReturns(returnsRes.data.data || returnsRes.data.returns || []);
      setTasks(tasksRes.data || []);
    } catch (err) {
      console.error("Dashboard API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [token, selectedDate]);

  const navTabs = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "inventory", label: "Inventory", icon: Armchair },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "returns", label: "Returns", icon: RotateCcw },
    { id: "staff", label: "Staff", icon: Users },
    { id: "tasks", label: "Tasks", icon: ClipboardCheck },
  ];

  return (
    <div className="flex h-screen bg-[#f8f7f5]">
      {/* Sidebar */}
      <div className="hidden lg:block"><Sidebar /></div>
      {mobileMenuOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)} />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50"><Sidebar onClose={() => setMobileMenuOpen(false)} /></div>
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── HEADER ── */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="px-4 lg:px-6 pt-4 pb-0">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden text-gray-600 hover:text-[#c62d23] transition-colors p-1.5"
                >
                  <Menu size={22} />
                </button>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight">Analytics Dashboard</h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Real-time insights and performance metrics</p>
                </div>
              </div>

              {/* Date Picker */}
              <div className="relative" ref={calendarRef}>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 hover:border-[#c62d23] hover:shadow-sm transition-all text-sm"
                >
                  <Calendar size={16} className="text-[#c62d23]" />
                  <span className="font-medium text-gray-800 hidden sm:inline">
                    {new Date(selectedDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${showCalendar ? "rotate-180" : ""}`} />
                </button>
                {showCalendar && (
                  <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl">
                    <CalendarComponent
                      selectedDate={selectedDate}
                      onDateSelect={(d) => { setSelectedDate(d); setShowCalendar(false); }}
                      maxDate={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="flex gap-0 overflow-x-auto -mx-1">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                      activeView === tab.id
                        ? "border-[#c62d23] text-[#c62d23]"
                        : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 xl:p-8">
            {loading ? (
              <LoadingState />
            ) : (
              <>
                {activeView === "overview" && (
                  <OverviewAnalytics allOrders={allOrders} staff={staff} products={products} inwardFull={inwardFull} inwardSpare={inwardSpare} returns={returns} tasks={tasks} />
                )}
                {activeView === "inventory" && (
                  <InventoryAnalytics inwardFull={inwardFull} inwardSpare={inwardSpare} />
                )}
                {activeView === "orders" && <OrdersAnalytics allOrders={allOrders} />}
                {activeView === "returns" && <ReturnsAnalytics returns={returns} allOrders={allOrders} />}
                {activeView === "staff" && <StaffAnalytics staff={staff} allOrders={allOrders} />}
                {activeView === "tasks" && <TasksAnalytics tasks={tasks} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   OVERVIEW
════════════════════════════════════════════════════════ */
const OverviewAnalytics = ({ allOrders, staff, products, inwardFull, inwardSpare, returns, tasks }) => {
  const safeOrders = safe(allOrders);
  const safeStaff = safe(staff);
  const safeReturns = safe(returns);
  const safeTasks = safe(tasks);
  const safeInwardFull = safe(inwardFull);
  const safeInwardSpare = safe(inwardSpare);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const router = useRouter();

  const dispatched = safeOrders.filter((o) => o.progress === "DISPATCHED").length;
  const pending = safeOrders.filter((o) => o.progress !== "DISPATCHED").length;
  const totalOrders = safeOrders.length;
  const totalQty = safeOrders.reduce((s, o) => s + (o.quantity || 0), 0);
  const totalFullQty = safeInwardFull.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalSpareQty = safeInwardSpare.reduce((s, i) => s + (i.quantity || 0), 0);
  const activeStaff = safeStaff.filter((s) => s.orders > 0).length;
  const completedTasks = safeTasks.filter((t) => t.status === "Completed" || t.status === "COMPLETED").length;

  const staffChartData = safeStaff.slice(0, 6).map((s) => {
    const completed = safeOrders.filter((o) => o.assignedTo?._id === s._id && o.progress === "DISPATCHED").length;
    return {
      name: s.name?.split(" ")[0] || s.name,
      orders: s.orders,
      completed,
      pending: s.orders - completed,
    };
  });

  const productMap = safeOrders.reduce((acc, o) => {
    const k = o.chairModel || "Unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const topProducts = Object.entries(productMap)
    .map(([name, orders]) => ({ name, orders }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 6);

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard title="Total Orders" value={totalOrders} sub={`${totalQty} units`} icon={ShoppingCart} onClick={() => router.push("/superadmin/order")} />
        <MetricCard title="Inventory Items" value={safeInwardFull.length + safeInwardSpare.length} sub={`${totalFullQty + totalSpareQty} units`} icon={Box} />
        <MetricCard title="Completion Rate" value={`${pct(dispatched, totalOrders)}%`} sub={`${dispatched} dispatched`} icon={CheckCircle2} accent="text-green-600" />
        <MetricCard title="Return Rate" value={`${pct(safeReturns.length, totalOrders)}%`} sub={`${safeReturns.length} returns`} icon={RotateCcw} accent="text-amber-600" />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard title="Active Staff" value={activeStaff} sub={`of ${safeStaff.length} total`} icon={Users} />
        <MetricCard title="Tasks Done" value={completedTasks} sub={`of ${safeTasks.length} tasks`} icon={ClipboardCheck} accent="text-blue-600" />
        <MetricCard title="Products" value={safe(products).length} sub="unique SKUs" icon={Package} />
        <MetricCard
          title="Pending Orders"
          value={pending}
          sub="in progress"
          icon={Clock}
          accent="text-amber-600"
          onClick={() => setShowPendingModal(true)}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Staff Performance — Top 6">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={staffChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb" }} />
              <Legend />
              <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} name="Completed" stackId="a" />
              <Bar dataKey="pending" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Pending" stackId="a" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Products by Orders">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb" }} />
              <Bar dataKey="orders" fill={BRAND} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Order Status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={[
                  { name: "Dispatched", value: dispatched },
                  { name: "Pending", value: pending },
                ]}
                dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={52}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="text-center bg-green-50 rounded-xl py-3 border border-green-100">
              <p className="text-2xl font-bold text-green-600">{dispatched}</p>
              <p className="text-xs text-green-700 mt-0.5">Dispatched</p>
            </div>
            <div className="text-center bg-amber-50 rounded-xl py-3 border border-amber-100">
              <p className="text-2xl font-bold text-amber-600">{pending}</p>
              <p className="text-xs text-amber-700 mt-0.5">In Progress</p>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Inventory Breakdown">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={[
                  { name: "Full Chairs", value: safeInwardFull.length },
                  { name: "Spare Parts", value: safeInwardSpare.length },
                ]}
                dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={52}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                <Cell fill={BRAND} />
                <Cell fill="#1f2937" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="text-center bg-[#c62d23]/5 rounded-xl py-3 border border-[#c62d23]/15">
              <p className="text-2xl font-bold text-[#c62d23]">{totalFullQty}</p>
              <p className="text-xs text-gray-600 mt-0.5">{safeInwardFull.length} Chair Types</p>
            </div>
            <div className="text-center bg-gray-50 rounded-xl py-3 border border-gray-200">
              <p className="text-2xl font-bold text-gray-800">{totalSpareQty}</p>
              <p className="text-xs text-gray-600 mt-0.5">{safeInwardSpare.length} Spare Types</p>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Pending Orders Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-amber-500" />
                <h2 className="text-base font-bold text-gray-900">Pending Orders</h2>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">{pending}</span>
              </div>
              <button onClick={() => setShowPendingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {["Order ID", "Model", "Qty", "Assigned To", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {safeOrders.filter((o) => o.progress !== "DISPATCHED").map((order, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800 bg-gray-50">{order.orderId}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{order.chairModel}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{order.quantity}</td>
                      <td className="px-4 py-3 text-gray-600">{order.salesPerson?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                          {order.progress?.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   INVENTORY
════════════════════════════════════════════════════════ */
const InventoryAnalytics = ({ inwardFull, inwardSpare }) => {
  const safeInwardFull = safe(inwardFull);
  const safeInwardSpare = safe(inwardSpare);

  const totalFullQty = safeInwardFull.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalSpareQty = safeInwardSpare.reduce((s, i) => s + (i.quantity || 0), 0);
  const lowStockChairs = safeInwardFull.filter((i) => (i.quantity || 0) < 5);
  const lowStockSpares = safeInwardSpare.filter((i) => (i.quantity || 0) < 10);

  const chairData = Object.entries(
    safeInwardFull.reduce((acc, item) => {
      const k = item.chairType || "Unknown";
      if (!acc[k]) acc[k] = { quantity: 0, items: 0 };
      acc[k].quantity += item.quantity || 0;
      acc[k].items += 1;
      return acc;
    }, {})
  )
    .map(([name, d]) => ({ name, quantity: d.quantity, items: d.items }))
    .sort((a, b) => b.quantity - a.quantity);

  const locationData = Object.entries(
    safeInwardSpare.reduce((acc, item) => {
      const k = item.location || "Unknown";
      if (!acc[k]) acc[k] = { quantity: 0, items: 0 };
      acc[k].quantity += item.quantity || 0;
      acc[k].items += 1;
      return acc;
    }, {})
  )
    .map(([name, d]) => ({ name, quantity: d.quantity, items: d.items }))
    .sort((a, b) => b.quantity - a.quantity);

  const topSpares = safeInwardSpare
    .map((i) => ({ name: i.partName || "Unknown", quantity: i.quantity || 0, location: i.location || "—" }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard title="Total Items" value={safeInwardFull.length + safeInwardSpare.length} sub={`${totalFullQty + totalSpareQty} units`} icon={Package} />
        <MetricCard title="Full Chairs" value={safeInwardFull.length} sub={`${totalFullQty} units`} icon={Armchair} accent="text-[#c62d23]" />
        <MetricCard title="Spare Parts" value={safeInwardSpare.length} sub={`${totalSpareQty} units`} icon={Wrench} />
        <MetricCard title="Low Stock Alerts" value={lowStockChairs.length + lowStockSpares.length} sub="need restock" icon={AlertCircle} accent="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Chair Inventory by Type">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chairData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" angle={-35} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: "10px" }} />
              <Bar dataKey="quantity" fill={BRAND} radius={[6, 6, 0, 0]} name="Quantity" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Spare Parts by Location">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={locationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: "10px" }} />
              <Legend />
              <Bar dataKey="quantity" fill={BRAND} radius={[6, 6, 0, 0]} name="Quantity" />
              <Bar dataKey="items" fill="#1f2937" radius={[6, 6, 0, 0]} name="Types" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Spares */}
        <ChartCard title="Top Spare Parts by Stock" className="xl:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topSpares.map((spare, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{spare.name}</p>
                    <p className="text-xs text-gray-500 ml-2 shrink-0">{spare.location}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-[#c62d23] h-1.5 rounded-full"
                      style={{ width: `${topSpares[0].quantity > 0 ? (spare.quantity / topSpares[0].quantity) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <p className="text-base font-bold text-gray-900 shrink-0 ml-2">{spare.quantity}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Stock Health */}
        <ChartCard title="Stock Health">
          <div className="space-y-3">
            <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-900 text-sm">Adequate Stock</p>
                <p className="text-xs text-green-700 mt-0.5">Above minimum threshold</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {safeInwardFull.filter((i) => (i.quantity || 0) >= 5).length +
                    safeInwardSpare.filter((i) => (i.quantity || 0) >= 10).length}
                </p>
                <p className="text-xs text-green-700">items</p>
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-amber-900 text-sm">Low Stock</p>
                <p className="text-xs text-amber-700 mt-0.5">{lowStockChairs.length} chairs · {lowStockSpares.length} spares</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-600">{lowStockChairs.length + lowStockSpares.length}</p>
                <p className="text-xs text-amber-700">items</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                <p className="text-xs text-gray-500 mb-1">Avg Chair Stock</p>
                <p className="text-xl font-bold text-gray-900">
                  {safeInwardFull.length > 0 ? (totalFullQty / safeInwardFull.length).toFixed(1) : 0}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                <p className="text-xs text-gray-500 mb-1">Avg Spare Stock</p>
                <p className="text-xl font-bold text-gray-900">
                  {safeInwardSpare.length > 0 ? (totalSpareQty / safeInwardSpare.length).toFixed(1) : 0}
                </p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   ORDERS
════════════════════════════════════════════════════════ */
const OrdersAnalytics = ({ allOrders }) => {
  const safeOrders = safe(allOrders);
  const totalOrders = safeOrders.length;
  const dispatched = safeOrders.filter((o) => o.progress === "DISPATCHED").length;
  const pending = totalOrders - dispatched;
  const totalQty = safeOrders.reduce((s, o) => s + (o.quantity || 0), 0);
  const avgSize = totalOrders > 0 ? (totalQty / totalOrders).toFixed(1) : 0;

  const statusData = Object.entries(
    safeOrders.reduce((acc, o) => {
      const k = o.progress || "Unknown";
      if (!acc[k]) acc[k] = { count: 0, quantity: 0 };
      acc[k].count += 1;
      acc[k].quantity += o.quantity || 0;
      return acc;
    }, {})
  )
    .map(([name, d]) => ({ name: name.replace(/_/g, " "), orders: d.count, quantity: d.quantity }))
    .sort((a, b) => b.orders - a.orders);

  const productData = Object.entries(
    safeOrders.reduce((acc, o) => {
      const k = o.chairModel || "Unknown";
      if (!acc[k]) acc[k] = { orders: 0, quantity: 0 };
      acc[k].orders += 1;
      acc[k].quantity += o.quantity || 0;
      return acc;
    }, {})
  )
    .map(([name, d]) => ({ name, orders: d.orders, quantity: d.quantity, avg: (d.quantity / d.orders).toFixed(1) }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard title="Total Orders" value={totalOrders} sub={`${totalQty} units`} icon={ShoppingCart} />
        <MetricCard title="Avg Order Size" value={avgSize} sub="units per order" icon={Package} />
        <MetricCard title="Fulfillment Rate" value={`${pct(dispatched, totalOrders)}%`} sub={`${dispatched} completed`} icon={CheckCircle2} accent="text-green-600" />
        <MetricCard title="In Progress" value={pending} sub="orders pending" icon={Clock} accent="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Orders by Status">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: "10px" }} />
              <Bar dataKey="orders" fill={BRAND} radius={[6, 6, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Completion Breakdown">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={[{ name: "Dispatched", value: dispatched }, { name: "Pending", value: pending }]}
                dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={52}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                <Cell fill="#10b981" /><Cell fill="#f59e0b" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="text-center bg-green-50 rounded-xl py-3 border border-green-100">
              <p className="text-2xl font-bold text-green-600">{dispatched}</p>
              <p className="text-xs text-green-700 mt-0.5">Dispatched</p>
            </div>
            <div className="text-center bg-amber-50 rounded-xl py-3 border border-amber-100">
              <p className="text-2xl font-bold text-amber-600">{pending}</p>
              <p className="text-xs text-amber-700 mt-0.5">Pending</p>
            </div>
          </div>
        </ChartCard>

        {/* Product table */}
        <ChartCard title="Product Performance" className="xl:col-span-2">
          <div className="space-y-2">
            {productData.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[#c62d23] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                    <div
                      className="bg-[#c62d23] h-1.5 rounded-full"
                      style={{ width: `${productData[0].orders > 0 ? (p.orders / productData[0].orders) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-right shrink-0">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{p.orders}</p>
                    <p className="text-[10px] text-gray-400">orders</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{p.quantity}</p>
                    <p className="text-[10px] text-gray-400">units</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#c62d23]">{pct(p.orders, totalOrders)}%</p>
                    <p className="text-[10px] text-gray-400">share</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   RETURNS
════════════════════════════════════════════════════════ */
const ReturnsAnalytics = ({ returns, allOrders }) => {
  const safeReturns = safe(returns);
  const safeOrders = safe(allOrders);
  const totalReturns = safeReturns.length;
  const resolved = safeReturns.filter((r) => r.status === "Accepted").length;
const pending = safeReturns.filter((r) => r.status === "Pending").length;

  const reasonData = Object.entries(
    safeReturns.reduce((acc, r) => {
      const k = r.category || "Not Specified";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value, pct: pct(value, totalReturns) }))
    .sort((a, b) => b.value - a.value);

  const statusData = Object.entries(
    safeReturns.reduce((acc, r) => {
      const k = r.status || "Unknown";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard title="Total Returns" value={totalReturns} sub="items returned" icon={RotateCcw} accent="text-amber-600" />
        <MetricCard title="Return Rate" value={`${pct(totalReturns, safeOrders.length)}%`} sub="of total orders" icon={Percent} accent="text-amber-600" />
        <MetricCard title="Resolved" value={resolved} sub={`${pct(resolved, totalReturns)}% resolved`} icon={CheckCircle2} accent="text-green-600" />
        <MetricCard title="Pending" value={pending} sub="awaiting action" icon={Clock} accent="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Return Status">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} innerRadius={52}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Return Reasons">
          <div className="space-y-3 pt-1">
            {reasonData.map((r, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-800">{r.name}</span>
                  <span className="text-gray-500">{r.value} <span className="text-[#c62d23] font-semibold">({r.pct}%)</span></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-[#c62d23] h-2 rounded-full transition-all"
                    style={{ width: `${reasonData[0].value > 0 ? (r.value / reasonData[0].value) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {reasonData.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No return data available</p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   STAFF — Role Config
════════════════════════════════════════════════════════ */
const ROLE_CONFIG = {
  sales: {
    label: "Sales",
    icon: ShoppingCart,
    color: "#c62d23",
    bg: "bg-red-50",
    border: "border-red-200",
    description: "Customer orders & dispatch",
  },
  warehouse: {
    label: "Warehouse",
    icon: Warehouse,
    color: "#2563eb",
    bg: "bg-blue-50",
    border: "border-blue-200",
    description: "Inventory & stock management",
  },
  fitting: {
    label: "Fitting",
    icon: Wrench,
    color: "#16a34a",
    bg: "bg-green-50",
    border: "border-green-200",
    description: "Assembly & fitting work",
  },
  production: {
    label: "Production",
    icon: Settings,
    color: "#9333ea",
    bg: "bg-purple-50",
    border: "border-purple-200",
    description: "Manufacturing & production",
  },
  admin: {
    label: "Admin",
    icon: Briefcase,
    color: "#f59e0b",
    bg: "bg-amber-50",
    border: "border-amber-200",
    description: "Administrative oversight",
  },
  user: {
    label: "User",
    icon: User,
    color: "#64748b",
    bg: "bg-slate-50",
    border: "border-slate-200",
    description: "General users",
  },
};

const ROLE_ORDER = ["sales", "warehouse", "fitting", "production", "admin", "user"];

/* ════════════════════════════════════════════════════════
   STAFF
════════════════════════════════════════════════════════ */
const StaffAnalytics = ({ staff, allOrders }) => {
  const safeStaff = safe(staff);
  const safeOrders = safe(allOrders);
  const [selectedRole, setSelectedRole] = useState(null);
  const [expandedMember, setExpandedMember] = useState(null);

  /* ── Group staff by role ── */
  const byRole = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = safeStaff.filter((s) => s.role === role);
    return acc;
  }, {});

  /* ── Enrich staff with order metrics ── */
  const enrichStaff = (members) =>
    members.map((s) => {
      const myOrders = safeOrders.filter((o) => o.assignedTo?._id === s._id || o.salesPerson?._id === s._id);
      const completed = myOrders.filter((o) => o.progress === "DISPATCHED").length;
      const pending = myOrders.length - completed;
      const efficiency = myOrders.length > 0 ? parseFloat(((completed / myOrders.length) * 100).toFixed(1)) : 0;
      return { ...s, totalOrders: myOrders.length, completed, pending, efficiency };
    });

  const enrichedByRole = Object.fromEntries(
    ROLE_ORDER.map((role) => [role, enrichStaff(byRole[role])])
  );

  const totalStaff = safeStaff.length;
  const activeStaff = safeStaff.filter((s) => (s.orders || 0) > 0).length;

  /* ── Role summary cards data ── */
  const roleSummary = ROLE_ORDER.map((role) => {
    const members = enrichedByRole[role];
    const cfg = ROLE_CONFIG[role];
    const total = members.length;
    const active = members.filter((m) => m.totalOrders > 0).length;
    const totalOrders = members.reduce((s, m) => s + m.totalOrders, 0);
    const avgEfficiency =
      members.length > 0
        ? (members.reduce((s, m) => s + m.efficiency, 0) / members.length).toFixed(1)
        : 0;
    return { role, cfg, total, active, totalOrders, avgEfficiency, members };
  }).filter((r) => r.total > 0);

  /* ── Pie chart data ── */
  const pieData = roleSummary.map((r) => ({
    name: r.cfg.label,
    value: r.total,
    color: r.cfg.color,
  }));

  /* ── Bar chart across roles ── */
  const roleBarData = roleSummary.map((r) => ({
    name: r.cfg.label,
    Members: r.total,
    Active: r.active,
    Orders: r.totalOrders,
  }));

  const displayed = selectedRole ? enrichedByRole[selectedRole] : [];
  const displayedCfg = selectedRole ? ROLE_CONFIG[selectedRole] : null;

  return (
    <div className="space-y-5">
      {/* ── Top KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiCard label="Total Staff" value={totalStaff} sub="across all roles" icon={Users} />
        <KpiCard label="Active This Period" value={activeStaff} sub={`${pct(activeStaff, totalStaff)}% engagement`} icon={Activity} accent="text-green-600" />
        <KpiCard label="Roles Present" value={roleSummary.length} sub="of 6 role types" icon={Briefcase} accent="text-blue-600" />
        <KpiCard
          label="Avg Efficiency"
          value={`${(roleSummary.reduce((s, r) => s + parseFloat(r.avgEfficiency), 0) / (roleSummary.length || 1)).toFixed(1)}%`}
          sub="completion rate"
          icon={Target}
          accent="text-[#c62d23]"
          isText
        />
      </div>

      {/* ── Role summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {roleSummary.map(({ role, cfg, total, active, totalOrders, avgEfficiency }) => {
          const Icon = cfg.icon;
          const isSelected = selectedRole === role;
          return (
            <button
              key={role}
              onClick={() => setSelectedRole(isSelected ? null : role)}
              className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 hover:shadow-md ${
                isSelected ? "shadow-lg bg-white" : `${cfg.bg} ${cfg.border} hover:border-opacity-60`
              }`}
              style={isSelected ? { borderColor: cfg.color } : {}}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${cfg.color}18` }}>
                  <Icon size={20} style={{ color: cfg.color }} />
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                >
                  {total} {total === 1 ? "member" : "members"}
                </span>
              </div>

              <p className="font-bold text-gray-900 text-base mb-0.5">{cfg.label}</p>
              <p className="text-xs text-gray-500 mb-4">{cfg.description}</p>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-white rounded-xl border border-gray-100">
                  <p className="text-lg font-bold text-gray-900">{active}</p>
                  <p className="text-[10px] text-gray-400">Active</p>
                </div>
                <div className="text-center p-2 bg-white rounded-xl border border-gray-100">
                  <p className="text-lg font-bold text-gray-900">{totalOrders}</p>
                  <p className="text-[10px] text-gray-400">Orders</p>
                </div>
                <div className="text-center p-2 bg-white rounded-xl border border-gray-100">
                  <p className="text-lg font-bold" style={{ color: cfg.color }}>{avgEfficiency}%</p>
                  <p className="text-[10px] text-gray-400">Efficiency</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${avgEfficiency}%`, backgroundColor: cfg.color }}
                  />
                </div>
              </div>

              <p className="text-xs mt-2 font-medium flex items-center gap-1" style={{ color: cfg.color }}>
                {isSelected ? "▼ Collapse members" : "▶ View members"}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Role member drill-down ── */}
      {selectedRole && displayedCfg && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${displayedCfg.color}18` }}>
              {React.createElement(displayedCfg.icon, { size: 18, style: { color: displayedCfg.color } })}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{displayedCfg.label} Team</h3>
              <p className="text-xs text-gray-500">{displayed.length} members</p>
            </div>
          </div>

          <div className="space-y-3">
            {displayed.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">No members in this role</p>
            )}
            {displayed
              .sort((a, b) => b.totalOrders - a.totalOrders)
              .map((member, i) => {
                const isExpanded = expandedMember === member._id;
                return (
                  <div key={member._id} className="rounded-xl border border-gray-100 overflow-hidden transition-all duration-200">
                    <div
                      className="flex items-center gap-3 p-3.5 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedMember(isExpanded ? null : member._id)}
                    >
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: displayedCfg.color }}
                      >
                        {member.photo ? (
                          <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          member.name?.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                          {i === 0 && member.totalOrders > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                              <Star size={9} /> Top
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{member.email}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-center hidden sm:block">
                          <p className="text-sm font-bold text-gray-900">{member.totalOrders}</p>
                          <p className="text-[10px] text-gray-400">Orders</p>
                        </div>
                        <div className="text-center hidden sm:block">
                          <p className="text-sm font-bold text-green-600">{member.completed}</p>
                          <p className="text-[10px] text-gray-400">Done</p>
                        </div>
                        <div className="text-center hidden sm:block">
                          <p className="text-sm font-bold text-amber-500">{member.pending}</p>
                          <p className="text-[10px] text-gray-400">Pending</p>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            member.efficiency >= 70
                              ? "bg-green-100 text-green-700"
                              : member.efficiency >= 40
                              ? "bg-blue-100 text-blue-700"
                              : member.totalOrders === 0
                              ? "bg-gray-100 text-gray-400"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {member.totalOrders === 0 ? "No data" : `${member.efficiency}%`}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <InfoTile label="Mobile" value={member.mobile || "—"} />
                        <InfoTile
                          label="Date of Birth"
                          value={member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString("en-IN") : "—"}
                        />
                        <InfoTile label="Blood Group" value={member.bloodGroup || "—"} highlight />
                        <InfoTile
                          label="Joined"
                          value={member.createdAt ? new Date(member.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        />
                        <InfoTile label="Total Orders" value={member.totalOrders} isNumber />
                        <InfoTile label="Completed" value={member.completed} isNumber color="text-green-700" />
                        <InfoTile label="Pending" value={member.pending} isNumber color="text-amber-600" />
                        <InfoTile
                          label="Efficiency"
                          value={member.totalOrders > 0 ? `${member.efficiency}%` : "N/A"}
                          isNumber
                          color={member.efficiency >= 70 ? "text-green-700" : member.efficiency >= 40 ? "text-blue-700" : "text-amber-600"}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Team Distribution by Role">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={55}
                label={({ name, value }) => `${name} (${value})`}
                labelLine={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Members & Orders by Role">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={roleBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb" }} />
              <Legend />
              <Bar dataKey="Members" fill="#1f2937" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Active" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Orders" fill={BRAND} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg Efficiency by Role" className="xl:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {roleSummary.map(({ role, cfg, avgEfficiency, total, active, totalOrders }) => {
              const eff = parseFloat(avgEfficiency);
              return (
                <div key={role} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {React.createElement(cfg.icon, { size: 15, style: { color: cfg.color } })}
                      <p className="font-semibold text-gray-900 text-sm">{cfg.label}</p>
                    </div>
                    <span className="text-lg font-bold" style={{ color: cfg.color }}>{avgEfficiency}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${eff}%`, backgroundColor: cfg.color }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{total} members</span>
                    <span>{active} active</span>
                    <span>{totalOrders} orders</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   TASKS
════════════════════════════════════════════════════════ */
const TasksAnalytics = ({ tasks }) => {
  const safeTasks = safe(tasks);
  const router = useRouter();
  const totalTasks = safeTasks.length;
  const completed = safeTasks.filter((t) => t.status === "Completed" || t.status === "COMPLETED").length;
  const pending = safeTasks.filter((t) => t.status === "Pending" || t.status === "PENDING").length;
  const completionRate = pct(completed, totalTasks);

  const statusData = Object.entries(
    safeTasks.reduce((acc, t) => { const k = t.status || "Unknown"; acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const priorityData = Object.entries(
    safeTasks.reduce((acc, t) => { const k = t.priority || "MEDIUM"; acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  )
    .map(([name, value]) => ({
      name, value,
      color: name === "HIGH" ? BRAND : name === "MEDIUM" ? "#f59e0b" : "#6B7280",
    }))
    .sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (order[a.name] ?? 3) - (order[b.name] ?? 3);
    });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard title="Total Tasks" value={totalTasks} sub="all tasks" icon={ClipboardCheck} />
        <MetricCard title="Completed" value={completed} sub={`${completionRate}% done`} icon={CheckCircle2} accent="text-green-600" onClick={() => router.push("/superadmin/task")} />
        <MetricCard title="Pending" value={pending} sub="not started" icon={Clock} accent="text-amber-600" onClick={() => router.push("/superadmin/task")} />
        <MetricCard title="Completion Rate" value={`${completionRate}%`} sub="overall rate" icon={Activity} accent="text-blue-600" />
      </div>

      {/* Progress bar summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-gray-900">Overall Progress</p>
          <p className="text-sm font-bold text-[#c62d23]">{completionRate}%</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-[#c62d23] to-[#ff6b5b] h-3 rounded-full transition-all duration-700"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs text-gray-500">
          <span>{completed} completed</span>
          <span>{pending} pending</span>
          <span>{totalTasks} total</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="Task Status">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} innerRadius={52}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tasks by Priority">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: "10px" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
════════════════════════════════════════════════════════ */

const MetricCard = ({ title, value, sub, icon: Icon, accent = "text-gray-900", onClick, isText = false }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md ${
      onClick ? "cursor-pointer hover:border-[#c62d23]/40 active:scale-[0.98]" : ""
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="p-2 bg-[#c62d23]/8 rounded-xl">
        <Icon size={18} className="text-[#c62d23]" />
      </div>
    </div>
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{title}</p>
    <p className={`font-bold mb-1 ${accent} ${isText ? "text-xl leading-tight" : "text-2xl sm:text-3xl"}`}>
      {!isText && typeof value === "number" ? <CountUp end={value} duration={1.2} /> : value}
    </p>
    {sub && <p className="text-xs text-gray-400">{sub}</p>}
  </div>
);

const KpiCard = ({ label, value, sub, icon: Icon, accent = "text-gray-900", isText = false }) => (
  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div className="p-2 bg-[#c62d23]/8 rounded-xl">
        <Icon size={18} className="text-[#c62d23]" />
      </div>
    </div>
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
    <p className={`font-bold mb-1 ${accent} ${isText ? "text-xl leading-tight" : "text-2xl sm:text-3xl"}`}>
      {!isText && typeof value === "number" ? <CountUp end={value} duration={1.2} /> : value}
    </p>
    {sub && <p className="text-xs text-gray-400">{sub}</p>}
  </div>
);

const InfoTile = ({ label, value, isNumber = false, color = "text-gray-900", highlight = false }) => (
  <div className={`p-3 rounded-xl ${highlight ? "bg-red-50 border border-red-100" : "bg-white border border-gray-100"}`}>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
    <p className={`font-bold text-sm ${isNumber ? color : "text-gray-900"}`}>{value}</p>
  </div>
);

const ChartCard = ({ title, children, className = "" }) => (
  <div className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow ${className}`}>
    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">{title}</h3>
    {children}
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-gray-100 border-t-[#c62d23]" />
      <p className="mt-4 text-gray-500 text-sm">Loading analytics…</p>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════
   CALENDAR
════════════════════════════════════════════════════════ */
const CalendarComponent = ({ selectedDate, onDateSelect, maxDate }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(selectedDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const selectedDateObj = new Date(selectedDate);
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const daysOfWeek = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= lastDay; d++) days.push(new Date(year, month, d));
    return days;
  };

  const isDisabled = (date) => {
    if (!date) return true;
    const max = new Date(maxDate);
    max.setHours(23, 59, 59, 999);
    return date > max;
  };

  const isSelected = (date) =>
    date &&
    date.getDate() === selectedDateObj.getDate() &&
    date.getMonth() === selectedDateObj.getMonth() &&
    date.getFullYear() === selectedDateObj.getFullYear();

  const handleClick = (date) => {
    if (!date || isDisabled(date)) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    onDateSelect(`${y}-${m}-${d}`);
  };

  const navigate = (dir) =>
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="w-72 p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <p className="text-sm font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </p>
        <button onClick={() => navigate(1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {daysOfWeek.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((date, i) => {
          const disabled = isDisabled(date);
          const selected = isSelected(date);
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(date)}
              disabled={disabled}
              className={`aspect-square text-xs rounded-lg transition-all ${
                !date ? "invisible" :
                selected ? "bg-[#c62d23] text-white font-bold" :
                disabled ? "text-gray-300 cursor-not-allowed" :
                "hover:bg-gray-100 text-gray-700"
              }`}
            >
              {date?.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};