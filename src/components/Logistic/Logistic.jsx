"use client";
import React, { useState } from "react";
import { Search, User, ChevronDown } from "lucide-react";
import Sidebar from "../Sidebar/sidebar";

export default function Logistics() {
  const [selectedRecords, setSelectedRecords] = useState([]);

  const logisticsData = [
    {
      id: "LOG-1001",
      supplier: "SteelWorks Pvt Ltd",
      material: "Steel Frame",
      category: "Metal",
      quantity: "450 units",
      partner: "BlueDart Logistics",
      arrivalDate: "Oct 08, 2023",
      status: "Received",
    },
    {
      id: "LOG-1002",
      supplier: "ComfortFoam Industries",
      material: "Seat Cushion Foam",
      category: "Foam",
      quantity: "1200 kg",
      partner: "Delhivery",
      arrivalDate: "Oct 12, 2023",
      status: "Delayed",
    },
    {
      id: "LOG-1003",
      supplier: "FlexiPlast Corp",
      material: "Armrest Plastic Mold",
      category: "Plastic",
      quantity: "800 units",
      partner: "Ecom Express",
      arrivalDate: "Oct 15, 2023",
      status: "Pending",
    },
    {
      id: "LOG-1004",
      supplier: "HydroLift Systems",
      material: "Gas Lift Cylinder",
      category: "Hydraulic",
      quantity: "300 units",
      partner: "DTDC",
      arrivalDate: "Oct 10, 2023",
      status: "Received",
    },
    {
      id: "LOG-1005",
      supplier: "TextilePro Ltd",
      material: "Chair Upholstery Fabric",
      category: "Fabric",
      quantity: "2000 meters",
      partner: "BlueDart Logistics",
      arrivalDate: "Oct 18, 2023",
      status: "Received",
    },
  ];

  const handleSelect = (id) => {
    setSelectedRecords((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Received":
        return "bg-green-900 text-green-300";
      case "Delayed":
        return "bg-red-900 text-red-300";
      case "Pending":
        return "bg-amber-900 text-amber-300";
      default:
        return "bg-neutral-700 text-neutral-300";
    }
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search supplier, material, partner..."
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

        {/* Page Content */}
        <div className="p-6">
          {/* Title */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Logistics & Raw Materials
              </h1>
              <p className="text-sm text-neutral-400">
                Track inbound raw materials, suppliers, and delivery partners.
              </p>
            </div>
            <button className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm font-medium">
              Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {["Material Type", "Supplier", "Delivery Partner", "Status"].map(
                (label) => (
                  <div key={label} className="relative">
                    <select className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-600 appearance-none">
                      <option>{label}</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                  </div>
                )
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-neutral-700">
              <h2 className="text-lg font-semibold text-white">
                Raw Material Records
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-850">
                    <th className="p-4 text-xs text-neutral-400 uppercase">Record ID</th>
                    <th className="p-4 text-xs text-neutral-400 uppercase">Supplier</th>
                    <th className="p-4 text-xs text-neutral-400 uppercase">Material</th>
                    <th className="p-4 text-xs text-neutral-400 uppercase">Quantity</th>
                    <th className="p-4 text-xs text-neutral-400 uppercase">Delivery Partner</th>
                    <th className="p-4 text-xs text-neutral-400 uppercase">Arrival Date</th>
                    <th className="p-4 text-xs text-neutral-400 uppercase">Status</th>
                    <th className="p-4 text-xs text-neutral-400 uppercase">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {logisticsData.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-neutral-700 hover:bg-neutral-750"
                    >
                      <td className="p-4 text-sm text-neutral-300">{item.id}</td>
                      <td className="p-4 text-sm text-neutral-300">{item.supplier}</td>
                      <td className="p-4">
                        <div className="text-white">{item.material}</div>
                        <div className="text-xs text-neutral-500">
                          {item.category}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-neutral-300">{item.quantity}</td>
                      <td className="p-4 text-sm text-neutral-300">{item.partner}</td>
                      <td className="p-4 text-sm text-neutral-300">{item.arrivalDate}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(item.id)}
                          onChange={() => handleSelect(item.id)}
                          className="w-4 h-4 accent-amber-600"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
