"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Contact,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Academic", href: "/admin/academic", icon: BookOpen },
  { name: "Teachers", href: "/admin/teachers", icon: Users },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Admit Cards", href: "/admin/admit-card", icon: Contact },
  { name: "Marks Entry", href: "/admin/exams", icon: FileText },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("/api/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setSchoolSettings(data))
      .catch((err) => console.error("Error fetching settings:", err));

    if (document.documentElement.classList.contains("dark")) {
      setDarkMode(true);
    }
  }, [router]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen app-shell-bg transition-colors duration-300">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0b1324]/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[17.5rem] nav-ink text-white transform transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="ambient-orb absolute -top-10 -right-10 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="ambient-orb absolute bottom-20 -left-10 h-32 w-32 rounded-full bg-rose-500/15 blur-3xl" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="relative flex h-[4.5rem] items-center justify-between px-5 border-b border-white/10">
          <Link href="/admin/dashboard" className="flex items-center gap-3 min-w-0">
            {schoolSettings?.logo_url ? (
              <img
                src={schoolSettings.logo_url}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover bg-white ring-2 ring-teal-400/40"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center ring-2 ring-white/10">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-display text-lg font-semibold truncate leading-tight">
                {schoolSettings?.school_name || "School ERP"}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-teal-200/80">Campus OS</div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="relative flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-white text-ink shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                    : "text-white/75 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? "bg-teal-600 text-white"
                      : "bg-white/5 text-teal-200 group-hover:bg-white/10"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="relative p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-200 rounded-xl hover:bg-rose-500/15 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-[17.5rem] flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 mx-3 mt-3 sm:mx-5 lg:mx-6">
          <div className="glass-panel rounded-2xl px-3 sm:px-5 py-2.5 flex items-center gap-3 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
            <button
              type="button"
              className="p-2 text-[var(--ink)]/70 lg:hidden shrink-0 rounded-xl hover:bg-black/5"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-5 text-xs sm:text-sm text-[var(--mute-text)]">
              {schoolSettings?.address && (
                <div className="flex items-center gap-1.5 min-w-0" title={schoolSettings.address}>
                  <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <span className="truncate">{schoolSettings.address.replace(/\s+/g, " ").trim()}</span>
                </div>
              )}
              {schoolSettings?.phone && (
                <a href={`tel:${schoolSettings.phone}`} className="flex items-center gap-1.5 shrink-0 hover:text-teal-800">
                  <Phone className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="font-semibold text-[var(--ink)] dark:text-white">{schoolSettings.phone}</span>
                </a>
              )}
              {schoolSettings?.email && (
                <a href={`mailto:${schoolSettings.email}`} className="hidden md:flex items-center gap-1.5 min-w-0 hover:text-teal-800">
                  <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">{schoolSettings.email}</span>
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-xl text-[var(--mute-text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-[var(--ink)] text-white text-sm font-bold flex items-center justify-center">
                A
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 py-6 px-3 sm:px-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
