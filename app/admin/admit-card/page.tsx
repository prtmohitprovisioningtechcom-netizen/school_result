"use client";

import {
  Contact,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

function classLabel(c: any) {
  if (!c) return "";
  const name = String(c.name || "").trim();
  const level = c.level;
  if (/class\s*\d+/i.test(name)) return name;
  if (level != null && level !== "") return `Class ${level}${name && name.toLowerCase() !== "class" ? ` (${name})` : ""}`;
  return name || `Class #${c.id}`;
}

export default function AdmitCardPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<number, number>>({});

  const [printSession, setPrintSession] = useState("");
  const [printExamType, setPrintExamType] = useState("");
  const [printClass, setPrintClass] = useState("");
  const [downloading, setDownloading] = useState(false);
  
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"ok" | "err">("ok");

  useEffect(() => {
    fetchData();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const fetchData = async () => {
    try {
      const headers = authHeaders();
      const [classesRes, sessionsRes, typesRes, studentsRes] = await Promise.all([
        fetch("/api/academic/classes", { headers }),
        fetch("/api/academic/sessions", { headers }),
        fetch("/api/exams/types", { headers }),
        fetch("/api/students", { headers }),
      ]);

      if (classesRes.ok) setClasses(await classesRes.json());
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
        const current = sessionsData.find((s: any) => s.is_current) || sessionsData[0];
        if (current) {
          setPrintSession(String(current.id));
        }
      }
      if (typesRes.ok) {
        const types = await typesRes.json();
        setExamTypes(types);
        if (types.length && !printExamType) setPrintExamType(String(types[0].id));
      }
      if (studentsRes.ok) {
        const students = await studentsRes.json();
        const counts: Record<number, number> = {};
        students.forEach((s: any) => {
          counts[s.class_id] = (counts[s.class_id] || 0) + 1;
        });
        setStudentCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const showMsg = (text: string, type: "ok" | "err" = "ok") => {
    setMessage(text);
    setMessageType(type);
  };

  const selectedClass = classes.find((c) => String(c.id) === String(printClass));
  const selectedExam = examTypes.find((t) => String(t.id) === String(printExamType));
  const selectedSession = sessions.find((s) => String(s.id) === String(printSession));

  const handleAdmitRelease = async () => {
    if (!printSession || !printClass || !printExamType) {
      showMsg("Admit Card ke liye: Session + Class + Exam Type select karein.", "err");
      return;
    }
    const count = studentCounts[Number(printClass)] || 0;
    if (count === 0) {
      showMsg(
        `${classLabel(selectedClass)} mein koi student nahi hai. Pehle Students page se student add karein.`,
        "err"
      );
      return;
    }

    setDownloading(true);
    showMsg("");
    try {
      const res = await fetch("/api/results/admit-cards/bulk", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          session_id: Number(printSession),
          exam_type_id: Number(printExamType),
          class_id: Number(printClass),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.details || "Admit card nahi bana");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AdmitCards_${classLabel(selectedClass).replace(/\s+/g, "_")}_${selectedExam?.name || "Exam"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showMsg(
        `Admit Card release ho gaya! ${classLabel(selectedClass)} — ${count} students PDF download hui.`,
        "ok"
      );
    } catch (err: any) {
      showMsg(err.message || "Admit card download fail", "err");
    } finally {
      setDownloading(false);
    }
  };

  const selectClass = (
    value: string,
    onChange: (v: string) => void,
    id?: string
  ) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
        Kaunsi Class?
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-medium focus:border-blue-500 focus:outline-none"
      >
        <option value="">— Class choose karein —</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {classLabel(c)}
            {studentCounts[c.id] != null ? `  ·  ${studentCounts[c.id]} students` : ""}
          </option>
        ))}
      </select>
      {classes.length === 0 && (
        <p className="mt-1 text-xs text-amber-600">
          Pehle <Link href="/admin/academic" className="underline font-semibold">Academic</Link> se Class 1, Class 2 banao.
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admit Cards</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Yahan se exam se pehle admit card PDF release / download karein.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-2 ${
            messageType === "err"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
          }`}
        >
          {messageType === "err" ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{message}</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-emerald-200 dark:border-emerald-800 overflow-hidden">
        <div className="px-6 py-4 bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-100 dark:border-emerald-800">
          <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <Contact className="w-5 h-5" />
            Admit Card Bulk Release
          </h3>
          <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80 mt-1">
            Exam se <strong>pehle</strong> yahan se class-wise admit card PDF release / download karo. Student photo card pe aayegi.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Session</label>
              <select
                value={printSession}
                onChange={(e) => setPrintSession(e.target.value)}
                className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="">— Session —</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.is_current ? " (Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectClass(printClass, setPrintClass, "admit-class")}

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Kis Exam ka Admit Card?
              </label>
              <select
                value={printExamType}
                onChange={(e) => setPrintExamType(e.target.value)}
                className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="">— Exam Type —</option>
                {examTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview strip */}
          {printClass && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm flex flex-wrap items-center gap-2">
              <span className="text-gray-500">Release hoga:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold dark:bg-emerald-900 dark:text-emerald-200">
                {classLabel(selectedClass)}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold dark:bg-blue-900 dark:text-blue-200">
                {selectedExam?.name || "Exam"}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold dark:bg-amber-900 dark:text-amber-200">
                {selectedSession?.name || "Session"}
              </span>
              <span className="ml-auto text-gray-600 dark:text-gray-300 font-medium">
                {studentCounts[Number(printClass)] || 0} students
              </span>
            </div>
          )}

          <button
            onClick={handleAdmitRelease}
            disabled={downloading}
            className="w-full flex justify-center items-center px-4 py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 text-base font-bold shadow-sm"
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Download className="w-5 h-5 mr-2" />
            )}
            Admit Card Release / Download PDF
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Tip: Timetable dikhane ke liye pehle Exams page pe us class ka exam schedule bana lo. Bina schedule ke bhi card banega.
          </p>
        </div>
      </div>
    </div>
  );
}
