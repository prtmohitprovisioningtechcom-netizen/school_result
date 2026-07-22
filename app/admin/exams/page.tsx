"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Save,
  Loader2,
  Search,
  X,
  Eye,
  Download,
  PencilLine,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

function classLabel(c: any) {
  if (!c) return "";
  const name = String(c.name || "").trim();
  if (/class\s*\d+/i.test(name)) return name;
  if (c.level != null && c.level !== "") return `Class ${c.level}`;
  return name || `Class #${c.id}`;
}

function num(v: any) {
  if (v === "" || v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pct(obt: number, max: number) {
  if (!max) return "-";
  return ((obt / max) * 100).toFixed(2);
}

export default function MarksEntryPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  const [sessionId, setSessionId] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [subjectRows, setSubjectRows] = useState<any[]>([]);
  const [savedOnce, setSavedOnce] = useState(false);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"ok" | "err">("ok");

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    if (sessionId) loadStudents();
    else setAllStudents([]);
  }, [sessionId]);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const showMsg = (text: string, type: "ok" | "err" = "ok") => {
    setMessage(text);
    setMessageType(type);
  };

  const fetchMeta = async () => {
    try {
      const headers = authHeaders();
      const [classesRes, sessionsRes] = await Promise.all([
        fetch("/api/academic/classes", { headers }),
        fetch("/api/academic/sessions", { headers }),
      ]);
      if (classesRes.ok) setClasses(await classesRes.json());
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data);
        const current = data.find((s: any) => s.is_current) || data[0];
        if (current) setSessionId(String(current.id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadStudents = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/students?session_id=${sessionId}`, {
        headers: authHeaders(),
      });
      // Also load without session filter if empty — students may not have session set
      let data = res.ok ? await res.json() : [];
      if (!data.length) {
        const allRes = await fetch("/api/students", { headers: authHeaders() });
        if (allRes.ok) data = await allRes.json();
      }
      setAllStudents(data);
    } catch (e) {
      console.error(e);
      showMsg("Students load nahi hue", "err");
    } finally {
      setLoadingList(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      if (classFilter && String(s.class_id) !== String(classFilter)) return false;
      if (nameFilter) {
        const q = nameFilter.toLowerCase();
        const full = `${s.first_name || ""} ${s.last_name || ""} ${s.admission_number || ""} ${s.roll_number || ""}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [allStudents, classFilter, nameFilter]);

  const openMarksheet = async (st: any) => {
    setLoadingSheet(true);
    setSavedOnce(false);
    showMsg("");
    try {
      const res = await fetch(
        `/api/exams/student-marks?student_id=${st.id}&session_id=${sessionId}&class_id=${st.class_id}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Marksheet open nahi hui");
      if (!data.subjects?.length) {
        throw new Error("Pehle Academic → Subjects add karein (Hindi, Math, English…).");
      }
      setStudent(data.student || st);
      setExamTypes(data.examTypes || []);
      setSubjectRows(data.subjects || []);
      setSheetOpen(true);
    } catch (err: any) {
      showMsg(err.message, "err");
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleMarkChange = (
    subjectIdx: number,
    typeId: number,
    field: "marks_ist" | "marks_iind" | "max_marks",
    val: string
  ) => {
    const next = [...subjectRows];
    next[subjectIdx] = {
      ...next[subjectIdx],
      marks: {
        ...next[subjectIdx].marks,
        [typeId]: {
          ...next[subjectIdx].marks[typeId],
          [field]: val,
        },
      },
    };
    setSubjectRows(next);
  };

  const termTotals = useMemo(() => {
    const totals: Record<number, { obt: number; max: number }> = {};
    examTypes.forEach((et) => {
      totals[et.id] = { obt: 0, max: 0 };
    });
    let grandObt = 0;
    let grandMax = 0;

    subjectRows.forEach((row) => {
      let rowObt = 0;
      let rowMax = 0;
      examTypes.forEach((et) => {
        const cell = row.marks[et.id] || {};
        const t = num(cell.marks_ist) + num(cell.marks_iind);
        const m = num(cell.max_marks);
        if (cell.marks_ist !== "" || cell.marks_iind !== "") {
          totals[et.id].obt += t;
          totals[et.id].max += m;
          rowObt += t;
          rowMax += m;
        } else if (m) {
          // still count max if only max set? skip until marks entered
        }
      });
      grandObt += rowObt;
      grandMax += rowMax;
    });

    return { totals, grandObt, grandMax };
  }, [subjectRows, examTypes]);

  const saveMarks = async () => {
    if (!student) return;
    setSaving(true);
    showMsg("");
    try {
      const res = await fetch("/api/exams/student-marks", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          student_id: student.id,
          session_id: Number(sessionId),
          class_id: student.class_id,
          marks_data: subjectRows,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Save fail");
      setSavedOnce(true);
      showMsg("Marksheet save ho gayi! Ab View / Release kar sakte ho.", "ok");
    } catch (err: any) {
      showMsg(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (mode: "view" | "release") => {
    if (!student) return;
    if (!savedOnce) {
      // auto-save first
      await saveMarks();
    }
    setReleasing(true);
    showMsg("");
    try {
      const res = await fetch("/api/results/marksheets/bulk", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          session_id: Number(sessionId),
          class_id: Number(student.class_id),
          student_id: Number(student.id),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "PDF nahi bani — pehle marks save karein");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      if (mode === "view") {
        window.open(url, "_blank");
        showMsg("Marksheet view open ho gayi (PDF tab).", "ok");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `Marksheet_${student.first_name}_${student.roll_number || student.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showMsg("Marksheet release / download ho gayi!", "ok");
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      showMsg(err.message, "err");
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marks Entry</h1>
        <p className="mt-1 text-sm text-gray-500">
          Session select → students dekho → <strong>Marks Enter</strong> → marksheet mein number dalo → Save → View → Release
        </p>
      </div>

      {message && !sheetOpen && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm flex gap-2 ${
            messageType === "err"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {messageType === "err" ? <AlertCircle className="w-4 h-4 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 mt-0.5" />}
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">1. Session (pehle yeh)</label>
            <select
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                setClassFilter("");
                setNameFilter("");
              }}
              className="w-full px-3 py-2.5 border-2 border-emerald-200 rounded-lg text-sm font-medium focus:border-emerald-500 outline-none"
            >
              <option value="">— Session choose karein —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.is_current ? " (Current)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">2. Class filter (optional)</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              disabled={!sessionId}
              className="w-full px-3 py-2.5 border-2 rounded-lg text-sm disabled:opacity-50 outline-none focus:border-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{classLabel(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">3. Name / Roll / Admission search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                disabled={!sessionId}
                placeholder="Naam se dhoondo…"
                className="w-full pl-9 pr-3 py-2.5 border-2 rounded-lg text-sm disabled:opacity-50 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b bg-gray-50 dark:bg-gray-900/40 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900 dark:text-white">Students</h2>
          <span className="text-xs text-gray-500">
            {sessionId ? `${filteredStudents.length} dikh rahe hain` : "Pehle session select karo"}
          </span>
        </div>

        {!sessionId ? (
          <div className="p-10 text-center text-gray-500 text-sm">Session select karte hi saare students yahan dikhenge.</div>
        ) : loadingList ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">Is filter pe koi student nahi. Students page se add karo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admission</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-emerald-50/50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 text-sm font-medium">{s.roll_number || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                            {(s.first_name || "?").charAt(0)}
                          </div>
                        )}
                        {s.first_name} {s.last_name || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{s.class_name || classLabel({ name: s.class_name, level: s.level })} - {s.section_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.admission_number}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openMarksheet(s)}
                        disabled={loadingSheet}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {loadingSheet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PencilLine className="w-3.5 h-3.5" />}
                        Marks Enter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Marksheet modal */}
      {sheetOpen && student && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="min-h-screen px-2 py-4 sm:px-4 flex justify-center">
            <div className="relative w-full max-w-6xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl my-2">
              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-orange-50 dark:bg-orange-950/40 rounded-t-xl">
                <div>
                  <h3 className="font-bold text-orange-900 dark:text-orange-200 text-lg">Student Marksheet</h3>
                  <p className="text-xs text-orange-800/80">
                    {student.first_name} {student.last_name || ""} · {student.class_name}-{student.section_name} · Roll {student.roll_number || "-"} · {student.session_name || "Session"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={saveMarks}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                  <button
                    onClick={() => downloadPdf("view")}
                    disabled={releasing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                  >
                    {releasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    View
                  </button>
                  <button
                    onClick={() => downloadPdf("release")}
                    disabled={releasing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Release PDF
                  </button>
                  <button onClick={() => setSheetOpen(false)} className="p-2 rounded-lg hover:bg-black/5">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {message && (
                <div
                  className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-sm ${
                    messageType === "err" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="p-4 overflow-x-auto">
                {/* Header like paper */}
                <div className="border-2 border-orange-500 rounded-lg overflow-hidden mb-3">
                  <div className="bg-orange-500 text-white text-center py-2 font-bold tracking-wide">
                    PROGRESS / MARKSHEET
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 text-sm border-b border-orange-200">
                    <div>Name: <strong>{student.first_name} {student.last_name || ""}</strong></div>
                    <div>Session: <strong>{student.session_name || "-"}</strong></div>
                    <div>Class: <strong>{student.class_name}-{student.section_name}</strong></div>
                    <div>Roll: <strong>{student.roll_number || "-"}</strong></div>
                  </div>

                  <table className="w-full text-[11px] sm:text-xs border-collapse">
                    <thead>
                      <tr className="bg-orange-500 text-white">
                        <th rowSpan={2} className="border border-orange-700 px-2 py-2 text-left">Subject</th>
                        {examTypes.map((et) => (
                          <th key={et.id} colSpan={4} className="border border-orange-700 px-1 py-2">
                            {et.name}
                          </th>
                        ))}
                        <th colSpan={2} className="border border-orange-700 px-1 py-2">Grand Total</th>
                      </tr>
                      <tr className="bg-orange-400 text-white">
                        {examTypes.map((et) => (
                          <Fragment key={`h-${et.id}`}>
                            <th className="border border-orange-700 px-1 py-1">Ist</th>
                            <th className="border border-orange-700 px-1 py-1">IInd</th>
                            <th className="border border-orange-700 px-1 py-1">Total</th>
                            <th className="border border-orange-700 px-1 py-1">Max</th>
                          </Fragment>
                        ))}
                        <th className="border border-orange-700 px-1 py-1">Obtained</th>
                        <th className="border border-orange-700 px-1 py-1">Maximum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectRows.map((row, idx) => {
                        let gObt = 0;
                        let gMax = 0;
                        return (
                          <tr key={row.subject_id} className="odd:bg-orange-50/40">
                            <td className="border border-orange-200 px-2 py-1 font-semibold whitespace-nowrap">{row.subject_name}</td>
                            {examTypes.map((et) => {
                              const cell = row.marks[et.id] || { marks_ist: "", marks_iind: "", max_marks: 50 };
                              const total = num(cell.marks_ist) + num(cell.marks_iind);
                              const max = num(cell.max_marks);
                              if (cell.marks_ist !== "" || cell.marks_iind !== "") {
                                gObt += total;
                                gMax += max;
                              }
                              return (
                                <Fragment key={`${row.subject_id}-${et.id}`}>
                                  <td className="border border-orange-200 p-0.5">
                                    <input
                                      type="number"
                                      value={cell.marks_ist}
                                      onChange={(e) => handleMarkChange(idx, et.id, "marks_ist", e.target.value)}
                                      className="w-12 sm:w-14 mx-auto block text-center py-1 border border-gray-200 rounded"
                                    />
                                  </td>
                                  <td className="border border-orange-200 p-0.5 bg-orange-50/60">
                                    <input
                                      type="number"
                                      value={cell.marks_iind}
                                      onChange={(e) => handleMarkChange(idx, et.id, "marks_iind", e.target.value)}
                                      className="w-12 sm:w-14 mx-auto block text-center py-1 border border-gray-200 rounded bg-white"
                                    />
                                  </td>
                                  <td className="border border-orange-200 px-1 text-center font-bold text-orange-800">{total || ""}</td>
                                  <td className="border border-orange-200 p-0.5">
                                    <input
                                      type="number"
                                      value={cell.max_marks}
                                      onChange={(e) => handleMarkChange(idx, et.id, "max_marks", e.target.value)}
                                      className="w-12 sm:w-14 mx-auto block text-center py-1 border border-gray-200 rounded text-gray-600"
                                    />
                                  </td>
                                </Fragment>
                              );
                            })}
                            <td className="border border-orange-200 px-1 text-center font-bold">{gObt || ""}</td>
                            <td className="border border-orange-200 px-1 text-center font-bold">{gMax || ""}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-orange-100 font-bold text-orange-900">
                        <td className="border border-orange-300 px-2 py-2">Total</td>
                        {examTypes.map((et) => {
                          const t = termTotals.totals[et.id] || { obt: 0, max: 0 };
                          return (
                            <Fragment key={`tot-${et.id}`}>
                              <td className="border border-orange-300"></td>
                              <td className="border border-orange-300"></td>
                              <td className="border border-orange-300 text-center py-2">{t.obt || ""}</td>
                              <td className="border border-orange-300 text-center py-2">{t.max || ""}</td>
                            </Fragment>
                          );
                        })}
                        <td className="border border-orange-300 text-center">{termTotals.grandObt || ""}</td>
                        <td className="border border-orange-300 text-center">{termTotals.grandMax || ""}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary boxes */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {examTypes.map((et) => {
                    const t = termTotals.totals[et.id] || { obt: 0, max: 0 };
                    const p = pct(t.obt, t.max);
                    const pass = t.max > 0 && (t.obt / t.max) * 100 >= 33;
                    return (
                      <div key={`sum-${et.id}`} className="border-2 border-orange-500 rounded-lg overflow-hidden text-sm">
                        <div className="bg-red-800 text-white text-center font-bold py-1 text-xs uppercase">{et.name}</div>
                        <div className="p-3 space-y-1">
                          <div>Percentage: <strong>{p}%</strong></div>
                          <div>Result: <strong>{t.max ? (pass ? "Pass" : "Fail") : "-"}</strong></div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="border-2 border-red-800 rounded-lg p-3 text-center">
                    <div className="text-xs font-bold text-red-800 mb-1">FINAL PERCENTAGE</div>
                    <div className="text-2xl font-extrabold text-red-800">
                      {pct(termTotals.grandObt, termTotals.grandMax)}%
                    </div>
                    <div className="text-xs mt-2 text-gray-600">
                      {termTotals.grandMax
                        ? (termTotals.grandObt / termTotals.grandMax) * 100 >= 33
                          ? "☑ Pass"
                          : "☑ Fail"
                        : "—"}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4 text-center">
                  Number change hote hi Total / % auto calculate hote hain. Save ke baad View ya Release PDF.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
