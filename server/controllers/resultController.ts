import { Request, Response } from 'express';
import { query, withTransaction } from '../utils/dbHelper';
import { generatePDFFromHTML } from '../utils/pdfGenerator';
import path from 'path';
import fs from 'fs';

const appBaseUrl = () => `http://localhost:${process.env.PORT || 3000}`;

const assetUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('file:')) return url;
  const filePath = path.join(process.cwd(), url.replace(/^\//, ''));
  if (fs.existsSync(filePath)) {
    return 'file:///' + filePath.replace(/\\/g, '/');
  }
  return `${appBaseUrl()}${url.startsWith('/') ? url : `/${url}`}`;
};

const defaultGrade = (percentage: number) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
};

const termKey = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('terminal') || n.includes('unit')) return 'terminal';
  if (n.includes('half')) return 'half';
  if (n.includes('annual') || n.includes('final')) return 'annual';
  return 'other';
};

const fmt = (v: any) => {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, '');
};

const cell = (v: any, absent?: boolean) => (absent ? 'ABS' : fmt(v));

// =======================
// GENERATE RESULTS
// =======================
export const generateResults = async (req: Request, res: Response) => {
  try {
    const { session_id, exam_type_id, class_id } = req.body;

    if (!session_id || !exam_type_id || !class_id) {
      return res.status(400).json({ message: 'session_id, exam_type_id and class_id are required' });
    }

    const exams = await query(
      `SELECT id, max_marks, passing_marks FROM exams
       WHERE session_id = ? AND exam_type_id = ? AND class_id = ?`,
      [session_id, exam_type_id, class_id]
    );

    if (exams.length === 0) {
      return res.status(400).json({ message: 'No exams found for the selected criteria' });
    }

    const examIds = exams.map((e: any) => e.id);
    const placeholders = examIds.map(() => '?').join(',');

    const marksData = await query(
      `SELECT student_id,
              SUM(
                CASE
                  WHEN COALESCE(marks_ist, 0) + COALESCE(marks_iind, 0) > 0
                    THEN COALESCE(marks_ist, 0) + COALESCE(marks_iind, 0) + COALESCE(grace_marks, 0)
                  ELSE COALESCE(marks_obtained, 0) + COALESCE(grace_marks, 0)
                END
              ) AS total_obtained
       FROM marks
       WHERE exam_id IN (${placeholders}) AND is_absent = 0
       GROUP BY student_id`,
      examIds
    );

    const totalMaxMarks = exams.reduce((sum: number, e: any) => sum + parseFloat(e.max_marks || 0), 0);
    const grades = await query('SELECT * FROM grades ORDER BY min_percentage DESC');

    await withTransaction(async (connection) => {
      for (const row of marksData as any[]) {
        const studentId = row.student_id;
        const totalObtained = parseFloat(row.total_obtained || 0);
        const percentage = totalMaxMarks > 0 ? (totalObtained / totalMaxMarks) * 100 : 0;

        let gradeName = defaultGrade(percentage);
        for (const g of grades as any[]) {
          if (percentage >= parseFloat(g.min_percentage) && percentage <= parseFloat(g.max_percentage)) {
            gradeName = g.name;
            break;
          }
        }

        const passFail = percentage >= 33 ? 'Pass' : 'Fail';

        await connection.execute(
          `INSERT INTO results (student_id, session_id, exam_type_id, total_max_marks, total_marks_obtained, percentage, grade, pass_fail)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           total_max_marks = VALUES(total_max_marks),
           total_marks_obtained = VALUES(total_marks_obtained),
           percentage = VALUES(percentage),
           grade = VALUES(grade),
           pass_fail = VALUES(pass_fail)`,
          [studentId, session_id, exam_type_id, totalMaxMarks, totalObtained, percentage.toFixed(2), gradeName, passFail]
        );
      }

      await connection.execute(
        `UPDATE results r
         JOIN (
           SELECT r2.id, RANK() OVER (ORDER BY r2.total_marks_obtained DESC) AS rnk
           FROM results r2
           JOIN students s ON r2.student_id = s.id
           WHERE r2.session_id = ? AND r2.exam_type_id = ? AND s.class_id = ?
         ) ranked ON r.id = ranked.id
         SET r.\`rank\` = ranked.rnk`,
        [session_id, exam_type_id, class_id]
      );
    });

    res.json({ message: 'Results generated and ranked successfully', count: marksData.length });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error generating results', details: error.message });
  }
};

