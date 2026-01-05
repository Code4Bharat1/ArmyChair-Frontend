"use client"
import React, { useState } from 'react';
import { Search, User, AlertCircle, Filter, Download, Plus } from 'lucide-react';
import Sidebar from '../Sidebar/sidebar';


export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const inventoryData = [
    {
      id: 1,
      name: 'Executive Leather Chair XL',
      vendor: 'Comfort Seating Co.',
      noStock: 95,
      quantity: 145,
      status: 'Healthy',
      lastUpdated: 'Today, 10:30 AM'
    },
    {
      id: 2,
      name: 'Hydraulic Piston Class-B',
      vendor: 'HydroTech Industries',
      noStock: 200,
      quantity: 45,
      status: 'Low Stock',
      lastUpdated: 'Yesterday, 4:15 PM'
    },
    {
      id: 3,
      name: 'Wheel Caster Set (5pcs)',
      vendor: 'BuildPro Suppliers',
      noStock: 500,
      quantity: 1240,
      status: 'Healthy',
      lastUpdated: 'Oct 24, 2023'
    },
    {
      id: 4,
      name: 'Assembly Bolt M6',
      vendor: 'Fastener Corp',
      noStock: 1000,
      quantity: 0,
      status: 'Critical',
      lastUpdated: '2 hours ago'
    },
    {
      id: 5,
      name: 'Mesh Ergonomic Chair',
      vendor: 'OfficeComfort Inc.',
      noStock: 40,
      quantity: 85,
      status: 'Healthy',
      lastUpdated: 'Oct 22, 2023'
    }
  ];

  const vendors = ['All', 'Comfort Seating Co.', 'HydroTech Industries', 'BuildPro Suppliers', 'Fastener Corp', 'OfficeComfort Inc.'];
  const statuses = ['All', 'Healthy', 'Low Stock', 'Critical'];

  const filteredData = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendor = filterVendor === 'All' || item.vendor === filterVendor;
    const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
    return matchesSearch && matchesVendor && matchesStatus;
  });

  const totalCount = inventoryData.reduce((sum, item) => sum + item.quantity, 0);
  const spareParts = inventoryData.length;
  const lowStockCount = inventoryData.filter(item => item.status === 'Low Stock' || item.status === 'Critical').length;

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      {/* Sidebar */}

  <Sidebar  />



      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products, orders, or alerts..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-600"
            />
          </div>
          <div className="flex items-center gap-3 ml-4">
            <div className="w-9 h-9 bg-neutral-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-300" />
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">
          {/* Alert Banner */}
          <div className="bg-amber-950 border border-amber-800 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-amber-200">Warning: 2 items are below the minimum stock threshold.</span>
            </div>
            <button className="text-sm text-amber-400 hover:text-amber-300 font-medium">
              View Critical Items
            </button>
          </div>

          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Inventory Management</h1>
            <p className="text-sm text-neutral-400">Track, add, update, manage and monitor your inventories.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-sm text-neutral-400 mb-2">TOTAL COUNT</div>
              <div className="text-3xl font-bold text-white mb-1">{totalCount.toLocaleString()}</div>
              <div className="text-xs text-neutral-500">Nearly Stock ready</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-sm text-neutral-400 mb-2">SPARE PARTS</div>
              <div className="text-3xl font-bold text-white mb-1">{spareParts.toLocaleString()}</div>
              <div className="text-xs text-neutral-500">Across 3 warehouses</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5 relative">
              <div className="text-sm text-neutral-400 mb-2">LOW STOCK ALERTS</div>
              <div className="text-3xl font-bold text-red-500 mb-1">{lowStockCount}</div>
              <div className="text-xs text-red-500">Action Required Immediately</div>
              <div className="absolute top-4 right-4">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by Project Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-600"
                />
              </div>

              <select
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-600"
              >
                {vendors.map(vendor => (
                  <option key={vendor} value={vendor}>Vendor: {vendor}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-600"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>Status: {status}</option>
                ))}
              </select>

              <button className="bg-neutral-900 border border-neutral-700 hover:border-neutral-600 text-neutral-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>

              <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />
                Add Stock
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-neutral-700">
              <h2 className="text-lg font-semibold text-white">Inventory Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-850">
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Product Name</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Vendor</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">No Stock</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Quantity</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Status</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Last Updated</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className="border-b border-neutral-700 hover:bg-neutral-750 transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-medium text-white">{item.name}</div>
                      </td>
                      <td className="p-4 text-sm text-neutral-300">{item.vendor}</td>
                      <td className="p-4 text-sm text-neutral-300">{item.noStock}</td>
                      <td className="p-4 text-sm text-neutral-300">{item.quantity}</td>
                      <td className="p-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === 'Healthy' ? 'bg-green-900 text-green-300' :
                          item.status === 'Low Stock' ? 'bg-amber-900 text-amber-300' :
                          'bg-red-900 text-red-300'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-neutral-400">{item.lastUpdated}</td>
                      <td className="p-4">
                        <button className="text-amber-500 hover:text-amber-400 text-sm font-medium">
                          Edit
                        </button>
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
};
