"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SchoolAuthBrand } from "../components/SchoolAuthBrand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-shell-bg relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="ambient-orb absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-400/25 blur-3xl" />
      <div className="ambient-orb absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-rose-500/20 blur-3xl" style={{ animationDelay: "1.2s" }} />

      <div className="relative w-full max-w-md animate-rise">
        <SchoolAuthBrand title="Sign in" subtitle="Access your campus workspace" />

        <div className="glass-panel rounded-[1.4rem] p-7 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--mute-text)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                placeholder="admin@school.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--mute-text)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ink)] text-white py-3 text-sm font-semibold hover:bg-teal-800 transition-colors disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--mute-text)]">
            New admin?{" "}
            <Link href="/register" className="font-semibold text-teal-700 hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
