
"use client"
import React, { useState } from 'react';
import { Search, User, ChevronDown } from 'lucide-react';
import Sidebar from '../Sidebar/sidebar';

export default function SalesOrders() {
  const [selectedOrders, setSelectedOrders] = useState([]);

  const ordersData = [
    {
      id: 'ECMC-3403',
      clientName: 'Apex Corp Solutions',
      items: 'Exec Chair V2',
      itemsDetail: 'CH-17 (Executive)',
      orderDate: 'Oct 10, 2023',
      deliveryDate: 'Oct 23, 2023',
      priority: 'High',
      amount: '$12,500',
      status: 'Late'
    },
    {
      id: 'ECMC-3898',
      clientName: 'TechPeak Systems',
      items: 'Office Set',
      itemsDetail: 'SET-02 (Standard)',
      orderDate: 'Oct 16, 2023',
      deliveryDate: 'Oct 28, 2023',
      priority: 'Normal',
      amount: '$16,200',
      status: 'In Process'
    },
    {
      id: 'ECMC-3405',
      clientName: 'Stellar Design Hub',
      items: 'Lounge Series',
      itemsDetail: 'LNG-09 (Modern)',
      orderDate: 'Oct 05, 2023',
      deliveryDate: 'Oct 18, 2023',
      priority: 'Normal',
      amount: '$4,500',
      status: 'Returned'
    },
    {
      id: 'ECMC-3912',
      clientName: 'Global Kinetics Ltd.',
      items: 'Exec Chair V2',
      itemsDetail: 'CH-17 (Executive)',
      orderDate: 'Oct 11, 2023',
      deliveryDate: 'Oct 29, 2023',
      priority: 'High',
      amount: '$1,930',
      status: 'Delivered'
    },
    {
      id: 'ECMC-3190',
      clientName: 'Brightest Ore',
      items: 'Office Set',
      itemsDetail: 'SET-02 (Standard)',
      orderDate: 'Oct 01, 2023',
      deliveryDate: 'Nov 01, 2023',
      priority: 'Normal',
      amount: '$6,000',
      status: 'Processing'
    }
  ];

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Late':
        return 'bg-red-900 text-red-300';
      case 'In Process':
        return 'bg-amber-900 text-amber-300';
      case 'Returned':
        return 'bg-neutral-700 text-neutral-300';
      case 'Delivered':
        return 'bg-green-900 text-green-300';
      case 'Processing':
        return 'bg-amber-900 text-amber-300';
      default:
        return 'bg-neutral-700 text-neutral-300';
    }
  };

  const getPriorityStyle = (priority) => {
    return priority === 'High' 
      ? 'bg-amber-900 text-amber-300' 
      : 'bg-neutral-700 text-neutral-300';
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
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
              placeholder="Search orders, clients..."
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
          {/* Page Title */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Sales Orders</h1>
              <p className="text-sm text-neutral-400">Track your fulfilment, delivery status, and returns.</p>
            </div>
            <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Export CSV
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">TOTAL ORDERS</div>
              <div className="text-3xl font-bold text-white mb-1">1,248</div>
              <div className="text-xs text-neutral-400">5 new this week</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">PENDING DELIVERIES</div>
              <div className="text-3xl font-bold text-white mb-1">42</div>
              <div className="text-xs text-neutral-400">15 need to processing</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">DELAYED</div>
              <div className="text-3xl font-bold text-red-500 mb-1">8</div>
              <div className="text-xs text-red-400">Attention needed</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <select className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-600 appearance-none">
                  <option>Filter by Order ID</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>

              <div className="relative">
                <select className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-600 appearance-none">
                  <option>Status: All</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>

              <div className="relative">
                <select className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-600 appearance-none">
                  <option>Priority: All</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>

              <div className="relative">
                <select className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-600 appearance-none">
                  <option>Date: This Month</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-neutral-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
              <button className="text-sm text-amber-500 hover:text-amber-400 font-medium">
                View Filters
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-850">
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Order ID</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Client Name</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Items</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Order Date</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Delivery Date</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Priority</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Amount</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Status</th>
                    <th className="text-left p-4 text-xs font-semibold text-neutral-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersData.map((order) => (
                    <tr key={order.id} className="border-b border-neutral-700 hover:bg-neutral-750 transition-colors">
                      <td className="p-4 text-sm text-neutral-300">{order.id}</td>
                      <td className="p-4 text-sm text-neutral-300">{order.clientName}</td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-white">{order.items}</div>
                        <div className="text-xs text-neutral-500">{order.itemsDetail}</div>
                      </td>
                      <td className="p-4 text-sm text-neutral-300">{order.orderDate}</td>
                      <td className="p-4 text-sm text-neutral-300">{order.deliveryDate}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityStyle(order.priority)}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-neutral-300">{order.amount}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <button className="text-amber-500 hover:text-amber-400 text-sm font-medium">
                            Details
                          </button>
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => handleSelectOrder(order.id)}
                            className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-amber-600 focus:ring-amber-600 focus:ring-offset-0 cursor-pointer"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="mt-4 flex justify-end gap-3">
            <button className="text-sm text-amber-500 hover:text-amber-400 font-medium">
              Sort by Date
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 rounded-full shadow-lg flex items-center justify-center transition-colors">
        <span className="text-white text-2xl">+</span>
      </button>
    </div>
  );
};

