/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Project, 
  WeeklyProgressReport, 
  ProjectAssignment, 
  ActiveTab,
  UserRole,
  ProjectStatus,
  AppNotification,
  ProjectScheduleTask,
  Organization
} from './types';
import { 
  initialUsers, 
  initialProjects, 
  initialWeeklyReports, 
  initialAssignments,
  initialOrganizations
} from './data/initialData';
import { 
  generateSystemNotifications, 
  getReadNotificationIds, 
  saveReadNotificationIds,
  getDismissedNotificationIds,
  saveDismissedNotificationIds
} from './utils/notificationService';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ProjectsView } from './components/ProjectsView';
import { WeeklyReportsListView } from './components/WeeklyReportsListView';
import { ProjectAssignmentsView } from './components/ProjectAssignmentsView';
import { DjangoCodeHubView } from './components/DjangoCodeHubView';
import { EVMAnalyticsView } from './components/EVMAnalyticsView';
import { SCurveGalleryView } from './components/SCurveGalleryView';
import { WeeklyReportFormModal } from './components/WeeklyReportFormModal';
import { NewProjectModal } from './components/NewProjectModal';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { AIPMOAdvisorModal } from './components/AIPMOAdvisorModal';
import { UserProfileModal } from './components/UserProfileModal';
import { ProjectActivitiesModal } from './components/ProjectActivitiesModal';
import { NewOrganizationModal } from './components/NewOrganizationModal';
import { AuthScreen } from './components/AuthScreen';
import { CheckCircle2, Info } from 'lucide-react';

