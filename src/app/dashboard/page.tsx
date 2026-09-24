"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type AuthUser, type Role } from "@/lib/api";

type ManagedUser = AuthUser & { isActive: boolean; createdAt: string };

const roleLabels: Record<Role, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  user: "User",
};

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState("");

  const canManage = me?.role === "super_admin" || me?.role === "admin";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    api<AuthUser>("/auth/me")
      .then((user) => {
        setMe(user);
        if (user.role === "super_admin" || user.role === "admin") {
          return api<ManagedUser[]>("/users").then(setUsers);
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.replace("/login");
      });
  }, [router]);

  async function changeRole(id: string, role: Role) {
    setError("");
    try {
      const updated = await api<ManagedUser>(`/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...updated } : user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role");
    }
  }

  async function changeStatus(id: string, isActive: boolean) {
    setError("");
    try {
      const updated = await api<ManagedUser>(`/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...updated } : user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    }
  }

  function signOut() {
    localStorage.removeItem("token");
    router.replace("/");
  }

  if (!me) {
    return <main className="px-6 py-16 text-sm text-zinc-400">Loading your account…</main>;
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">{roleLabels[me.role]}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{me.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">{me.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
        >
          Sign out
        </button>
      </div>

      {canManage ? (
        <section className="overflow-hidden rounded-2xl border border-white/10">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-medium">People</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {me.role === "super_admin"
                ? "You can change roles and account status."
                : "You can activate or deactivate users below your role."}
            </p>
          </div>
          {error ? <p className="px-5 pt-4 text-sm text-red-300">{error}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-white/10">
                    <td className="px-5 py-3">{user.name}</td>
                    <td className="px-5 py-3 text-zinc-400">{user.email}</td>
                    <td className="px-5 py-3">
                      {me.role === "super_admin" && user.id !== me.id ? (
                        <select
                          value={user.role}
                          onChange={(event) => changeRole(user.id, event.target.value as Role)}
                          className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super admin</option>
                        </select>
                      ) : (
                        roleLabels[user.role]
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {user.id !== me.id ? (
                        <button
                          type="button"
                          onClick={() => changeStatus(user.id, !user.isActive)}
                          className="text-left hover:text-white"
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </button>
                      ) : user.isActive ? (
                        "Active"
                      ) : (
                        "Inactive"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-medium">Your workspace</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            You are signed in as a user. Account management is available to admins and super admins.
          </p>
        </section>
      )}
    </main>
  );
}
