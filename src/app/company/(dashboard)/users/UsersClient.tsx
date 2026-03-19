"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Trash2, Shield, Eye, Edit3 } from "lucide-react";
import { createCompanyUser, updateCompanyUser, deleteCompanyUser } from "@/app/actions/company-survey";

const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
    admin: { label: "管理者", color: "bg-red-100 text-red-700 border-red-200", description: "全機能にアクセス可能" },
    manager: { label: "マネージャー", color: "bg-amber-100 text-amber-700 border-amber-200", description: "担当部署の結果を閲覧可能" },
    viewer: { label: "閲覧者", color: "bg-blue-100 text-blue-700 border-blue-200", description: "許可されたサーベイ結果のみ閲覧可能" },
};

type User = {
    id: string;
    name: string;
    email: string;
    role: "admin" | "manager" | "viewer";
    department: string | null;
    is_active: boolean;
    created_at: string;
};

type Props = {
    users: User[];
    departments: string[];
};

export default function UsersClient({ users: initialUsers, departments }: Props) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Add form state
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newRole, setNewRole] = useState<"admin" | "manager" | "viewer">("viewer");
    const [newDepartment, setNewDepartment] = useState("");

    // Edit form state
    const [editName, setEditName] = useState("");
    const [editRole, setEditRole] = useState<"admin" | "manager" | "viewer">("viewer");
    const [editDepartment, setEditDepartment] = useState("");

    const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";

    async function handleAdd() {
        setSaving(true);
        setError(null);
        const result = await createCompanyUser({
            name: newName,
            email: newEmail,
            role: newRole,
            department: newDepartment || undefined,
        });
        if (result.error) {
            setError(result.error);
        } else if (result.data) {
            setUsers([...users, result.data as User]);
            setShowAddForm(false);
            setNewName("");
            setNewEmail("");
            setNewRole("viewer");
            setNewDepartment("");
        }
        setSaving(false);
    }

    async function handleUpdate(userId: string) {
        setSaving(true);
        setError(null);
        const result = await updateCompanyUser(userId, {
            name: editName,
            role: editRole,
            department: editDepartment,
        });
        if (result.error) {
            setError(result.error);
        } else {
            setUsers(users.map((u) => u.id === userId ? { ...u, name: editName, role: editRole, department: editDepartment || null } : u));
            setEditingId(null);
        }
        setSaving(false);
    }

    async function handleToggleActive(userId: string, isActive: boolean) {
        const result = await updateCompanyUser(userId, { is_active: !isActive });
        if (!result.error) {
            setUsers(users.map((u) => u.id === userId ? { ...u, is_active: !isActive } : u));
        }
    }

    async function handleDelete(userId: string) {
        if (!confirm("このユーザーを削除しますか？")) return;
        const result = await deleteCompanyUser(userId);
        if (!result.error) {
            setUsers(users.filter((u) => u.id !== userId));
        }
    }

    function startEdit(user: User) {
        setEditingId(user.id);
        setEditName(user.name);
        setEditRole(user.role);
        setEditDepartment(user.department || "");
    }

    return (
        <div className="space-y-6">
            {/* Role explanation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(ROLE_LABELS).map(([role, { label, color, description }]) => (
                    <div key={role} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-slate-400" />
                            <Badge className={color}>{label}</Badge>
                        </div>
                        <p className="text-xs text-slate-500">{description}</p>
                    </div>
                ))}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
            )}

            {/* User list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">ユーザー一覧 ({users.length})</h3>
                    <Button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        size="sm"
                    >
                        <UserPlus size={14} />
                        ユーザー追加
                    </Button>
                </div>

                {/* Add form */}
                {showAddForm && (
                    <div className="p-5 bg-indigo-50 border-b border-indigo-100 space-y-3">
                        <p className="text-sm font-medium text-indigo-800">新規ユーザー追加</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-600 font-medium">名前 *</label>
                                <input className={inputClass} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="山田 太郎" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-600 font-medium">メールアドレス *</label>
                                <input className={inputClass} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="yamada@example.com" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-600 font-medium">ロール</label>
                                <select className={inputClass} value={newRole} onChange={(e) => setNewRole(e.target.value as any)}>
                                    <option value="admin">管理者</option>
                                    <option value="manager">マネージャー</option>
                                    <option value="viewer">閲覧者</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-600 font-medium">部署</label>
                                <select className={inputClass} value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)}>
                                    <option value="">選択しない</option>
                                    {departments.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleAdd} disabled={saving || !newName.trim() || !newEmail.trim()} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {saving ? "保存中..." : "追加"}
                            </Button>
                            <Button onClick={() => setShowAddForm(false)} variant="outline" size="sm">キャンセル</Button>
                        </div>
                    </div>
                )}

                {users.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                        ユーザーがまだ登録されていません
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <div key={user.id} className={`p-5 ${!user.is_active ? "opacity-50 bg-slate-50" : "hover:bg-slate-50"} transition-colors`}>
                                {editingId === user.id ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-600 font-medium">名前</label>
                                                <input className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-600 font-medium">ロール</label>
                                                <select className={inputClass} value={editRole} onChange={(e) => setEditRole(e.target.value as any)}>
                                                    <option value="admin">管理者</option>
                                                    <option value="manager">マネージャー</option>
                                                    <option value="viewer">閲覧者</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-600 font-medium">部署</label>
                                                <select className={inputClass} value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)}>
                                                    <option value="">選択しない</option>
                                                    {departments.map((d) => (
                                                        <option key={d} value={d}>{d}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={() => handleUpdate(user.id)} disabled={saving} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                                {saving ? "保存中..." : "保存"}
                                            </Button>
                                            <Button onClick={() => setEditingId(null)} variant="outline" size="sm">キャンセル</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-medium text-slate-900">{user.name}</p>
                                                    <Badge className={ROLE_LABELS[user.role].color + " text-xs"}>
                                                        {ROLE_LABELS[user.role].label}
                                                    </Badge>
                                                    {!user.is_active && <Badge className="bg-slate-200 text-slate-500 text-xs">無効</Badge>}
                                                </div>
                                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                                {user.department && (
                                                    <p className="text-xs text-slate-400 mt-0.5">{user.department}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => startEdit(user)}
                                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                                title="編集"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(user.id, user.is_active)}
                                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                                title={user.is_active ? "無効化" : "有効化"}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                                title="削除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
