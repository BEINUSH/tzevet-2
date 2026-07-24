import type { ReactNode } from "react";
import { AdminLogin } from "./AdminLogin";
import { isAdminAuthenticated } from "./auth-actions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdminAuthenticated())) return <AdminLogin />;
  return children;
}
