"use client";
import React, { useState } from "react";
import { Search, User } from "lucide-react";
import Sidebar from "../Sidebar/sidebar";

export default function Fitting() {
  const [orders, setOrders] = useState([
    {
      id: "ORD-301",
      salesPerson: "Rahul Sharma",
      orderDate: "22 Sep 2025",
      quantity: 500,
      warehouseStatus: "Collected",
      assemblyStatus: "Pending",
      delayFlag: false,
    },
    {
      id: "ORD-302",
      salesPerson: "Ankit Verma",
      orderDate: "23 Sep 2025",
      quantity: 500,
      warehouseStatus: "Missed",
      assemblyStatus: "Pending",
      delayFlag: true,
    },
    {
      id: "ORD-303",
      salesPerson: "Neha Gupta",
      orderDate: "23 Sep 2025",
      quantity: 500,
      warehouseStatus: "Collected",
      assemblyStatus: "Completed",
      delayFlag: false,
    },
  ]);

  const markCompleted = (id) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id
          ? { ...order, assemblyStatus: "Completed" }
          : order
      )
    );
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
              placeholder="Search fitting orders..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 ml-4">
            <div className="w-9 h-9 bg-neutral-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-300" />
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-1">Fitting / Assembly</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Assemble products after warehouse material collection
          </p>

          {/* FITTING TABLE */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="p-4 text-xs text-neutral-400">Order ID</th>
                  <th className="p-4 text-xs text-neutral-400">Sales Person</th>
                  <th className="p-4 text-xs text-neutral-400">Order Date</th>
                  <th className="p-4 text-xs text-neutral-400">Quantity</th>
                  <th className="p-4 text-xs text-neutral-400">Warehouse</th>
                  <th className="p-4 text-xs text-neutral-400">Assembly</th>
                  <th className="p-4 text-xs text-neutral-400">Action</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className={`border-b border-neutral-700 ${
                      order.delayFlag ? "bg-red-900/10" : ""
                    }`}
                  >
                    <td className="p-4">{order.id}</td>
                    <td className="p-4">{order.salesPerson}</td>
                    
                    <td className="p-4">{order.orderDate}</td>
                    <td className="p-4">{order.quantity}</td>

                    {/* WAREHOUSE STATUS */}
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs
                          ${
                            order.warehouseStatus === "Collected"
                              ? "bg-emerald-600/20 text-emerald-400"
                              : "bg-red-600/20 text-red-400"
                          }
                        `}
                      >
                        {order.warehouseStatus}
                      </span>
                    </td>

                    {/* ASSEMBLY STATUS */}
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs
                          ${
                            order.assemblyStatus === "Completed"
                              ? "bg-emerald-600/20 text-emerald-400"
                              : "bg-amber-600/20 text-amber-400"
                          }
                        `}
                      >
                        {order.assemblyStatus}
                      </span>
                    </td>

                    {/* ACTION */}
                    <td className="p-4">
                      {order.assemblyStatus === "Pending" ? (
                        <button
                          onClick={() => markCompleted(order.id)}
                          className="bg-amber-600 hover:bg-amber-700 text-black px-3 py-1 rounded-lg text-xs"
                        >
                          Mark Completed
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-500">
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* EMPTY STATE */}
            {orders.length === 0 && (
              <div className="p-10 text-center text-neutral-400">
                No fitting orders available
              </div>
            )}
          </div>

          {/* FOOT NOTE */}
          <div className="mt-4 text-xs text-neutral-500">
            * Orders highlighted in red indicate warehouse delay or missed material collection.
          </div>
        </div>
      </div>
    </div>
  );
}
