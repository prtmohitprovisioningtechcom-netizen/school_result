const fs = require('fs');
const filePath = 'app/admin/results/page.tsx';

const newContent = `"use client";

import {
  FileSpreadsheet,
  Download,
  Loader2,
  Contact,
  Search,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";

function classLabel(c: any) {
  if (!c) return "";
  const name = String(c.name || "").trim();
  const level = c.level;
  if (/class\\s*\\d+/i.test(name)) return name;
  if (level != null && level !== "") return \`Class \${level}\${name && name.toLowerCase() !== "class" ? \` (\${name})\` : ""}\`;
  return name || \`Class #\${c.id}\`;
}

export default function ResultsPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);

  const [filterSession, setFilterSession] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterExamType, setFilterExamType] = useState("");

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"ok" | "err">("ok");

  useEffect(() => {
    fetchMeta();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: \`Bearer \${token}\`,
      "Content-Type": "application/json",
    };
  };

  const fetchMeta = async () => {
    try {
      const headers = authHeaders();
      const [classesRes, sessionsRes, typesRes] = await Promise.all([
        fetch("/api/academic/classes", { headers }),
        fetch("/api/academic/sessions", { headers }),
        fetch("/api/exams/types", { headers }),
      ]);

      if (classesRes.ok) setClasses(await classesRes.json());
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
        const current = sessionsData.find((s: any) => s.is_current) || sessionsData[0];
        if (current) setFilterSession(String(current.id));
      }
      if (typesRes.ok) {
        const types = await typesRes.json();
        setExamTypes(types);
        if (types.length) setFilterExamType(String(types[0].id));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const showMsg = (text: string, type: "ok" | "err" = "ok") => {
    setMessage(text);
    setMessageType(type);
  };

  const handleLoadStudents = async () => {
    if (!filterSession || !filterClass) {
      showMsg("Please select Session and Class to load students.", "err");
      return;
    }
    setLoading(true);
    showMsg("");
    try {
      const res = await fetch(\`/api/students?class_id=\${filterClass}\`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      setStudents(data);
      if(data.length === 0) showMsg("No students found in this class.", "err");
    } catch (error: any) {
      showMsg(error.message, "err");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMarksheet = async (student_id: number, student_name: string) => {
    setDownloadingId(student_id);
    showMsg("");
    
    try {
      // PDF generation
      const res = await fetch("/api/results/marksheets/bulk", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          session_id: Number(filterSession),
          class_id: Number(filterClass),
          student_id: student_id
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Marksheet failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = \`Marksheet_\${student_name.replace(/\\s+/g, "_")}.pdf\`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showMsg(\`Marksheet downloaded for \${student_name}\`, "ok");
    } catch (err: any) {
      showMsg(err.message || "Download failed", "err");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Marksheets</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Select session and class to view students and generate their marksheets easily.
        </p>
      </div>

      {message && (
        <div
          className={\`rounded-lg border px-4 py-3 text-sm flex items-start gap-2 \${
            messageType === "err"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
          }\`}
        >
          {messageType === "err" ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{message}</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Session</label>
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">— Session —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.is_current ? " (Current)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Class</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">— Class —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{classLabel(c)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleLoadStudents}
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-bold shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Load Students
            </button>
          </div>
        </div>

        {students.length > 0 && (
          <div className="border rounded-lg dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Father's Name</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {student.roll_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {student.first_name} {student.last_name || ""}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {student.father_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      <button
                        onClick={() => handleDownloadMarksheet(student.id, student.first_name)}
                        disabled={downloadingId === student.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md disabled:opacity-50 text-sm font-semibold transition-colors"
                      >
                        {downloadingId === student.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                        Generate Marksheet
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
  );
}
`;

fs.writeFileSync(filePath, newContent);
console.log('Results page modified.');