// =======================
// BULK ADMIT CARDS PDF (before exam)
// =======================
export const downloadAdmitCards = async (req: Request, res: Response) => {
  try {
    const settingsArr: any = await query('SELECT * FROM school_settings LIMIT 1');
    const settings = settingsArr[0] || { school_name: 'School ERP' };

    const { session_id, exam_type_id, class_id } = req.body;

    if (!session_id || !exam_type_id || !class_id) {
      return res.status(400).json({ message: 'session_id, exam_type_id and class_id are required' });
    }

    const students = await query(
      `SELECT s.id, s.first_name, s.last_name, s.roll_number, s.admission_number, s.photo_url, s.dob, s.gender,
              c.name AS class_name, c.level AS class_level, sec.name AS section_name, p.father_name, sess.name AS session_name
       FROM students s
       JOIN classes c ON s.class_id = c.id
       JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN parents p ON s.parent_id = p.id
       LEFT JOIN academic_sessions sess ON sess.id = ?
       WHERE s.class_id = ?
       ORDER BY CAST(s.roll_number AS UNSIGNED), s.first_name`,
      [session_id, class_id]
    );

    if (students.length === 0) {
      return res.status(404).json({
        message: 'Is class mein koi student nahi mila. Pehle Students page se student add karein, phir Admit Card release karein.'
      });
    }

    const schedule = await query(
      `SELECT e.exam_date, e.max_marks, sub.name AS subject_name, et.name AS exam_type_name
       FROM exams e
       JOIN subjects sub ON e.subject_id = sub.id
       JOIN exam_types et ON e.exam_type_id = et.id
       WHERE e.session_id = ? AND e.exam_type_id = ? AND e.class_id = ?
       ORDER BY e.exam_date ASC, sub.name ASC`,
      [session_id, exam_type_id, class_id]
    );

    const schoolRows: any = await query('SELECT * FROM school_settings LIMIT 1');
    const school = schoolRows[0] || {};
    const examTypeName =
      (schedule as any[])[0]?.exam_type_name ||
      ((await query('SELECT name FROM exam_types WHERE id = ?', [exam_type_id])) as any[])[0]?.name ||
      'Examination';
    const sessionName = (students as any[])[0]?.session_name || '';

    const scheduleRows = (schedule as any[])
      .map(
        (row, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="text-align:left;">${row.subject_name}</td>
          <td>${row.exam_date ? new Date(row.exam_date).toLocaleDateString('en-IN') : '-'}</td>
          <td>${row.max_marks ?? '-'}</td>
          <td></td>
        </tr>`
      )
      .join('');

    let htmlContent = `
      <html>
      <head>
        <style>
          @page { margin: 10mm; }
          * { box-sizing: border-box; }
          body { font-family: "Segoe UI", Arial, sans-serif; color: #1a2332; margin: 0; }
          .admit-card {
            page-break-after: always;
            border: 3px solid #0f4c81;
            border-radius: 10px;
            overflow: hidden;
            margin: 0 0 12px;
            background: linear-gradient(180deg, #f7fbff 0%, #ffffff 120px);
          }
          .band {
            background: linear-gradient(90deg, #0f4c81, #1f7a8c);
            color: #fff;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .school-block { flex: 1; text-align: center; }
          .school-name { font-size: 22px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; }
          .school-meta { font-size: 11px; opacity: 0.95; margin-top: 3px; }
          .badge {
            background: #f4a261;
            color: #1a2332;
            font-weight: 800;
            font-size: 12px;
            padding: 8px 12px;
            border-radius: 6px;
            white-space: nowrap;
          }
          .logo { height: 52px; width: 52px; object-fit: contain; background: #fff; border-radius: 8px; padding: 3px; }
          .body { padding: 16px 18px 18px; }
          .title-row { text-align: center; margin-bottom: 14px; }
          .title-row h1 {
            margin: 0;
            font-size: 18px;
            color: #0f4c81;
            border-bottom: 2px solid #f4a261;
            display: inline-block;
            padding-bottom: 4px;
          }
          .subtitle { font-size: 12px; color: #555; margin-top: 4px; }
          .main { display: flex; gap: 16px; }
          .info { flex: 1; }
          .info table { width: 100%; border-collapse: collapse; }
          .info td { padding: 7px 8px; font-size: 13px; border-bottom: 1px dashed #cfd8e3; }
          .info td.label { width: 38%; color: #5b6b7c; font-weight: 600; }
          .photo-wrap {
            width: 110px;
            text-align: center;
          }
          .photo {
            width: 104px; height: 124px;
            object-fit: cover;
            border: 2px solid #0f4c81;
            border-radius: 6px;
            background: #fff;
          }
          .photo-box {
            width: 104px; height: 124px;
            border: 2px dashed #0f4c81;
            border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; color: #667;
            background: #f3f7fb;
          }
          .schedule { width: 100%; border-collapse: collapse; margin-top: 16px; }
          .schedule th {
            background: #0f4c81; color: #fff;
            font-size: 11px; padding: 8px 6px; text-align: center;
          }
          .schedule td {
            border: 1px solid #b8c7d9; padding: 7px 6px; text-align: center; font-size: 12px;
          }
          .schedule tr:nth-child(even) td { background: #f4f8fc; }
          .note {
            margin-top: 12px;
            font-size: 11px;
            color: #444;
            background: #fff7eb;
            border-left: 4px solid #f4a261;
            padding: 8px 10px;
          }
          .sign-row {
            margin-top: 28px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 12px;
          }
          .sign { text-align: center; min-width: 140px; }
          .sign img { height: 42px; display: block; margin: 0 auto 4px; }
          .sign .line { border-top: 1px solid #333; padding-top: 4px; margin-top: 36px; }
        </style>
      </head>
      <body>
    `;

    for (const st of students as any[]) {
      htmlContent += `
        <div class="admit-card">
          <div class="band">
            ${school.logo_url ? `<img class="logo" src="${assetUrl(school.logo_url)}" />` : '<div style="width:52px"></div>'}
            <div class="school-block">
              <div class="school-name">${school.school_name || 'School ERP'}</div>
              <div class="school-meta">${school.address || ''}${school.phone ? ' | Ph: ' + school.phone : ''}</div>
            </div>
            <div class="badge">ADMIT CARD</div>
          </div>
          <div class="body">
            <div class="title-row">
              <h1>${examTypeName}</h1>
              <div class="subtitle">Session: ${sessionName || '-'} | Bring this card to every exam</div>
            </div>
            <div class="main">
              <div class="info">
                <table>
                  <tr><td class="label">Student Name</td><td><strong>${st.first_name} ${st.last_name || ''}</strong></td></tr>
                  <tr><td class="label">Father's Name</td><td>${st.father_name || '-'}</td></tr>
                  <tr><td class="label">Class & Section</td><td><strong>${st.class_name || ('Class ' + (st.class_level || ''))} - ${st.section_name}</strong></td></tr>
                  <tr><td class="label">Roll No</td><td>${st.roll_number || 'N/A'}</td></tr>
                  <tr><td class="label">Admission No</td><td>${st.admission_number}</td></tr>
                  <tr><td class="label">DOB / Gender</td><td>${st.dob ? new Date(st.dob).toLocaleDateString('en-IN') : '-'} / ${st.gender || '-'}</td></tr>
                </table>
              </div>
              <div class="photo-wrap">
                ${st.photo_url ? `<img class="photo" src="${assetUrl(st.photo_url)}" />` : '<div class="photo-box">PHOTO</div>'}
              </div>
            </div>
            ${
              schedule.length
                ? `<table class="schedule">
                    <thead>
                      <tr>
                        <th style="width:40px;">#</th>
                        <th>Subject</th>
                        <th>Exam Date</th>
                        <th>Max Marks</th>
                        <th>Invigilator Sign</th>
                      </tr>
                    </thead>
                    <tbody>${scheduleRows}</tbody>
                  </table>`
                : '<p style="margin-top:14px;font-size:13px;color:#666;">Exam timetable will be announced / attached by school.</p>'
            }
            <div class="note">
              Instructions: Carry this admit card and school ID. Mobile phones are not allowed in the exam hall.
              Reach the centre 15 minutes before start time.
            </div>
            <div class="sign-row">
              <div class="sign"><div class="line">Student Sign</div></div>
              <div class="sign"><div class="line">Class Teacher</div></div>
              <div class="sign">
                ${school.principal_signature_url ? `<img src="${assetUrl(school.principal_signature_url)}" />` : ''}
                <div class="line">Principal</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    htmlContent += '</body></html>';

    const pdfBuffer = await generatePDFFromHTML(htmlContent, 'A4', false);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk_admit_cards.pdf"');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error generating admit cards', details: error.message });
  }
};

// =======================
// BULK MARKSHEETS PDF (Terminal + Half Yearly + Annual like sample)
// =======================
export const downloadMarksheets = async (req: Request, res: Response) => {
  try {
    const settingsArr: any = await query('SELECT * FROM school_settings LIMIT 1');
    const settings = settingsArr[0] || { school_name: 'School ERP' };

    const userRole = (req as any).user?.role_id;
    if (userRole !== 1 && !settings.results_published) {
      return res.status(403).json({ message: 'Results are not released yet. Only Admin can view them.' });
    }

    const { session_id, class_id, student_id } = req.body;

    if (!session_id || !class_id) {
      return res.status(400).json({ message: 'session_id and class_id are required' });
    }

    let queryStr = `SELECT s.id, s.first_name, s.last_name, s.roll_number, s.admission_number, s.photo_url,
              c.name AS class_name, c.level AS class_level, sec.name AS section_name, sess.name AS session_name,
              p.father_name, p.mother_name
       FROM students s
       JOIN classes c ON s.class_id = c.id
       JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN parents p ON s.parent_id = p.id
       LEFT JOIN academic_sessions sess ON sess.id = ?
       WHERE s.class_id = ?`;
    const queryParams: any[] = [session_id, class_id];

    if (student_id) {
      queryStr += ` AND s.id = ?`;
      queryParams.push(student_id);
    }
    
    queryStr += ` ORDER BY CAST(s.roll_number AS UNSIGNED), s.first_name`;

    const students = await query(queryStr, queryParams);

    if (students.length === 0) {
      return res.status(404).json({ message: 'No students found for this class/session' });
    }

    const markRows = await query(
      `SELECT m.student_id, m.marks_ist, m.marks_iind, m.marks_obtained, m.grace_marks, m.is_absent,
              sub.id AS subject_id, sub.name AS subject_name,
              e.max_marks, e.exam_type_id, et.name AS exam_type_name
       FROM marks m
       JOIN exams e ON m.exam_id = e.id
       JOIN subjects sub ON e.subject_id = sub.id
       JOIN exam_types et ON e.exam_type_id = et.id
       WHERE e.session_id = ? AND e.class_id = ?
       ORDER BY sub.name ASC`,
      [session_id, class_id]
    );

    if ((markRows as any[]).length === 0) {
      return res.status(404).json({
        message: 'No marks found. Enter marks for Terminal / Half-Yearly / Annual exams first.'
      });
    }

    const results = await query(
      `SELECT r.*, et.name AS exam_type_name
       FROM results r
       JOIN exam_types et ON r.exam_type_id = et.id
       JOIN students s ON r.student_id = s.id
       WHERE r.session_id = ? AND s.class_id = ?`,
      [session_id, class_id]
    );

    const schoolRows: any = await query('SELECT * FROM school_settings LIMIT 1');
    const school = schoolRows[0] || {};
    const sessionName = (students as any[])[0]?.session_name || '';

    const subjectsMap = new Map<number, string>();
    for (const row of markRows as any[]) {
      subjectsMap.set(row.subject_id, row.subject_name);
    }
    const subjects = Array.from(subjectsMap.entries()).map(([id, name]) => ({ id, name }));

    const getPart = (row: any) => {
      const ist = parseFloat(row.marks_ist || 0);
      const iind = parseFloat(row.marks_iind || 0);
      if (ist > 0 || iind > 0) {
        return { ist, iind, total: ist + iind + parseFloat(row.grace_marks || 0) };
      }
      const total = parseFloat(row.marks_obtained || 0) + parseFloat(row.grace_marks || 0);
      // Split evenly display if only total exists: show total in Total, leave Ist/IInd blank-ish
      return { ist: '', iind: '', total };
    };

    let htmlContent = `
      <html>
      <head>
        <style>
          @page { margin: 8mm; size: A4 landscape; }
          body { font-family: Arial, Helvetica, sans-serif; color: #222; margin: 0; }
          .sheet {
            page-break-after: always;
            border: 3px solid #e85d04;
            padding: 10px;
          }
          .top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 8px;
          }
          .school-title {
            text-align: center;
            flex: 1;
          }
          .school-title h1 {
            margin: 0;
            font-size: 18px;
            color: #9a031e;
            text-transform: uppercase;
          }
          .school-title .sub { font-size: 11px; color: #444; }
          .meta-line {
            margin-top: 8px;
            font-size: 13px;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            border-bottom: 2px solid #e85d04;
            padding-bottom: 6px;
          }
          .meta-line strong { color: #9a031e; }
          .photo {
            width: 72px; height: 88px; object-fit: cover;
            border: 2px solid #e85d04;
          }
          .photo-box {
            width: 72px; height: 88px; border: 2px dashed #e85d04;
            display:flex; align-items:center; justify-content:center; font-size:10px; color:#777;
          }
          table.marks {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 6px;
          }
          table.marks th, table.marks td {
            border: 1px solid #333;
            padding: 3px 2px;
            text-align: center;
            vertical-align: middle;
          }
          table.marks th {
            background: #e85d04;
            color: #fff;
            font-weight: 700;
          }
          table.marks th.subhead { background: #f48c06; font-size: 9px; }
          table.marks td.subj { text-align: left; padding-left: 5px; font-weight: 600; white-space: nowrap; }
          table.marks tr.total-row td { background: #fff3e6; font-weight: 800; color: #9a031e; }
          .bottom {
            display: flex;
            gap: 10px;
            margin-top: 8px;
          }
          .summary {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 6px;
          }
          .box {
            border: 2px solid #e85d04;
            border-radius: 4px;
            padding: 6px;
            font-size: 10px;
          }
          .box h4 {
            margin: 0 0 4px;
            background: #9a031e;
            color: #fff;
            text-align: center;
            padding: 3px;
            font-size: 10px;
          }
          .final-wrap {
            width: 170px;
          }
          .final-box {
            border: 2px solid #9a031e;
            padding: 8px;
            font-size: 11px;
            margin-bottom: 6px;
          }
          .final-pct {
            border: 3px solid #9a031e;
            text-align: center;
            padding: 10px 6px;
            font-size: 18px;
            font-weight: 800;
            color: #9a031e;
          }
          .check { margin: 3px 0; }
          .signs {
            display: flex;
            justify-content: space-between;
            margin-top: 18px;
            font-size: 11px;
          }
          .signs .s { text-align: center; width: 28%; }
          .signs .line { border-top: 1px solid #333; margin-top: 34px; padding-top: 3px; }
        </style>
      </head>
      <body>
    `;

    for (const st of students as any[]) {
      const studentMarks = (markRows as any[]).filter((m) => m.student_id === st.id);
      const studentResults = (results as any[]).filter((r) => r.student_id === st.id);

      const byTermSubject: Record<string, Record<number, any>> = {
        terminal: {},
        half: {},
        annual: {},
      };

      for (const m of studentMarks) {
        const key = termKey(m.exam_type_name);
        if (!byTermSubject[key]) byTermSubject[key] = {};
        byTermSubject[key][m.subject_id] = m;
      }

      const emptyTerm = { ist: '', iind: '', total: '', max: '', absent: false };
      const readTerm = (bucket: Record<number, any>, subjectId: number) => {
        const row = bucket[subjectId];
        if (!row) return { ...emptyTerm };
        const part = getPart(row);
        return {
          ist: row.is_absent ? 'ABS' : part.ist,
          iind: row.is_absent ? '' : part.iind,
          total: row.is_absent ? 'ABS' : part.total,
          max: row.max_marks,
          absent: !!row.is_absent,
        };
      };

      let tTot = 0, tMax = 0, hTot = 0, hMax = 0, aTot = 0, aMax = 0, gTot = 0, gMax = 0;

      const bodyRows = subjects
        .map((sub) => {
          const t = readTerm(byTermSubject.terminal, sub.id);
          const h = readTerm(byTermSubject.half, sub.id);
          const a = readTerm(byTermSubject.annual, sub.id);

          const tTotalNum = typeof t.total === 'number' ? t.total : parseFloat(String(t.total || 0)) || 0;
          const hTotalNum = typeof h.total === 'number' ? h.total : parseFloat(String(h.total || 0)) || 0;
          const aTotalNum = typeof a.total === 'number' ? a.total : parseFloat(String(a.total || 0)) || 0;
          const tMaxNum = parseFloat(String(t.max || 0)) || 0;
          const hMaxNum = parseFloat(String(h.max || 0)) || 0;
          const aMaxNum = parseFloat(String(a.max || 0)) || 0;

          if (!t.absent && t.max) { tTot += tTotalNum; tMax += tMaxNum; }
          if (!h.absent && h.max) { hTot += hTotalNum; hMax += hMaxNum; }
          if (!a.absent && a.max) { aTot += aTotalNum; aMax += aMaxNum; }

          const obtained = (t.absent ? 0 : tTotalNum) + (h.absent ? 0 : hTotalNum) + (a.absent ? 0 : aTotalNum);
          const maximum = tMaxNum + hMaxNum + aMaxNum;
          gTot += obtained;
          gMax += maximum;

          return `
            <tr>
              <td class="subj">${sub.name}</td>
              <td>${cell(t.ist)}</td><td>${cell(t.iind)}</td><td>${cell(t.total, t.absent)}</td><td>${fmt(t.max)}</td>
              <td>${cell(h.ist)}</td><td>${cell(h.iind)}</td><td>${cell(h.total, h.absent)}</td><td>${fmt(h.max)}</td>
              <td>${cell(a.ist)}</td><td>${cell(a.iind)}</td><td>${cell(a.total, a.absent)}</td><td>${fmt(a.max)}</td>
              <td>${fmt(obtained)}</td><td>${fmt(maximum)}</td>
            </tr>`;
        })
        .join('');

      const pct = (obt: number, max: number) => (max > 0 ? ((obt / max) * 100).toFixed(2) : '-');
      const resultOf = (obt: number, max: number) => {
        if (max <= 0) return '-';
        return (obt / max) * 100 >= 33 ? 'Pass' : 'Fail';
      };

      const findResult = (needle: string) =>
        studentResults.find((r) => termKey(r.exam_type_name) === needle);

      const tRes = findResult('terminal');
      const hRes = findResult('half');
      const aRes = findResult('annual');

      const finalPct = pct(gTot, gMax);
      const finalPass = gMax > 0 && (gTot / gMax) * 100 >= 33;
      const gracePass = !finalPass && gMax > 0 && (gTot / gMax) * 100 >= 28;

      htmlContent += `
        <div class="sheet">
          <div class="top">
            <div style="width:72px;">
              ${school.logo_url ? `<img src="${assetUrl(school.logo_url)}" style="height:60px;object-fit:contain;" />` : ''}
            </div>
            <div class="school-title">
              <h1>${school.school_name || 'School ERP'}</h1>
              <div class="sub">${school.address || ''}${school.phone ? ' | ' + school.phone : ''}</div>
              <div class="sub" style="margin-top:3px;font-weight:700;color:#e85d04;">PROGRESS / MARKSHEET</div>
            </div>
            <div>
              ${st.photo_url ? `<img class="photo" src="${assetUrl(st.photo_url)}" />` : '<div class="photo-box">PHOTO</div>'}
            </div>
          </div>

          <div class="meta-line">
            <div>Student's Name: <strong>${st.first_name} ${st.last_name || ''}</strong></div>
            <div>Session: <strong>${sessionName}</strong></div>
            <div>Class: <strong>${st.class_name || ('Class ' + (st.class_level || ''))}-${st.section_name}</strong></div>
            <div>Roll No: <strong>${st.roll_number || '-'}</strong></div>
          </div>

          <table class="marks">
            <thead>
              <tr>
                <th rowspan="2">Subject</th>
                <th colspan="4">Terminal Exam</th>
                <th colspan="4">Half Yearly Exam</th>
                <th colspan="4">Annual Exam</th>
                <th colspan="2">Grand Total</th>
              </tr>
              <tr>
                <th class="subhead">Ist</th><th class="subhead">IInd</th><th class="subhead">Total</th><th class="subhead">Max Mark</th>
                <th class="subhead">Ist</th><th class="subhead">IInd</th><th class="subhead">Total</th><th class="subhead">Max Mark</th>
                <th class="subhead">Ist</th><th class="subhead">IInd</th><th class="subhead">Total</th><th class="subhead">Max Mark</th>
                <th class="subhead">Marks Obtained</th><th class="subhead">Maximum Marks</th>
              </tr>
            </thead>
            <tbody>
              ${bodyRows}
              <tr class="total-row">
                <td class="subj">Total</td>
                <td></td><td></td><td>${fmt(tTot)}</td><td>${fmt(tMax)}</td>
                <td></td><td></td><td>${fmt(hTot)}</td><td>${fmt(hMax)}</td>
                <td></td><td></td><td>${fmt(aTot)}</td><td>${fmt(aMax)}</td>
                <td>${fmt(gTot)}</td><td>${fmt(gMax)}</td>
              </tr>
            </tbody>
          </table>

          <div class="bottom">
            <div class="summary">
              <div class="box">
                <h4>TERMINAL EXAM</h4>
                <div>Percentage: <strong>${tRes?.percentage ?? pct(tTot, tMax)}%</strong></div>
                <div>Position: <strong>${tRes?.rank ?? '-'}</strong></div>
                <div>Result: <strong>${tRes?.pass_fail ?? resultOf(tTot, tMax)}</strong></div>
              </div>
              <div class="box">
                <h4>HALF YEARLY EXAM</h4>
                <div>Percentage: <strong>${hRes?.percentage ?? pct(hTot, hMax)}%</strong></div>
                <div>Position: <strong>${hRes?.rank ?? '-'}</strong></div>
                <div>Result: <strong>${hRes?.pass_fail ?? resultOf(hTot, hMax)}</strong></div>
              </div>
              <div class="box">
                <h4>ANNUAL EXAM</h4>
                <div>Percentage: <strong>${aRes?.percentage ?? pct(aTot, aMax)}%</strong></div>
                <div>Position: <strong>${aRes?.rank ?? '-'}</strong></div>
                <div>Result: <strong>${aRes?.pass_fail ?? resultOf(aTot, aMax)}</strong></div>
              </div>
            </div>
            <div class="final-wrap">
              <div class="final-box">
                <div style="font-weight:700;margin-bottom:4px;">FINAL EXAM</div>
                <div class="check">${finalPass && !gracePass ? '☑' : '☐'} Pass</div>
                <div class="check">${gracePass ? '☑' : '☐'} With Grace Pass</div>
                <div class="check">${!finalPass && !gracePass ? '☑' : '☐'} Fail</div>
              </div>
              <div class="final-pct">
                FINAL<br/>PERCENTAGE<br/>${finalPct}%
              </div>
            </div>
          </div>

          <div class="signs">
            <div class="s"><div class="line">Class Teacher Sign.</div></div>
            <div class="s"><div class="line">Guardian Sign.</div></div>
            <div class="s">
              ${school.principal_signature_url ? `<img src="${assetUrl(school.principal_signature_url)}" style="height:36px;display:block;margin:0 auto;" />` : ''}
              <div class="line">Principal Sign.</div>
            </div>
          </div>
        </div>
      `;
    }

    htmlContent += '</body></html>';

    const pdfBuffer = await generatePDFFromHTML(htmlContent, 'A4', true);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk_marksheets.pdf"');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error generating marksheets', details: error.message });
  }
};
