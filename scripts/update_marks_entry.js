const fs = require('fs');
const filePath = 'app/admin/exams/page.tsx';

const newContent = `"use client";

import { Save, Loader2, Search, UserSquare2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function MarksEntryPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [marksFilter, setMarksFilter] = useState({ 
    session_id: "", 
    class_id: "", 
    student_id: "" 
  });

  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [subjectRows, setSubjectRows] = useState<any[]>([]);
  
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
      const [classesRes, sessionsRes] = await Promise.all([
        fetch("/api/academic/classes", { headers }),
        fetch("/api/academic/sessions", { headers })
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
    } catch (error) {
      console.error(error);
    }
  };

  // Fetch students when class changes
  useEffect(() => {
    if (marksFilter.class_id && marksFilter.session_id) {
      fetch(\`/api/students?class_id=\${marksFilter.class_id}&session_id=\${marksFilter.session_id}\`, { headers: authHeaders() })
        .then(res => res.json())
        .then(data => setStudents(data))
        .catch(err => console.error(err));
    } else {
      setStudents([]);
    }
  }, [marksFilter.class_id, marksFilter.session_id]);

  const showMsg = (text: string, type: "ok" | "err" = "ok") => {
    setMessage(text);
    setMessageType(type);
  };
  
  const loadSubjectsAndMarks = async () => {
    const { session_id, class_id, student_id } = marksFilter;
    if (!session_id || !class_id || !student_id) {
      showMsg("Please select Session, Class, and a Student.", "err");
      return;
    }
    
    showMsg("");
    setLoading(true);
    setSubjectRows([]);
    setExamTypes([]);
    
    try {
      const res = await fetch(\`/api/exams/student-marks?student_id=\${student_id}&session_id=\${session_id}&class_id=\${class_id}\`, { 
        headers: authHeaders() 
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || "Failed to load marks");
      
      setExamTypes(data.examTypes || []);
      setSubjectRows(data.subjects || []);
    } catch (err: any) {
      showMsg(err.message, "err");
    } finally {
      setLoading(false);
    }
  };

  const saveMarks = async () => {
    if (subjectRows.length === 0) return;
    setSavingMarks(true);
    showMsg("");
    
    try {
      const res = await fetch("/api/exams/student-marks", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          student_id: marksFilter.student_id,
          session_id: marksFilter.session_id,
          class_id: marksFilter.class_id,
          marks_data: subjectRows,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save marks");
      
      showMsg("All marks saved successfully for this student!", "ok");
    } catch (err: any) {
      showMsg(err.message, "err");
    } finally {
      setSavingMarks(false);
    }
  };

  const handleMarkChange = (subjectIdx: number, typeId: number, field: 'marks_ist' | 'marks_iind', val: string) => {
    const nextRows = [...subjectRows];
    nextRows[subjectIdx].marks[typeId][field] = val;
    setSubjectRows(nextRows);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marks Entry</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Select a student to enter their marks across all exams and subjects simultaneously.
        </p>
      </div>

      {message && (
        <div className={\`px-4 py-3 rounded-lg text-sm font-medium \${messageType === "err" ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}\`}>
          {message}
        </div>
      )}

      {/* Filter Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Session</label>
            <select 
              value={marksFilter.session_id} 
              onChange={(e) => setMarksFilter({ ...marksFilter, session_id: e.target.value, student_id: "" })} 
              className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
            >
              <option value="">— Session —</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Class</label>
            <select 
              value={marksFilter.class_id} 
              onChange={(e) => setMarksFilter({ ...marksFilter, class_id: e.target.value, student_id: "" })} 
              className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
            >
              <option value="">— Class —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name || \`Class \${c.level}\`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Select Student</label>
            <select 
              value={marksFilter.student_id} 
              onChange={(e) => setMarksFilter({ ...marksFilter, student_id: e.target.value })} 
              disabled={!marksFilter.class_id}
              className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none disabled:opacity-50"
            >
              <option value="">— Choose Student —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} (Roll: {s.roll_number || 'N/A'})</option>)}
            </select>
          </div>
          <div className="flex items-end">
             <button 
               onClick={loadSubjectsAndMarks} 
               disabled={loading || !marksFilter.student_id}
               className="w-full flex justify-center items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50 transition-colors"
             >
               {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserSquare2 className="w-4 h-4 mr-2" />}
               Open Student Grid
             </button>
          </div>
        </div>

        {/* Master Excel-Like Table */}
        {subjectRows.length > 0 && examTypes.length > 0 && (
          <div className="mt-8">
            <div className="border rounded-lg dark:border-gray-700 overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-900">
                  <tr>
                    <th rowSpan={2} className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase border-r dark:border-gray-700 bg-gray-200 dark:bg-gray-800">
                      Subject
                    </th>
                    {examTypes.map(et => (
                      <th key={et.id} colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase border-b border-r dark:border-gray-700">
                        {et.name}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {examTypes.map(et => (
                       <React.Fragment key={'headers_'+et.id}>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r dark:border-gray-700">Ist</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r dark:border-gray-700">IInd</th>
                       </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {subjectRows.map((row, idx) => (
                    <tr key={row.subject_id} className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white border-r dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        {row.subject_name}
                      </td>
                      {examTypes.map(et => {
                         const cellData = row.marks[et.id] || { marks_ist: '', marks_iind: '' };
                         return (
                           <React.Fragment key={row.subject_id + '_' + et.id}>
                             <td className="px-2 py-2 border-r dark:border-gray-700">
                               <input 
                                 type="number" 
                                 value={cellData.marks_ist}
                                 onChange={(e) => handleMarkChange(idx, et.id, 'marks_ist', e.target.value)}
                                 className="w-16 mx-auto block px-2 py-1.5 border-2 border-gray-200 rounded text-center text-sm font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                 placeholder="-"
                               />
                             </td>
                             <td className="px-2 py-2 border-r dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                               <input 
                                 type="number" 
                                 value={cellData.marks_iind}
                                 onChange={(e) => handleMarkChange(idx, et.id, 'marks_iind', e.target.value)}
                                 className="w-16 mx-auto block px-2 py-1.5 border-2 border-gray-200 rounded text-center text-sm font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700"
                                 placeholder="-"
                               />
                             </td>
                           </React.Fragment>
                         );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border dark:border-gray-700">
              <button 
                onClick={saveMarks} 
                disabled={savingMarks} 
                className="inline-flex justify-center items-center px-10 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                {savingMarks ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                Save Student Marks
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
console.log('Marks Entry page modified for Student-wise Entry.');
