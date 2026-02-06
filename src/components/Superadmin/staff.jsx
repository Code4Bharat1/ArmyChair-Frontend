"use client";
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Sidebar from "@/components/Superadmin/sidebar";
import {
  Users,
  Mail,
  Lock,
  User,
  Phone,
  CreditCard,
  Calendar,
  Camera,
  Upload,
  Plus,
  X,
  Search,
  UserCheck,
  UserCog,
  ChevronDown,
  Menu,
} from "lucide-react";

export default function Staff() {
  /* ==========================
     STAFF LIST
  ========================== */
  const [staffs, setStaffs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchStaffs = async () => {
    try {
      const res = await axios.get(`${API}/auth/staff`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      console.log("Staff data:", res.data); 
      setStaffs(res.data);
    } catch (err) {
      console.error("Failed to fetch staff");
    }
  };

  const [imageViewer, setImageViewer] = useState({
    open: false,
    src: "",
    title: "",
  });

  useEffect(() => {
    fetchStaffs();
  }, []);
  
  useEffect(() => {
    if (selectedStaff || showForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [selectedStaff, showForm]);

  /* ==========================
     FILTER
  ========================== */
  const filteredStaff = staffs.filter((s) => {
  const matchesSearch = 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase());
  
  const matchesRole = roleFilter === "All" || s.role === roleFilter;
  
  return matchesSearch && matchesRole;
});

  /* ==========================
     STATS
  ========================== */
  const totalStaff = staffs.length;
  const salesCount = staffs.filter((s) => s.role === "sales").length;
  const warehouseCount = staffs.filter((s) => s.role === "warehouse").length;
  const fittingCount = staffs.filter((s) => s.role === "fitting").length;
  const productionCount = staffs.filter((s) => s.role === "production").length;

  /* ==========================
     FORM STATE
  ========================== */
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "sales",
    mobile: "",
    aadharNumber: "",
    dateOfBirth: "",
    bloodGroup: "",
    photo: "",
    aadharPhotoFront: "", 
    aadharPhotoBack: "", 
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [preview, setPreview] = useState(null);
  const [aadharFrontPreview, setAadharFrontPreview] = useState(null);
  const [aadharBackPreview, setAadharBackPreview] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setPreview(URL.createObjectURL(file));
    setForm({ ...form, photo: base64 });
  };
  
  const handleAadharFrontUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAadharFrontPreview(URL.createObjectURL(file));
    setForm({ ...form, aadharPhotoFront: base64 });
  };

  const handleAadharBackUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAadharBackPreview(URL.createObjectURL(file));
    setForm({ ...form, aadharPhotoBack: base64 });
  };

  const openCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
    setCameraOpen(true);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8);
    setForm({ ...form, photo: base64 });
    setPreview(base64);
    video.srcObject.getTracks().forEach((t) => t.stop());
    setCameraOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const { name, email, password, mobile, aadharNumber, dateOfBirth, bloodGroup } = form;
    
    if (!form.aadharPhotoFront || !form.aadharPhotoBack) {
      setMessage("Please upload both front and back Aadhar photos");
      return;
    }

    if (
      !name ||
      !email ||
      !password ||
      !mobile ||
      !aadharNumber ||
      !dateOfBirth || 
      !bloodGroup
    ) {
      setMessage("All required fields must be filled");
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${API}/auth/signup`, form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setMessage("Staff added successfully");
      setShowForm(false);
      fetchStaffs();

      setForm({
        name: "",
        email: "",
        password: "",
        role: "sales",
        mobile: "",
        aadharNumber: "",
        dateOfBirth: "",
        bloodGroup: "",
        photo: "",
        aadharPhotoFront: "",
        aadharPhotoBack: "",
      });

      setPreview(null);
      setAadharFrontPreview(null);
      setAadharBackPreview(null);
      setCameraOpen(false);
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Mobile Header Bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">
            Staff
          </h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#c62d23] text-white p-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Desktop HEADER */}
        <div className="hidden lg:block sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <span>Staff Management</span>
              </h1>
              <p className="text-gray-600 mt-2">
                Manage and track all staff members
              </p>
            </div>
            
            <button
              onClick={() => setShowForm(true)}
              className="bg-white px-5 py-3 rounded-xl border-2 border-gray-200 shadow-sm hover:border-[#c62d23] hover:shadow-md transition-all duration-200 cursor-pointer group flex items-center gap-2 font-medium"
            >
              <Plus size={18} className="text-[#c62d23] group-hover:scale-110 transition-transform" />
              Add Staff
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            <KpiCard
              title="Total Staff"
              value={totalStaff}
              icon={<Users className="text-[#c62d23]" />}
              onClick={() => setRoleFilter("All")}
              isClickable={true}
            />
            <KpiCard
              title="Sales Team"
              value={salesCount}
              icon={<UserCheck className="text-[#c62d23]" />}
              onClick={() => setRoleFilter("sales")}
              isClickable={true}
            />
            <KpiCard
              title="Warehouse Team"
              value={warehouseCount}
              icon={<UserCog className="text-[#c62d23]" />}
              onClick={() => setRoleFilter("warehouse")}
              isClickable={true}
            />
            <KpiCard
              title="Fitting Team"
              value={fittingCount}
              icon={<UserCheck className="text-[#c62d23]" />}
              onClick={() => setRoleFilter("fitting")}
              isClickable={true}
            />
            <KpiCard
              title="Production Team"
              value={productionCount}
              icon={<UserCheck className="text-[#c62d23]" />}
              onClick={() => setRoleFilter("production")}
              isClickable={true}
            />
          </div>

          {/* SEARCH & TABLE */}
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search staff..."
                  className="w-full p-2.5 sm:p-3 pl-10 bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Desktop TABLE */}
            <div className="hidden lg:block overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-4 font-semibold text-gray-700">PHOTO</th>
                    <th className="text-left p-4 font-semibold text-gray-700">NAME</th>
                    <th className="text-left p-4 font-semibold text-gray-700">EMAIL</th>
                    <th className="text-left p-4 font-semibold text-gray-700">MOBILE</th>
                    <th className="text-left p-4 font-semibold text-gray-700">AADHAR NUMBER</th>
                    <th className="text-left p-4 font-semibold text-gray-700">ROLE</th>
                    <th className="text-left p-4 font-semibold text-gray-700">ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStaff.map((s, index) => (
                    <tr
                      key={s._id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="p-4">
                        <img
                          src={s.photo || "/avatar.png"}
                          className="w-10 h-10 rounded-full object-cover"
                          alt={s.name}
                        />
                      </td>
                      <td className="p-4 font-medium text-gray-900">{s.name}</td>
                      <td className="p-4 text-gray-700">{s.email}</td>
                      <td className="p-4 text-gray-700">{s.mobile}</td>
                      <td className="p-4 text-gray-700">{s.aadharNumber}</td>
                      <td className="p-4">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {s.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedStaff(s)}
                          className="text-[#c62d23] hover:text-[#a8241c] text-sm font-medium hover:underline cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredStaff.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No staff members found
                </div>
              )}
            </div>

            {/* Mobile CARD VIEW */}
            <div className="lg:hidden space-y-3">
              {filteredStaff.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No staff members found
                </div>
              ) : (
                filteredStaff.map((s) => (
                  <div
                    key={s._id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white hover:border-[#c62d23] transition-colors"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <img
                        src={s.photo || "/avatar.png"}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-gray-200"
                        alt={s.name}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {s.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          {s.email}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {s.role}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Mobile:</span>
                        <span className="font-medium text-gray-900">{s.mobile}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Aadhar:</span>
                        <span className="font-medium text-gray-900">{s.aadharNumber}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedStaff(s)}
                      className="w-full mt-3 text-xs sm:text-sm text-[#c62d23] hover:text-[#a8241c] font-medium hover:underline"
                    >
                      View Full Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== STAFF DETAILS MODAL ===== */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-lg max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Staff Details</h2>
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="flex flex-col items-center">
                <img
                  src={selectedStaff.photo || "/avatar.png"}
                  onClick={() =>
                    setImageViewer({
                      open: true,
                      src: selectedStaff.photo || "/avatar.png",
                      title: "Profile Photo",
                    })
                  }
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-gray-200 cursor-pointer hover:opacity-80 transition"
                  alt={selectedStaff.name}
                />

                <h2 className="mt-4 text-lg sm:text-xl font-bold text-gray-900">{selectedStaff.name}</h2>
                <span className="mt-2 px-4 py-1 rounded-full text-xs sm:text-sm font-medium bg-gray-100 text-gray-800">
                  {selectedStaff.role}
                </span>
              </div>

              <div className="mt-6 space-y-3 sm:space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-xs sm:text-sm text-gray-600">Email</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 truncate ml-2">{selectedStaff.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-xs sm:text-sm text-gray-600">Mobile</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">{selectedStaff.mobile}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-xs sm:text-sm text-gray-600">Aadhar</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">{selectedStaff.aadharNumber}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-xs sm:text-sm text-gray-600">Date of Birth</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {new Date(selectedStaff.dateOfBirth).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-xs sm:text-sm text-gray-600">Blood Group</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">{selectedStaff.bloodGroup}</span>
                </div>
              </div>

              {/* AADHAR PHOTOS */}
              {(selectedStaff.aadharPhotoFront || selectedStaff.aadharPhotoBack) && (
                <div className="mt-6">
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">Aadhar Card</p>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {selectedStaff.aadharPhotoFront && (
                      <img
                        src={selectedStaff.aadharPhotoFront}
                        onClick={() =>
                          setImageViewer({
                            open: true,
                            src: selectedStaff.aadharPhotoFront,
                            title: "Aadhar Card - Front",
                          })
                        }
                        className="rounded-lg border border-gray-200 object-cover cursor-pointer hover:opacity-80 transition w-full h-28 sm:h-32"
                        alt="Aadhar Front"
                      />
                    )}
                    {selectedStaff.aadharPhotoBack && (
                      <img
                        src={selectedStaff.aadharPhotoBack}
                        onClick={() =>
                          setImageViewer({
                            open: true,
                            src: selectedStaff.aadharPhotoBack,
                            title: "Aadhar Card - Back",
                          })
                        }
                        className="rounded-lg border border-gray-200 object-cover cursor-pointer hover:opacity-80 transition w-full h-28 sm:h-32"
                        alt="Aadhar Back"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== IMAGE VIEWER MODAL ===== */}
      {imageViewer.open && (
        <div className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4">
          <button
            onClick={() => setImageViewer({ open: false, src: "", title: "" })}
            className="absolute top-4 sm:top-6 right-4 sm:right-6 text-white hover:text-[#c62d23] cursor-pointer"
          >
            <X size={24} className="sm:w-7 sm:h-7" />
          </button>

          <div className="max-w-3xl w-full">
            <p className="text-center text-gray-300 mb-3 text-sm sm:text-base">{imageViewer.title}</p>
            <img
              src={imageViewer.src}
              className="w-full max-h-[80vh] object-contain rounded-lg border border-gray-700"
              alt="Preview"
            />
          </div>
        </div>
      )}

      {/* ===== ADD STAFF FORM MODAL ===== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-gray-200 shadow-lg max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Add New Staff Member</h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setPreview(null);
                    setAadharFrontPreview(null);
                    setAadharBackPreview(null);

                    if (videoRef.current?.srcObject) {
                      videoRef.current.srcObject
                        .getTracks()
                        .forEach((t) => t.stop());
                    }

                    setCameraOpen(false);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                    required
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="mobile"
                    value={form.mobile}
                    onChange={handleChange}
                    placeholder="Mobile Number"
                    required
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                  />
                </div>

                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="aadharNumber"
                    value={form.aadharNumber}
                    onChange={handleChange}
                    placeholder="Aadhar Number"
                    required
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                  />
                </div>

                {/* AADHAR PHOTOS */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Aadhar Card Photos
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <label className="cursor-pointer flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-[#c62d23] px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200">
                      <Upload size={14} className="text-[#c62d23] sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Upload Front</span>
                      <span className="xs:hidden">Front</span>
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleAadharFrontUpload}
                      />
                    </label>

                    <label className="cursor-pointer flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-[#c62d23] px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200">
                      <Upload size={14} className="text-[#c62d23] sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Upload Back</span>
                      <span className="xs:hidden">Back</span>
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleAadharBackUpload}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Blood Group
                  </label>
                  <select
                    name="bloodGroup"
                    value={form.bloodGroup}
                    onChange={handleChange}
                    className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                    required
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full p-2.5 sm:p-3 bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all text-sm sm:text-base"
                  >
                    <option value="sales">Sales</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="fitting">Fitting</option>
                    <option value="production">Production</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Photo
                  </label>
                  <div className="flex gap-2 sm:gap-3">
                    <label className="cursor-pointer flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-[#c62d23] px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200">
                      <Upload size={14} className="text-[#c62d23] sm:w-4 sm:h-4" />
                      Upload
                      <input
                        type="file"
                        hidden
                        onChange={handlePhotoUpload}
                        accept="image/*"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-[#c62d23] px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer"
                    >
                      <Camera size={14} className="text-[#c62d23] sm:w-4 sm:h-4" />
                      Camera
                    </button>
                  </div>
                </div>

                {preview && (
                  <div className="flex justify-center">
                    <img
                      src={preview}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg object-cover border-2 border-gray-200"
                      alt="Preview"
                    />
                  </div>
                )}

                {/* AADHAR PREVIEW */}
                {(aadharFrontPreview || aadharBackPreview) && (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {aadharFrontPreview && (
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Front</p>
                        <img
                          src={aadharFrontPreview}
                          className="w-full h-28 sm:h-32 object-cover rounded-lg border border-gray-200"
                          alt="Aadhar Front"
                        />
                      </div>
                    )}

                    {aadharBackPreview && (
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Back</p>
                        <img
                          src={aadharBackPreview}
                          className="w-full h-28 sm:h-32 object-cover rounded-lg border border-gray-200"
                          alt="Aadhar Back"
                        />
                      </div>
                    )}
                  </div>
                )}

                {cameraOpen && (
                  <div className="space-y-3">
                    <video
                      ref={videoRef}
                      autoPlay
                      className="w-full rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-full bg-[#c62d23] hover:bg-[#a8241c] text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer text-sm sm:text-base"
                    >
                      Capture Photo
                    </button>
                    <canvas ref={canvasRef} hidden />
                  </div>
                )}

                {message && (
                  <div className={`text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg ${
                    message.includes("success")
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#c62d23] hover:bg-[#a8241c] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer text-sm sm:text-base"
                >
                  {loading ? "Adding Staff..." : "Add Staff Member"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= KPI CARD ================= */
const KpiCard = ({ title, value, icon, onClick, isClickable }) => (
  <button
    onClick={onClick}
    disabled={!isClickable}
    className={`bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full text-left ${
      isClickable ? 'cursor-pointer hover:border-[#c62d23]' : ''
    }`}
    style={{ borderLeft: '4px solid #c62d23' }}
  >
    <div className="flex justify-between items-start mb-2 sm:mb-3 lg:mb-4">
      <p className="text-xs sm:text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 18, className: "sm:w-5 sm:h-5 lg:w-6 lg:h-6" })}
    </div>
    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
  </button>
);