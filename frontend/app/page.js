"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Archive, ArrowUpRight, Bell, CalendarDays, Check, CheckCircle2,
  ChevronDown, Circle, Clock3, Command, Filter, FolderKanban, LayoutDashboard,
  ListTodo, LogOut, Menu, MessageCircle, MoreHorizontal, Plus, Search, Settings2,
  ShieldCheck, Sparkles, Target, Trash2, UserRound, Users, X,
} from "lucide-react";

function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `http://${window.location.hostname}:5000/api`;
  return "http://localhost:5000/api";
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("orbit_token");
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || "Request failed.");
  return data;
}

const initialProjects = [
  { id: 1, name: "Website redesign", description: "Refresh the marketing site and improve conversion.", color: "#7c5cff", status: "On track", tasks: 18, done: 12, due: "Oct 28", members: ["SP", "SK", "AM", "LC"] },
  { id: 2, name: "Mobile app v2.0", description: "A faster, simpler mobile experience for everyone.", color: "#ff9f43", status: "At risk", tasks: 24, done: 9, due: "Nov 04", members: ["SK", "AM", "RP"] },
  { id: 3, name: "Q4 growth campaign", description: "Coordinate launch assets across every channel.", color: "#20b486", status: "On track", tasks: 12, done: 8, due: "Nov 18", members: ["SP", "LC", "RP", "AM"] },
];

const initialTasks = [
  { id: 1, title: "Finalize homepage copy", project: "Website redesign", priority: "High", status: "In progress", assignee: "SK", due: "Today", comments: 4 },
  { id: 2, title: "Review component library", project: "Website redesign", priority: "Medium", status: "To do", assignee: "JD", due: "Tomorrow", comments: 2 },
  { id: 3, title: "Set up push notifications", project: "Mobile app v2.0", priority: "High", status: "In progress", assignee: "AM", due: "Oct 26", comments: 6 },
  { id: 4, title: "QA onboarding flow", project: "Mobile app v2.0", priority: "Low", status: "Done", assignee: "RP", due: "Oct 22", comments: 1 },
  { id: 5, title: "Approve social creative", project: "Q4 growth campaign", priority: "Medium", status: "To do", assignee: "LC", due: "Oct 29", comments: 0 },
];

const people = [
  { name: "Sohit Patel", initials: "SP", role: "Admin", color: "#7c5cff", email: "sohit@neostats.io", status: "Active" },
  { name: "Sarah Kim", initials: "SK", role: "Project Manager", color: "#ff9f43", email: "sarah@neostats.io", status: "Inactive" },
  { name: "Alex Morgan", initials: "AM", role: "Team Member", color: "#20b486", email: "alex@neostats.io", status: "Active" },
  { name: "Lena Costa", initials: "LC", role: "Team Member", color: "#e76f9a", email: "lena@neostats.io", status: "Away" },
  { name: "Raj Patel", initials: "RP", role: "Viewer", color: "#4b8ef1", email: "raj@neostats.io", status: "Active" },
];

const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Projects", icon: FolderKanban },
  { label: "My tasks", icon: ListTodo, count: 4 },
  { label: "Team", icon: Users },
];

function Avatar({ initials, color, size = "normal" }) {
  return <span className={`avatar ${size === "small" ? "avatar-small" : ""}`} style={{ background: color }}>{initials}</span>;
}

function Progress({ done, total }) {
  return <div className="progress-wrap"><div className="progress"><span style={{ width: `${Math.round((done / total) * 100)}%` }} /></div><span className="progress-label">{done}/{total}</span></div>;
}

function Modal({ onClose, children }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18} /></button>{children}</div></div>;
}

function ConfirmModal({ title, message, confirmLabel = "Confirm", onClose, onConfirm }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="modal confirm-modal" onClick={(event) => event.stopPropagation()}><div className="confirm-icon"><AlertTriangle size={20} /></div><h2>{title}</h2><p className="modal-subtitle">{message}</p><div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="button" className="button danger" onClick={onConfirm}>{confirmLabel}</button></div></div></div>;
}

function PlaceholderPage({ icon: Icon, title, subtitle, action, onAction, children }) {
  return <><PageHeading eyebrow={`Workspace / ${title}`} title={title} subtitle={subtitle} action={action} onAction={onAction} /><section className="panel placeholder-panel"><div className="placeholder-icon"><Icon size={25} /></div><h2>{children ? "Coming together" : `No ${title.toLowerCase()} yet`}</h2><p>{children || "This workspace view is ready for your next update."}</p></section></>;
}

function ArchivePage({ projects, canRestore, onRestore }) {
  return <><PageHeading eyebrow="Workspace / Archive" title="Archive" subtitle="Keep completed work available without cluttering your active workspace." /><section className="archive-hero"><div className="archive-hero-icon"><Archive size={25} /></div><div><span className="archive-kicker">PROJECT LIBRARY</span><h2>Your completed work, preserved.</h2><p>Archived projects remain safe in MongoDB with their tasks, comments, team members, and history intact.</p></div><div className="archive-total"><strong>{projects.length}</strong><span>Archived<br />projects</span></div></section><section className="archive-section"><div className="archive-section-heading"><div><span className="eyebrow">PROJECT HISTORY</span><h2>Archived projects</h2><p>{projects.length ? "Restore a project whenever your team is ready to continue." : "Your archived projects will appear here."}</p></div><span className="archive-count">{projects.length} {projects.length === 1 ? "project" : "projects"}</span></div>{projects.length ? <div className="archived-grid">{projects.map((project, index) => <article className="archived-card" key={project._id}><div className="archived-card-glow" /><div className="archived-card-top"><span className="archive-project-icon"><FolderKanban size={18} /></span><span className="archived-badge"><Archive size={12} /> Archived</span></div><h3>{project.name}</h3><p>{project.description || "No description provided for this project."}</p><div className="archived-meta"><span><Clock3 size={13} />{project.archivedAt ? new Date(project.archivedAt).toLocaleDateString() : "Previously archived"}</span><span className="archive-dot" /></div><div className="archived-card-footer"><span className="archive-preserved"><CheckCircle2 size={14} /> Data preserved</span>{canRestore && <button className="button secondary archive-restore" onClick={() => onRestore(project._id)}>Restore <ArrowUpRight size={14} /></button>}</div></article>)}</div> : <div className="archive-empty"><div className="archive-empty-icon"><Archive size={22} /></div><h3>Nothing archived yet</h3><p>When a project is complete, archive it from the Projects page and it will appear here.</p></div>}</section></>;
}

