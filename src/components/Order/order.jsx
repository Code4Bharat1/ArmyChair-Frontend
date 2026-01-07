"use client";
import React, { useState } from "react";
import { Search, User, ChevronDown } from "lucide-react";
import Sidebar from "../Sidebar/sidebar";

export default function SalesOrders() {
  const [selectedOrders, setSelectedOrders] = useState([]);

  const ordersData = [
    {
      id: "ORD-9001",
      dispatchedTo: "Apex Corp Solutions",
      chairModel: "Exec Chair V2",
      chairDetail: "CH-17 (Executive)",
      orderDate: "Oct 10, 2023",
      deliveryDate: "Oct 23, 2023",
      onTime: false,
      assembly: "Assembled",
      amount: "$12,500",
    },
    {
      id: "ORD-9002",
      dispatchedTo: "TechPeak Systems",
      chairModel: "Office Set",
      chairDetail: "SET-02 (Standard)",
      orderDate: "Oct 16, 2023",
      deliveryDate: "Oct 28, 2023",
      onTime: true,
      assembly: "Dismantled",
      amount: "$16,200",
    },
    {
      id: "ORD-9003",
      dispatchedTo: "Stellar Design Hub",
      chairModel: "Lounge Series",
      chairDetail: "LNG-09 (Modern)",
      orderDate: "Oct 05, 2023",
      deliveryDate: "Oct 18, 2023",
      onTime: true,
      assembly: "Assembled",
      amount: "$4,500",
    },
    {
      id: "ORD-9004",
      dispatchedTo: "Global Kinetics Ltd.",
      chairModel: "Exec Chair V2",
      chairDetail: "CH-17 (Executive)",
      orderDate: "Oct 11, 2023",
      deliveryDate: "Oct 29, 2023",
      onTime: false,
      assembly: "Dismantled",
      amount: "$1,930",
    },
    {
      id: "ORD-9005",
      dispatchedTo: "Brightest Ore",
      chairModel: "Office Set",
      chairDetail: "SET-02 (Standard)",
      orderDate: "Oct 01, 2023",
      deliveryDate: "Nov 01, 2023",
      onTime: true,
      assembly: "Assembled",
      amount: "$6,000",
    },
  ];

  const handleSelectOrder = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const getDeliveryStyle = (onTime) =>
    onTime
      ? "bg-green-900 text-green-300"
      : "bg-red-900 text-red-300";

  const getAssemblyStyle = (assembly) =>
    assembly === "Assembled"
      ? "bg-amber-900 text-amber-300"
      : "bg-neutral-700 text-neutral-300";

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search orders or dispatch location..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-600"
            />
          </div>
          <div className="flex items-center gap-3 ml-4">
            <div className="w-9 h-9 bg-neutral-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-300" />
            </div>
            <span className="text-sm text-neutral-300">Admin User</span>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {/* TITLE */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Sales Dispatch Orders
              </h1>
              <p className="text-sm text-neutral-400">
                Track dispatch, delivery timeliness, and assembly status.
              </p>
            </div>
            <button className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm font-medium">
              Export CSV
            </button>
          </div>

          {/* STATS CARDS — RESTORED */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase mb-2">
                TOTAL DISPATCHES
              </div>
              <div className="text-3xl font-bold text-white">1,248</div>
              <div className="text-xs text-neutral-400">This month</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase mb-2">
                ON-TIME DELIVERIES
              </div>
              <div className="text-3xl font-bold text-green-400">92%</div>
              <div className="text-xs text-neutral-400">Last 30 days</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase mb-2">
                DELAYED
              </div>
              <div className="text-3xl font-bold text-red-500">8</div>
              <div className="text-xs text-red-400">Needs attention</div>
            </div>
          </div>

          {/* FILTERS — RESTORED */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {["Order ID", "Delivery Status", "Assembly Type", "Date"].map(
                (label) => (
                  <div key={label} className="relative">
                    <select className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 appearance-none">
                      <option>{label}</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  </div>
                )
              )}
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-neutral-700 flex justify-between">
              <h2 className="text-lg font-semibold text-white">
                Dispatch Orders
              </h2>
              <button className="text-sm text-amber-500">
                View Filters
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-850">
                    {[
                      "Order ID",
                      "Dispatched To",
                      "Chair",
                      "Order Date",
                      "Delivery Date",
                      "On Time",
                      "Assembly",
                      "Amount",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="p-4 text-xs text-neutral-400 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {ordersData.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-neutral-700 hover:bg-neutral-750"
                    >
                      <td className="p-4 text-sm text-neutral-300">
                        {order.id}
                      </td>
                      <td className="p-4 text-sm text-neutral-300">
                        {order.dispatchedTo}
                      </td>
                      <td className="p-4">
                        <div className="text-white">
                          {order.chairModel}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {order.chairDetail}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-neutral-300">
                        {order.orderDate}
                      </td>
                      <td className="p-4 text-sm text-neutral-300">
                        {order.deliveryDate}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getDeliveryStyle(
                            order.onTime
                          )}`}
                        >
                          {order.onTime ? "On Time" : "Late"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getAssemblyStyle(
                            order.assembly
                          )}`}
                        >
                          {order.assembly}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-neutral-300">
                        {order.amount}
                      </td>
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() =>
                            handleSelectOrder(order.id)
                          }
                          className="w-4 h-4 accent-amber-600"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER ACTION — RESTORED */}
          <div className="mt-4 flex justify-end">
            <button className="text-sm text-amber-500">
              Sort by Date
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING BUTTON — RESTORED */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-neutral-950 border border-neutral-700 rounded-full text-2xl text-white">
        +
      </button>
    </div>
  );
}
