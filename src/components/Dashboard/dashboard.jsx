"use client";
import React, { useEffect, useState } from "react";
import { Search, User, Users } from "lucide-react";
import Sidebar from "../Sidebar/sidebar";
import axios from "axios";

/* ================= TIMELINE COMPONENT ================= */
function OrderTimeline({ timeline }) {
  const activeIndex = timeline.findIndex((t) => t.status === "active");
  const safeIndex = activeIndex === -1 ? timeline.length - 1 : activeIndex;

  return (
    <div className="relative pl-8 mt-">
      {timeline.map((step, index) => {
        const completed = index < safeIndex;
        const active = index === safeIndex;

        return (
          <div key={index} className="relative flex gap-6 pb-8 last:pb-0">
            {/* LINE */}
            {index !== timeline.length - 1 && (
              <div
                className={`absolute  top-2 h-full w-[2px]
                  ${
                    completed
                      ? "bg-emerald-500"
                      : active
                      ? "bg-amber-500"
                      : "bg-neutral-700"
                  }`}
              />
            )}

            {/* DOT
            <div
              className={`relative z-10 mt-1 w-4 h-4 rounded-full border-2
                ${
                  completed
                    ? "bg-emerald-500 border-emerald-500"
                    : active
                    ? "bg-amber-500 border-amber-500"
                    : "bg-neutral-900 border-neutral-600"
                }`}
            /> */}

            {/* CONTENT */}
            <div>
              <h3
                className={`text-sm font-semibold
                  ${
                    completed
                      ? "text-emerald-400"
                      : active
                      ? "text-amber-400"
                      : "text-neutral-400"
                  }`}
              >
                {step.title}
              </h3>

              <div className="mt-2 space-y-2">
                {step.events.length ? (
                  step.events.map((event, i) => (
                    <div key={i} className="text-xs text-neutral-400">
                      <div>{event.text}</div>
                      <div className="text-neutral-500">{event.time}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-neutral-500 italic">
                    Pending
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


/* ================= PROGRESS → TIMELINE ================= */
const PROGRESS_ORDER = [
  "ORDER_PLACED",
  "WAREHOUSE_COLLECTED",
  "FITTING_IN_PROGRESS",
  "FITTING_COMPLETED",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
];

const PROGRESS_LABELS = {
  ORDER_PLACED: "Order Placed",
  WAREHOUSE_COLLECTED: "Warehouse Collected",
  FITTING_IN_PROGRESS: "Fitting In Progress",
  FITTING_COMPLETED: "Fitting Completed",
  READY_FOR_DISPATCH: "Ready For Dispatch",
  DISPATCHED: "Dispatched",
};

function buildTimeline(progress) {
  const activeIndex = PROGRESS_ORDER.indexOf(progress);

  return PROGRESS_ORDER.map((step, index) => ({
    title: PROGRESS_LABELS[step],
    status:
      index < activeIndex
        ? "completed"
        : index === activeIndex
        ? "active"
        : "pending",
    events:
      index <= activeIndex
        ? [{ text: PROGRESS_LABELS[step], time: "Updated" }]
        : [],
  }));
}

export default function Dashboard() {
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [timeline, setTimeline] = useState([]);

  /* ================= ADD USER STATE ================= */
  const [newUser, setNewUser] = useState({
    role: "sales",
    phone: "",
    password: "",
  });

  const handleUserChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  const handleAddUser = (e) => {
    e.preventDefault();

    if (!newUser.phone || !newUser.password) {
      alert("Phone number and password are required");
      return;
    }

    console.log("New User Added:", newUser);
    setNewUser({ role: "sales", phone: "", password: "" });
  };

  /* ================= ORDERS FROM BACKEND ================= */
  const [orders, setOrders] = useState([]);

  /* ================= PAGINATION ================= */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const res = await axios.get("http://localhost:5000/api/orders", {
      withCredentials: true,
    });
    setOrders(res.data.orders || []);
  };

  const totalPages = Math.ceil(orders.length / pageSize);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              placeholder="Search products, orders, or alerts..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button className="bg-amber-600 px-4 py-2 rounded-lg text-sm">
              Create Order
            </button>
            <div className="w-9 h-9 bg-neutral-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-300" />
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg">
            <div className="p-5 border-b border-neutral-700">
              <h2 className="text-lg font-semibold">New Orders</h2>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="p-4 text-xs text-neutral-400">Order ID</th>
                  <th className="p-4 text-xs text-neutral-400">Order Date</th>
                  <th className="p-4 text-xs text-neutral-400">Delivery Date</th>
                  <th className="p-4 text-xs text-neutral-400">Tracking</th>
                </tr>
              </thead>

              <tbody>
                {paginatedOrders.map((order) => (
                  <React.Fragment key={order._id}>
                    <tr className="border-b border-neutral-700">
                      <td className="p-4">{order.orderId}</td>
                      <td className="p-4">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="p-4">—</td>
                      <td className="p-4">
                        <button
                          onClick={() => {
                            if (expandedOrder === order._id) {
                              setExpandedOrder(null);
                              return;
                            }
                            setTimeline(buildTimeline(order.progress));
                            setExpandedOrder(order._id);
                          }}
                          className="text-xs text-amber-400 hover:underline"
                        >
                          {expandedOrder === order._id
                            ? "Hide Tracking"
                            : "View Tracking"}
                        </button>
                      </td>
                    </tr>

                    {expandedOrder === order._id && (
  <tr className="bg-neutral-900">
    <td colSpan={4} className="p-6 space-y-8">

      {/* ================= HORIZONTAL PROGRESS BAR ================= */}
      {(() => {
        const steps = PROGRESS_ORDER;
        const currentIndex = steps.indexOf(order.progress);
        const safeIndex = currentIndex === -1 ? 0 : currentIndex;
        const percent = (safeIndex / (steps.length - 1)) * 100;

        return (
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-300">
              Order Progress
            </p>

            {/* Step labels */}
            <div className="flex justify-between text-xs text-neutral-500">
              {steps.map((s, i) => (
                <span
                  key={s}
                  className={i <= safeIndex ? "text-neutral-200" : ""}
                >
                  {PROGRESS_LABELS[s]}
                </span>
              ))}
            </div>

            {/* Progress line */}
            <div className="relative h-2 rounded-full bg-neutral-700">
              <div
                className="absolute left-0 top-0 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${percent}%`,
                  background:
                    percent === 100
                      ? "#22c55e"
                      : "linear-gradient(90deg,#22c55e,#f59e0b)",
                }}
              />

              {/* Active dot */}
              <div
                className="absolute -top-1 w-4 h-4 rounded-full border-2 border-black"
                style={{
                  left: `calc(${percent}% - 8px)`,
                  backgroundColor:
                    percent === 100 ? "#22c55e" : "#f59e0b",
                }}
              />
            </div>

            <p className="text-sm text-neutral-400">
              Current Stage:{" "}
              <span className="text-amber-400 font-medium">
                {PROGRESS_LABELS[order.progress]}
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

            {/* PAGINATION */}
            <div className="flex justify-end items-center gap-3 p-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 bg-neutral-700 rounded disabled:opacity-50"
              >
                Prev
              </button>

              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 bg-neutral-700 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {/* ADD NEW USER (UNCHANGED) */}
          <div className="mt-8 bg-neutral-800 border border-neutral-700 rounded-lg">
            <div className="p-5 border-b border-neutral-700 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Add New User</h2>
            </div>

            <form
              onSubmit={handleAddUser}
              className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <select
                name="role"
                value={newUser.role}
                onChange={handleUserChange}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="sales">sales</option>
                <option value="warehouse">Warehouse</option>
                <option value="fitting">Fitting</option>
              </select>

              <input
                name="phone"
                value={newUser.phone}
                onChange={handleUserChange}
                placeholder="Phone Number"
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm"
              />

              <input
                type="password"
                name="password"
                value={newUser.password}
                onChange={handleUserChange}
                placeholder="Password"
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm"
              />

              <div className="md:col-span-3 flex justify-end">
                <button className="bg-amber-600 px-6 py-2 rounded-lg text-sm">
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