function CalendarPage({ tasks, projects, events, onAddEvent }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1);
  const monthTasks = tasks.filter((task) => task.dueDate && new Date(task.dueDate).getFullYear() === year && new Date(task.dueDate).getMonth() === monthIndex);
  const monthEvents = events.filter((event) => event.date && new Date(event.date).getFullYear() === year && new Date(event.date).getMonth() === monthIndex);
  const projectName = (task) => task.project || projects.find((project) => project.id === task.projectId)?.name || "Workspace";
  const moveMonth = (amount) => setMonth(new Date(year, monthIndex + amount, 1));
  return <><PageHeading eyebrow="Workspace / Calendar" title="Calendar" subtitle="See deadlines and team capacity at a glance." action={onAddEvent ? "Add event" : undefined} onAction={onAddEvent} /><div className="calendar-toolbar"><div><span className="calendar-kicker">DEADLINES & DELIVERY</span><h2>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><p>{monthTasks.length + monthEvents.length ? `${monthTasks.length + monthEvents.length} item${monthTasks.length + monthEvents.length === 1 ? "" : "s"} scheduled this month` : "No deadlines or events scheduled for this month"}</p></div><div className="calendar-controls"><button className="button secondary" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button><button className="calendar-arrow" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button><button className="calendar-arrow" onClick={() => moveMonth(1)} aria-label="Next month">›</button></div></div><section className="calendar-layout"><div className="calendar-panel"><div className="calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => { const dayTasks = day ? monthTasks.filter((task) => new Date(task.dueDate).getDate() === day) : []; const dayEvents = day ? monthEvents.filter((event) => new Date(event.date).getDate() === day) : []; const isToday = day && new Date().getFullYear() === year && new Date().getMonth() === monthIndex && new Date().getDate() === day; return <div className={`calendar-day ${!day ? "calendar-blank" : ""} ${isToday ? "calendar-today" : ""}`} key={`${year}-${monthIndex}-${index}`}>{day && <><span className="calendar-day-number">{day}</span><div className="calendar-events">{dayEvents.slice(0, 1).map((event) => <div className="calendar-event event-meeting" key={event._id} title={event.title}><i />{event.title}</div>)}{dayTasks.slice(0, dayEvents.length ? 1 : 2).map((task) => <div className={`calendar-event ${task.status === "Done" ? "event-done" : ""}`} key={task.id} title={task.title}><i />{task.title}</div>)}{dayTasks.length + dayEvents.length > 2 && <span className="calendar-more">+{dayTasks.length + dayEvents.length - 2} more</span>}</div></>}</div>; })}</div></div><aside className="calendar-agenda"><div className="calendar-agenda-heading"><div><span className="calendar-kicker">UP NEXT</span><h3>Agenda</h3></div><CalendarDays size={18} /></div>{monthTasks.length || monthEvents.length ? <div className="agenda-list">{[...monthTasks.map((task) => ({ ...task, calendarType: "task", calendarDate: task.dueDate })), ...monthEvents.map((event) => ({ ...event, calendarType: "event", calendarDate: event.date }))].sort((a, b) => new Date(a.calendarDate) - new Date(b.calendarDate)).map((item) => <div className="agenda-item" key={`${item.calendarType}-${item.id || item._id}`}><span className={`agenda-date ${item.calendarType === "event" ? "agenda-event-date" : ""}`}><strong>{new Date(item.calendarDate).getDate()}</strong><small>{new Date(item.calendarDate).toLocaleDateString(undefined, { month: "short" })}</small></span><div><strong>{item.title}</strong><small>{item.calendarType === "event" ? `${item.projectId?.name || "Workspace event"} · Event` : `${projectName(item)} · ${item.status}`}</small></div></div>)}</div> : <div className="agenda-empty"><CalendarDays size={20} /><p>Your upcoming deadlines and events will appear here.</p></div>}</aside></section></>;
}

