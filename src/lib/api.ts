export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export type Role = "super_admin" | "admin" | "user";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
};

type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
};

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | { success: false; message?: string }
    | null;

  if (!response.ok || !body || body.success === false) {
    throw new ApiRequestError(body && "message" in body && body.message ? body.message : "Request failed", response.status);
  }

  return body.data;
}
