"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import Sidebar from "@/components/Superadmin/sidebar";
import axios from "axios";

export default function AssignTasks() {
  const [department, setDepartment] = useState("Sales");
  const [userId, setUserId] = useState("");
  const [task, setTask] = useState("");

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Assign Task</h1>

        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 max-w-xl">
          {/* Department */}
          <div className="mb-5">
            <label className="text-sm text-neutral-400">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full mt-2 bg-neutral-900 border border-neutral-700 p-3 rounded-lg"
            >
              <option>Sales</option>
              <option>Warehouse</option>
              <option>Fitting</option>
              <option>Production</option>
            </select>
          </div>

          {/* Employee ID */}
          <div className="mb-5">
            <label className="text-sm text-neutral-400">
  Employee Email or ID
</label>

            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter exact employee ID"
              className="w-full mt-2 bg-neutral-900 border border-neutral-700 p-3 rounded-lg"
            />
          </div>

          {/* Task */}
          <div className="mb-5">
            <label className="text-sm text-neutral-400">Task</label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={4}
              placeholder="Write the task"
              className="w-full mt-2 bg-neutral-900 border border-neutral-700 p-3 rounded-lg resize-none"
            />
          </div>

          <button
  onClick={async () => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/tasks/assign`,
        {
          department,
          userId,
          task,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      alert("Task assigned");
      setTask("");
      setUserId("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    }
  }}
  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 py-3 rounded-lg flex items-center justify-center gap-2"
>
  <Send size={18} />
  Assign Task
</button>

        </div>

        <p className="text-sm text-neutral-400 mt-6">
          The task will only be visible to the selected employee.
        </p>
      </div>
    </div>
  );
}
