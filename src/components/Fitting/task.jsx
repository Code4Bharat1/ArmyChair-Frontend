"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Clock } from "lucide-react";
import axios from "axios";
import FittingSidebar from "@/components/Fitting/sidebar";

export default function FittingTasks() {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const loadTask = async () => {
    try {
      const res = await axios.get(`${API}/tasks/my`, { headers });
      setTask(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markDone = async () => {
    try {
      await axios.put(`${API}/tasks/complete/${task._id}`, {}, { headers });
      loadTask();
    } catch {
      alert("Failed to complete task");
    }
  };

  useEffect(() => {
    loadTask();
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <FittingSidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4">
          <h1 className="text-2xl font-bold">My Fitting Task</h1>
          <p className="text-sm text-neutral-400">
            View and complete your assigned fitting work
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div>Loading...</div>
          ) : !task ? (
            <div className="text-green-400">No task assigned 🎉</div>
          ) : (
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">
              <div className="flex justify-between items-center">
                <p className="text-lg">{task.task}</p>

                {task.status === "Completed" ? (
                  <span className="text-green-400 flex gap-2">
                    <CheckCircle size={18} /> Completed
                  </span>
                ) : (
                  <span className="text-orange-400 flex gap-2">
                    <Clock size={18} /> Pending
                  </span>
                )}
              </div>

              {task.status === "Pending" && (
                <button
                  onClick={markDone}
                  className="mt-6 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Task Done
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
