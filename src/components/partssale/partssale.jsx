"use client";
import React, { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import Sidebar from "@/components/Sidebar/sidebar";

const SparePartsSales = () => {
  const [search, setSearch] = useState("");
  const [selectedPartType, setSelectedPartType] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");

  const spareSales = [
    {
      orderId: "SP-701",
      part: "Armrest Foam",
      type: "Foam",
      color: "Black",
      quantity: 120,
      soldTo: "ABC Furnitures",
      orderDate: "2023-09-10",
      deliveryDate: "2023-09-13",
      billingAmount: 48000,
    },
    {
      orderId: "SP-702",
      part: "Chair Suspension",
      type: "Suspension",
      color: "Silver",
      quantity: 35,
      soldTo: "Zenith Offices",
      orderDate: "2023-09-08",
      deliveryDate: "2023-09-20",
      billingAmount: 175000,
    },
    {
      orderId: "SP-703",
      part: "Gas Lift Cylinder",
      type: "Hydraulic",
      color: "Black",
      quantity: 50,
      soldTo: "Delta Systems",
      orderDate: "2023-09-12",
      deliveryDate: "2023-09-14",
      billingAmount: 125000,
    },
    {
      orderId: "SP-704",
      part: "Chair Wheels (Set)",
      type: "Wheels",
      color: "Grey",
      quantity: 80,
      soldTo: "EduCore Pvt Ltd",
      orderDate: "2023-09-05",
      deliveryDate: "2023-09-25",
      billingAmount: 64000,
    },
  ];

  /* ================= ENRICH DATA ================= */
  const enrichedSales = spareSales.map((s) => {
    const order = new Date(s.orderDate);
    const delivery = new Date(s.deliveryDate);
    const processingDays = Math.ceil(
      (delivery - order) / (1000 * 60 * 60 * 24)
    );

    return {
      ...s,
      processingDays,
      priority:
        processingDays <= 3
          ? "High"
          : processingDays <= 7
          ? "Medium"
          : "Low",
    };
  });

  /* ================= FILTER LOGIC ================= */
  const filteredSales = useMemo(() => {
    return enrichedSales
      .filter((s) => {
        const matchSearch =
          s.orderId.toLowerCase().includes(search.toLowerCase()) ||
          s.part.toLowerCase().includes(search.toLowerCase()) ||
          s.soldTo.toLowerCase().includes(search.toLowerCase());

        const matchType =
          selectedPartType === "All" || s.type === selectedPartType;

        const matchPriority =
          selectedPriority === "All" || s.priority === selectedPriority;

        return matchSearch && matchType && matchPriority;
      })
      .sort(
        (a, b) =>
          new Date(a.deliveryDate) - new Date(b.deliveryDate)
      );
  }, [search, selectedPartType, selectedPriority]);

  /* ================= EXPORT ================= */
  const exportCSV = () => {
    const headers = Object.keys(enrichedSales[0]).join(",");
    const rows = enrichedSales
      .map((s) => Object.values(s).join(","))
      .join("\n");

    const blob = new Blob([headers + "\n" + rows], {
      type: "text/csv",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spare-parts-sales-report.csv";
    a.click();
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 p-5 overflow-auto">
        {/* ================= HEADER ================= */}
        <div className="bg-neutral-800 border-b border-neutral-700 mb-8 p-4 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-white">
              Spare Parts Sales
            </h1>
            <p className="text-sm text-neutral-400">
              Track spare part sales, delivery timelines, billing, and order
              priority.
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>

        {/* ================= FILTERS ================= */}
        <div className="flex flex-wrap gap-7 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID, part, or client..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-600"
            />
          </div>

          {[
            [
              "Part Type",
              selectedPartType,
              setSelectedPartType,
              ["All", "Foam", "Suspension", "Hydraulic", "Wheels"],
            ],
            [
              "Priority",
              selectedPriority,
              setSelectedPriority,
              ["All", "High", "Medium", "Low"],
            ],
          ].map(([label, value, setter, options]) => (
            <div key={label}>
              <label className="block text-xs text-neutral-400 mb-1">
                {label}
              </label>
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-600"
              >
                {options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-neutral-700">
              <tr>
                {[
                  "Order ID",
                  "Spare Part",
                  "Quantity",
                  "Sold To",
                  "Order Date",
                  "Delivery Date",
                  "Processing Days",
                  "Billing Amount",
                  "Priority",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left p-4 text-xs font-medium text-neutral-400 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredSales.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-10 text-neutral-400"
                  >
                    No spare part sales found
                  </td>
                </tr>
              )}

              {filteredSales.map((s) => (
                <tr
                  key={s.orderId}
                  className="border-b border-neutral-700 hover:bg-neutral-750"
                >
                  <td className="px-6 py-4 text-white">
                    {s.orderId}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white">{s.part}</div>
                    <div className="text-xs text-neutral-500">
                      {s.type} · {s.color}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-neutral-300">
                    {s.quantity}
                  </td>
                  <td className="px-6 py-4 text-neutral-300">
                    {s.soldTo}
                  </td>
                  <td className="px-6 py-4 text-neutral-300">
                    {s.orderDate}
                  </td>
                  <td className="px-6 py-4 text-neutral-300">
                    {s.deliveryDate}
                  </td>
                  <td className="px-6 py-4 text-neutral-300">
                    {s.processingDays} days
                  </td>
                  <td className="px-6 py-4 text-neutral-300">
                    ₹{s.billingAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-amber-500">
                    {s.priority}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SparePartsSales;
