"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Calendar,
  TrendingUp,
  Users,
  Package,
  Inbox,
  Send,
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
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL;
const COLORS = [
  "#f2a53f",
  "#1c07e0",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
];

export default function Dashboard() {
  const [staff, setStaff] = useState([]);
  const [products, setProducts] = useState([]);
  const [token, setToken] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [inward, setInward] = useState([]);
  const [inwardFull, setInwardFull] = useState([]);
  const [inwardSpare, setInwardSpare] = useState([]);
  const [inventoryTab, setInventoryTab] = useState("FULL");

  const [outward, setOutward] = useState([]);
  const [view, setView] = useState(null); // inward | outward
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") setToken(localStorage.getItem("token"));
  }, []);

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
        params: { progress: "DISPATCHED", from, to },
      });
      const inventory = i.data.inventory || [];

      setInwardFull(inventory.filter((x) => x.type === "FULL"));
      setInwardSpare(inventory.filter((x) => x.type === "SPARE"));

      setStaff(s.data || []);
      setProducts(p.data || []);

      setOutward(o.data.orders || []);
    } catch (err) {
      console.error("Dashboard API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [token, selectedDate]);

  const totalOrders = staff.reduce((a, b) => a + (b.orders || 0), 0);
  const topStaff = staff[0]?.name || "—";
  const topProduct = products[0]?.name || "—";

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur border-b border-neutral-800 p-6 flex justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Executive Dashboard</h1>
            <p className="text-sm text-neutral-400">Factory analytics</p>
          </div>

          <div className="flex items-center gap-3 bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-800">
            <Calendar size={16} />
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none text-sm"
            />
          </div>
        </div>

        <div className="p-8 space-y-10">
          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Kpi
              title="Total Orders"
              value={totalOrders}
              icon={<TrendingUp />}
            />
            <Kpi title="Top Staff" value={topStaff} icon={<Users />} />
            <Kpi title="Top Product" value={topProduct} icon={<Package />} />

            <Kpi
              title="Inward Inventory"
              value={inwardFull.length + inwardSpare.length}
              icon={<Inbox />}
              onClick={() => setView("inward")}
            />
            <Kpi
              title="Outward Orders"
              value={outward.length}
              icon={<Send />}
              onClick={() => setView("outward")}
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
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={products}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Staff Performance">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={staff}
                      dataKey="orders"
                      nameKey="name"
                      outerRadius={120}
                      label
                    >
                      {staff.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

const Kpi = ({ title, value, icon, onClick }) => (
  <div
    onClick={onClick}
    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 cursor-pointer hover:bg-neutral-800 transition"
  >
    <div className="flex justify-between mb-2">
      <p className="text-sm text-neutral-400">{title}</p>
      {icon}
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

const Card = ({ title, children }) => (
  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
    <h2 className="font-semibold mb-4">{title}</h2>
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
  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
    <div className="flex justify-between mb-4">
      <h2 className="font-semibold text-lg">
        {view === "inward" ? "Inward Inventory" : "Dispatched Orders"}
      </h2>
      <button onClick={close} className="text-sm text-neutral-400">
        Close
      </button>
    </div>

    {view === "inward" && (
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setInventoryTab("FULL")}
          className={`px-4 py-1 rounded ${inventoryTab === "FULL" ? "bg-white text-black" : "bg-neutral-800"}`}
        >
          Full Chairs
        </button>
        <button
          onClick={() => setInventoryTab("SPARE")}
          className={`px-4 py-1 rounded ${inventoryTab === "SPARE" ? "bg-white text-black" : "bg-neutral-800"}`}
        >
          Spare Parts
        </button>
      </div>
    )}

    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-700">
            {view === "inward" && inventoryTab === "FULL" && (
              <>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Chair</th>
                <th className="text-left p-2">Color</th>
                <th className="text-left p-2">Qty</th>
                <th className="text-left p-2">Vendor</th>
                <th className="text-left p-2">Status</th>
              </>
            )}

            {view === "inward" && inventoryTab === "SPARE" && (
              <>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Part</th>
                <th className="text-left p-2">Location</th>
                <th className="text-left p-2">Qty</th>
              </>
            )}

            {view === "outward" && (
              <>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Product</th>
                <th className="text-left p-2">Qty</th>
                <th className="text-left p-2">Client</th>
                <th className="text-left p-2">Status</th>
              </>
            )}
          </tr>
        </thead>

        <tbody>
          {data.map((r) => (
            <tr key={r._id} className="border-b border-neutral-800">
              {view === "inward" && inventoryTab === "FULL" && (
                <>
                  <td className="p-2">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-2">{r.chairType}</td>
                  <td className="p-2">{r.color}</td>
                  <td className="p-2">{r.quantity}</td>
                  <td className="p-2">{r.vendor?.name || "—"}</td>
                  <td className="p-2">{r.status}</td>
                </>
              )}

              {view === "inward" && inventoryTab === "SPARE" && (
                <>
                  <td className="p-2">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-2">{r.chairType}</td>
                  <td className="p-2">{r.location}</td>
                  <td className="p-2">{r.quantity}</td>
                </>
              )}

              {view === "outward" && (
                <>
                  <td className="p-2">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-2">{r.chairModel}</td>
                  <td className="p-2">{r.quantity}</td>
                  <td className="p-2">{r.dispatchedTo?.name}</td>
                  <td className="p-2">{r.progress}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