export default function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('pmo_is_authenticated');
    return saved === 'true';
  });

  // Users state (with LocalStorage persistence)
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('pmo_users_data');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  // Current logged in user (with RBAC role)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedCurrentUserId = localStorage.getItem('pmo_current_user_id');
    if (savedCurrentUserId) {
      const found = (users && users.length > 0 ? users : initialUsers).find(
        (u) => u.id === Number(savedCurrentUserId)
      );
      if (found) return found;
    }
    return initialUsers[0]; // Default: Admin
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Organizations state (with LocalStorage persistence)
  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    const saved = localStorage.getItem('pmo_organizations_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved organizations', e);
      }
    }
    return initialOrganizations;
  });

  // Active Organization ID
  const [activeOrgId, setActiveOrgId] = useState<string>(() => {
    const saved = localStorage.getItem('pmo_active_org_id');
    return saved || 'org_keyhan';
  });

  // Current Organization computed object
  const currentOrganization = useMemo(() => {
    const found = organizations.find((o) => o.id === activeOrgId);
    return found || organizations[0] || initialOrganizations[0];
  }, [organizations, activeOrgId]);

  // If currentUser is changed and doesn't have access to activeOrgId, auto-lock to their assigned org
  useEffect(() => {
    const isSuperAdmin = currentUser.role === 'Admin' || currentUser.isSuperAdmin === true;
    const userAllowed = currentUser.allowedOrganizationIds || [currentUser.organizationId || 'org_keyhan'];
    if (!isSuperAdmin && !userAllowed.includes(activeOrgId)) {
      const fallbackOrg = userAllowed[0] || 'org_keyhan';
      setActiveOrgId(fallbackOrg);
    }
  }, [currentUser, activeOrgId]);

  // Persist organizations and activeOrgId
  useEffect(() => {
    localStorage.setItem('pmo_organizations_data', JSON.stringify(organizations));
  }, [organizations]);

  useEffect(() => {
    localStorage.setItem('pmo_active_org_id', activeOrgId);
  }, [activeOrgId]);

  // Persistence in LocalStorage
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('pmo_projects_data');
    return saved ? JSON.parse(saved) : initialProjects;
  });

  const [reports, setReports] = useState<WeeklyProgressReport[]>(() => {
    const saved = localStorage.getItem('pmo_weekly_reports_data');
    return saved ? JSON.parse(saved) : initialWeeklyReports;
  });

  const [assignments, setAssignments] = useState<ProjectAssignment[]>(() => {
    const saved = localStorage.getItem('pmo_assignments_data');
    return saved ? JSON.parse(saved) : initialAssignments;
  });

  // Scoped projects strictly for active organization (Isolated Silo)
  const scopedProjects = useMemo(() => {
    return projects.filter((p) => (p.organizationId || 'org_keyhan') === activeOrgId);
  }, [projects, activeOrgId]);

  // Scoped reports strictly for active organization
  const scopedReports = useMemo(() => {
    const scopedProjectIds = new Set(scopedProjects.map((p) => p.id));
    return reports.filter((r) => {
      if (r.organizationId) {
        return r.organizationId === activeOrgId;
      }
      return scopedProjectIds.has(r.projectId);
    });
  }, [reports, scopedProjects, activeOrgId]);

  // Scoped assignments strictly for active organization
  const scopedAssignments = useMemo(() => {
    const scopedProjectIds = new Set(scopedProjects.map((p) => p.id));
    return assignments.filter((a) => {
      if (a.organizationId) {
        return a.organizationId === activeOrgId;
      }
      return scopedProjectIds.has(a.projectId);
    });
  }, [assignments, scopedProjects, activeOrgId]);

  // Notification read/dismissed state
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => getReadNotificationIds());
  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(() => getDismissedNotificationIds());

  // Dynamically compute active system notifications for the current organization
  const notifications = useMemo(() => {
    return generateSystemNotifications(scopedProjects, scopedReports, currentUser).filter(
      (n) => !dismissedNotifIds.has(n.id)
    ).map((n) => ({
      ...n,
      isRead: readNotifIds.has(n.id),
    }));
  }, [scopedProjects, scopedReports, currentUser, readNotifIds, dismissedNotifIds]);

  const handleMarkAsRead = (id: string) => {
    setReadNotifIds((prev: Set<string>) => {
      const next = new Set<string>(prev);
      next.add(id);
      saveReadNotificationIds(next);
      return next;
    });
  };

  const handleMarkAllAsRead = () => {
    setReadNotifIds((prev: Set<string>) => {
      const next = new Set<string>(prev);
      notifications.forEach((n) => next.add(n.id));
      saveReadNotificationIds(next);
      return next;
    });
    showToast('تمامی اعلان‌ها به‌عنوان خوانده‌شده علامت‌گذاری شدند.');
  };

  const handleDismissNotification = (id: string) => {
    setDismissedNotifIds((prev: Set<string>) => {
      const next = new Set<string>(prev);
      next.add(id);
      saveDismissedNotificationIds(next);
      return next;
    });
  };

  const handleClearReadNotifications = () => {
    setDismissedNotifIds((prev: Set<string>) => {
      const next = new Set<string>(prev);
      notifications.filter((n) => n.isRead).forEach((n) => next.add(n.id));
      saveDismissedNotificationIds(next);
      return next;
    });
    showToast('اعلان‌های خوانده‌شده پاک‌سازی شدند.');
  };

  const handleNotificationAction = (notif: AppNotification) => {
    if (notif.projectId) {
      const proj = projects.find((p) => p.id === notif.projectId);
      if (proj) {
        if (notif.actionType === 'new_report') {
          handleOpenNewReport(proj.id);
          return;
        }
        if (notif.actionType === 'scurve') {
          setActiveTab('scurve_analytics');
          return;
        }
        if (notif.actionType === 'view_reports') {
          setActiveTab('weekly_reports');
          return;
        }
        // Default action: open project detail modal
        setSelectedProjectForDetail(proj);
        return;
      }
    }
    if (notif.actionType === 'scurve') {
      setActiveTab('scurve_analytics');
    } else if (notif.actionType === 'view_reports') {
      setActiveTab('weekly_reports');
    } else if (notif.actionType === 'new_report') {
      handleOpenNewReport();
    }
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('pmo_is_authenticated', isAuthenticated.toString());
  }, [isAuthenticated]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pmo_current_user_id', currentUser.id.toString());
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('pmo_users_data', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('pmo_projects_data', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('pmo_weekly_reports_data', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('pmo_assignments_data', JSON.stringify(assignments));
  }, [assignments]);

  // Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportModalProjectId, setReportModalProjectId] = useState<number | undefined>(undefined);
  const [editingReport, setEditingReport] = useState<WeeklyProgressReport | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isNewOrgModalOpen, setIsNewOrgModalOpen] = useState<boolean>(false);
  const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<Project | null>(null);
  const [selectedProjectForActivities, setSelectedProjectForActivities] = useState<Project | null>(null);

  // Toast message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Organization Management Handlers
  const handleSaveOrganization = (newOrg: Organization) => {
    setOrganizations((prev) => [...prev, newOrg]);
    setActiveOrgId(newOrg.id);
    setActiveTab('projects');
    showToast(`سازمان «${newOrg.name}» با موفقیت ایجاد و فضای کاری اختصاصی آن فعال گردید.`);
  };

  const handleSelectOrganization = (orgId: string) => {
    setActiveOrgId(orgId);
    const org = organizations.find((o) => o.id === orgId);
    showToast(`فضای کاری به سازمان «${org?.name || ''}» تغییر یافت.`);
  };

  // Save Project Schedule Tasks (WBS)
  const handleSaveProjectSchedule = (projectId: number, updatedTasks: ProjectScheduleTask[]) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            scheduleTasks: updatedTasks,
            updatedAt: new Date().toISOString().split('T')[0],
          };
        }
        return p;
      })
    );
    showToast('ساختار شکست کار و فعالیت‌های پروژه با موفقیت ذخیره شدند.');
  };

  // User Profile Update Handler
  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    showToast(`خوش آمدید، ${user.fullName} (${user.role === 'Admin' ? 'مدیر ارشد PMO' : user.role === 'Project_Controller' ? 'کارشناس کنترل پروژه' : 'مدیر ناظر'})`);
  };

  const handleRegisterNewUser = (newUser: User) => {
    // Add user to state and users array
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    showToast(`ثبت‌نام شما با موفقیت انجام شد! مشخصات سازمانی شما به پرتال مدیر ارشد PMO ارسال گردید.`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    showToast('با موفقیت از حساب کاربری خارج شدید.');
  };

  // Admin Updates User Role
  const handleUpdateUserRole = (userId: number, newRole: UserRole, isApproved: boolean = true) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return { ...u, role: newRole, isApproved };
        }
        return u;
      })
    );

    // If updating current user's role
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, role: newRole, isApproved }));
    }

    const updatedUser = users.find((u) => u.id === userId);
    showToast(`سطح دسترسی کاربر «${updatedUser?.fullName || ''}» به «${newRole}» به‌روزرسانی شد.`);
  };

  // Handlers
  const handleOpenNewReport = (projectId?: number) => {
    setEditingReport(null);
    setReportModalProjectId(projectId);
    setIsReportModalOpen(true);
  };

  const handleEditReport = (report: WeeklyProgressReport) => {
    setEditingReport(report);
    setReportModalProjectId(report.projectId);
    setIsReportModalOpen(true);
  };

  const handleSaveReport = (
    reportData: Omit<WeeklyProgressReport, 'id' | 'createdAt'>,
    existingReportId?: number
  ) => {
    if (existingReportId) {
      setReports((prev) =>
        prev.map((r) =>
          r.id === existingReportId
            ? {
                ...r,
                ...reportData,
              }
            : r
        )
      );
      showToast('گزارش پیشرفت پروژه با موفقیت اصلاح و به‌روزرسانی شد.');
    } else {
      const newReport: WeeklyProgressReport = {
        ...reportData,
        id: Date.now(),
        organizationId: activeOrgId,
        createdAt: new Date().toISOString(),
      };

      setReports((prev) => [newReport, ...prev]);
      showToast('گزارش پیشرفت پروژه با موفقیت در دیتابیس ثبت و شاخص‌ها به‌روزرسانی شدند.');
    }

    // Update project status if changed, and update description with the latest report's key issues/delays
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === reportData.projectId) {
          const updated: Project = {
            ...p,
            updatedAt: new Date().toISOString(),
          };
          if (reportData.projectStatus) {
            updated.status = reportData.projectStatus;
          }
          if (reportData.keyIssuesAndDelays && reportData.keyIssuesAndDelays.trim()) {
            updated.description = reportData.keyIssuesAndDelays.trim();
          }
          return updated;
        }
        return p;
      })
    );
  };

  const handleDeleteReport = (reportId: number) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    showToast('گزارش پیشرفت با موفقیت حذف گردید.');
  };

  const handleSaveProject = (newProjectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProj: Project = {
      ...newProjectData,
      id: Date.now(),
      organizationId: activeOrgId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjects((prev) => [newProj, ...prev]);

    // Automatically assign the current user if controller
    if (currentUser.role === 'Project_Controller') {
      setAssignments((prev) => [
        ...prev,
        {
          id: Date.now(),
          projectId: newProj.id,
          userId: currentUser.id,
          roleInProject: 'controller',
          assignedAt: new Intl.DateTimeFormat('fa-IR').format(new Date()),
          isActive: true,
          organizationId: activeOrgId,
        },
      ]);
    }

    // Switch to projects tab to display the freshly submitted project
    setActiveTab('projects');

    showToast(`پروژه «${newProj.name}» با موفقیت ثبت و جهت تایید به کارتابل مدیرعامل ارسال شد.`);
  };

  const handleUpdateProjectStatus = (projectId: number, newStatus: ProjectStatus) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, status: newStatus, updatedAt: new Date().toISOString() }
          : p
      )
    );
    showToast('وضعیت پروژه با موفقیت به‌روزرسانی شد.');
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === updatedProject.id
          ? { ...updatedProject, updatedAt: new Date().toISOString() }
          : p
      )
    );
    showToast(`اطلاعات پروژه «${updatedProject.name}» با موفقیت ثبت شد.`);
  };

  const handleAddAssignment = (newAssign: Omit<ProjectAssignment, 'id'>) => {
    const item: ProjectAssignment = {
      ...newAssign,
      id: Date.now(),
    };
    setAssignments((prev) => [...prev, item]);
    showToast('تخصیص کاربر به پروژه با موفقیت ثبت شد.');
  };

  const handleRemoveAssignment = (id: number) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    showToast('تخصیص مورد نظر حذف گردید.');
  };

  // If not authenticated, render Authentication and Registration Portal
  if (!isAuthenticated) {
    return (
      <AuthScreen
        users={users}
        currentOrganization={currentOrganization}
        onLoginSuccess={handleLoginSuccess}
        onRegisterNewUser={handleRegisterNewUser}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200" dir="rtl">
      
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        users={users}
        currentOrganization={currentOrganization}
        organizations={organizations}
        onSelectOrganization={handleSelectOrganization}
        onOpenNewOrganizationModal={() => setIsNewOrgModalOpen(true)}
        onSelectUser={(u) => {
          setCurrentUser(u);
          showToast(`کاربر فعال به «${u.fullName} (${u.role})» تغییر یافت.`);
        }}
        onLogout={handleLogout}
        onOpenNewReport={() => handleOpenNewReport()}
        onOpenNewProject={() => setIsNewProjectModalOpen(true)}
        onOpenAIAdvisor={() => setIsAIAdvisorOpen(true)}
        onSelectTab={setActiveTab}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDismissNotification={handleDismissNotification}
        onClearReadNotifications={handleClearReadNotifications}
        onNotificationAction={handleNotificationAction}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto">
        
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
          users={users}
          currentOrganization={currentOrganization}
          onSelectUser={(u) => {
            setCurrentUser(u);
            showToast(`کاربر فعال به «${u.fullName} (${u.role === 'Admin' ? 'مدیر سیستم' : u.role === 'Project_Controller' ? 'کنترل پروژه' : 'مدیر ارشد'})» تغییر یافت.`);
          }}
          projectsCount={scopedProjects.length}
          reportsCount={scopedReports.length}
          onOpenAIAdvisor={() => setIsAIAdvisorOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        {/* Dynamic View Panel (Strictly Scoped to Active Organization) */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              projects={scopedProjects}
              reports={scopedReports}
              currentUser={currentUser}
              onSelectProject={(proj) => setSelectedProjectForDetail(proj)}
              onOpenNewReport={handleOpenNewReport}
              onOpenAIAdvisor={() => setIsAIAdvisorOpen(true)}
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              projects={scopedProjects}
              reports={scopedReports}
              assignments={scopedAssignments}
              users={users}
              currentUser={currentUser}
              onSelectProject={(proj) => setSelectedProjectForDetail(proj)}
              onOpenNewReport={handleOpenNewReport}
              onOpenNewProject={() => setIsNewProjectModalOpen(true)}
              onUpdateProjectStatus={handleUpdateProjectStatus}
              onUpdateProject={handleUpdateProject}
              onOpenActivities={(proj) => setSelectedProjectForActivities(proj)}
            />
          )}

          {activeTab === 'weekly_reports' && (
            <WeeklyReportsListView
              reports={scopedReports}
              projects={scopedProjects}
              users={users}
              currentUser={currentUser}
              onOpenNewReport={handleOpenNewReport}
              onEditReport={handleEditReport}
              onDeleteReport={handleDeleteReport}
              onSelectProject={(proj) => setSelectedProjectForDetail(proj)}
            />
          )}

          {activeTab === 'evm_analytics' && (
            <EVMAnalyticsView
              projects={scopedProjects}
              reports={scopedReports}
              onSelectProject={(proj) => setSelectedProjectForDetail(proj)}
            />
          )}

          {activeTab === 'scurve_analytics' && (
            <SCurveGalleryView
              projects={scopedProjects}
              reports={scopedReports}
              currentUser={currentUser}
              onSelectProject={(proj) => setSelectedProjectForDetail(proj)}
              onOpenNewReport={handleOpenNewReport}
            />
          )}

          {activeTab === 'assignments' && (
            <ProjectAssignmentsView
              projects={scopedProjects}
              users={users}
              assignments={scopedAssignments}
              currentUser={currentUser}
              onAddAssignment={handleAddAssignment}
              onRemoveAssignment={handleRemoveAssignment}
              onUpdateUserRole={handleUpdateUserRole}
            />
          )}

          {activeTab === 'django_code_hub' && (
            <DjangoCodeHubView />
          )}
        </main>
      </div>

      {/* Modals */}
      <WeeklyReportFormModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setEditingReport(null);
          setReportModalProjectId(undefined);
        }}
        projects={scopedProjects}
        assignments={scopedAssignments}
        currentUser={currentUser}
        selectedProjectId={reportModalProjectId}
        editingReport={editingReport}
        onSaveReport={handleSaveReport}
      />

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        projects={scopedProjects}
        currentUser={currentUser}
        onSaveProject={handleSaveProject}
      />

      {/* New Organization Modal */}
      <NewOrganizationModal
        isOpen={isNewOrgModalOpen}
        onClose={() => setIsNewOrgModalOpen(false)}
        onSaveOrganization={handleSaveOrganization}
        existingOrganizations={organizations}
      />

      {selectedProjectForDetail && (
        <ProjectDetailModal
          project={selectedProjectForDetail}
          onClose={() => setSelectedProjectForDetail(null)}
          reports={scopedReports}
          assignments={scopedAssignments}
          users={users}
          currentUser={currentUser}
          onOpenNewReport={(pId) => {
            setSelectedProjectForDetail(null);
            handleOpenNewReport(pId);
          }}
          onEditReport={(rep) => {
            setSelectedProjectForDetail(null);
            handleEditReport(rep);
          }}
          onOpenActivities={(proj) => {
            setSelectedProjectForActivities(proj);
          }}
          onUpdateProject={(updatedProj) => {
            handleUpdateProject(updatedProj);
            setSelectedProjectForDetail(updatedProj);
          }}
        />
      )}

      {selectedProjectForActivities && (
        <ProjectActivitiesModal
          isOpen={!!selectedProjectForActivities}
          project={selectedProjectForActivities}
          onClose={() => setSelectedProjectForActivities(null)}
          onSaveTasks={handleSaveProjectSchedule}
          currentUser={currentUser}
        />
      )}

      <AIPMOAdvisorModal
        isOpen={isAIAdvisorOpen}
        onClose={() => setIsAIAdvisorOpen(false)}
        projects={scopedProjects}
        reports={scopedReports}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        projects={scopedProjects}
        showToast={showToast}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 border border-emerald-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
