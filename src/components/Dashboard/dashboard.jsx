"use client"
import React, { useState } from 'react';
import { Search, User, AlertCircle, Clock, Package } from 'lucide-react';
import Sidebar from '../Sidebar/sidebar';

export default function Dashboard(){
  const [activeMenu, setActiveMenu] = useState('Dashboard');

  const menuItems = [
    { title: 'MAIN MENU', items: ['Dashboard', 'Inventory', 'Sales Orders', 'Vendors'] },
    { title: 'OPERATIONS', items: ['Returns', 'Defects', 'Reports'] }
  ];

  const inventoryData = [
    {
      name: 'Ergonomic Office Chair',
      sku: 'CH-682',
      vendor: 'OfficeDepot Inc.',
      quantity: 245,
      status: 'In Stock',
      time: '2 mins ago'
    },
    {
      name: 'Hydraulic Pump V2',
      sku: 'SP-204',
      vendor: 'TechParts Co.',
      quantity: 12,
      status: 'Low Stock',
      time: '15 mins ago'
    },
    {
      name: 'Leather Armrest (Pair)',
      sku: 'SP-102',
      vendor: 'LeatherWorks',
      quantity: 0,
      status: 'Out of Stock',
      time: '1 hour ago'
    },
    {
      name: 'Meeting Table - Oak',
      sku: 'TB-405',
      vendor: 'WoodCraft Ltd.',
      quantity: 18,
      status: 'In Stock',
      time: '3 hours ago'
    },
    {
      name: 'Mesh Back Support',
      sku: 'SP-330',
      vendor: 'OfficeDepot Inc.',
      quantity: 85,
      status: 'In Stock',
      time: '5 hours ago'
    }
  ];

  const alerts = [
    {
      title: 'Critical Stock Level',
      description: 'Hydraulic Pump V2 is below threshold (15).',
      type: 'critical'
    },
    {
      title: 'Delivery Delayed',
      description: 'Order #9921 from TechParts is delayed by 2 days.',
      type: 'warning'
    },
    {
      title: 'Return Request',
      description: 'Defect reported for Order #8821 (Chair Mechanism).',
      type: 'info'
    }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      {/* Sidebar */}
 
     <Sidebar />
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
            <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Create Order
            </button>
            <div className="w-9 h-9 bg-neutral-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-300" />
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-sm text-neutral-400 mb-2">Total Revenue</div>
              <div className="text-3xl font-bold text-white mb-2">$124,500</div>
              <div className="text-xs text-green-500">12.5% vs last month</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-sm text-neutral-400 mb-2">Total Inventory</div>
              <div className="text-3xl font-bold text-white mb-2">1,458</div>
              <div className="text-xs text-green-500">4.2% stock level increased</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-sm text-neutral-400 mb-2">Low Stock Alerts</div>
              <div className="text-3xl font-bold text-red-500 mb-2">12</div>
              <div className="text-xs text-red-500">Requires Attention</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-sm text-neutral-400 mb-2">Pending Orders</div>
              <div className="text-3xl font-bold text-white mb-2">38</div>
              <div className="text-xs text-amber-500">5 waiting dispatch</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Inventory Updates */}
            <div className="lg:col-span-2 bg-neutral-800 border border-neutral-700 rounded-lg">
              <div className="p-5 border-b border-neutral-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Recent Inventory Updates</h2>
                <button className="text-sm text-amber-500 hover:text-amber-400">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="text-left p-4 text-xs font-medium text-neutral-400 uppercase">Product Name</th>
                      <th className="text-left p-4 text-xs font-medium text-neutral-400 uppercase">Vendor</th>
                      <th className="text-left p-4 text-xs font-medium text-neutral-400 uppercase">Quantity</th>
                      <th className="text-left p-4 text-xs font-medium text-neutral-400 uppercase">Status</th>
                      <th className="text-left p-4 text-xs font-medium text-neutral-400 uppercase">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.map((item, idx) => (
                      <tr key={idx} className="border-b border-neutral-700 hover:bg-neutral-750">
                        <td className="p-4">
                          <div className="text-sm font-medium text-white">{item.name}</div>
                          <div className="text-xs text-neutral-500">SKU: {item.sku}</div>
                        </td>
                        <td className="p-4 text-sm text-neutral-300">{item.vendor}</td>
                        <td className="p-4 text-sm text-neutral-300">{item.quantity}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                            item.status === 'In Stock' ? 'bg-green-900 text-green-300' :
                            item.status === 'Low Stock' ? 'bg-amber-900 text-amber-300' :
                            'bg-red-900 text-red-300'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-neutral-400">{item.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* System Alerts */}
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg">
              <div className="p-5 border-b border-neutral-700">
                <h2 className="text-lg font-semibold text-white">System Alerts</h2>
              </div>
              <div className="p-5 space-y-4">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="pb-4 border-b border-neutral-700 last:border-0 last:pb-0">
                    <h3 className="text-sm font-semibold text-white mb-1">{alert.title}</h3>
                    <p className="text-xs text-neutral-400">{alert.description}</p>
                  </div>
                ))}
                <button className="w-full text-center text-sm text-amber-500 hover:text-amber-400 mt-4">
                  View All Alerts
                </button>
              </div>

              {/* Quick Actions */}
              <div className="p-5 border-t border-neutral-700">
                <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-4 py-3 rounded-lg text-sm font-medium transition-colors">
                    Add Product
                  </button>
                  <button className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-4 py-3 rounded-lg text-sm font-medium transition-colors">
                    New Quote
                  </button>
                  <button className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-4 py-3 rounded-lg text-sm font-medium transition-colors">
                    Dispatch
                  </button>
                  <button className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-4 py-3 rounded-lg text-sm font-medium transition-colors">
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

