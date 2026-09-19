import React, { useState } from 'react';
import { Project, User, ProjectAssignment, UserRole } from '../types';
import { 
  Users2, 
  ShieldCheck, 
  UserCheck, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Lock,
  Sparkles,
  Phone,
  Briefcase,
  Building,
  UserCog,
  Calendar,
  Filter
} from 'lucide-react';

interface ProjectAssignmentsViewProps {
  projects: Project[];
  users: User[];
  assignments: ProjectAssignment[];
  currentUser: User;
  onAddAssignment: (assignment: Omit<ProjectAssignment, 'id'>) => void;
  onRemoveAssignment: (id: number) => void;
  onUpdateUserRole?: (userId: number, newRole: UserRole, isApproved?: boolean) => void;
}

export const ProjectAssignmentsView: React.FC<ProjectAssignmentsViewProps> = ({
  projects,
  users,
  assignments,
  currentUser,
  onAddAssignment,
  onRemoveAssignment,
  onUpdateUserRole,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users_management' | 'project_assignments'>('users_management');
  const [selectedProjectId, setSelectedProjectId] = useState<number>(projects[0]?.id || 1);
  const [selectedUserId, setSelectedUserId] = useState<number>(users[1]?.id || 2);
  const [selectedRoleInProject, setSelectedRoleInProject] = useState<'controller' | 'lead_pmo' | 'observer'>('controller');

  // Filter for users
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter === 'all') return true;
    if (userRoleFilter === 'pending') return u.isApproved === false;
    return u.role === userRoleFilter;
  });

  const pendingUsersCount = users.filter((u) => u.isApproved === false).length;

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'Admin') return;

    // Check if already exists
    const exists = assignments.some(
      (a) => a.projectId === selectedProjectId && a.userId === selectedUserId
    );

    if (exists) {
      alert('این کاربر قبلاً به این پروژه تخصیص داده شده است.');
      return;
    }

    onAddAssignment({
      projectId: selectedProjectId,
      userId: selectedUserId,
      roleInProject: selectedRoleInProject,
      assignedAt: new Intl.DateTimeFormat('fa-IR').format(new Date()),
      isActive: true,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users2 className="w-5 h-5 text-indigo-400" />
            <span>مدیریت کاربران، سطوح دسترسی و تخصیص پروژه (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            تعیین سطح دسترسی کاربران ثبت‌نام شده، نقش‌های سازمانی و انتساب کارشناسان به پروژه‌ها
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingUsersCount > 0 && (
            <div className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{pendingUsersCount} کاربر جدید در انتظار تعیین دسترسی</span>
            </div>
          )}
          <div className="text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            دسترسی شما: <strong>{currentUser.role === 'Admin' ? 'مدیر سیستم (حق ویرایش کامل)' : 'فقط مشاهده'}</strong>
          </div>
        </div>
      </div>

      {/* Subtabs */}
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 w-fit">
        <button
          id="btn-subtab-users"
          onClick={() => setActiveSubTab('users_management')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'users_management'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCog className="w-4 h-4" />
          <span>لیست پرسنل و تعیین سطح دسترسی ({users.length})</span>
          {pendingUsersCount > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingUsersCount}
            </span>
          )}
        </button>

        <button
          id="btn-subtab-assignments"
          onClick={() => setActiveSubTab('project_assignments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'project_assignments'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>ماتریس تخصیص پروژه ({assignments.length})</span>
        </button>
      </div>

      {/* RBAC Logic Explainer Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>منطق معماری کنترل دسترسی نقش‌محور (Role-Based Access Control) در سامانه:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-slate-300">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-rose-400 block mb-0.5">۱. نقش Admin (مدیر سیستم):</span>
            دسترسی نامحدود، ایجاد پروژه، تعیین نقش کاربران تازه‌وارد و نظارت بر کلیه پروژه‌ها.
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-sky-400 block mb-0.5">۲. نقش Project_Controller (کارشناس):</span>
            مجاز به ثبت و ویرایش گزارش‌های پیشرفت هفتگی فقط برای پروژه‌های منتسب در ماتریس.
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-0.5">۳. نقش Executive_Viewer (مدیران ارشد):</span>
            دسترسی فقط‌خواندنی (Read-Only) به داشبوردهای تحلیلی پورتفولیو، منحنی‌های S-Curve و شاخص‌های EVM.
          </div>
        </div>
      </div>

      {/* SUBTAB 1: USERS LIST & ACCESS LEVEL MANAGEMENT */}
      {activeSubTab === 'users_management' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">فیلتر بر اساس نقش:</span>
              <div className="flex gap-1.5">
                {[
                  { key: 'all', label: 'همه کاربران' },
                  { key: 'pending', label: 'در انتظار تایید / جدید' },
                  { key: 'Admin', label: 'مدیران ارشد (Admin)' },
                  { key: 'Project_Controller', label: 'کارشناسان کنترل پروژه' },
                  { key: 'Executive_Viewer', label: 'مدیران ناظر' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setUserRoleFilter(f.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                      userRoleFilter === f.key
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-400">
              نمایش <strong className="text-white">{filteredUsers.length}</strong> کاربر
            </div>
          </div>

          {/* Users Table */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 pr-2 font-medium">مشخصات پرسنلی</th>
                    <th className="pb-3 font-medium">سمت سازمانی</th>
                    <th className="pb-3 font-medium">واحد کاری</th>
                    <th className="pb-3 font-medium">شماره همراه</th>
                    <th className="pb-3 font-medium text-center">سطح دسترسی فعلی</th>
                    <th className="pb-3 font-medium text-center">پروژه‌های منتسب</th>
                    {currentUser.role === 'Admin' && (
                      <th className="pb-3 pl-2 font-medium text-center">تغییر سطح دسترسی (مدیریت Admin)</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((user) => {
                    const userAssignments = assignments.filter((a) => a.userId === user.id);
                    const isCurrentUser = currentUser.id === user.id;

                    return (
                      <tr key={user.id} className={`hover:bg-slate-800/40 transition ${user.isApproved === false ? 'bg-amber-500/5' : ''}`}>
                        
                        {/* Profile Info */}
                        <td className="py-3.5 pr-2">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar}
                              alt={user.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">{user.fullName}</span>
                                {isCurrentUser && (
                                  <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                    شما
                                  </span>
                                )}
                                {user.isApproved === false && (
                                  <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                                    ثبت‌نام جدید
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Position */}
                        <td className="py-3.5 text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{user.position || 'ثبت‌نشده'}</span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{user.department || 'دفتر مرکزی'}</span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 font-mono text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{user.phone || '-'}</span>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 text-center">
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            user.role === 'Admin'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : user.role === 'Project_Controller'
                              ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {user.role === 'Admin' && 'مدیر سیستم (Admin)'}
                            {user.role === 'Project_Controller' && 'کارشناس کنترل پروژه'}
                            {user.role === 'Executive_Viewer' && 'مدیر ارشد ناظر'}
                          </span>
                        </td>

                        {/* Assignments Count */}
                        <td className="py-3.5 text-center font-mono">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-xs">
                            {userAssignments.length} پروژه
                          </span>
                        </td>

                        {/* Admin Role Selector / Quick Actions */}
                        {currentUser.role === 'Admin' && (
                          <td className="py-3.5 pl-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <select
                                id={`select-role-${user.id}`}
                                value={user.role}
                                onChange={(e) => {
                                  if (onUpdateUserRole) {
                                    onUpdateUserRole(user.id, e.target.value as UserRole, true);
                                  }
                                }}
                                className="bg-slate-950 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                              >
                                <option value="Admin">مدیر سیستم (Admin)</option>
                                <option value="Project_Controller">کارشناس کنترل پروژه</option>
                                <option value="Executive_Viewer">مدیر ارشد ناظر</option>
                              </select>

                              {user.isApproved === false && (
                                <button
                                  onClick={() => {
                                    if (onUpdateUserRole) {
                                      onUpdateUserRole(user.id, user.role, true);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                  title="تایید حساب کاربری"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>تایید</span>
                                </button>
                              )}
                            </div>
                          </td>
                        )}

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUBTAB 2: PROJECT ASSIGNMENTS MATRIX */}
      {activeSubTab === 'project_assignments' && (
        <div className="space-y-6">
          {/* Admin Assignment Creation Form */}
          {currentUser.role === 'Admin' && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                افزودن تخصیص جدید (اتصال کارشناس به پروژه)
              </h2>

              <form onSubmit={handleCreateAssignment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-right">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">انتخاب پروژه</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">انتخاب کاربر / کارشناس</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role === 'Admin' ? 'مدیر ارشد' : u.role === 'Project_Controller' ? 'کارشناس کنترل' : 'مدیر ناظر'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">نقش در پروژه</label>
                  <select
                    value={selectedRoleInProject}
                    onChange={(e) => setSelectedRoleInProject(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="controller">کارشناس مسئول کنترل پروژه (Lead Controller)</option>
                    <option value="lead_pmo">کارشناس ارشد دفتر PMO</option>
                    <option value="observer">ناظر پروژه (Observer)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ثبت تخصیص در دیتابیس</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Assignments Table */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users2 className="w-4 h-4 text-sky-400" />
                لیست تخصیص‌های فعال (Project_Assignment Records)
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {assignments.length} رکورد انتساب فعال
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 pr-2 font-medium">پروژه</th>
                    <th className="pb-3 font-medium">کاربر / کارشناس منتسب</th>
                    <th className="pb-3 font-medium">سمت و واحد سازمانی</th>
                    <th className="pb-3 font-medium">مسئولیت در پروژه</th>
                    <th className="pb-3 font-medium">تاریخ انتساب</th>
                    <th className="pb-3 font-medium text-center">وضعیت دسترسی</th>
                    {currentUser.role === 'Admin' && <th className="pb-3 pl-2 font-medium text-center">حذف</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {assignments.map((assignment) => {
                    const project = projects.find((p) => p.id === assignment.projectId);
                    const user = users.find((u) => u.id === assignment.userId);

                    return (
                      <tr key={assignment.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 pr-2">
                          <div className="font-bold text-white">{project?.name || 'پروژه حذف‌شده'}</div>
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">{project?.code}</div>
                        </td>

                        <td className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={user?.avatar}
                              alt={user?.fullName}
                              className="w-7 h-7 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <div className="font-semibold text-slate-200">{user?.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{user?.phone || user?.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5">
                          <div className="text-slate-200">{user?.position || '-'}</div>
                          <div className="text-[10px] text-slate-400">{user?.department || '-'}</div>
                        </td>

                        <td className="py-3.5 text-slate-300">
                          {assignment.roleInProject === 'controller' && 'کارشناس کنترل پروژه مسئول'}
                          {assignment.roleInProject === 'lead_pmo' && 'کارشناس ارشد PMO'}
                          {assignment.roleInProject === 'observer' && 'ناظر پروژه'}
                        </td>

                        <td className="py-3.5 font-mono text-slate-400">{assignment.assignedAt}</td>

                        <td className="py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            مجاز به ثبت دیتا
                          </span>
                        </td>

                        {currentUser.role === 'Admin' && (
                          <td className="py-3.5 pl-2 text-center">
                            <button
                              onClick={() => onRemoveAssignment(assignment.id)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                              title="حذف انتساب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