function SettingsPage({ currentUser, projects, tasks, onSaved, onToast, onLogout }) {
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [digest, setDigest] = useState(() => localStorage.getItem("orbit_digest") !== "false");
  const [activity, setActivity] = useState(() => localStorage.getItem("orbit_activity") !== "false");
  const [saving, setSaving] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const user = await apiRequest("/profile", { method: "PATCH", body: JSON.stringify({ name, email }) });
      onSaved(user.user);
      onToast("Profile settings saved");
    } catch (error) { onToast(error.message); } finally { setSaving(false); }
  };
  const togglePreference = (key, value, setter) => {
    setter(value);
    localStorage.setItem(key, String(value));
    onToast("Preference updated");
  };
  return <><PageHeading eyebrow="Workspace / Settings" title="Settings" subtitle="Configure your profile, workspace preferences, and access controls." /><div className="settings-hero"><div className="settings-hero-icon"><Settings2 size={24} /></div><div><span className="settings-kicker">WORKSPACE CONTROL CENTER</span><h2>Make Orbit work your way.</h2><p>Personalize your workspace while keeping every project and permission secure.</p></div><span className="settings-live"><i /> All systems operational</span></div><div className="settings-grid"><section className="settings-card settings-profile"><div className="settings-card-heading"><div className="settings-heading-icon"><UserRound size={17} /></div><div><h2>Profile details</h2><p>Update the identity your team sees across Orbit.</p></div></div><form onSubmit={saveProfile}><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><div className="profile-preview"><Avatar initials={name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U"} color="#7c5cff" /><div><strong>{name || "Your name"}</strong><small>{currentUser?.role || "member"} · Active account</small></div></div><button className="button primary settings-save" type="submit" disabled={saving}><Check size={15} />{saving ? "Saving..." : "Save profile"}</button></form></section><section className="settings-card"><div className="settings-card-heading"><div className="settings-heading-icon green"><ShieldCheck size={17} /></div><div><h2>Workspace access</h2><p>Your permissions are enforced by the API.</p></div></div><div className="access-role"><span>Your role</span><strong>{currentUser?.role === "manager" ? "Project Manager" : currentUser?.role?.[0]?.toUpperCase() + currentUser?.role?.slice(1)}</strong></div><div className="security-list"><div><CheckCircle2 size={15} /><span>Signed authentication session</span></div><div><CheckCircle2 size={15} /><span>Server-side role permissions</span></div><div><CheckCircle2 size={15} /><span>MongoDB data persistence</span></div></div><div className="security-note">Your role controls which projects, tasks, and actions are available. Contact an administrator if your access needs to change.</div><button className="button danger settings-logout" type="button" onClick={onLogout}><LogOut size={15} />Log out</button></section><section className="settings-card"><div className="settings-card-heading"><div className="settings-heading-icon orange"><Bell size={17} /></div><div><h2>Notifications</h2><p>Choose which workspace updates you want to see.</p></div></div><PreferenceRow title="Weekly progress digest" description="Receive a summary of project progress." checked={digest} onChange={(value) => togglePreference("orbit_digest", value, setDigest)} /><PreferenceRow title="Task activity updates" description="Stay informed about task and comment changes." checked={activity} onChange={(value) => togglePreference("orbit_activity", value, setActivity)} /></section><section className="settings-card settings-overview"><div className="settings-card-heading"><div className="settings-heading-icon purple"><Activity size={17} /></div><div><h2>Workspace overview</h2><p>Live numbers from your current workspace.</p></div></div><div className="settings-metrics"><div><strong>{projects.length}</strong><span>Active projects</span></div><div><strong>{tasks.length}</strong><span>Visible tasks</span></div><div><strong>{tasks.filter((task) => task.status === "Done").length}</strong><span>Completed tasks</span></div></div><div className="settings-footer-note">Orbit keeps your workspace changes synchronized with MongoDB Atlas.</div></section></div></>;
}

