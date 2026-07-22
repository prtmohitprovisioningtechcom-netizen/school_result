"use client";

import { Plus, FolderOpen, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function AcademicPage() {
  const [activeTab, setActiveTab] = useState("classes");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [classesList, setClassesList] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    if (activeTab === 'sections') {
      fetchClasses();
    }
  }, [activeTab]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/academic/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setClassesList(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/academic/${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setCurrentItem(null);
    setFormData({});
    setShowModal(true);
  };

  const handleEditClick = (item: any) => {
    setCurrentItem(item);
    // Format dates if session
    const updatedFormData = { ...item };
    if (activeTab === 'sessions') {
      if (updatedFormData.start_date) updatedFormData.start_date = updatedFormData.start_date.split('T')[0];
      if (updatedFormData.end_date) updatedFormData.end_date = updatedFormData.end_date.split('T')[0];
      
      if (updatedFormData.name && updatedFormData.name.includes('-')) {
         const parts = updatedFormData.name.split('-');
         if (parts.length === 2) {
            updatedFormData.startYear = parts[0].trim();
            updatedFormData.endYear = parts[1].trim();
         }
      }
    }
    setFormData(updatedFormData);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete this ${activeTab.slice(0, -1)}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/academic/${activeTab}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete item');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = currentItem ? `/api/academic/${activeTab}/${currentItem.id}` : `/api/academic/${activeTab}`;
      const method = currentItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({});
        setCurrentItem(null);
        fetchData();
      }
    } catch (error) {
      console.error(`Error saving ${activeTab}:`, error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Academic Setup</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage sessions, classes, sections, and subjects.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleAddClick}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab.slice(0, -1)}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex">
            {["classes", "sections", "subjects", "sessions"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="border rounded-lg dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
              <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="mb-2 font-medium text-gray-900 dark:text-gray-200">No {activeTab} found</p>
              <p className="text-sm">Get started by creating your first {activeTab.slice(0, -1)}.</p>
              <button 
                onClick={handleAddClick}
                className="mt-4 px-4 py-2 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm text-sm font-medium"
              >
                Create {activeTab.slice(0, -1)}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    {activeTab === 'classes' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</th>}
                    {activeTab === 'sections' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>}
                    {activeTab === 'subjects' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>}
                    {activeTab === 'sessions' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                      {activeTab === 'classes' && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.level}</td>}
                      {activeTab === 'sections' && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.class_name}</td>}
                      {activeTab === 'subjects' && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.code}</td>}
                      {activeTab === 'sessions' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_current ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {item.is_current ? 'Current' : 'Past'}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleEditClick(item)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowModal(false)}>
              <div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white capitalize">
                  {currentItem ? 'Edit' : 'Add New'} {activeTab.slice(0, -1)}
                </h3>
              </div>
              
              <div className="px-4 py-5 sm:p-6 space-y-4">
                {activeTab === 'sessions' ? (
                  <div className="flex items-center gap-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Year</label>
                      <input
                        type="number"
                        placeholder="e.g. 2024"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                        value={formData.startYear || ''}
                        onChange={(e) => {
                           const sy = e.target.value;
                           const ey = formData.endYear || '';
                           setFormData({ ...formData, startYear: sy, name: sy && ey ? `${sy}-${ey}` : '' });
                        }}
                      />
                    </div>
                    <span className="mt-6 text-gray-500 font-bold">-</span>
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Year</label>
                      <input
                        type="number"
                        placeholder="e.g. 2025"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                        value={formData.endYear || ''}
                        onChange={(e) => {
                           const ey = e.target.value;
                           const sy = formData.startYear || '';
                           setFormData({ ...formData, endYear: ey, name: sy && ey ? `${sy}-${ey}` : '' });
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                )}

                {activeTab === 'classes' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Level (1 = Class 1, 2 = Class 2…)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                      value={formData.level ?? ''}
                      onChange={(e) => {
                        const level = e.target.value ? parseInt(e.target.value) : '';
                        setFormData({
                          ...formData,
                          level,
                          name:
                            formData.name &&
                            formData.name !== 'Class' &&
                            !/^Class\s*\d*$/i.test(String(formData.name))
                              ? formData.name
                              : level
                                ? `Class ${level}`
                                : '',
                        });
                      }}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Name auto banega: Class 1, Class 2… (upar Name field se change kar sakte ho)
                    </p>
                  </div>
                )}

                {activeTab === 'sections' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                      value={formData.class_id || ''}
                      onChange={(e) => setFormData({ ...formData, class_id: parseInt(e.target.value) })}
                      required
                    >
                      <option value="">Select Class</option>
                      {classesList.map(c => (
                        <option key={c.id} value={c.id}>{c.name || `Class ${c.level}`}</option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTab === 'subjects' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Code</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>
                )}

                {activeTab === 'sessions' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                      <input
                        type="date"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                        value={formData.start_date || ''}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                      <input
                        type="date"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
                        value={formData.end_date || ''}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={formData.is_current || false}
                        onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Is Current Session</label>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  onClick={handleSave}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
