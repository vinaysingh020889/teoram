"use client";
import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth";
import RequireAuth from "../../../../components/RequireAuth";

type U = {
  id: string;
  email: string;
  role: "ADMIN" | "EDITOR" | "ANALYST";
  active: boolean;
  name?: string | null;
};

export default function AdminUsersPage() {
  return (
    <RequireAuth role="ADMIN">
      <UsersInner />
    </RequireAuth>
  );
}

function UsersInner() {
  const { logout } = useAuth();
  const [list, setList] = useState<U[]>([]);
  const [form, setForm] = useState({ email: "", name: "", role: "EDITOR", password: "" });

  useEffect(() => {
    load();
  }, []);
  async function load() {
    const { data } = await api.get("/admin/users");
    setList(data?.data || []);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/admin/users", form);
    setForm({ email: "", name: "", role: "EDITOR", password: "" });
    await load();
  }

  async function update(id: string, patch: Partial<U> & { newPassword?: string }) {
    await api.patch(`/admin/users/${id}`, patch);
    await load();
  }

  return (
    <main className="p-6 grid gap-4">
      <div className="flex justify-between">
        <h1 className="h1">Admin · Users</h1>
       
      </div>

      {/* Create user */}
      <form onSubmit={createUser} className="card grid gap-2">
        <input
          className="input"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="input"
          placeholder="Name (optional)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          className="select"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="EDITOR">EDITOR</option>
          <option value="ANALYST">ANALYST</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <input
          className="input"
          type="password"
          placeholder="Temp password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className="btn btn--primary">Create</button>
      </form>

      {/* List users */}
      <section className="card">
        <h2 className="h2 mb-2">All users</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.name || "—"}</td>
                <td>
                  <select
                    className="select"
                    value={u.role}
                    onChange={(e) => update(u.id, { role: e.target.value as any })}
                  >
                    <option value="EDITOR">EDITOR</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td>
                  {u.active ? (
                    <span className="badge badge--ok">Active</span>
                  ) : (
                    <span className="badge badge--warn">Disabled</span>
                  )}
                </td>
                <td className="flex gap-2">
                  <button className="btn" onClick={() => update(u.id, { active: !u.active })}>
                    {u.active ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="btn"
                    onClick={async () => {
                      const np = prompt("New password");
                      if (np) await update(u.id, { newPassword: np });
                    }}
                  >
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
