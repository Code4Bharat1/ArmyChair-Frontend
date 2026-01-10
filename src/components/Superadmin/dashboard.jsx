"use client";
import React, { useState } from "react";
import { Search, User, Users } from "lucide-react";
import Sidebar from "./sidebar";

/* ================= TIMELINE COMPONENT ================= */
function OrderTimeline({ timeline }) {
  return (
    <div className="relative pl-6 mt-4">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-neutral-700" />

      {timeline.map((step, index) => (
        <div key={index} className="mb-8 relative">
          <div
            className={`absolute -left-[2px] w-4 h-4 rounded-full border-2
              ${
                step.status === "completed"
                  ? "bg-emerald-500 border-emerald-500"
                  : step.status === "active"
                  ? "bg-amber-500 border-amber-500"
                  : "bg-neutral-900 border-neutral-600"
              }
            `}
          />

          <div className="ml-6">
            <h3
              className={`text-sm font-semibold
                ${
                  step.status === "completed"
                    ? "text-emerald-400"
                    : step.status === "active"
                    ? "text-amber-400"
                    : "text-neutral-400"
                }
              `}
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
                <div className="text-xs text-neutral-500 italic">Pending</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [expandedOrder, setExpandedOrder] = useState(null);

  /* ================= ADD USER STATE ================= */
  const [newUser, setNewUser] = useState({
    role: "admin",
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

    setNewUser({ role: "admin", phone: "", password: "" });
  };

  /* ================= ORDERS ================= */
  const orders = [
    { id: "ORD-201", orderDate: "22 Sep 2025", deliveryDate: "30 Sep 2025" },
    { id: "ORD-202", orderDate: "23 Sep 2025", deliveryDate: "01 Oct 2025" },
  ];

  const orderTimelines = {
    "ORD-201": [
      {
        title: "Order Accepted",
        status: "completed",
        events: [{ text: "Order confirmed", time: "22 Sep • 10:30 AM" }],
      },
      {
        title: "Inventory Status",
        status: "active",
        events: [{ text: "Lack of inventory detected", time: "22 Sep • 11:00 AM" }],
      },
      { title: "Inventory Movement", status: "pending", events: [] },
      { title: "Fitting", status: "pending", events: [] },
      { title: "Stock Ready", status: "pending", events: [] },
      { title: "Dispatch", status: "pending", events: [] },
    ],
    "ORD-202": [
      {
        title: "Order Accepted",
        status: "completed",
        events: [{ text: "Order placed", time: "23 Sep • 9:00 AM" }],
      },
      {
        title: "Inventory Status",
        status: "completed",
        events: [{ text: "Inventory available", time: "23 Sep • 9:20 AM" }],
      },
      {
        title: "Inventory Movement",
        status: "active",
        events: [{ text: "Warehouse → Factory", time: "23 Sep • 12:00 PM" }],
      },
      { title: "Fitting", status: "pending", events: [] },
      { title: "Stock Ready", status: "pending", events: [] },
      { title: "Dispatch", status: "pending", events: [] },
    ],
  };

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
          {/* NEW ORDERS TABLE */}
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
                {orders.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr className="border-b border-neutral-700">
                      <td className="p-4">{order.id}</td>
                      <td className="p-4">{order.orderDate}</td>
                      <td className="p-4">{order.deliveryDate}</td>
                      <td className="p-4">
                        <button
                          onClick={() =>
                            setExpandedOrder(
                              expandedOrder === order.id ? null : order.id
                            )
                          }
                          className="text-xs text-amber-400 hover:underline"
                        >
                          {expandedOrder === order.id ? "Hide Tracking" : "View Tracking"}
                        </button>
                      </td>
                    </tr>

                    {expandedOrder === order.id && (
                      <tr className="bg-neutral-900">
                        <td colSpan={4} className="p-6">
                          <OrderTimeline timeline={orderTimelines[order.id]} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
