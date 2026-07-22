"use client";

import { Save, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    school_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    exam_types: '',
    results_published: false
  });
  
  const [logoPreview, setLogoPreview] = useState("");
  const [signaturePreview, setSignaturePreview] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          school_name: data.school_name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          exam_types: data.exam_types || 'Half-Yearly, Annual',
          results_published: data.results_published == 1
        });
        if (data.logo_url) setLogoPreview(data.logo_url);
        if (data.principal_signature_url) setSignaturePreview(data.principal_signature_url);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('school_name', settings.school_name);
      formData.append('address', settings.address);
      formData.append('phone', settings.phone);
      formData.append('email', settings.email);
      formData.append('website', settings.website);
      formData.append('exam_types', settings.exam_types);
      formData.append('results_published', settings.results_published ? "1" : "0");
      
      if (logoFile) formData.append('logo', logoFile);
      if (signatureFile) formData.append('signature', signatureFile);

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (res.ok) {
        alert('Settings saved successfully!');
        window.location.reload(); // Reload to refresh sidebar context if needed
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      setLogoPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSignatureFile(e.target.files[0]);
      setSignaturePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage global school configuration and branding.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="school_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                School Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="school_name"
                  id="school_name"
                  value={settings.school_name}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                />
              </div>
            </div>
            
            
            <div className="sm:col-span-6 border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Publish Marksheets Globally</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">If enabled, teachers and students will be able to download their marksheets. If disabled, only Admins can view them.</p>
                </div>
                <div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.results_published}
                      onChange={(e) => setSettings({...settings, results_published: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="sm:col-span-6">
               <div className="sm:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Exam Types</label>
                 <input
                   type="text"
                   value={settings.exam_types}
                   onChange={(e) => setSettings({...settings, exam_types: e.target.value})}
                   placeholder="e.g. Unit Test, Half-Yearly, Annual"
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                 />
                 <p className="mt-1 text-xs text-gray-500">Comma separated list of exam types used in your school.</p>
               </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                School Address
              </label>
              <div className="mt-1">
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  value={settings.address}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="phone"
                  id="phone"
                  value={settings.phone}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={settings.email}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">School Logo</label>
            <div className="mt-1 flex items-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-300 dark:text-gray-500" />
                )}
              </span>
              <input type="file" ref={logoInputRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="ml-5 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
              >
                Change Logo
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Principal Signature (For Admit Cards/Marksheets)</label>
            <div className="mt-1 flex items-center">
               <div className="h-16 w-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 overflow-hidden">
                  {signaturePreview ? (
                    <img src={signaturePreview} alt="Signature preview" className="h-full w-full object-contain p-1" />
                  ) : (
                    "No signature"
                  )}
               </div>
               <input type="file" ref={sigInputRef} onChange={handleSignatureChange} accept="image/*" className="hidden" />
              <button
                type="button"
                onClick={() => sigInputRef.current?.click()}
                className="ml-5 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
              >
                Upload Signature
              </button>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 text-right border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
