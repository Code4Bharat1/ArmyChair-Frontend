"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import CountUp from "react-countup";
import {
  Calendar,
  TrendingUp,
  Users,
  Package,
  Inbox,
  Send,
  X,
  ChevronDown,
  Menu,
  Armchair,
  Wrench,
  ShoppingCart,
  RotateCcw,
  ClipboardCheck,
  Activity,
  CheckCircle2,
  Clock,
  Box,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  DollarSign,
  Percent,
  Target,
} from "lucide-react";
import Sidebar from "./sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL;
const COLORS = [
  "#c62d23",
  "#000000",
  "#4B5563",
  "#6B7280",
  "#9CA3AF",
  "#D1D5DB",
];

export default function Dashboard() {
  const [staff, setStaff] = useState([]);
  const [products, setProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [token, setToken] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const calendarRef = useRef(null);
  const [inwardFull, setInwardFull] = useState([]);
  const [inwardSpare, setInwardSpare] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Active analytics view
  const [activeView, setActiveView] = useState("overview");

  useEffect(() => {
    if (typeof window !== "undefined") setToken(localStorage.getItem("token"));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const from = new Date(new Date(selectedDate).setDate(1)).toISOString();
  const to = new Date(selectedDate).toISOString();

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [
        staffRes,
        productsRes,
        inventoryRes,
        ordersRes,
        returnsRes,
        tasksRes,
      ] = await Promise.all([
        axios.get(`${API}/orders/analytics/staff`, {
          headers,
          params: { from, to },
        }),
        axios.get(`${API}/orders/analytics/products`, {
          headers,
          params: { from, to },
        }),
        axios.get(`${API}/inventory`, { headers }),
        axios.get(`${API}/orders`, {
          headers,
          params: { from, to },
        }),
        axios
          .get(`${API}/returns`, {
            headers,
            params: { from, to },
          })
          .catch(() => ({ data: { returns: [] } })),
        axios.get(`${API}/tasks/all`, { headers }).catch(() => ({ data: [] })),
      ]);

      const inventory = inventoryRes.data.inventory || [];
      setInwardFull(inventory.filter((x) => x.type === "FULL"));
      setInwardSpare(inventory.filter((x) => x.type === "SPARE"));
      setStaff(staffRes.data || []);
      setProducts(productsRes.data || []);
      setAllOrders(ordersRes.data.orders || []);
      setReturns(returnsRes.data.returns || returnsRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (err) {
      console.error("Dashboard API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [token, selectedDate]);

  const navigationButtons = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "inventory", label: "Inventory", icon: Armchair },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "returns", label: "Returns", icon: RotateCcw },
    { id: "staff", label: "Staff", icon: Users },
    { id: "tasks", label: "Tasks", icon: ClipboardCheck },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* MOBILE SIDEBAR */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50">
            <Sidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Title */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden text-gray-600 hover:text-[#c62d23] transition-colors"
                  aria-label="Toggle menu"
                >
                  <Menu size={24} />
                </button>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                    Analytics Dashboard
                  </h1>
                  <p className="text-sm text-gray-600 hidden sm:block">
                    Real-time insights and performance metrics
                  </p>
                </div>
              </div>

              {/* Right: Date Picker */}
              <div className="relative" ref={calendarRef}>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-gray-300 hover:border-[#c62d23] transition-colors"
                  aria-label="Select date"
                >
                  <Calendar size={18} className="text-[#c62d23]" />
                  <span className="text-sm font-medium text-gray-900 hidden sm:inline">
                    {new Date(selectedDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform ${showCalendar ? "rotate-180" : ""}`}
                  />
                </button>

                {showCalendar && (
                  <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl">
                    <CalendarComponent
                      selectedDate={selectedDate}
                      onDateSelect={(date) => {
                        setSelectedDate(date);
                        setShowCalendar(false);
                      }}
                      maxDate={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-4 border-b border-gray-200">
              <nav
                className="flex gap-1 overflow-x-auto"
                aria-label="Analytics sections"
              >
                {navigationButtons.map((btn) => {
                  const Icon = btn.icon;
                  return (
                    <button
                      key={btn.id}
                      onClick={() => setActiveView(btn.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeView === btn.id
                          ? "border-[#c62d23] text-[#c62d23]"
                          : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{btn.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-8">
            {loading ? (
              <LoadingState />
            ) : (
              <>
                {activeView === "overview" && (
                  <OverviewAnalytics
                    allOrders={allOrders}
                    staff={staff}
                    products={products}
                    inwardFull={inwardFull}
                    inwardSpare={inwardSpare}
                    returns={returns}
                    tasks={tasks}
                  />
                )}
                {activeView === "inventory" && (
                  <InventoryAnalytics
                    inwardFull={inwardFull}
                    inwardSpare={inwardSpare}
                  />
                )}
                {activeView === "orders" && (
                  <OrdersAnalytics allOrders={allOrders} />
                )}
                {activeView === "returns" && (
                  <ReturnsAnalytics returns={returns} allOrders={allOrders} />
                )}
                {activeView === "staff" && (
                  <StaffAnalytics staff={staff} allOrders={allOrders} />
                )}
                {activeView === "tasks" && <TasksAnalytics tasks={tasks} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== ANALYTICS VIEWS ==================== */

const OverviewAnalytics = ({
  allOrders,
  staff,
  products,
  inwardFull,
  inwardSpare,
  returns,
  tasks,
}) => {
  // Ensure all props are arrays
  const safeReturns = Array.isArray(returns) ? returns : [];
  const safeOrders = Array.isArray(allOrders) ? allOrders : [];
  const safeStaff = Array.isArray(staff) ? staff : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeInwardFull = Array.isArray(inwardFull) ? inwardFull : [];
  const safeInwardSpare = Array.isArray(inwardSpare) ? inwardSpare : [];
  const [showPendingModal, setShowPendingModal] = useState(false);
  const router = useRouter();

  const totalOrders = safeOrders.length;
  const totalInventory = safeInwardFull.length + safeInwardSpare.length;
  const dispatched = safeOrders.filter(
    (o) => o.progress === "DISPATCHED",
  ).length;

  const pending = safeOrders.filter((o) => o.progress !== "DISPATCHED").length;

  const completionRate =
    totalOrders > 0 ? ((dispatched / totalOrders) * 100).toFixed(1) : 0;

  const returnRate =
    totalOrders > 0 ? ((safeReturns.length / totalOrders) * 100).toFixed(1) : 0;

  // Calculate total quantities
  const totalOrderQuantity = safeOrders.reduce(
    (sum, o) => sum + (o.quantity || 0),
    0,
  );
  const totalFullQuantity = safeInwardFull.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0,
  );
  const totalSpareQuantity = safeInwardSpare.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0,
  );

  // Staff efficiency metrics
  const activeStaff = safeStaff.filter((s) => s.orders > 0).length;
  const avgOrdersPerStaff =
    activeStaff > 0 ? (totalOrders / activeStaff).toFixed(1) : 0;

  // Task completion
  const completedTasks = safeTasks.filter(
    (t) => t.status === "COMPLETED",
  ).length;
  const taskCompletionRate =
    safeTasks.length > 0
      ? ((completedTasks / safeTasks.length) * 100).toFixed(0)
      : 0;

  // Top performers
  const topStaff = safeStaff.slice(0, 5);
  const productCounts = safeOrders.reduce((acc, order) => {
    const name = order.chairModel || "Unknown";
    if (!acc[name]) acc[name] = 0;
    acc[name] += 1;
    return acc;
  }, {});

  const topProducts = Object.entries(productCounts)
    .map(([name, orders]) => ({ name, orders }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);

  // Performance comparison data
  const performanceData = topStaff.map((s) => {
    const staffOrders = safeOrders.filter((o) => o.assignedTo?._id === s._id);
    const completed = staffOrders.filter(
      (o) => o.progress === "DISPATCHED",
    ).length;
    const efficiency =
      s.orders > 0 ? ((completed / s.orders) * 100).toFixed(0) : 0;

    return {
      name: s.name,
      orders: s.orders,
      completed,
      pending: s.orders - completed,
      efficiency: parseInt(efficiency),
    };
  });

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Orders"
          value={totalOrders}
          subValue={`${totalOrderQuantity} units`}
          icon={ShoppingCart}
          onClick={() => router.push("/superadmin/order")}
        />

        <MetricCard
          title="Inventory Stock"
          value={totalInventory}
          subValue={`${totalFullQuantity + totalSpareQuantity} units`}
          icon={Box}
        />
        <MetricCard
          title="Order Completion"
          value={`${completionRate}%`}
          subValue={`${dispatched} dispatched`}
          icon={CheckCircle2}
          valueColor="text-green-600"
        />
        <MetricCard
          title="Return Rate"
          value={`${returnRate}%`}
          subValue={`${safeReturns.length} returns`}
          icon={RotateCcw}
          valueColor="text-amber-600"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Staff"
          value={activeStaff}
          icon={Users}
          badge={`${avgOrdersPerStaff} avg orders`}
        />
        <KpiCard
          title="Task Progress"
          value={`${taskCompletionRate}%`}
          icon={ClipboardCheck}
          badge={`${completedTasks}/${safeTasks.length}`}
        />
        <KpiCard
          title="Products Sold"
          value={safeProducts.length}
          icon={Package}
          badge="SKUs"
        />
        <KpiCard
          title="Pending Orders"
          value={pending}
          icon={Clock}
          badge="In progress"
          valueColor="text-amber-600"
          onClick={() => setShowPendingModal(true)}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Staff Performance Comparison */}
        <ChartCard title="Top 5 Staff Performance">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11 }}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="completed"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
                name="Completed"
              />
              <Bar
                yAxisId="left"
                dataKey="pending"
                fill="#f59e0b"
                radius={[8, 8, 0, 0]}
                name="Pending"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="efficiency"
                stroke="#c62d23"
                strokeWidth={2}
                name="Efficiency %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Product Performance with Trend */}
        <ChartCard title="Top 5 Products Performance">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topProducts} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="orders" fill="#c62d23" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Order Status Flow */}
        <ChartCard title="Order Status Distribution">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={[
                  { name: "Dispatched", value: dispatched, color: "#10b981" },
                  { name: "Pending", value: pending, color: "#f59e0b" },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {[
                  { name: "Dispatched", value: dispatched, color: "#10b981" },
                  { name: "Pending", value: pending, color: "#f59e0b" },
                ].map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{dispatched}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{pending}</p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
          </div>
        </ChartCard>

        {/* Inventory Breakdown */}
        <ChartCard title="Inventory Composition">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={[
                  { name: "Full Chairs", value: safeInwardFull.length },
                  { name: "Spare Parts", value: safeInwardSpare.length },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
              >
                <Cell fill="#c62d23" />
                <Cell fill="#000000" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#c62d23]">
                {totalFullQuantity}
              </p>
              <p className="text-sm text-gray-600">
                {safeInwardFull.length} Chair Items
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{totalSpareQuantity}</p>
              <p className="text-sm text-gray-600">
                {safeInwardSpare.length} Spare Items
              </p>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatCard
          title="Staff Efficiency"
          items={[
            { label: "Total Staff", value: safeStaff.length },
            { label: "Active Staff", value: activeStaff },
            { label: "Avg Orders/Staff", value: avgOrdersPerStaff },
          ]}
        />
        <StatCard
          title="Task Overview"
          items={[
            { label: "Total Tasks", value: safeTasks.length },
            { label: "Completed", value: completedTasks },
            { label: "Completion Rate", value: `${taskCompletionRate}%` },
          ]}
        />
        <StatCard
          title="Returns Overview"
          items={[
            { label: "Total Returns", value: safeReturns.length },
            { label: "Return Rate", value: `${returnRate}%` },
            {
              label: "Resolved",
              value: safeReturns.filter((r) => r.status === "RESOLVED").length,
            },
          ]}
        />
      </div>
      {showPendingModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-gray-200 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Pending Orders</h2>
              <button
                onClick={() => setShowPendingModal(false)}
                className="text-gray-500 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Order ID
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Model
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Quantity
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Assigned
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {safeOrders
                  .filter((o) => o.progress !== "DISPATCHED")
                  .map((order, i) => (
                    <tr
                      key={i}
                      className="border-b hover:bg-gray-100 transition-colors"
                    >
                      <td className="p-2">{order.orderId}</td>

                      <td className="p-2">{order.chairModel}</td>
                      <td className="p-2">{order.quantity}</td>
                      <td className="p-2">{order.salesPerson?.name || "—"}</td>
                      <td className="p-2 text-amber-600 font-medium">
                        {order.progress}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const InventoryAnalytics = ({ inwardFull, inwardSpare }) => {
  // Ensure arrays are valid
  const safeInwardFull = Array.isArray(inwardFull) ? inwardFull : [];
  const safeInwardSpare = Array.isArray(inwardSpare) ? inwardSpare : [];

  const totalFullQuantity = safeInwardFull.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0,
  );
  const totalSpareQuantity = safeInwardSpare.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0,
  );

  // Chair analysis by type
  const chairsByType = safeInwardFull.reduce((acc, item) => {
    const type = item.chairType || "Unknown";
    if (!acc[type]) {
      acc[type] = { quantity: 0, items: 0, avgQuantity: 0 };
    }
    acc[type].quantity += item.quantity || 0;
    acc[type].items += 1;
    return acc;
  }, {});

  const chairData = Object.entries(chairsByType)
    .map(([name, data]) => ({
      name,
      quantity: data.quantity,
      items: data.items,
      avgQuantity: (data.quantity / data.items).toFixed(1),
    }))
    .sort((a, b) => b.quantity - a.quantity);

  // Spare parts analysis
  const sparesByLocation = safeInwardSpare.reduce((acc, item) => {
    const location = item.location || "Unknown";
    if (!acc[location]) {
      acc[location] = { quantity: 0, items: 0 };
    }
    acc[location].quantity += item.quantity || 0;
    acc[location].items += 1;
    return acc;
  }, {});

  const locationData = Object.entries(sparesByLocation)
    .map(([name, data]) => ({
      name,
      quantity: data.quantity,
      items: data.items,
    }))
    .sort((a, b) => b.quantity - a.quantity);

  // Top spares
  const topSpares = safeInwardSpare
    .map((item) => ({
      name: item.partName || "Unknown",
      quantity: item.quantity || 0,
      location: item.location || "—",
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Stock levels analysis
  const lowStockChairs = safeInwardFull.filter(
    (item) => (item.quantity || 0) < 5,
  );
  const lowStockSpares = safeInwardSpare.filter(
    (item) => (item.quantity || 0) < 10,
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Inventory"
          value={safeInwardFull.length + safeInwardSpare.length}
          subValue={`${totalFullQuantity + totalSpareQuantity} units`}
          icon={Package}
        />
        <MetricCard
          title="Full Chairs"
          value={safeInwardFull.length}
          subValue={`${totalFullQuantity} units`}
          icon={Armchair}
          valueColor="text-[#c62d23]"
        />
        <MetricCard
          title="Spare Parts"
          value={safeInwardSpare.length}
          subValue={`${totalSpareQuantity} units`}
          icon={Wrench}
        />
        <MetricCard
          title="Low Stock Alerts"
          value={lowStockChairs.length + lowStockSpares.length}
          subValue="Items need restock"
          icon={AlertCircle}
          valueColor="text-amber-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chair Type Analysis */}
        <ChartCard title="Chair Inventory by Type">
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chairData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11 }}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="quantity"
                fill="#c62d23"
                radius={[8, 8, 0, 0]}
                name="Total Quantity"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="items"
                stroke="#000000"
                strokeWidth={2}
                name="Item Count"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Spare Parts Distribution */}
        <ChartCard title="Spare Parts by Location">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={locationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="quantity"
                fill="#c62d23"
                radius={[8, 8, 0, 0]}
                name="Quantity"
              />
              <Bar
                dataKey="items"
                fill="#000000"
                radius={[8, 8, 0, 0]}
                name="Items"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top 10 Spare Parts */}
        <ChartCard
          title="Top 10 Spare Parts by Stock"
          className="xl:col-span-2"
        >
          <div className="space-y-3">
            {topSpares.map((spare, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {spare.name}
                    </span>
                    <span className="text-sm text-gray-600">
                      {spare.location}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#c62d23] h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min((spare.quantity / topSpares[0].quantity) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {spare.quantity}
                  </p>
                  <p className="text-xs text-gray-600">units</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Stock Health */}
        <ChartCard title="Inventory Health Overview">
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-green-900">
                  Adequate Stock
                </span>
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {safeInwardFull.filter((i) => (i.quantity || 0) >= 5).length +
                  safeInwardSpare.filter((i) => (i.quantity || 0) >= 10).length}
              </p>
              <p className="text-sm text-green-700 mt-1">Items well-stocked</p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-amber-900">
                  Low Stock Alert
                </span>
                <AlertCircle size={20} className="text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {lowStockChairs.length + lowStockSpares.length}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {lowStockChairs.length} chairs, {lowStockSpares.length} spares
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Avg Chair Stock</p>
                <p className="text-xl font-bold text-gray-900">
                  {safeInwardFull.length > 0
                    ? (totalFullQuantity / safeInwardFull.length).toFixed(1)
                    : 0}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Avg Spare Stock</p>
                <p className="text-xl font-bold text-gray-900">
                  {safeInwardSpare.length > 0
                    ? (totalSpareQuantity / safeInwardSpare.length).toFixed(1)
                    : 0}
                </p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

const OrdersAnalytics = ({ allOrders }) => {
  // Ensure array is valid
  const safeOrders = Array.isArray(allOrders) ? allOrders : [];

  const totalOrders = safeOrders.length;

  const dispatched = safeOrders.filter(
    (o) => o.progress === "DISPATCHED",
  ).length;

  const pending = safeOrders.filter((o) => o.progress !== "DISPATCHED").length;

  const fulfillmentRate =
    totalOrders > 0 ? ((dispatched / totalOrders) * 100).toFixed(1) : 0;

  const totalQuantity = safeOrders.reduce(
    (sum, o) => sum + (o.quantity || 0),
    0,
  );
  const avgOrderSize =
    totalOrders > 0 ? (totalQuantity / totalOrders).toFixed(1) : 0;

  // Order status detailed breakdown
  const statusCounts = safeOrders.reduce((acc, order) => {
    const status = order.progress || "Unknown";
    if (!acc[status]) {
      acc[status] = { count: 0, quantity: 0 };
    }
    acc[status].count += 1;
    acc[status].quantity += order.quantity || 0;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts)
    .map(([name, data]) => ({
      name,
      orders: data.count,
      quantity: data.quantity,
    }))
    .sort((a, b) => b.orders - a.orders);

  // Product performance
  const productCounts = safeOrders.reduce((acc, order) => {
    const product = order.chairModel || "Unknown";
    if (!acc[product]) {
      acc[product] = { orders: 0, quantity: 0, revenue: 0 };
    }
    acc[product].orders += 1;
    acc[product].quantity += order.quantity || 0;
    return acc;
  }, {});

  const productData = Object.entries(productCounts)
    .map(([name, data]) => ({
      name,
      orders: data.orders,
      quantity: data.quantity,
      avgSize: (data.quantity / data.orders).toFixed(1),
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Orders"
          value={totalOrders}
          subValue={`${totalQuantity} units`}
          icon={ShoppingCart}
        />
        <MetricCard
          title="Avg Order Size"
          value={avgOrderSize}
          subValue="units per order"
          icon={Package}
        />
        <MetricCard
          title="Fulfillment Rate"
          value={`${fulfillmentRate}%`}
          subValue={`${dispatched} completed`}
          icon={CheckCircle2}
          valueColor="text-green-600"
          trend={{ value: fulfillmentRate }}
        />
        <MetricCard
          title="In Progress"
          value={pending}
          subValue="orders pending"
          icon={Clock}
          valueColor="text-amber-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Order Status Funnel */}
        <ChartCard title="Order Status Breakdown">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="orders"
                fill="#c62d23"
                radius={[8, 8, 0, 0]}
                name="Order Count"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="quantity"
                stroke="#000000"
                strokeWidth={2}
                name="Total Units"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Completion Progress */}
        <ChartCard title="Order Completion Status">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={[
                  { name: "Dispatched", value: dispatched },
                  { name: "Pending", value: pending },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
              >
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-around">
            <div className="text-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{dispatched}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="text-center">
              <div className="w-4 h-4 bg-amber-500 rounded-full mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-600">{pending}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>
        </ChartCard>

        {/* Top Products by Orders */}
        <ChartCard title="Top 10 Products - Order Volume">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={productData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="orders" fill="#c62d23" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Products by Quantity */}
        <ChartCard title="Top 10 Products - Total Units">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={productData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="quantity" fill="#000000" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Product Performance Details */}
        <ChartCard
          title="Product Performance Analysis"
          className="xl:col-span-2"
        >
          <div className="space-y-3">
            {productData.slice(0, 8).map((product, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-10 h-10 rounded-lg bg-[#c62d23] text-white flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{product.name}</p>
                  <div className="flex gap-4 mt-1">
                    <span className="text-sm text-gray-600">
                      Orders:{" "}
                      <span className="font-medium text-gray-900">
                        {product.orders}
                      </span>
                    </span>
                    <span className="text-sm text-gray-600">
                      Units:{" "}
                      <span className="font-medium text-gray-900">
                        {product.quantity}
                      </span>
                    </span>
                    <span className="text-sm text-gray-600">
                      Avg:{" "}
                      <span className="font-medium text-gray-900">
                        {product.avgSize}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 bg-white rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600">Share</p>
                    <p className="text-sm font-bold text-[#c62d23]">
                      {((product.orders / totalOrders) * 100).toFixed(1)}%
                    </p>
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

const ReturnsAnalytics = ({ returns, allOrders }) => {
  // Ensure arrays are valid
  const safeReturns = Array.isArray(returns) ? returns : [];
  const safeOrders = Array.isArray(allOrders) ? allOrders : [];

  const totalReturns = safeReturns.length;
  const returnRate =
    safeOrders.length > 0
      ? ((totalReturns / safeOrders.length) * 100).toFixed(1)
      : 0;
  const resolved = safeReturns.filter((r) => r.status === "RESOLVED").length;
  const pending = safeReturns.filter((r) => r.status === "PENDING").length;
  const resolutionRate =
    totalReturns > 0 ? ((resolved / totalReturns) * 100).toFixed(1) : 0;

  // Status breakdown
  const statusCounts = safeReturns.reduce((acc, ret) => {
    const status = ret.status || "Unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // Reason analysis
  const reasonCounts = safeReturns.reduce((acc, ret) => {
    const reason = ret.reason || "Not Specified";
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  const reasonData = Object.entries(reasonCounts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: ((value / totalReturns) * 100).toFixed(1),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Returns"
          value={totalReturns}
          subValue="items returned"
          icon={RotateCcw}
          valueColor="text-amber-600"
        />
        <MetricCard
          title="Return Rate"
          value={`${returnRate}%`}
          subValue="of total orders"
          icon={Percent}
          valueColor="text-amber-600"
        />
        <MetricCard
          title="Resolution Rate"
          value={`${resolutionRate}%`}
          subValue={`${resolved} resolved`}
          icon={CheckCircle2}
          valueColor="text-green-600"
        />
        <MetricCard
          title="Pending Returns"
          value={pending}
          subValue="awaiting action"
          icon={Clock}
          valueColor="text-amber-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Return Status */}
        <ChartCard title="Return Status Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Return Reasons */}
        <ChartCard title="Top Return Reasons">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reasonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11 }}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#c62d23" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Reason Details */}
        <ChartCard title="Return Reason Analysis" className="xl:col-span-2">
          <div className="space-y-3">
            {reasonData.map((reason, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#c62d23] to-[#a02419] text-white flex items-center justify-center font-bold shadow-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {reason.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#c62d23]">
                        {reason.percentage}%
                      </span>
                      <span className="text-sm text-gray-600">
                        ({reason.value} returns)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-[#c62d23] to-[#a02419] h-2.5 rounded-full transition-all"
                      style={{
                        width: `${(reason.value / reasonData[0].value) * 100}%`,
                      }}
                    />
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

const StaffAnalytics = ({ staff, allOrders }) => {
  // Ensure arrays are valid
  const safeStaff = Array.isArray(staff) ? staff : [];
  const safeOrders = Array.isArray(allOrders) ? allOrders : [];

  const totalStaff = safeStaff.length;
  const activeStaff = safeStaff.filter((s) => s.orders > 0).length;
  const topPerformer = safeStaff[0]?.name || "—";
  const avgOrders =
    activeStaff > 0
      ? (safeStaff.reduce((sum, s) => sum + s.orders, 0) / activeStaff).toFixed(
          1,
        )
      : 0;

  // Calculate detailed metrics
  const staffMetrics = safeStaff
    .map((s) => {
      const staffOrders = safeOrders.filter((o) => o.assignedTo?._id === s._id);
      const completed = staffOrders.filter(
        (o) => o.progress === "DISPATCHED",
      ).length;
      const pending = staffOrders.filter(
        (o) => o.progress !== "DISPATCHED",
      ).length;
      const efficiency = s.orders > 0 ? (completed / s.orders) * 100 : 0;

      return {
        name: s.name,
        totalOrders: s.orders,
        completed,
        pending,
        efficiency: parseFloat(efficiency.toFixed(1)),
        completionRate:
          s.orders > 0 ? ((completed / s.orders) * 100).toFixed(0) : 0,
      };
    })
    .sort((a, b) => b.totalOrders - a.totalOrders);

  // Performance tiers
  const topPerformers = staffMetrics.filter((s) => s.efficiency >= 70);
  const midPerformers = staffMetrics.filter(
    (s) => s.efficiency >= 40 && s.efficiency < 70,
  );
  const needsSupport = staffMetrics.filter(
    (s) => s.efficiency < 40 && s.totalOrders > 0,
  );

  // Radar chart data for top 5 staff
  const radarData = staffMetrics.slice(0, 5).map((s) => ({
    staff: s.name,
    "Total Orders": Math.min(s.totalOrders / 10, 10), // Normalize to 0-10 scale
    Completion: s.efficiency / 10,
    Efficiency: s.efficiency / 10,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Staff"
          value={totalStaff}
          subValue={`${activeStaff} active`}
          icon={Users}
        />
        <MetricCard
          title="Top Performer"
          value={topPerformer}
          subValue={`${safeStaff[0]?.orders || 0} orders`}
          icon={Target}
          valueColor="text-[#c62d23]"
        />
        <MetricCard
          title="Avg Performance"
          value={avgOrders}
          subValue="orders per staff"
          icon={Activity}
        />
        <MetricCard
          title="High Performers"
          value={topPerformers.length}
          subValue="≥70% efficiency"
          icon={CheckCircle2}
          valueColor="text-green-600"
        />
      </div>

      {/* Performance Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-900">Top Performers</h3>
            <div className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
              {topPerformers.length}
            </div>
          </div>
          <p className="text-sm text-green-700">≥70% completion rate</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {topPerformers.reduce((sum, s) => sum + s.totalOrders, 0)}
          </p>
          <p className="text-sm text-green-700">Total orders handled</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-blue-900">Mid Performers</h3>
            <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
              {midPerformers.length}
            </div>
          </div>
          <p className="text-sm text-blue-700">40-70% completion rate</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {midPerformers.reduce((sum, s) => sum + s.totalOrders, 0)}
          </p>
          <p className="text-sm text-blue-700">Total orders handled</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-amber-900">Needs Support</h3>
            <div className="px-3 py-1 bg-amber-600 text-white rounded-full text-sm font-bold">
              {needsSupport.length}
            </div>
          </div>
          <p className="text-sm text-amber-700">&lt;40% completion rate</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {needsSupport.reduce((sum, s) => sum + s.totalOrders, 0)}
          </p>
          <p className="text-sm text-amber-700">Total orders handled</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Staff Performance Comparison */}
        <ChartCard title="Staff Performance Overview">
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={staffMetrics.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11 }}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="completed"
                stackId="a"
                fill="#10b981"
                radius={[0, 0, 0, 0]}
                name="Completed"
              />
              <Bar
                yAxisId="left"
                dataKey="pending"
                stackId="a"
                fill="#f59e0b"
                radius={[8, 8, 0, 0]}
                name="Pending"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="efficiency"
                stroke="#c62d23"
                strokeWidth={3}
                name="Efficiency %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Order Distribution */}
        <ChartCard title="Work Distribution">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={staffMetrics.slice(0, 8)}
                dataKey="totalOrders"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) =>
                  `${name.split(" ")[0]} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {staffMetrics.slice(0, 8).map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Staff Leaderboard */}
        <ChartCard title="Staff Leaderboard" className="xl:col-span-2">
          <div className="space-y-3">
            {staffMetrics.slice(0, 10).map((staff, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0
                      ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg"
                      : index === 1
                        ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md"
                        : index === 2
                          ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {index + 1}
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-lg">
                    {staff.name}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600">
                      Total:{" "}
                      <span className="font-semibold text-gray-900">
                        {staff.totalOrders}
                      </span>
                    </span>
                    <span className="text-sm text-gray-600">
                      Completed:{" "}
                      <span className="font-semibold text-green-600">
                        {staff.completed}
                      </span>
                    </span>
                    <span className="text-sm text-gray-600">
                      Pending:{" "}
                      <span className="font-semibold text-amber-600">
                        {staff.pending}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#c62d23]">
                      {staff.efficiency}%
                    </p>
                    <p className="text-xs text-gray-600">Efficiency</p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      staff.efficiency >= 70
                        ? "bg-green-100 text-green-700"
                        : staff.efficiency >= 40
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {staff.efficiency >= 70
                      ? "Excellent"
                      : staff.efficiency >= 40
                        ? "Good"
                        : "Needs Improvement"}
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

const TasksAnalytics = ({ tasks }) => {
  // Ensure array is valid
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const router = useRouter();

  const totalTasks = safeTasks.length;
  const completed = safeTasks.filter((t) => t.status === "Completed").length;
  const pending = safeTasks.filter((t) => t.status === "Pending").length;
  const inProgress = 0; // not supported in backend
  const completionRate =
    totalTasks > 0 ? ((completed / totalTasks) * 100).toFixed(0) : 0;

  // Status breakdown
  const statusCounts = safeTasks.reduce((acc, task) => {
    const status = task.status || "Unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: ((value / totalTasks) * 100).toFixed(1),
    }))
    .sort((a, b) => b.value - a.value);

  // Priority breakdown
  const priorityCounts = safeTasks.reduce((acc, task) => {
    const priority = task.priority || "MEDIUM";
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  const priorityData = Object.entries(priorityCounts)
    .map(([name, value]) => ({
      name,
      value,
      color:
        name === "HIGH" ? "#c62d23" : name === "MEDIUM" ? "#f59e0b" : "#6B7280",
    }))
    .sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (order[a.name] || 3) - (order[b.name] || 3);
    });

  // Task progress metrics
  const progressMetrics = [
    { name: "Completed", value: completed, color: "#10b981" },
    { name: "In Progress", value: inProgress, color: "#3b82f6" },
    { name: "Pending", value: pending, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Tasks"
          value={totalTasks}
          subValue="all tasks"
          icon={ClipboardCheck}
        />
        <MetricCard
          title="Completed"
          value={completed}
          subValue={`${completionRate}% done`}
          icon={CheckCircle2}
          valueColor="text-green-600"
          trend={{ value: completionRate }}
          onClick={() => router.push("/superadmin/task")}
        />
        <MetricCard
          title="In Progress"
          value={inProgress}
          subValue="active tasks"
          icon={Activity}
          valueColor="text-blue-600"
        />
        <MetricCard
          title="Pending"
          value={pending}
          subValue="not started"
          icon={Clock}
          valueColor="text-amber-600"
          onClick={() => router.push("/superadmin/task")}
        />
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {progressMetrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{metric.name}</h3>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: metric.color }}
              />
            </div>
            <p
              className="text-4xl font-bold mb-2"
              style={{ color: metric.color }}
            >
              {metric.value}
            </p>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${totalTasks > 0 ? (metric.value / totalTasks) * 100 : 0}%`,
                  backgroundColor: metric.color,
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {totalTasks > 0
                ? ((metric.value / totalTasks) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <ChartCard title="Task Status Breakdown">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
                label={({ name, percentage }) => `${name} (${percentage}%)`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Priority Distribution */}
        <ChartCard title="Tasks by Priority">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {priorityData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Completion Progress */}
        <ChartCard title="Task Completion Progress" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={progressMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#c62d23"
                fill="#c62d23"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-6 flex justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {completionRate}%
              </p>
              <p className="text-sm text-gray-600 mt-1">Completion Rate</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {totalTasks > 0
                  ? ((inProgress / totalTasks) * 100).toFixed(0)
                  : 0}
                %
              </p>
              <p className="text-sm text-gray-600 mt-1">In Progress</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">
                {totalTasks > 0 ? ((pending / totalTasks) * 100).toFixed(0) : 0}
                %
              </p>
              <p className="text-sm text-gray-600 mt-1">Not Started</p>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

/* ==================== REUSABLE COMPONENTS ==================== */

const MetricCard = ({
  title,
  value,
  subValue,
  icon: Icon,
  valueColor = "text-gray-900",
  trend,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow ${
      onClick ? "cursor-pointer hover:border-[#c62d23]" : ""
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="p-2.5 bg-gray-50 rounded-lg">
        <Icon size={22} className="text-[#c62d23]" />
      </div>

      {trend && (
        <div className="flex items-center gap-1 text-sm">
          {trend.value >= 60 ? (
            <ArrowUpRight size={16} className="text-green-600" />
          ) : trend.value >= 30 ? (
            <Minus size={16} className="text-amber-600" />
          ) : (
            <ArrowDownRight size={16} className="text-red-600" />
          )}
          <span
            className={`font-semibold ${
              trend.value >= 60
                ? "text-green-600"
                : trend.value >= 30
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {trend.isCount ? trend.value : `${trend.value}%`}
          </span>
        </div>
      )}
    </div>

    <p className="text-sm text-gray-600 mb-1">{title}</p>

    <p className={`text-3xl font-bold ${valueColor} mb-1`}>
      {typeof value === "number" ? (
        <CountUp end={value} duration={1.5} />
      ) : (
        value
      )}
    </p>

    {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
  </div>
);

const KpiCard = ({
  title,
  value,
  icon: Icon,
  badge,
  valueColor = "text-gray-900",
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow ${
      onClick ? "cursor-pointer hover:border-[#c62d23]" : ""
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="p-2 bg-gray-50 rounded-lg">
        <Icon size={20} className="text-[#c62d23]" />
      </div>

      {badge && (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
          {badge}
        </span>
      )}
    </div>

    <p className="text-sm text-gray-600 mb-1">{title}</p>

    <p className={`text-2xl lg:text-3xl font-bold ${valueColor}`}>
      {typeof value === "number" ? (
        <CountUp end={value} duration={1.5} />
      ) : (
        value
      )}
    </p>
  </div>
);

const ChartCard = ({ title, children, className = "" }) => (
  <div
    className={`bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow ${className}`}
  >
    <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">
      {title}
    </h3>
    {children}
  </div>
);

const StatCard = ({ title, items }) => (
  <div className="bg-white rounded-lg p-6 border border-gray-200">
    <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{item.label}</span>
          <span className="text-lg font-bold text-gray-900">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#c62d23]" />
      <p className="mt-4 text-gray-600">Loading analytics...</p>
    </div>
  </div>
);

const CalendarComponent = ({ selectedDate, onDateSelect, maxDate }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const selectedDateObj = new Date(selectedDate);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const isDateDisabled = (date) => {
    if (!date) return true;
    const maxDateObj = new Date(maxDate);
    maxDateObj.setHours(23, 59, 59, 999);
    return date > maxDateObj;
  };

  const isDateSelected = (date) => {
    if (!date) return false;
    return (
      date.getDate() === selectedDateObj.getDate() &&
      date.getMonth() === selectedDateObj.getMonth() &&
      date.getFullYear() === selectedDateObj.getFullYear()
    );
  };

  const handleDateClick = (date) => {
    if (!date || isDateDisabled(date)) return;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    onDateSelect(`${year}-${month}-${day}`);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="w-80 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-base font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 p-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const isDisabled = isDateDisabled(date);
          const isSelected = isDateSelected(date);
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={isDisabled}
              className={`aspect-square p-2 text-sm rounded-lg transition-all ${
                !date
                  ? "invisible"
                  : isSelected
                    ? "bg-[#c62d23] text-white font-semibold"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "hover:bg-gray-100 cursor-pointer"
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
