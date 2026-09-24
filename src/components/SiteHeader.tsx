"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type AuthUser } from "@/lib/api";

export function SiteHeader() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    api<AuthUser>("/auth/me")
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
      });
  }, []);

  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Jersey
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-300">
          {user ? (
            <>
              <span className="hidden text-zinc-400 sm:inline">{user.name}</span>
              <Link href="/dashboard" className="hover:text-white">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-white">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-white px-4 py-2 font-medium text-zinc-950 hover:bg-zinc-200"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
