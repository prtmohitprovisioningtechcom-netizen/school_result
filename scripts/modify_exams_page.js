const fs = require('fs');
const filePath = 'app/admin/exams/page.tsx';

const newContent = `"use client";

import { Save, Loader2, Search } from "lucide-react";
import { useState, useEffect } from "react";

export default function MarksEntryPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);

  const [marksFilter, setMarksFilter] = useState({ 
    session_id: "", 
    class_id: "", 
    exam_type_id: "", 
    subject_id: "" 
  });

  const [marksExamId, setMarksExamId] = useState("");
  const [marksRows, setMarksRows] = useState<any[]>([]);
  const [savingMarks, setSavingMarks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"ok" | "err">("ok");

  useEffect(() => {
    fetchMeta();
  }, []);

  const authHeaders = (json = true) => {
    const token = localStorage.getItem("token");
    const headers: any = { Authorization: \`Bearer \${token}\` };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  };

  const fetchMeta = async () => {
    try {
      const headers = authHeaders();
      const [classesRes, sessionsRes, subjectsRes, typesRes] = await Promise.all([
        fetch("/api/academic/classes", { headers }),
        fetch("/api/academic/sessions", { headers }),
        fetch("/api/academic/subjects", { headers }),
        fetch("/api/exams/types", { headers }),
      ]);
      if (classesRes.ok) setClasses(await classesRes.json());
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data);
        const current = data.find((s: any) => s.is_current) || data[0];
        if (current) {
          setMarksFilter((prev) => ({ ...prev, session_id: String(current.id) }));
        }
      }
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (typesRes.ok) setExamTypes(await typesRes.json());
    } catch (error) {
      console.error(error);
    }
  };

  const showMsg = (text: string, type: "ok" | "err" = "ok") => {
    setMessage(text);
    setMessageType(type);
  };
  
  const loadStudents = async () => {
    const { session_id, class_id, exam_type_id, subject_id } = marksFilter;
    if (!session_id || !class_id || !exam_type_id || !subject_id) {
      showMsg("Please select Session, Exam Type, Class, and Subject.", "err");
      return;
    }
    showMsg("");
    setLoading(true);
    setMarksRows([]);
    try {
      // Auto-create or find the exam with default max_marks = 100
      const res = await fetch("/api/exams/find-or-create", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ session_id, class_id, exam_type_id, subject_id, max_marks: "100" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load exam details");
      
      const marksRes = await fetch(\`/api/exams/marks?exam_id=\${data.id}\`, { headers: authHeaders() });
      const marksData = await marksRes.json();
      if (!marksRes.ok) throw new Error(marksData.message || "Failed to load students");
      
      setMarksExamId(String(data.id));
      setMarksRows(
        (marksData.students || []).map((s: any) => ({
          student_id: s.student_id,
          roll_number: s.roll_number,
          name: \`\${s.first_name} \${s.last_name || ""}\`.trim(),
          marks_ist: s.marks_ist ?? "",
          marks_iind: s.marks_iind ?? "",
          is_absent: !!s.is_absent,
        }))
      );
    } catch (err: any) {
      showMsg(err.message, "err");
    } finally {
      setLoading(false);
    }
  };

  const saveMarks = async () => {
    if (!marksExamId) return;
    setSavingMarks(true);
    showMsg("");
    try {
      const res = await fetch("/api/exams/marks", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          exam_id: Number(marksExamId),
          marks_data: marksRows.map((r) => ({
            student_id: r.student_id,
            marks_ist: r.is_absent ? 0 : Number(r.marks_ist || 0),
            marks_iind: r.is_absent ? 0 : Number(r.marks_iind || 0),
            is_absent: r.is_absent ? 1 : 0,
            remarks: "",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save marks");
      showMsg("Marks saved successfully!", "ok");
    } catch (err: any) {
      showMsg(err.message, "err");
    } finally {
      setSavingMarks(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marks Entry</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter student marks for the selected class and subject.
        </p>
      </div>

      {message && (
        <div className={\`px-4 py-3 rounded-lg text-sm font-medium \${messageType === "err" ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}\`}>
          {message}
        </div>
      )}

      {/* Filter Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Session</label>
            <select 
              value={marksFilter.session_id} 
              onChange={(e) => setMarksFilter({ ...marksFilter, session_id: e.target.value })} 
              className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
            >
              <option value="">— Session —</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Exam Type</label>
            <select 
              value={marksFilter.exam_type_id} 
              onChange={(e) => setMarksFilter({ ...marksFilter, exam_type_id: e.target.value })} 
              className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
            >
              <option value="">— Exam Type —</option>
              {examTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Class</label>
            <select 
              value={marksFilter.class_id} 
              onChange={(e) => setMarksFilter({ ...marksFilter, class_id: e.target.value })} 
              className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
            >
              <option value="">— Class —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name || \`Class \${c.level}\`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Subject</label>
            <select 
              value={marksFilter.subject_id} 
              onChange={(e) => setMarksFilter({ ...marksFilter, subject_id: e.target.value })} 
              className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
            >
              <option value="">— Subject —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
             <button 
               onClick={loadStudents} 
               disabled={loading}
               className="w-full flex justify-center items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50 transition-colors"
             >
               {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
               Load Students
             </button>
          </div>
        </div>

        {/* Marks Table */}
        {marksRows.length > 0 && (
          <div className="mt-8">
            <div className="border rounded-lg dark:border-gray-700 overflow-hidden mb-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ist (Terminal)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IInd (Half/Annual)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Absent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {marksRows.map((row, idx) => {
                    const total = Number(row.marks_ist || 0) + Number(row.marks_iind || 0);
                    return (
                      <tr key={row.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.roll_number || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{row.name}</td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            disabled={row.is_absent} 
                            value={row.marks_ist} 
                            onChange={(e) => { 
                              const next = [...marksRows]; 
                              next[idx] = { ...next[idx], marks_ist: e.target.value }; 
                              setMarksRows(next); 
                            }} 
                            className="w-24 px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm font-medium disabled:opacity-50 disabled:bg-gray-100" 
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            disabled={row.is_absent} 
                            value={row.marks_iind} 
                            onChange={(e) => { 
                              const next = [...marksRows]; 
                              next[idx] = { ...next[idx], marks_iind: e.target.value }; 
                              setMarksRows(next); 
                            }} 
                            className="w-24 px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm font-medium disabled:opacity-50 disabled:bg-gray-100" 
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-700">
                          {row.is_absent ? <span className="text-red-500">ABS</span> : total}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={row.is_absent} 
                            onChange={(e) => { 
                              const next = [...marksRows]; 
                              next[idx] = { 
                                ...next[idx], 
                                is_absent: e.target.checked, 
                                marks_ist: e.target.checked ? "" : next[idx].marks_ist, 
                                marks_iind: e.target.checked ? "" : next[idx].marks_iind 
                              }; 
                              setMarksRows(next); 
                            }} 
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={saveMarks} 
                disabled={savingMarks} 
                className="inline-flex justify-center items-center px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-md transition-colors"
              >
                {savingMarks ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                Save All Marks
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(filePath, newContent);
console.log('Marks page modified.');
