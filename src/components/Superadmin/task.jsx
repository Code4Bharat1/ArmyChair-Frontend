"use client";
import { useEffect, useState } from "react";
import {
  Send,
  CheckCircle,
  Clock,
  Trash2,
  Edit2,
  Search,
  Filter,
  TrendingUp,
  Users,
  AlertCircle,
  Target,
  X,
  Menu,
  Plus,
} from "lucide-react";
import Sidebar from "@/components/Superadmin/sidebar";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function AssignTasks() {
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueTime, setDueTime] = useState("23:59");

  const [department, setDepartment] = useState("Sales");
  const [userId, setUserId] = useState("");
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [token, setToken] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  // Edit states
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Mobile states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Toast notification
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token"));
    }
  }, []);

  const auth = token ? { headers: { Authorization: `Bearer ${token}` } } : null;

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const fetchTasks = async () => {
    if (!auth) return;
    try {
      const res = await axios.get(`${API}/tasks/all`, auth);
      setTasks(res.data);
      setFilteredTasks(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async (dept) => {
    if (!auth) return;
    try {
      setLoadingStaff(true);
      const res = await axios.get(`${API}/auth/staff`, auth);
      const roleMap = {
        Sales: "sales",
        Warehouse: "warehouse",
        Fitting: "fitting",
        Production: "production",
      };
      const role = roleMap[dept];
      const filtered = role
        ? res.data.filter((u) => u.role === role)
        : res.data;
      setStaff(filtered);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load staff", "error");
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchTasks();
    fetchStaff(department);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchStaff(department);
    setUserId("");
  }, [department, token]);

  // Filter tasks
  useEffect(() => {
    let filtered = [...tasks];

    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.assignedTo?.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          t.assignedTo?.email.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (statusFilter !== "All") {
      if (statusFilter === "Delayed") {
        filtered = filtered.filter((t) => t.isDelayed);
      } else {
        filtered = filtered.filter((t) => t.status === statusFilter);
      }
    }

    if (departmentFilter !== "All") {
      filtered = filtered.filter((t) => t.department === departmentFilter);
    }

    setFilteredTasks(filtered);
  }, [searchQuery, statusFilter, departmentFilter, tasks]);

  const assignTask = async () => {
    if (!auth) return;
    try {
      await axios.post(
        `${API}/tasks/assign`,
        {
          department,
          userId,
          task,
          dueDate,
          dueTime,
        },
        auth,
      );

      setTask("");
      setUserId("");
      setShowAssignModal(false);
      fetchTasks();
      showToast("Task assigned successfully!");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to assign task",
        "error",
      );
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await axios.delete(`${API}/tasks/${taskId}`, auth);
      fetchTasks();
      showToast("Task deleted successfully!");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to delete task",
        "error",
      );
    }
  };

  const updateTask = async () => {
    if (!auth || !editingTask) return;

    try {
      await axios.put(`${API}/tasks/${editingTask._id}`, editingTask, auth);
      setShowEditModal(false);
      setEditingTask(null);
      fetchTasks();
      showToast("Task updated successfully!");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update task",
        "error",
      );
    }
  };

  const getTimeRemaining = (dueAt) => {
    const now = new Date();
    const due = new Date(dueAt);
    const diff = due - now;

    if (diff < 0) {
      const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      if (days > 0) return `Overdue by ${days}d`;
      return `Overdue by ${hours}h`;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `Due in ${days}d`;
    if (hours > 0) return `Due in ${hours}h`;
    return "Due soon";
  };

  const getRowColor = (t) => {
    if (t.status === "Completed") return "";
    if (t.isDelayed) return "bg-red-50";

    const now = new Date();
    const due = new Date(t.dueAt);
    const diff = due - now;
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24 && hours > 0) return "bg-yellow-50";
    return "";
  };

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const pendingTasks = tasks.filter((t) => t.status === "Pending").length;
  const delayedTasks = tasks.filter((t) => t.isDelayed).length;
  const completionRate =
    totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;
  const uniqueEmployees = new Set(tasks.map((t) => t.assignedTo?._id)).size;

  // Handle stat card clicks
  const handleStatClick = (filterType) => {
    setSearchQuery("");
    setDepartmentFilter("All");

    switch (filterType) {
      case "all":
        setStatusFilter("All");
        break;
      case "completed":
        setStatusFilter("Completed");
        break;
      case "pending":
        setStatusFilter("Pending");
        break;
      case "delayed":
        setStatusFilter("Delayed");
        break;
      default:
        setStatusFilter("All");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <Sidebar />
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-lg flex items-center gap-2 sm:gap-3 animate-slide-in ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle size={18} className="sm:w-5 sm:h-5" />
          ) : (
            <AlertCircle size={18} className="sm:w-5 sm:h-5" />
          )}
          <span className="font-medium text-sm sm:text-base">{toast.message}</span>
        </div>
      )}

      {/* Assign Task Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold">Assign New Task</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 sm:p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all cursor-pointer text-sm sm:text-base"
                >
                  <option>Sales</option>
                  <option>Warehouse</option>
                  <option>Fitting</option>
                  <option>Production</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Staff Member
                </label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full p-2.5 sm:p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all cursor-pointer text-sm sm:text-base"
                >
                  <option value="">
                    {loadingStaff ? "Loading staff..." : "Select staff"}
                  </option>
                  {staff.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Description
                </label>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  rows={4}
                  placeholder="Describe the task clearly..."
                  className="w-full p-2.5 sm:p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all resize-none text-sm sm:text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Completion Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2.5 sm:p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Completion Time
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full p-2.5 sm:p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={assignTask}
                  disabled={!userId || !task}
                  className="w-full sm:flex-1 bg-[#c62d23] hover:bg-[#a8241c] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
                >
                  <Send size={16} className="sm:w-[18px] sm:h-[18px]" /> Assign Task
                </button>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="w-full sm:flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold">Edit Task</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Description
                </label>
                <textarea
                  value={editingTask.task}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, task: e.target.value })
                  }
                  rows={4}
                  className="w-full p-2.5 sm:p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all resize-none text-sm sm:text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editingTask.dueAt?.split("T")[0] || ""}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, dueAt: e.target.value })
                    }
                    className="w-full p-2.5 sm:p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Time
                  </label>
                  <input
                    type="time"
                    value={
                      editingTask.dueAt?.split("T")[1]?.substring(0, 5) || ""
                    }
                    onChange={(e) => {
                      const date =
                        editingTask.dueAt?.split("T")[0] ||
                        new Date().toISOString().split("T")[0];
                      setEditingTask({
                        ...editingTask,
                        dueAt: `${date}T${e.target.value}`,
                      });
                    }}
                    className="w-full p-2.5 sm:p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={updateTask}
                  className="w-full sm:flex-1 bg-[#c62d23] hover:bg-[#a8241c] text-white py-2.5 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base"
                >
                  Update Task
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-full sm:flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Mobile Header Bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Tasks</h1>
          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-[#c62d23] text-white p-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Desktop HEADER */}
        <div className="hidden lg:block sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <span>Task Management</span>
              </h1>
              <p className="text-gray-600 mt-2">
                Assign work to staff and track completion in real-time.
              </p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-all shadow-sm hover:shadow-md"
            >
              <Send size={18} /> Assign New Task
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          {/* STATS CARDS - RESPONSIVE */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Tasks */}
            <button
              onClick={() => handleStatClick("all")}
              className="bg-white border-2 border-gray-200 hover:border-blue-400 rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Target size={18} className="sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                  ALL
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                {totalTasks}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-600">
                Total Tasks
              </div>
            </button>

            {/* Completed */}
            <button
              onClick={() => handleStatClick("completed")}
              className="bg-white border-2 border-gray-200 hover:border-green-400 rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                  <CheckCircle size={18} className="sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-green-700 bg-green-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                  DONE
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                {completedTasks}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-600">Completed</div>
            </button>

            {/* Pending */}
            <button
              onClick={() => handleStatClick("pending")}
              className="bg-white border-2 border-gray-200 hover:border-amber-400 rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                  <Clock size={18} className="sm:w-6 sm:h-6 text-amber-600" />
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-amber-700 bg-amber-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                  ACTIVE
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                {pendingTasks}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-600">Pending</div>
            </button>

            {/* Delayed */}
            <button
              onClick={() => handleStatClick("delayed")}
              className="bg-white border-2 border-gray-200 hover:border-red-400 rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                  <AlertCircle size={18} className="sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-red-700 bg-red-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                  URGENT
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                {delayedTasks}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-600">Delayed</div>
            </button>
          </div>

          {/* TABLE/CARD VIEW */}
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col max-h-[800px]">
            <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Assigned Tasks
                  {statusFilter !== "All" && (
                    <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-normal text-gray-500">
                      ({statusFilter})
                    </span>
                  )}
                </h2>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Filter size={20} className="text-gray-600" />
                </button>
              </div>

              {/* Desktop Filters */}
              <div className="hidden lg:flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all cursor-pointer"
                >
                  <option>All</option>
                  <option>Pending</option>
                  <option>Completed</option>
                  <option>Delayed</option>
                </select>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all cursor-pointer"
                >
                  <option>All</option>
                  <option>Sales</option>
                  <option>Warehouse</option>
                  <option>Fitting</option>
                  <option>Production</option>
                </select>
              </div>

              {/* Mobile Filters */}
              {showFilters && (
                <div className="lg:hidden space-y-3 pb-3 border-b border-gray-200">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all cursor-pointer text-sm"
                    >
                      <option>All</option>
                      <option>Pending</option>
                      <option>Completed</option>
                      <option>Delayed</option>
                    </select>

                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all cursor-pointer text-sm"
                    >
                      <option>All</option>
                      <option>Sales</option>
                      <option>Warehouse</option>
                      <option>Fitting</option>
                      <option>Production</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center flex-1 flex items-center justify-center">
                <div>
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#c62d23] border-r-transparent"></div>
                  <p className="mt-4 text-gray-500 text-sm">Loading tasks...</p>
                </div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-8 sm:p-12 text-center flex-1 flex items-center justify-center">
                <div>
                  <Target size={40} className="sm:w-12 sm:h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-base sm:text-lg font-medium">
                    {searchQuery ||
                    statusFilter !== "All" ||
                    departmentFilter !== "All"
                      ? "No tasks match your filters"
                      : "No tasks assigned yet"}
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-2">
                    {searchQuery ||
                    statusFilter !== "All" ||
                    departmentFilter !== "All"
                      ? "Try adjusting your search or filters"
                      : "Start by assigning your first task"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-auto flex-1 rounded-lg border border-gray-200">
                  <table className="w-full text-sm min-w-[1000px]">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr className="bg-gray-50">
                        <th className="text-left p-4 font-semibold text-gray-700">
                          Department
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700">
                          Employee
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700">
                          Task
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700">
                          Due By
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700">
                          Assigned
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700">
                          Completed
                        </th>
                        <th className="text-left p-4 font-semibold text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((t, index) => (
                        <tr
                          key={t._id}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${getRowColor(t)}`}
                        >
                          <td className="p-4 text-gray-700">{t.department}</td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">
                              {t.assignedTo?.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {t.assignedTo?.email}
                            </div>
                          </td>
                          <td className="p-4 text-gray-700 max-w-md">{t.task}</td>
                          <td className="p-4">
                            <div className="text-gray-700">
                              {new Date(t.dueAt).toLocaleString()}
                            </div>
                            {t.status !== "Completed" && (
                              <div className="text-xs text-gray-500 mt-1">
                                {getTimeRemaining(t.dueAt)}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {t.status === "Completed" ? (
                              new Date(t.completedAt) > new Date(t.dueAt) ? (
                                <span className="inline-flex items-center gap-2 text-red-600 font-semibold">
                                  ⏰ Done Late
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 text-green-600 font-medium">
                                  <CheckCircle size={16} /> Completed
                                </span>
                              )
                            ) : t.isDelayed ? (
                              <span className="text-red-600 font-semibold">
                                ⏰ Delayed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-amber-600 font-medium">
                                <Clock size={16} /> Pending
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-gray-700">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-gray-700">
                            {t.completedAt
                              ? new Date(t.completedAt).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingTask(t);
                                  setShowEditModal(true);
                                }}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                title="Edit task"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => deleteTask(t._id)}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Delete task"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3 overflow-y-auto flex-1">
                  {filteredTasks.map((t) => (
                    <div
                      key={t._id}
                      className={`border border-gray-200 rounded-lg p-3 ${getRowColor(t)} hover:border-[#c62d23] transition-colors`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              {t.department}
                            </span>
                            {t.status === "Completed" ? (
                              new Date(t.completedAt) > new Date(t.dueAt) ? (
                                <span className="text-xs font-semibold text-red-600">
                                  Done Late
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                  <CheckCircle size={12} /> Done
                                </span>
                              )
                            ) : t.isDelayed ? (
                              <span className="text-xs font-semibold text-red-600">
                                Delayed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                                <Clock size={12} /> Pending
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm mb-1">
                            {t.assignedTo?.name}
                          </h3>
                          <p className="text-xs text-gray-600 truncate">
                            {t.assignedTo?.email}
                          </p>
                        </div>

                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => {
                              setEditingTask(t);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteTask(t._id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-2 mb-2">
                        <p className="text-xs text-gray-700 line-clamp-2">
                          {t.task}
                        </p>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Due:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(t.dueAt).toLocaleDateString()} {new Date(t.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {t.status !== "Completed" && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Time:</span>
                            <span className="font-medium text-gray-900">
                              {getTimeRemaining(t.dueAt)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Assigned:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {t.completedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Completed:</span>
                            <span className="font-medium text-gray-900">
                              {new Date(t.completedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}