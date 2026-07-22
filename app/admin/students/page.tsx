"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, X, Camera } from "lucide-react";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    admission_number: "",
    roll_number: "",
    class_id: "",
    section_id: "",
    dob: "",
    gender: "",
    father_name: "",
    mother_name: "",
    parent_phone: "",
    parent_email: "",
    address: "",
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [studentsRes, classesRes, sectionsRes] = await Promise.all([
        fetch("/api/students", { headers }),
        fetch("/api/academic/classes", { headers }),
        fetch("/api/academic/sections", { headers }),
      ]);

      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (classesRes.ok) setClasses(await classesRes.json());
      if (sectionsRes.ok) setSections(await sectionsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      admission_number: "",
      roll_number: "",
      class_id: "",
      section_id: "",
      dob: "",
      gender: "",
      father_name: "",
      mother_name: "",
      parent_phone: "",
      parent_email: "",
      address: "",
    });
    setPhotoFile(null);
    setPhotoPreview("");
  };

  const handleAddClick = () => {
    setCurrentStudent(null);
    resetForm();
    setShowModal(true);
  };

  const handleEditClick = (student: any) => {
    setCurrentStudent(student);
    setFormData({
      first_name: student.first_name || "",
      last_name: student.last_name || "",
      admission_number: student.admission_number || "",
      roll_number: student.roll_number || "",
      class_id: student.class_id || "",
      section_id: student.section_id || "",
      dob: student.dob ? String(student.dob).split("T")[0] : "",
      gender: student.gender || "",
      father_name: student.father_name || "",
      mother_name: student.mother_name || "",
      parent_phone: student.phone || "",
      parent_email: student.parent_email || "",
      address: student.parent_address || student.address || "",
    });
    setPhotoFile(null);
    setPhotoPreview(student.photo_url || "");
    setShowModal(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/students/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStudents(students.filter((s: any) => s.id !== id));
      } else {
        alert("Failed to delete student");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const url = currentStudent ? `/api/students/${currentStudent.id}` : "/api/students";
      const method = currentStudent ? "PUT" : "POST";

      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) => body.append(key, String(value ?? "")));
      if (currentStudent?.photo_url && !photoFile) {
        body.append("existing_photo_url", currentStudent.photo_url);
      }
      if (photoFile) body.append("photo", photoFile);

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      if (res.ok) {
        setShowModal(false);
        fetchStudents();
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Failed to save student");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Register students with photo for admit cards & marksheets.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          onClick={handleAddClick}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admission No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class & Section</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent Contact</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">Loading students...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No students yet. Add one with photo.</td>
                </tr>
              ) : (
                students.map((student: any) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt="" className="h-10 w-10 rounded-full object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          {student.first_name?.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{student.admission_number}</td>
                    <td className="px-6 py-4 text-sm">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {student.class_name} - {student.section_name}
                    </td>
                    <td className="px-6 py-4 text-sm">{student.phone}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button onClick={() => handleEditClick(student)} className="text-blue-600 mr-4">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(student.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
              <form onSubmit={handleSave}>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {currentStudent ? "Edit Student" : "Add Student"}
                  </h3>
                  <button type="button" onClick={() => setShowModal(false)}>
                    <X className="h-6 w-6 text-gray-400" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 mb-5">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-28 w-24 border-2 border-dashed border-gray-300 rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Upload Photo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    <input required placeholder="First Name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input placeholder="Last Name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input required placeholder="Admission No" value={formData.admission_number} onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })} className="border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input placeholder="Roll No" value={formData.roll_number} onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })} className="border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <select required value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value, section_id: "" })} className="border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="">Select Class</option>
                      {classes.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name || `Class ${c.level}`}</option>
                      ))}
                    </select>
                    <select required value={formData.section_id} onChange={(e) => setFormData({ ...formData, section_id: e.target.value })} className="border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="">Select Section</option>
                      {sections
                        .filter((s: any) => !formData.class_id || String(s.class_id) === String(formData.class_id))
                        .map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="">Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <input placeholder="Father's Name" value={formData.father_name} onChange={(e) => setFormData({ ...formData, father_name: e.target.value })} className="border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input placeholder="Mother's Name" value={formData.mother_name} onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })} className="border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input placeholder="Parent Phone" value={formData.parent_phone} onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })} className="border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:col-span-2" />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
