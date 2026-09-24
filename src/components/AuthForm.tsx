"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";

type AuthResponse = {
  token: string;
  user: { id: string; name: string; email: string; role: string };
};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const payload = isRegister ? { name, email, password } : { email, password };
      const data = await api<AuthResponse>(isRegister ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      localStorage.setItem("token", data.token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{isRegister ? "Create account" : "Sign in"}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {isRegister ? "New accounts are created as users." : "Use the account you already have."}
        </p>
      </div>
      {isRegister ? (
        <label className="flex flex-col gap-2 text-sm">
          Name
          <input
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30"
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-2 text-sm">
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Password
        <input
          required
          minLength={8}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30"
        />
      </label>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-white px-5 py-3 text-sm font-medium text-zinc-950 disabled:opacity-60"
      >
        {pending ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
      </button>
      <p className="text-sm text-zinc-400">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-white">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Need an account?{" "}
            <Link href="/register" className="text-white">
              Create one
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
