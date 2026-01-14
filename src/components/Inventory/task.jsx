"use client";
import { useEffect, useState } from "react";
import { CheckCircle, Clock } from "lucide-react";
import InventorySidebar from "@/components/Inventory/sidebar";
import axios from "axios";

export default function WarehouseTasks() {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const loadTask = async () => {
    try {
      const res = await axios.get(`${API}/tasks/my`, { headers });
      setTask(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const markDone = async () => {
    try {
      await axios.put(`${API}/tasks/complete/${task._id}`, {}, { headers });
      loadTask();
    } catch (err) {
      alert("Failed to complete task");
    }
  };

  useEffect(() => {
    loadTask();
  }, []);

  if (loading)
    return (
      <div className="flex h-screen bg-black text-white">
        <InventorySidebar />
        <div className="flex-1 p-10">Loading...</div>
      </div>
    );

  if (!task)
    return (
      <div className="flex h-screen bg-black text-white">
        <InventorySidebar />
        <div className="flex-1 p-10 text-green-400">No task assigned 🎉</div>
      </div>
    );

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <InventorySidebar />

      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">My Task</h1>

        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">
          <div className="flex justify-between items-center">
            <p>{task.task}</p>

            {task.status === "Completed" ? (
              <span className="text-green-400 flex gap-2">
                <CheckCircle /> Completed
              </span>
            ) : (
              <span className="text-orange-400 flex gap-2">
                <Clock /> Pending
              </span>
            )}
          </div>

          {task.status === "Pending" && (
            <button
              onClick={markDone}
              className="mt-6 px-6 py-2 bg-emerald-600 rounded-lg"
            >
              Task Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

