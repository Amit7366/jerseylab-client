import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl px-6 py-16">
      <AuthForm mode="register" />
    </main>
  );
}
