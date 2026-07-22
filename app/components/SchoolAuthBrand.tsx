"use client";

import { useEffect, useState } from "react";
import { GraduationCap, MapPin, Phone, Mail, Globe } from "lucide-react";

type Branding = {
  school_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
};

export function useSchoolBranding() {
  const [branding, setBranding] = useState<Branding>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => setBranding(data || {}))
      .catch(() => setBranding({}))
      .finally(() => setLoading(false));
  }, []);

  return { branding, loading };
}

export function SchoolAuthBrand({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { branding, loading } = useSchoolBranding();

  if (loading) {
    return (
      <div className="text-center mb-7">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-black/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="text-center mb-7">
      <div className="mx-auto mb-4 h-16 w-16 rounded-2xl overflow-hidden bg-[var(--ink)] text-white flex items-center justify-center shadow-xl ring-2 ring-teal-500/30">
        {branding.logo_url ? (
          <img src={branding.logo_url} alt="School logo" className="h-full w-full object-cover bg-white" />
        ) : (
          <GraduationCap className="h-8 w-8" />
        )}
      </div>

      <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">
        {branding.school_name || "School ERP"}
      </h1>
      <p className="mt-1.5 text-sm font-medium text-teal-800">{title}</p>

    </div>
  );
}