function PreferenceRow({ title, description, checked, onChange }) {
  return <div className="preference-row"><div><strong>{title}</strong><p>{description}</p></div><button type="button" className={`toggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} aria-label={`Toggle ${title}`}><span /></button></div>;
}

export default function Workspace() {
  const [active, setActive] = useState("Overview");
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [members, setMembers] = useState(people);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("orbit_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    fetch(`${getApiUrl()}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => { if (!response.ok) throw new Error("Session expired"); const data = await response.json(); setCurrentUser(data.user); setAuthReady(true); })
      .catch(() => { localStorage.removeItem("orbit_token"); window.location.href = "/login"; });
  }, []);

  useEffect(() => {
    if (!authReady) return;
    setLoadingData(true);
    Promise.all([
      apiRequest("/projects"),
      ["admin", "manager"].includes(currentUser?.role) ? apiRequest("/users") : Promise.resolve({ items: [] }),
    ]).then(async ([projectData, userData]) => {
      const loadedProjects = projectData.items.map((project) => ({
        ...project,
        id: project._id,
        color: project.color || "#7c5cff",
        status: project.status === "at_risk" ? "At risk" : "On track",
        tasks: 0, done: 0, due: project.dueDate || "Set a date",
        members: (project.members || []).map((member) => member.userId),
      }));
      const taskGroups = await Promise.all(loadedProjects.map((project) => apiRequest(`/projects/${project.id}/tasks`)));
      const loadedTasks = taskGroups.flatMap((group, index) => group.items.map((task) => ({
        ...task, id: task._id, project: loadedProjects[index].name,
        status: task.status === "in_progress" ? "In progress" : task.status === "done" ? "Done" : "To do",
        priority: task.priority[0].toUpperCase() + task.priority.slice(1),
        assigneeId: task.assigneeId, assignee: task.assigneeId ? String(task.assigneeId).slice(-2).toUpperCase() : "UN",
        due: task.dueDate || "Set a date", comments: task.commentsCount || 0,
      })));
      setProjects(loadedProjects.map((project) => {
        const projectTasks = loadedTasks.filter((task) => task.project === project.name);
        return { ...project, tasks: projectTasks.length, done: projectTasks.filter((task) => task.status === "Done").length };
      }));
      setTasks(loadedTasks);
      if (userData.items.length) setMembers(userData.items.map((user) => ({ ...user, initials: user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: user.role === "manager" ? "Project Manager" : user.role === "member" ? "Team Member" : user.role[0].toUpperCase() + user.role.slice(1), color: "#7c5cff", status: user.active ? "Active" : "Inactive" })));
    }).catch((error) => {
      setProjects([]);
      setTasks([]);
      setToast(`Could not load saved workspace data: ${error.message}`);
    }).finally(() => setLoadingData(false));
  }, [authReady, currentUser?.role]);

  useEffect(() => {
    if (!authReady || active !== "Archive") return;
    apiRequest("/projects?status=archived").then((data) => setArchivedProjects(data.items || [])).catch((error) => setToast(error.message));
  }, [active, authReady]);

  useEffect(() => {
    if (!authReady) return;
    apiRequest("/events").then((data) => setEvents(data.items || [])).catch((error) => setToast(error.message));
  }, [authReady]);

  const filteredTasks = useMemo(() => tasks.filter((task) => task.title.toLowerCase().includes(query.toLowerCase()) || task.project.toLowerCase().includes(query.toLowerCase())), [tasks, query]);
  const updateTask = async (id, status, extra = {}) => {
    const task = tasks.find((item) => item.id === id);
    try {
      if (typeof id !== "string" || id.length !== 24) return setToast("This demo task is not connected to MongoDB yet.");
      const updates = { ...extra };
      if (status) updates.status = status === "In progress" ? "in_progress" : status === "Done" ? "done" : "todo";
      const savedTask = await apiRequest(`/tasks/${id}`, { method: "PATCH", headers: { "if-match-version": String(task.version) }, body: JSON.stringify(updates) });
      setTasks((items) => items.map((item) => item.id === id ? { ...item, ...savedTask, status: savedTask.status === "in_progress" ? "In progress" : savedTask.status === "done" ? "Done" : "To do", priority: savedTask.priority[0].toUpperCase() + savedTask.priority.slice(1), assigneeId: savedTask.assigneeId, assignee: savedTask.assigneeId ? String(savedTask.assigneeId).slice(-2).toUpperCase() : "UN" } : item));
      setToast(status ? "Task status updated" : "Task assignment updated");
    } catch (error) { setToast(error.message.includes("changed since") ? "This task was updated by someone else. Open it again to review the latest version." : error.message); }
  };
  const openTask = async (task) => {
    try {
      const data = await apiRequest(`/tasks/${task.id}/comments`);
      setSelectedTask(task);
      setTaskComments(data.items || []);
      setModal("task-detail");
    } catch (error) { setToast(error.message); }
  };
  const addComment = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const comment = await apiRequest(`/tasks/${selectedTask.id}/comments`, {
        method: "POST", body: JSON.stringify({ body: form.get("body") }),
      });
      setTaskComments((items) => [...items, comment]);
      setTasks((items) => items.map((item) => item.id === selectedTask.id ? { ...item, comments: (item.comments || 0) + 1 } : item));
      event.currentTarget.reset();
      setToast("Comment added");
    } catch (error) { setToast(error.message); }
  };
  const deleteComment = async (commentId) => {
    try {
      await apiRequest(`/comments/${commentId}`, { method: "DELETE" });
      setTaskComments((items) => items.filter((comment) => comment._id !== commentId));
      setTasks((items) => items.map((item) => item.id === selectedTask?.id ? { ...item, comments: Math.max((item.comments || 0) - 1, 0) } : item));
      setToast("Comment deleted");
    } catch (error) { setToast(error.message); }
  };
  const logout = () => {
    localStorage.removeItem("orbit_token");
    window.location.href = "/login";
  };
  const deleteTask = async (id) => {
    try {
      await apiRequest(`/tasks/${id}`, { method: "DELETE" });
      setTasks((items) => items.filter((item) => item.id !== id));
      setToast("Task deleted");
    } catch (error) { setToast(error.message); }
  };
  const openProjectMembers = async (project) => {
    try {
      const data = await apiRequest(`/projects/${project.id}/members`);
      setSelectedProject(project);
      setProjectMembers(data.items || []);
      setModal("project-members");
    } catch (error) { setToast(error.message); }
  };
  const addProjectMember = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const project = await apiRequest(`/projects/${selectedProject.id}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: form.get("userId"), role: form.get("role") }),
      });
      setProjectMembers(project.members || []);
      setModal("project-members");
      setToast("Project member added");
    } catch (error) { setToast(error.message); }
  };
  const changeProjectMemberRole = async (userId, role) => {
    try {
      const project = await apiRequest(`/projects/${selectedProject.id}/members/${userId}`, {
        method: "PATCH", body: JSON.stringify({ role }),
      });
      setProjectMembers(project.members || []);
      setToast("Project role updated");
    } catch (error) { setToast(error.message); }
  };
  const removeProjectMember = (userId) => setConfirmation({
    title: "Remove this project member?",
    message: "They will lose access to this project, but their workspace account and task history will remain.",
    confirmLabel: "Remove member",
    onConfirm: async () => {
      setConfirmation(null);
      try {
        const project = await apiRequest(`/projects/${selectedProject.id}/members/${userId}`, { method: "DELETE" });
        setProjectMembers(project.members || []);
        setToast("Project member removed");
      } catch (error) { setToast(error.message); }
    },
  });
  const addTask = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const task = await apiRequest(`/projects/${form.get("projectId")}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title: form.get("title"), description: form.get("description"), priority: form.get("priority"), assigneeId: form.get("assigneeId") || undefined, dueDate: form.get("dueDate") || undefined }),
      });
      const project = projects.find((item) => item.id === form.get("projectId"));
      setTasks((items) => [...items, { ...task, id: task._id, project: project?.name || "Project", status: "To do", priority: task.priority[0].toUpperCase() + task.priority.slice(1), assignee: "UN", due: "Set a date", comments: 0 }]);
      setProjects((items) => items.map((item) => item.id === form.get("projectId") ? { ...item, tasks: item.tasks + 1 } : item));
      setModal(null);
      setToast("Task created");
    } catch (error) { setToast(error.message); }
  };
  const deleteProject = async (id) => {
    try {
      await apiRequest(`/projects/${id}`, { method: "DELETE" });
      setProjects((items) => items.filter((project) => project.id !== id));
      setTasks((items) => items.filter((task) => task.projectId !== id));
      setToast("Project deleted");
    } catch (error) { setToast(error.message, "error"); }
  };
  const restoreProject = async (id) => {
    try {
      const project = await apiRequest(`/projects/${id}`, { method: "PATCH", body: JSON.stringify({ status: "on_track" }) });
      setArchivedProjects((items) => items.filter((item) => item._id !== id));
      setProjects((items) => [...items, { ...project, id: project._id, color: "#4b8ef1", status: "On track", tasks: 0, done: 0, due: project.dueDate || "Set a date", members: project.members || [] }]);
      setToast("Project restored");
    } catch (error) { setToast(error.message); }
  };
  const archiveProject = (project) => setConfirmation({
    title: "Archive this project?",
    message: "The project and its tasks will remain saved in MongoDB and can be restored from the Archive page.",
    confirmLabel: "Archive project",
    onConfirm: async () => {
      setConfirmation(null);
      try {
        const archived = await apiRequest(`/projects/${project.id}/archive`, { method: "PATCH" });
        setProjects((items) => items.filter((item) => item.id !== project.id));
        setArchivedProjects((items) => [{ ...archived, _id: archived._id }, ...items]);
        setToast("Project archived and saved");
      } catch (error) { setToast(error.message); }
    },
  });
  const addProject = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get("name");
    if (!name) return;
    try {
      const project = await apiRequest("/projects", { method: "POST", body: JSON.stringify({ name, description: form.get("description") }) });
      setProjects((items) => [...items, { ...project, id: project._id, color: "#4b8ef1", status: "On track", tasks: 0, done: 0, due: "Set a date", members: [] }]);
      setModal(null); setToast("Project created");
    } catch (error) { setToast(error.message); }
  };
  const addEvent = async (formEvent) => {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    try {
      const event = await apiRequest("/events", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          date: form.get("date"),
          projectId: form.get("projectId") || undefined,
        }),
      });
      setEvents((items) => [...items, event].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setModal(null);
      setToast("Calendar event added");
    } catch (error) { setToast(error.message); }
  };

  const renderContent = () => {
    if (active === "Team") return <TeamPage people={members} currentUser={currentUser} onAdd={() => setModal("member")} onRoleChange={async (userId, role) => {
      try {
        const user = await apiRequest(`/users/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) });
        setMembers((items) => items.map((member) => member._id === user._id ? { ...member, ...user, role: user.role === "manager" ? "Project Manager" : user.role === "member" ? "Team Member" : user.role[0].toUpperCase() + user.role.slice(1) } : member));
        setToast("Role updated");
      } catch (error) { setToast(error.message); }
    }} onActivate={async (userId) => {
      try {
        const user = await apiRequest(`/users/${userId}`, { method: "PATCH", body: JSON.stringify({ active: true }) });
        setMembers((items) => items.map((member) => member._id === user._id ? { ...member, ...user, active: true, status: "Active" } : member));
        setToast("User activated");
      } catch (error) { setToast(error.message); }
    }} onRemove={(userId) => setConfirmation({
      title: "Deactivate this user?",
      message: "They will be signed out and will no longer be able to access the workspace. Their project history will be preserved.",
      confirmLabel: "Deactivate user",
      onConfirm: async () => {
        setConfirmation(null);
      try {
        await apiRequest(`/users/${userId}`, { method: "DELETE" });
        setMembers((items) => items.map((member) => member._id === userId ? { ...member, active: false, status: "Inactive" } : member));
        setToast("User deactivated");
      } catch (error) { setToast(error.message); }
      },
    })} />;
    const canManageTasks = ["admin", "manager"].includes(currentUser?.role);
    const canCreateProjects = currentUser?.role === "admin";
    const canEditTasks = ["admin", "manager", "member"].includes(currentUser?.role);
    if (active === "My tasks") return <TasksPage tasks={filteredTasks} query={query} setQuery={setQuery} members={members} onOpen={openTask} onStatus={canEditTasks ? updateTask : undefined} onAssign={(id, assigneeId) => updateTask(id, null, { assigneeId: assigneeId || null })} onDelete={deleteTask} canManageTasks={canManageTasks} readOnly={!canEditTasks} onAdd={canManageTasks ? () => setModal("task") : undefined} />;
    if (active === "Projects") return <ProjectsPage projects={projects} canManageMembers={["admin", "manager"].includes(currentUser?.role)} canArchive={["admin", "manager"].includes(currentUser?.role)} onMembers={openProjectMembers} onArchive={archiveProject} onAdd={canCreateProjects ? () => setModal("project") : undefined} onDelete={canCreateProjects ? (id) => setConfirmation({
      title: "Delete this project?",
      message: "This will permanently remove the project, its tasks, and comments. This action cannot be undone.",
      confirmLabel: "Delete project",
      onConfirm: async () => { setConfirmation(null); await deleteProject(id); },
    }) : undefined} />;
    if (active === "Calendar") return <CalendarPage tasks={tasks} projects={projects} events={events} onAddEvent={["admin", "manager"].includes(currentUser?.role) ? () => setModal("event") : undefined} />;
    if (active === "Archive") return <ArchivePage projects={archivedProjects} canRestore={["admin", "manager"].includes(currentUser?.role)} onRestore={restoreProject} />;
    if (active === "Settings") return <SettingsPage currentUser={currentUser} projects={projects} tasks={tasks} onSaved={(user) => setCurrentUser(user)} onToast={setToast} onLogout={logout} />;
    return <Overview projects={projects} tasks={tasks} onAdd={canCreateProjects ? () => setModal("project") : undefined} onTask={canManageTasks ? () => setModal("task") : undefined} onStatus={canEditTasks ? updateTask : undefined} onOpen={openTask} readOnly={!canEditTasks} onNavigate={setActive} />;
  };

  if (!authReady || loadingData) return <div className="auth-loading">Loading your workspace...</div>;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div><span>orbit<span className="brand-dot">.</span></span></div>
      <button className="workspace-switcher" onClick={() => setToast("You are viewing the Neostats HQ workspace")}><div className="workspace-icon">N</div><div><strong>Neostats HQ</strong><small>Growth workspace</small></div><ChevronDown size={15} /></button>
      <p className="nav-label">Workspace</p>
      <nav>{nav.filter(({ label }) => !(currentUser?.role === "viewer" && label === "Team")).map(({ label, icon: Icon, count }) => <button key={label} onClick={() => setActive(label)} className={active === label ? "active" : ""}><Icon size={18} />{label}{count && <b className="nav-count">{count}</b>}</button>)}</nav>
      <p className="nav-label nav-label-spaced">Manage</p>
      <nav><button onClick={() => setActive("Calendar")} className={active === "Calendar" ? "active" : ""}><CalendarDays size={18} />Calendar</button><button onClick={() => setActive("Archive")} className={active === "Archive" ? "active" : ""}><Archive size={18} />Archive</button><button onClick={() => setActive("Settings")} className={active === "Settings" ? "active" : ""}><Settings2 size={18} />Settings</button></nav>
      <div className="sidebar-footer"><div className="upgrade-card"><div className="upgrade-icon"><Target size={17} /></div><strong>Make work flow</strong><p>Unlock unlimited projects and powerful automations.</p><button onClick={() => setToast("Orbit Pro is coming soon")} >Explore Pro <ArrowUpRight size={14} /></button></div><button className="user-chip" onClick={() => setToast(`Signed in as ${currentUser?.name || "your account"}`)}><Avatar initials={(currentUser?.name || "User").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} color="#7c5cff" /><div><strong>{currentUser?.name || "User"}</strong><small>{currentUser?.role || "Member"}</small></div><MoreHorizontal size={17} /></button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="mobile-brand"><div className="brand-mark"><Sparkles size={17} /></div>orbit<span className="brand-dot">.</span></div><button className="mobile-menu" onClick={() => setToast("Use the sidebar navigation on desktop")}><Menu size={20} /></button><div className="breadcrumbs"><span>Neostats HQ</span><span>/</span><strong>{active}</strong></div><div className="top-actions"><div className="search-box"><Search size={17} /><input placeholder="Search anything..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd><Command size={12} /> K</kbd></div><button className="icon-button" onClick={() => setToast("You are all caught up")}><Bell size={19} /><i /></button><div className="top-divider" /><button className="top-user" onClick={() => { localStorage.removeItem("orbit_token"); window.location.href = "/login"; }}><Avatar initials={(currentUser?.name || "User").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} color="#7c5cff" size="small" /><ChevronDown size={15} /></button></div></header>
      <div className="content">{renderContent()}</div>
    </main>
    {modal === "project" && <Modal onClose={() => setModal(null)}><h2>Create a project</h2><p className="modal-subtitle">Bring your team together around a shared goal.</p><form onSubmit={addProject}><label>Project name<input name="name" autoFocus placeholder="e.g. Product launch" /></label><label>Description<textarea name="description" placeholder="What are you working towards?" /></label><div className="form-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary" type="submit"><Plus size={16} />Create project</button></div></form></Modal>}
    {modal === "task" && <Modal onClose={() => setModal(null)}><h2>Create a task</h2><p className="modal-subtitle">Add a focused piece of work to one of your projects.</p><form onSubmit={addTask}><label>Task title<input name="title" autoFocus placeholder="e.g. Review launch checklist" required /></label><label>Project<select name="projectId" required defaultValue={projects[0]?.id || ""}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Assign to<select name="assigneeId" defaultValue=""><option value="">Unassigned</option>{members.filter((member) => member.active !== false).map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label><label>Due date<input name="dueDate" type="date" /></label><label>Description<textarea name="description" placeholder="Add context for your team" /></label><label>Priority<select name="priority" defaultValue="medium"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><div className="form-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary" type="submit"><Plus size={16} />Create task</button></div></form></Modal>}
    {modal === "event" && <Modal onClose={() => setModal(null)}><h2>Add calendar event</h2><p className="modal-subtitle">Create a shared event for your workspace calendar.</p><form onSubmit={addEvent}><label>Event title<input name="title" autoFocus placeholder="e.g. Product launch review" required /></label><label>Date and time<input name="date" type="datetime-local" required /></label><label>Project<select name="projectId" defaultValue=""><option value="">Workspace event</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Description<textarea name="description" placeholder="Add meeting details or context" /></label><div className="form-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary" type="submit"><Plus size={16} />Add event</button></div></form></Modal>}
    {modal === "member" && <Modal onClose={() => setModal(null)}><h2>Create a teammate</h2><p className="modal-subtitle">Create a real workspace account with a role.</p><form onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { const user = await apiRequest("/users", { method: "POST", body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role") }) }); setMembers((items) => [...items, { ...user, initials: user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: user.role, color: "#7c5cff", status: "Active" }]); setModal(null); setToast("Teammate created"); } catch (error) { setToast(error.message); } }}><label>Name<input name="name" autoFocus placeholder="Sarah Kim" required /></label><label>Email address<input name="email" type="email" placeholder="name@company.com" required /></label><label>Temporary password<input name="password" type="password" minLength={8} required /></label><label>Workspace role<select name="role" defaultValue="member"><option value="member">Team Member</option><option value="manager">Project Manager</option><option value="viewer">Viewer</option></select></label><div className="form-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary" type="submit"><Plus size={16} />Create member</button></div></form></Modal>}
    {modal === "project-members" && <Modal onClose={() => setModal(null)}><h2>{selectedProject?.name} team</h2><p className="modal-subtitle">Manage access for this project.</p><form onSubmit={addProjectMember}><label>Add active user<select name="userId" required defaultValue=""><option value="" disabled>Select a user</option>{members.filter((member) => member.active !== false && !projectMembers.some((item) => String(item.userId?._id || item.userId) === String(member._id))).map((member) => <option key={member._id} value={member._id}>{member.name} ({member.email})</option>)}</select></label><label>Project role<select name="role" defaultValue="member"><option value="manager">Project Manager</option><option value="member">Team Member</option><option value="viewer">Viewer</option></select></label><button className="button primary" type="submit"><Plus size={16} />Add to project</button></form><div className="project-member-list">{projectMembers.map((member) => { const user = member.userId?._id ? member.userId : members.find((item) => String(item._id) === String(member.userId)); const userId = user?._id || member.userId; const isProjectManager = String(selectedProject?.managerId) === String(userId); return <div className="project-member-item" key={String(userId)}><Avatar initials={(user?.name || "User").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} color="#7c5cff" size="small" /><div><strong>{user?.name || "Project member"}</strong><small>{user?.email || ""}</small></div><select className="role-select" value={member.role} disabled={isProjectManager} onChange={(event) => changeProjectMemberRole(userId, event.target.value)}><option value="manager">Manager</option><option value="member">Member</option><option value="viewer">Viewer</option></select>{!isProjectManager && <button type="button" className="remove-member" onClick={() => removeProjectMember(userId)}>Remove</button>}</div>; })}</div></Modal>}
    {modal === "task-detail" && <Modal onClose={() => setModal(null)}><h2>{selectedTask?.title}</h2><p className="modal-subtitle">{selectedTask?.description || "No description provided."}</p><div className="task-detail-meta"><span className={`priority ${selectedTask?.priority?.toLowerCase()}`}>{selectedTask?.priority}</span><span className="status"><i />{selectedTask?.status}</span><span>{selectedTask?.project}</span></div><div className="comments-list">{taskComments.length ? taskComments.map((comment) => { const canDelete = ["admin", "manager"].includes(currentUser?.role) || String(comment.authorId?._id || comment.authorId) === String(currentUser?._id); return <div className="comment-item" key={comment._id}><Avatar initials={(comment.authorId?.name || "U").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} color="#7c5cff" size="small" /><div><strong>{comment.authorId?.name || "Team member"}</strong><p>{comment.body}</p></div>{canDelete && <button type="button" className="icon-button" onClick={() => deleteComment(comment._id)} title="Delete comment" aria-label="Delete comment"><Trash2 size={14} /></button>}</div>; }) : <p className="modal-subtitle">No comments yet.</p>}</div>{currentUser?.role !== "viewer" ? <form onSubmit={addComment}><label>Add a comment<textarea name="body" required maxLength={2000} placeholder="Share an update or question..." /></label><div className="form-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Close</button><button className="button primary" type="submit"><MessageCircle size={16} />Comment</button></div></form> : <div className="form-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Close</button></div>}</Modal>}
    {confirmation && <ConfirmModal {...confirmation} onClose={() => setConfirmation(null)} />}
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
  </div>;
}

function PageHeading({ eyebrow, title, subtitle, action, onAction }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action && <button className="button primary" onClick={onAction}><Plus size={17} />{action}</button>}</div>;
}

function Overview({ projects, tasks, onAdd, onTask, onStatus, onOpen, readOnly, onNavigate }) {
  const completed = tasks.filter((task) => task.status === "Done").length;
  return <><PageHeading eyebrow="Monday, October 23, 2026" title={<>Good morning, Jamie <span>✦</span></>} subtitle="Here’s what’s happening across your workspace." action={onAdd ? "New project" : undefined} onAction={onAdd} /><div className="stats-grid"><div className="stat-card purple"><div className="stat-top"><span>Active projects</span><FolderKanban size={17} /></div><strong>{projects.length}</strong><div className="stat-foot"><span className="trend up">↗ 8.4%</span><span>vs. last month</span></div></div><div className="stat-card"><div className="stat-top"><span>Tasks completed</span><CheckCircle2 size={17} /></div><strong>{completed}<small> / {tasks.length}</small></strong><div className="stat-foot"><span className="trend up">↗ 12.6%</span><span>vs. last month</span></div></div><div className="stat-card"><div className="stat-top"><span>Team members</span><Users size={17} /></div><strong>24</strong><div className="stat-foot"><span className="trend up">↗ 3 new</span><span>this month</span></div></div><div className="stat-card"><div className="stat-top"><span>On-time delivery</span><Activity size={17} /></div><strong>92<small>%</small></strong><div className="stat-foot"><span className="trend up">↗ 4.2%</span><span>vs. last month</span></div></div></div><div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Project health</h2><p>Keep a pulse on your active initiatives.</p></div><button className="text-button" onClick={() => onNavigate("Projects")}>View all <ArrowUpRight size={14} /></button></div><div className="project-list">{projects.map((project) => <div className="project-row" key={project.id}><span className="project-color" style={{ background: project.color }} /><div className="project-info"><strong>{project.name}</strong><small>{project.description}</small></div><div className="project-progress"><span>{Math.round((project.done / project.tasks) * 100)}%</span><Progress done={project.done} total={project.tasks || 1} /></div><span className={`status ${project.status === "At risk" ? "risk" : ""}`}><i />{project.status}</span><button className="row-menu"><MoreHorizontal size={18} /></button></div>)}</div></section><section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Your team’s latest updates.</p></div><button className="row-menu"><MoreHorizontal size={18} onClick={() => onNavigate("Team")} /></button></div><div className="activity-list"><div className="activity-item"><Avatar initials="SK" color="#ff9f43" size="small" /><div><p><strong>Sarah Kim</strong> moved <b>Finalize homepage copy</b> to In progress</p><small>12 minutes ago</small></div></div><div className="activity-item"><Avatar initials="AM" color="#20b486" size="small" /><div><p><strong>Alex Morgan</strong> commented on <b>Push notifications</b></p><small>45 minutes ago</small></div><MessageCircle size={15} /></div><div className="activity-item"><Avatar initials="LC" color="#e76f9a" size="small" /><div><p><strong>Lena Costa</strong> completed <b>Q4 audience research</b></p><small>2 hours ago</small></div></div><div className="activity-item"><div className="activity-system"><Sparkles size={15} /></div><div><p><strong>Orbit AI</strong> generated a weekly summary</p><small>Yesterday at 4:32 PM</small></div></div></div><button className="view-activity" onClick={() => onNavigate("Team")}>View all activity <ArrowUpRight size={14} /></button></section></div><section className="panel tasks-panel"><div className="panel-heading"><div><h2>My tasks <span className="heading-count">4</span></h2><p>Things that need your attention.</p></div><button className="text-button" onClick={() => onNavigate("My tasks")}>View all <ArrowUpRight size={14} /></button></div><TaskTable tasks={tasks.slice(0, 4)} onOpen={onOpen} onStatus={onStatus} readOnly={readOnly} /></section></>;
}

function ProjectsPage({ projects, canManageMembers, canArchive, onMembers, onArchive, onAdd, onDelete }) {
  return <><PageHeading eyebrow="Workspace / Projects" title="Projects" subtitle="Everything your team is building, in one place." action={onAdd ? "New project" : undefined} onAction={onAdd} /><div className="filter-bar"><div className="tabs"><button className="selected">All projects <b>{projects.length}</b></button><button>Owned by me</button><button>Archived</button></div><button className="filter-button"><Filter size={15} /> Filter</button></div><div className="projects-grid">{projects.map((project) => <article className="project-card" key={project.id}><div className="project-card-top"><span className="project-color large" style={{ background: project.color }} /><div>{canManageMembers && <button className="row-menu" onClick={() => onMembers(project)} title="Manage project team"><Users size={17} /></button>}{canArchive && <button className="row-menu" onClick={() => onArchive(project)} title="Archive project"><Archive size={17} /></button>}{onDelete && <button className="row-menu" onClick={() => onDelete(project.id)} title="Delete project"><MoreHorizontal size={18} /></button>}</div></div><h2>{project.name}</h2><p>{project.description}</p><div className="card-meta"><span className={`status ${project.status === "At risk" ? "risk" : ""}`}><i />{project.status}</span><span><Clock3 size={14} />Due {project.due}</span></div><div className="card-divider" /><div className="card-bottom"><Progress done={project.done} total={project.tasks || 1} /><div className="avatar-stack">{project.members.map((member, index) => <Avatar key={String(member)} initials={String(member).slice(-2).toUpperCase()} color={people[index % people.length].color} size="small" />)}</div></div></article>)}{onAdd && <button className="new-card" onClick={onAdd}><span><Plus size={20} /></span><strong>Start a new project</strong><small>Set a goal and invite your team</small></button>}</div></>;
}

function TasksPage({ tasks, query, setQuery, members, onOpen, onStatus, onAssign, onDelete, canManageTasks, readOnly, onAdd }) {
  return <><PageHeading eyebrow="Workspace / My tasks" title="My tasks" subtitle="Focus on the work that moves your projects forward." action={onAdd ? "New task" : undefined} onAction={onAdd} /><div className="filter-bar"><div className="task-filters"><button className="selected">All <b>{tasks.length}</b></button><button>To do</button><button>In progress</button><button>Done</button></div><div className="table-search"><Search size={15} /><input placeholder="Filter tasks" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div><section className="panel full-panel"><TaskTable tasks={tasks} members={members} onOpen={onOpen} onStatus={onStatus} onAssign={onAssign} onDelete={onDelete} canManageTasks={canManageTasks} readOnly={readOnly} /></section></>;
}

function TaskTable({ tasks, members, onOpen, onStatus, onAssign, onDelete, canManageTasks, readOnly }) {
  return <div className="task-table"><div className="task-head"><span>Task</span><span>Project</span><span>Priority</span><span>Assignee</span><span>Due date</span><span /></div>{tasks.map((task) => <div className="task-row" key={task.id}><div className="task-title">{readOnly ? <span className={`check-task ${task.status === "Done" ? "checked" : ""}`}>{task.status === "Done" && <Check size={13} />}</span> : <button className={`check-task ${task.status === "Done" ? "checked" : ""}`} onClick={() => onStatus?.(task.id, task.status === "Done" ? "To do" : "Done")}>{task.status === "Done" && <Check size={13} />}</button>}<button className="task-link" onClick={() => onOpen && onOpen(task)}><strong>{task.title}</strong></button>{task.comments > 0 && <span className="comment-count"><MessageCircle size={13} />{task.comments}</span>}</div><span className="task-project"><i className="mini-dot" />{task.project}</span><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>{canManageTasks ? <select className="status-select" value={task.assigneeId || ""} onChange={(event) => onAssign(task.id, event.target.value)}><option value="">Unassigned</option>{members.filter((member) => member.active !== false).map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select> : <Avatar initials={task.assignee} color={people.find((person) => person.initials === task.assignee)?.color || "#7c5cff"} size="small" />}<span className={task.due === "Today" ? "due-today" : "task-due"}>{task.due}</span>{readOnly ? <span className="status-readonly">{task.status}</span> : <select className="status-select" value={task.status} onChange={(event) => onStatus?.(task.id, event.target.value)}><option>To do</option><option>In progress</option><option>Done</option></select>}{canManageTasks && <button className="row-menu" onClick={() => onDelete(task.id)} title="Delete task"><MoreHorizontal size={18} /></button>}</div>)}</div>;
}

function TeamPage({ people: team, currentUser, onAdd, onRoleChange, onActivate, onRemove }) {
  const isAdmin = currentUser?.role === "admin";
  return <><PageHeading eyebrow="Workspace / Team" title="Your team" subtitle="Manage workspace access and keep everyone aligned." action={isAdmin ? "Invite member" : undefined} onAction={onAdd} /><div className="team-summary"><div><Users size={20} /><strong>{team.filter((person) => person.active !== false).length} members</strong><span>in this workspace</span></div><div className="team-avatars">{team.slice(0, 5).map((person) => <Avatar key={person.initials} initials={person.initials} color={person.color} />)}{team.length > 5 && <span className="more-members">+{team.length - 5}</span>}</div></div><section className="panel full-panel"><div className="panel-heading"><div><h2>Members</h2><p>People with access to the Neostats workspace.</p></div><div className="table-search"><Search size={15} /><input placeholder="Search members" /></div></div><div className="members-table"><div className="task-head"><span>Member</span><span>Role</span><span>Status</span><span>Projects</span><span /></div>{team.map((person, index) => <div className={`member-row ${person.active === false ? "member-inactive" : ""}`} key={person.email}><div className="member-name"><Avatar initials={person.initials} color={person.color} /><div><strong>{person.name}</strong><small>{person.email}</small></div></div>{isAdmin && person._id !== currentUser.id ? <select className="role-select" value={person.role === "Project Manager" ? "manager" : person.role === "Team Member" ? "member" : person.role.toLowerCase()} onChange={(event) => onRoleChange(person._id, event.target.value)}><option value="manager">Project Manager</option><option value="member">Team Member</option><option value="viewer">Viewer</option><option value="admin">Admin</option></select> : <span className="role-pill">{person.role}</span>}<span className="member-status"><i />{person.status}</span><span className="project-count">{index === 0 ? "All projects" : `${index + 1} projects`}</span>{isAdmin && person._id !== currentUser.id ? person.active === false ? <button className="activate-member" onClick={() => onActivate(person._id)} title="Activate user">Activate</button> : <button className="remove-member" onClick={() => onRemove(person._id)} title="Deactivate user">Remove</button> : <button className="row-menu"><MoreHorizontal size={18} /></button>}</div>)}</div></section></>;
}
