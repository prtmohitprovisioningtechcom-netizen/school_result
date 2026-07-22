"use client";

import {
  Users,
  BookOpen,
  GraduationCap,
  Activity,
  FileText,
  Settings,
  Contact,
  ArrowUpRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Dashboard() {
  const [statsData, setStatsData] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalTeachers: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatsData(data.stats);
        setRecentActivities(data.recentActivities || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: "Students",
      value: statsData.totalStudents,
      hint: "Active records",
      icon: Users,
      tone: "from-teal-500/20 to-teal-600/5 text-teal-800",
      iconBg: "bg-teal-600",
      href: "/admin/students",
      delay: "animate-rise-delay-1",
    },
    {
      title: "Classes",
      value: statsData.totalClasses,
      hint: "Academic structure",
      icon: BookOpen,
      tone: "from-amber-500/20 to-amber-600/5 text-amber-900",
      iconBg: "bg-amber-600",
      href: "/admin/academic",
      delay: "animate-rise-delay-2",
    },
    {
      title: "Teachers",
      value: statsData.totalTeachers,
      hint: "Staff accounts",
      icon: GraduationCap,
      tone: "from-rose-500/20 to-rose-600/5 text-rose-900",
      iconBg: "bg-rose-600",
      href: "/admin/teachers",
      delay: "animate-rise-delay-3",
    },
  ];

  const actions = [
    { href: "/admin/students", label: "Add Student", icon: Users, color: "text-teal-700 bg-teal-50" },
    { href: "/admin/exams", label: "Enter Marks", icon: FileText, color: "text-amber-700 bg-amber-50" },
    { href: "/admin/admit-card", label: "Admit Cards", icon: Contact, color: "text-rose-700 bg-rose-50" },
    { href: "/admin/settings", label: "Settings", icon: Settings, color: "text-slate-700 bg-slate-100" },
  ];

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-6xl">
      <section className="animate-rise relative overflow-hidden rounded-[1.6rem] border border-white/70 dark:border-white/10 bg-[var(--ink)] text-white px-6 py-7 sm:px-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-teal-400/25 blur-3xl ambient-orb" />
          <div className="absolute left-1/3 -bottom-20 h-40 w-40 rounded-full bg-rose-500/20 blur-3xl ambient-orb" style={{ animationDelay: "2s" }} />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.22em] text-teal-200/90 mb-2">Campus control</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight max-w-xl">
            Run school ops with a clean, fast desk.
          </h1>
          <p className="mt-3 text-sm text-white/70 max-w-lg">
            Students, marks, admit cards — everything in one sharp workspace.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.title}
            href={stat.href}
            className={`animate-rise ${stat.delay} group relative overflow-hidden rounded-2xl border border-white/80 dark:border-white/10 stat-shine p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 transition-transform duration-300`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.tone} opacity-80`} />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                  {stat.title}
                </div>
                <div className="mt-2 font-display text-4xl font-semibold text-[var(--ink)] dark:text-white">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs text-black/45 dark:text-white/45">{stat.hint}</div>
              </div>
              <div className={`h-11 w-11 rounded-xl ${stat.iconBg} text-white flex items-center justify-center shadow-lg`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="relative mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--ink)]/60 dark:text-white/60 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
              Open <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <h3 className="font-display text-xl font-semibold text-[var(--ink)] dark:text-white">Quick Actions</h3>
          <p className="text-xs text-[var(--mute-text)] mt-1 mb-4">Jump straight into daily work</p>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 hover:border-teal-500/30 hover:shadow-md transition-all"
              >
                <div className={`h-9 w-9 rounded-lg ${a.color} flex items-center justify-center mb-3`}>
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold text-[var(--ink)] dark:text-white">{a.label}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 glass-panel rounded-2xl p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <h3 className="font-display text-xl font-semibold text-[var(--ink)] dark:text-white">Recent Activity</h3>
          <p className="text-xs text-[var(--mute-text)] mt-1 mb-4">Latest moves across the campus OS</p>
          <ul className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-center gap-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] px-3 py-3"
                >
                  <span className="h-9 w-9 rounded-lg bg-[var(--ink)] text-white flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--ink)] dark:text-white truncate">
                      <span className="font-semibold">{activity.user_name || "User"}</span>{" "}
                      <span className="text-[var(--mute-text)]">{activity.action}</span>
                    </p>
                  </div>
                  <time className="text-[11px] text-[var(--mute-text)] shrink-0">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </time>
                </li>
              ))
            ) : (
              <li className="text-center py-8 text-sm text-[var(--mute-text)]">No recent activities yet.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
