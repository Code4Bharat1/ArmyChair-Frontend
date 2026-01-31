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
  ArrowRight,
  ChevronDown,
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
} from "recharts";

const isDelayed = (order) => {
  const created = new Date(order.createdAt);
  const days = (Date.now() - created) / (1000 * 60 * 60 * 24);
  return days > 4 && order.progress !== "DISPATCHED";
};

const getStatusClass = (status) => {
  if (status === "DISPATCHED") return "bg-green-100 text-green-800";
  if (status === "ORDER_PLACED") return "bg-yellow-100 text-yellow-800";
  if (status.includes("WAREHOUSE")) return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-700";
};

const API = process.env.NEXT_PUBLIC_API_URL;
const COLORS = [
  "#000000", // Black
  "#c62d23", // Your custom red accent
  "#4B5563", // Gray-600 for depth
  "#6B7280", // Gray-500
  "#9CA3AF", // Gray-400
  "#D1D5DB", // Gray-300
];

export default function Dashboard() {
  const [staff, setStaff] = useState([]);
  const [products, setProducts] = useState([]);
  const [productType, setProductType] = useState("ALL"); // ALL | FULL | SPARE
  const [allOrders, setAllOrders] = useState([]);
  const [token, setToken] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);
  const [inward, setInward] = useState([]);
  const [inwardFull, setInwardFull] = useState([]);
  const [inwardSpare, setInwardSpare] = useState([]);
  const [inventoryTab, setInventoryTab] = useState("FULL");

  const [outward, setOutward] = useState([]);
  const [view, setView] = useState(null); // inward | outward
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffOrders, setStaffOrders] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setToken(localStorage.getItem("token"));
  }, []);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fullSet = useMemo(
    () => new Set(inwardFull.map((i) => i.chairType)),
    [inwardFull],
  );

  const spareSet = useMemo(
    () => new Set(inwardSpare.map((i) => i.partName)),
    [inwardSpare],
  );

  const filteredProducts = useMemo(() => {
    if (productType === "ALL") return products;

    if (productType === "FULL") {
      return products.filter((p) => fullSet.has(p.name));
    }

    if (productType === "SPARE") {
      return products.filter((p) => spareSet.has(p.name));
    }

    return products;
  }, [products, productType, fullSet, spareSet]);

  const from = new Date(new Date(selectedDate).setDate(1)).toISOString();
  const to = new Date(selectedDate).toISOString();

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const s = await axios.get(`${API}/orders/analytics/staff`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { from, to },
      });

      const p = await axios.get(`${API}/orders/analytics/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { from, to },
      });

      const i = await axios.get(`${API}/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const o = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { from, to }, // remove progress filter
      });

      const inventory = i.data.inventory || [];

      setInwardFull(inventory.filter((x) => x.type === "FULL"));
      setInwardSpare(inventory.filter((x) => x.type === "SPARE"));

      setStaff(s.data || []);
      setProducts(p.data || []);
      const ordersData = o.data.orders || [];

      setAllOrders(ordersData); // 👈 THIS was missing

      // outward = only dispatched
      setOutward(ordersData.filter((ord) => ord.progress === "DISPATCHED"));
    } catch (err) {
      console.error("Dashboard API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [token, selectedDate]);

  useEffect(() => {
    const fetchStaffOrders = async () => {
      if (!selectedStaff || !token) return;

      try {
        setStaffLoading(true);

        const res = await axios.get(`${API}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            staffId: selectedStaff._id,
            from,
            to,
          },
        });

        setStaffOrders(res.data.orders || []);
      } catch (err) {
        console.error("Staff order fetch failed", err);
      } finally {
        setStaffLoading(false);
      }
    };

    fetchStaffOrders();
  }, [selectedStaff, token, from, to]);

  const totalOrders = allOrders.length;

  const topStaff = staff[0]?.name || "—";
  const topProduct = filteredProducts[0]?.name || "—";

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 flex justify-between shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <span>Executive Dashboard</span>
            </h1>
          </div>

          <div className="relative" ref={calendarRef}>
            <div
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border-2 border-gray-200 shadow-sm hover:border-[#c62d23] hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <Calendar
                size={18}
                className="text-[#c62d23] group-hover:scale-110 transition-transform"
              />
              <span className="text-sm font-medium text-gray-900 min-w-[140px]">
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <ChevronDown
                size={16}
                className={`text-gray-500 transition-transform ${showCalendar ? "rotate-180" : ""}`}
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#c62d23]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>

            {showCalendar && (
              <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-4 min-w-[320px]">
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

        <div className="p-8 space-y-10">
          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Kpi
              title="Total Orders"
              value={totalOrders}
              icon={<TrendingUp className="text-[#c62d23]" />}
              clickable
              onClick={() => router.push("/superadmin/order")}
            />

            <Kpi
              title="Top Staff"
              value={topStaff}
              icon={<Users className="text-[#c62d23]" />}
              accentColor="red"
              clickable={false}
            />
            <Kpi
              title="Top Product"
              value={topProduct}
              icon={<Package className="text-[#c62d23]" />}
              accentColor="red"
              clickable={false}
            />

            <Kpi
              title="Inward Inventory"
              value={inwardFull.length + inwardSpare.length}
              icon={<Inbox className="text-[#c62d23]" />}
              accentColor="red"
              onClick={() => setView("inward")}
              clickable={true}
            />
            <Kpi
              title="Outward Orders"
              value={outward.length}
              icon={<Send className="text-[#c62d23]" />}
              accentColor="red"
              onClick={() => setView("outward")}
              clickable={true}
            />
          </div>

          {/* Table View */}
          {view && (
            <TableView
              view={view}
              data={
                view === "inward"
                  ? inventoryTab === "FULL"
                    ? inwardFull
                    : inwardSpare
                  : outward
              }
              inventoryTab={inventoryTab}
              setInventoryTab={setInventoryTab}
              close={() => setView(null)}
            />
          )}

          {/* Charts */}
          {!view && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <Card title="Most Purchased Products">
                {/* TOGGLE */}
                <div className="flex gap-2 mb-4">
                  {["ALL", "FULL", "SPARE"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setProductType(t)}
                      className={`px-4 py-2 text-sm rounded-lg font-medium transition
          ${
            productType === t
              ? "bg-[#c62d23] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={filteredProducts}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={100}
                      tick={{ fontSize: 11, fill: "#374151" }}
                      stroke="#E5E7EB"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      stroke="#E5E7EB"
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        padding: "12px",
                      }}
                      cursor={{ fill: "rgba(198, 45, 35, 0.1)" }}
                    />
                    <Bar
                      dataKey="orders"
                      fill="#c62d23"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Staff Performance">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={staff}
                      dataKey="orders"
                      nameKey="name"
                      outerRadius={120}
                      onClick={(data) => {
                        setSelectedStaff(data);
                      }}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {staff.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
        </div>
      </div>
      {selectedStaff && (
        <StaffPerformanceModal
          staff={selectedStaff}
          orders={staffOrders}
          loading={staffLoading}
          onClose={() => {
            setSelectedStaff(null);
            setStaffOrders([]);
          }}
        />
      )}
    </div>
  );
}

/* ================= COMPONENTS ================= */

const Kpi = ({
  title,
  value,
  icon,
  onClick,
  accentColor = "red",
  clickable = false,
}) => (
  <div
    onClick={onClick}
    className={`bg-white border border-gray-200 rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full ${
      clickable ? "cursor-pointer hover:bg-gray-50 hover:border-[#c62d23]" : ""
    }`}
    style={{
      ...(accentColor === "red" && { borderLeft: "4px solid #c62d23" }),
    }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    {typeof value === "number" ? (
      <CountUp
        end={value}
        duration={1.5}
        className="text-3xl font-bold text-gray-900 mb-1"
        separator=","
      />
    ) : (
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    )}
    {clickable && (
      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
        <span>Click to view details</span>
        <span className="text-[#c62d23]">→</span>
      </div>
    )}
  </div>
);

const Card = ({ title, children }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
    <h2 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
      {title}
    </h2>
    {children}
  </div>
);

const TableView = ({
  view,
  data = [],
  inventoryTab,
  setInventoryTab,
  close,
}) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
    <div className="flex justify-between items-center mb-6">
      <h2 className="font-bold text-xl text-gray-900">
        {view === "inward" ? "Inward Inventory" : "Dispatched Orders"}
      </h2>
      <button
        onClick={close}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#c62d23] transition-colors p-2 rounded-lg hover:bg-gray-100"
      >
        <X size={16} />
        Close
      </button>
    </div>

    {view === "inward" && (
      <div className="flex gap-4 mb-6 bg-gray-50 p-2 rounded-xl">
        <button
          onClick={() => setInventoryTab("FULL")}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            inventoryTab === "FULL"
              ? "bg-[#c62d23] text-white shadow-md"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          Full Chairs
        </button>
        <button
          onClick={() => setInventoryTab("SPARE")}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            inventoryTab === "SPARE"
              ? "bg-[#c62d23] text-white shadow-md"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          Spare Parts
        </button>
      </div>
    )}

    <div className="overflow-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            {view === "inward" && inventoryTab === "FULL" && (
              <>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Date
                </th>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Chair
                </th>

                <th className="text-left p-4 font-semibold text-gray-700">
                  Qty
                </th>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Vendor
                </th>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Status
                </th>
              </>
            )}

            {view === "inward" && inventoryTab === "SPARE" && (
              <>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Date
                </th>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Part
                </th>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Location
                </th>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Qty
                </th>
              </>
            )}

            {view === "outward" && (
              <>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Date
                </th>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Product
                </th>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Qty
                </th>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Client
                </th>
                <th className="text-left p-4 font-semibold text-gray-700">
                  Status
                </th>
              </>
            )}
          </tr>
        </thead>

        <tbody>
          {data.map((r, index) => (
            <tr
              key={r._id}
              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                index % 2 === 0 ? "bg-white" : "bg-gray-50"
              }`}
            >
              {view === "inward" && inventoryTab === "FULL" && (
                <>
                  <td className="p-4 text-gray-900">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-gray-900 font-medium">
                    {r.chairType}
                  </td>

                  <td className="p-4 text-gray-900 font-semibold">
                    <CountUp end={r.quantity} duration={1} separator="," />
                  </td>
                  <td className="p-4 text-gray-700">{r.vendor?.name || "—"}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-[#fef2f2] text-[#991b1b] text-xs rounded-full font-medium">
                      {r.status}
                    </span>
                  </td>
                </>
              )}

              {view === "inward" && inventoryTab === "SPARE" && (
                <>
                  <td className="p-4 text-gray-900">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-gray-900 font-medium">
                    {r.partName}
                  </td>
                  <td className="p-4 text-gray-700">{r.location}</td>
                  <td className="p-4 text-gray-900 font-semibold">
                    <CountUp end={r.quantity} duration={1} separator="," />
                  </td>
                </>
              )}

              {view === "outward" && (
                <>
                  <td className="p-4 text-gray-900">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-gray-900 font-medium">
                    {r.chairModel}
                  </td>
                  <td className="p-4 text-gray-900 font-semibold">
                    <CountUp end={r.quantity} duration={1} separator="," />
                  </td>
                  <td className="p-4 text-gray-700">{r.dispatchedTo?.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                      {r.progress}
                    </span>
                  </td>
                </>
              )}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan="100%" className="p-8 text-center text-gray-500">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const CalendarComponent = ({ selectedDate, onDateSelect, maxDate }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  // Don't use local state for selected date, use the prop directly
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

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateDisabled = (date) => {
    if (!date) return true;
    const maxDateObj = new Date(maxDate);
    maxDateObj.setHours(23, 59, 59, 999); // Set to end of day for comparison
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

    // Format date as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    onDateSelect(formattedDate);
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
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="text-xl font-bold text-gray-600">‹</span>
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="text-xl font-bold text-gray-600">›</span>
        </button>
      </div>

      {/* Days of week header */}
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

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const isDisabled = isDateDisabled(date);
          const isSelected = isDateSelected(date);

          return (
            <button
              key={`${currentMonth.getMonth()}-${currentMonth.getFullYear()}-${index}`}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={isDisabled}
              className={`
                aspect-square p-2 text-sm rounded-lg transition-all min-h-[36px] flex items-center justify-center
                ${!date ? "invisible" : ""}
                ${
                  isSelected
                    ? "bg-[#c62d23] text-white font-semibold shadow-md"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "hover:bg-gray-100 text-gray-700 cursor-pointer"
                }
              `}
            >
              {date?.getDate()}
            </button>
          );
        })}
      </div>

      {/* Quick select buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => handleDateClick(new Date())}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-1"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            handleDateClick(lastWeek);
          }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-1"
        >
          Last Week
        </button>
      </div>
    </div>
  );
};

const StaffPerformanceModal = ({ staff, orders, loading, onClose }) => {
  const router = useRouter();

  // total quantity handled by staff
  const totalQty = useMemo(
    () => orders.reduce((sum, o) => sum + Number(o.quantity || 0), 0),
    [orders],
  );

  // delayed orders (more than 3 days & not dispatched)
  const delayedOrders = useMemo(
    () =>
      orders.filter((o) => {
        const days =
          (Date.now() - new Date(o.createdAt)) / (1000 * 60 * 60 * 24);
        return days > 10 && o.progress !== "DISPATCHED";
      }),
    [orders],
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {staff.name} – Performance
            </h2>
            <p className="text-sm text-gray-500">
              Total Orders: {staff.orders}
            </p>
            <p
              className={`text-sm mt-1 font-medium ${
                delayedOrders.length ? "text-red-600" : "text-green-600"
              }`}
            >
              {delayedOrders.length
                ? `⚠️ ${delayedOrders.length} delayed order(s)`
                : "✅ All recent orders on track"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">
          {/* SUMMARY */}
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard title="Orders" value={staff.orders} />
            <SummaryCard title="Items Shown" value={orders.length} />
            <SummaryCard title="Total Qty" value={totalQty} />
          </div>

          {/* ORDERS TABLE */}
          <div className="border rounded-xl overflow-hidden">
            {loading ? (
              <p className="p-6 text-center text-gray-500">Loading...</p>
            ) : orders.length === 0 ? (
              <p className="p-6 text-center text-gray-500">No orders found</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-left">Client</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((o) => {
                    const isDelayed =
                      (Date.now() - new Date(o.createdAt)) /
                        (1000 * 60 * 60 * 24) >
                        3 && o.progress !== "DISPATCHED";

                    return (
                      <tr
                        key={o._id}
                        className={`border-t ${
                          isDelayed ? "bg-red-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="p-3">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-medium">{o.chairModel}</td>
                        <td className="p-3 text-center font-semibold">
                          {o.quantity}
                        </td>
                        <td className="p-3">{o.dispatchedTo?.name || "—"}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              o.progress === "DISPATCHED"
                                ? "bg-green-100 text-green-800"
                                : isDelayed
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {o.progress}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* FOOTER ACTION */}
          <button
            onClick={() =>
              router.push(`/superadmin/order?staffId=${staff._id}`)
            }
            className="w-full bg-[#c62d23] text-white py-3 rounded-xl font-medium hover:opacity-90"
          >
            View All Orders
          </button>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value }) => (
  <div className="bg-gray-50 p-4 rounded-xl text-center">
    <p className="text-sm text-gray-500">{title}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);
