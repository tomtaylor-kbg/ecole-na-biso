import { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { AlertTriangle, BadgeDollarSign, Building2, CalendarRange, CircleHelp, ClipboardList, CreditCard, GraduationCap, LayoutDashboard, LogOut, Moon, ReceiptText, Settings, Sun, Users, WalletCards } from 'lucide-react';
import { AuditLogsPage } from './components/AuditLogsPage';
import { BalancesPage } from './components/BalancesPage';
import { classLabel, classOrientationLabel, classSectionLabel, classStatusLabel } from './components/classLabels';
import { CreationOverlay } from './components/CreationOverlay';
import { DashboardPage } from './components/DashboardPage';
import { DetailOverlay } from './components/DetailOverlay';
import { EditOverlay } from './components/EditOverlay';
import { HelpPage } from './components/HelpPage';
import { ListPage } from './components/ListPage';
import { LoginPage } from './components/LoginPage';
import { NotFoundPage } from './components/NotFoundPage';
import { hasUiPermission, roleLabel } from './components/roles';
import { SettingsPage, SetupPage } from './components/SettingsPage';
import type { ApiClass, ApiFee, ApiPayment, ApiSchoolYear, ApiSettings, ApiStudent, ApiUser, CrudResource, DashboardData, DetailRecord, ListRow, OverlayType, PageCard, Stat } from './components/types';
import type { LucideIcon } from 'lucide-react';

type ThemeMode = 'light' | 'dark';
type NavItem = { label: string; to: string; icon: LucideIcon };
type AppData = { students: ApiStudent[]; classes: ApiClass[]; fees: ApiFee[]; payments: ApiPayment[]; schoolYears: ApiSchoolYear[]; users: ApiUser[] };

const apiUrl = import.meta.env.VITE_API_URL ?? '';
const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard }, { label: 'Élèves', to: '/students', icon: GraduationCap }, { label: 'Classes', to: '/classes', icon: Building2 }, { label: 'Frais scolaires', to: '/fees', icon: BadgeDollarSign }, { label: 'Paiements', to: '/payments', icon: CreditCard }, { label: 'Suivi financier', to: '/balances', icon: ReceiptText }, { label: 'Années scolaires', to: '/school-years', icon: CalendarRange }, { label: 'Utilisateurs', to: '/users', icon: Users }, { label: 'Journal', to: '/audit-logs', icon: ClipboardList }, { label: 'Aide', to: '/help', icon: CircleHelp }, { label: 'Paramètres', to: '/settings', icon: Settings },
];
const emptyData: AppData = { students: [], classes: [], fees: [], payments: [], schoolYears: [], users: [] };

const formatMoney = (value: number, currency = 'USD') => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`;
const formatDate = (value: string) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(value));
const fullName = (user: { firstName: string; lastName: string }) => `${user.lastName} ${user.firstName}`;
const getStoredUser = () => {
  try {
    const user = localStorage.getItem('school-fees-user');
    return user ? JSON.parse(user) as ApiUser : null;
  } catch {
    return null;
  }
};

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => localStorage.getItem('school-fees-theme') === 'dark' ? 'dark' : 'light');
  const [overlay, setOverlay] = useState<OverlayType | null>(null);
  const [detailRecord, setDetailRecord] = useState<DetailRecord | null>(null);
  const [editRecord, setEditRecord] = useState<{ resource: CrudResource; record: DetailRecord } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('school-fees-token')));
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(() => getStoredUser());
  const [data, setData] = useState<AppData>(emptyData);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const isAdmin = currentUser?.role === 'ADMIN';
  const can = (permission: string) => hasUiPermission(currentUser?.role, permission);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('school-fees-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (settings?.primaryColor) {
      document.body.style.setProperty('--accent', settings.primaryColor);
    }
  }, [settings?.primaryColor]);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/settings/status`);
        if (!response.ok) return;
        const body = await response.json();
        setSetupRequired(!body.isConfigured);
      } catch {
        setSetupRequired(false);
      } finally {
        setIsCheckingSetup(false);
      }
    };
    void checkSetup();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || setupRequired) { setIsLoading(false); return; }
    const loadData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('school-fees-token') ?? '';
        const headers = { Authorization: `Bearer ${token}` };
        const endpoints = isAdmin ? ['students', 'classes', 'fees', 'payments', 'school-years', 'users'] : ['students', 'classes', 'fees', 'payments', 'school-years'];
        const [responses, settingsResponse, dashboardResponse] = await Promise.all([
          Promise.all(endpoints.map((endpoint) => fetch(`${apiUrl}/api/${endpoint}`, { headers }))),
          fetch(`${apiUrl}/api/settings`, { headers }),
          fetch(`${apiUrl}/api/dashboard`, { headers }),
        ]);
        if (responses.some((response) => response.status === 401)) {
          localStorage.removeItem('school-fees-token');
          localStorage.removeItem('school-fees-user');
          setIsAuthenticated(false);
          setCurrentUser(null);
          return;
        }
        if (responses.some((response) => !response.ok)) throw new Error('Impossible de charger les données de l’application.');
        if (settingsResponse.ok) setSettings(await settingsResponse.json());
        if (dashboardResponse.ok) setDashboard(await dashboardResponse.json());
        const payloads = await Promise.all(responses.map((response) => response.json()));
        const nextData = { ...emptyData };
        endpoints.forEach((endpoint, index) => {
          if (endpoint === 'school-years') nextData.schoolYears = payloads[index];
          else nextData[endpoint as Exclude<keyof AppData, 'schoolYears'>] = payloads[index];
        });
        setData(nextData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les données.');
      } finally { setIsLoading(false); }
    };
    void loadData();
  }, [isAuthenticated, refreshKey, isAdmin, setupRequired]);

  const stats: Stat[] = [
    { label: 'Élèves', value: (dashboard?.summary.studentCount ?? data.students.length).toLocaleString('fr-FR'), hint: 'Inscrits', icon: GraduationCap },
    { label: 'Encaissé', value: formatMoney(dashboard?.summary.totalPaid ?? 0, dashboard?.currency), hint: 'Paiements confirmés', icon: WalletCards },
    { label: 'À recouvrer', value: formatMoney(dashboard?.summary.balance ?? 0, dashboard?.currency), hint: 'Solde global', icon: CreditCard },
    { label: 'Soldes', value: (dashboard?.summary.studentsWithBalance ?? 0).toLocaleString('fr-FR'), hint: 'Élèves avec solde', icon: AlertTriangle },
  ];
  const pageCards: PageCard[] = [
    { title: 'Élèves', description: 'Élèves enregistrés', count: data.students.length.toLocaleString('fr-FR') },
    { title: 'Classes', description: 'Classes enregistrées', count: data.classes.length.toLocaleString('fr-FR') },
    { title: 'Frais', description: 'Frais configurés', count: data.fees.length.toLocaleString('fr-FR') },
  ];
  const refreshData = () => setRefreshKey((key) => key + 1);
  const handleDelete = async (resource: string, id: string) => {
    if (!window.confirm('Confirmer la suppression de cet élément ?')) return;
    try {
      const response = await fetch(`${apiUrl}/api/${resource}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? 'La suppression a échoué.');
      }
      refreshData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'La suppression a échoué.');
    }
  };
  const rowsFor = (kind: string): { rows: ListRow[]; headings: string[] } => {
    if (kind === 'students') return { headings: ['Matricule', 'Nom complet', 'Classe'], rows: data.students.map((student) => ({ id: student.id, source: student, cells: [student.matricule, fullName(student), student.class ? classLabel(student.class) : 'Sans classe'], status: { label: 'Actif', tone: 'success' } })) };
    if (kind === 'classes') return { headings: ['Code', 'Classe', 'Section', 'Orientation', 'Statut', 'Année scolaire'], rows: data.classes.map((schoolClass) => ({ id: schoolClass.id, source: schoolClass, cells: [schoolClass.code, schoolClass.name, classSectionLabel(schoolClass.section) || '—', classOrientationLabel(schoolClass.orientation) || '—', classStatusLabel(schoolClass.status), schoolClass.schoolYear?.name ?? 'Non définie'], status: { label: classStatusLabel(schoolClass.status), tone: schoolClass.status === 'ACTIVE' ? 'success' : schoolClass.status === 'INACTIVE' ? 'neutral' : 'danger' } })) };
    if (kind === 'fees') return { headings: ['Frais', 'Montant', 'Bénéficiaire'], rows: data.fees.map((fee) => ({ id: fee.id, source: fee, cells: [fee.name, formatMoney(Number(fee.amount), fee.currency), fee.student ? fullName(fee.student) : fee.class ? classLabel(fee.class) : 'Tous'], status: { label: fee.status, tone: fee.status === 'active' ? 'success' : 'neutral' } })) };
    if (kind === 'payments') return { headings: ['Élève', 'Montant', 'Mode', 'Date'], rows: data.payments.map((payment) => ({ id: payment.id, source: payment, cells: [fullName(payment.student), formatMoney(Number(payment.amount), payment.fee.currency ?? settings?.currency), payment.paymentMode, formatDate(payment.paymentDate)], status: payment.status === 'cancelled' ? { label: 'Annulé', tone: 'danger' } : { label: payment.fee.name, tone: 'success' } })) };
    if (kind === 'school-years') return { headings: ['Année', 'Début', 'Fin'], rows: data.schoolYears.map((year) => ({ id: year.id, source: year, cells: [year.name, formatDate(year.startDate), formatDate(year.endDate)], status: { label: year.isActive ? 'Active' : 'Archivée', tone: year.isActive ? 'success' : 'neutral' } })) };
    return { headings: ['Username', 'Email', 'Téléphone', 'Nom', 'Rôle'], rows: data.users.map((user) => ({ id: user.id, source: user, cells: [user.username, user.email ?? '—', user.phone ?? '—', fullName(user), roleLabel(user.role)], status: { label: 'Actif', tone: 'success' } })) };
  };

  const openStudentDetail = (studentId: string) => {
    const student = data.students.find((item) => item.id === studentId);
    if (!student) return;
    setDetailRecord({
      title: 'Élèves',
      headings: ['Matricule', 'Nom complet', 'Classe'],
      row: {
        id: student.id,
        source: student,
        cells: [student.matricule, fullName(student), student.class ? classLabel(student.class) : 'Sans classe'],
        status: { label: 'Actif', tone: 'success' },
      },
    });
  };

  const visibleNavItems = navItems.filter((item) => {
    if (item.to === '/settings') return can('settings:manage');
    if (item.to === '/help') return can('users:manage');
    if (item.to === '/users') return can('users:manage');
    if (item.to === '/audit-logs') return can('audit:read');
    return true;
  });
  const visibleResources = isAdmin ? ['students', 'classes', 'fees', 'payments', 'school-years', 'users'] as const : ['students', 'classes', 'fees', 'payments', 'school-years'] as const;

  if (isCheckingSetup) return <main className="login-page"><section className="login-panel"><p className="form-help">Chargement de la configuration...</p></section></main>;
  if (setupRequired) return <SetupPage onConfigured={(nextSettings) => { setSettings(nextSettings); setSetupRequired(false); }} />;

  return <BrowserRouter>{!isAuthenticated ? <LoginPage onLogin={() => { setCurrentUser(getStoredUser()); setIsAuthenticated(true); }} /> : <div className="app-shell">
    <aside className="sidebar"><div className="brand-wrap"><div className="brand-mark"><img src="/favicon.svg" alt="" /></div><div><span className="brand-name">{settings?.name ?? 'School Fees'}</span><small>Administration</small></div></div><nav className="sidebar-nav" aria-label="Navigation principale">{visibleNavItems.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav><div className="sidebar-footer"><button type="button" className="logout-button" onClick={() => { localStorage.removeItem('school-fees-token'); localStorage.removeItem('school-fees-user'); setCurrentUser(null); setIsAuthenticated(false); }}><LogOut size={17} /><span>Déconnexion</span></button></div></aside>
    <main className="main-panel"><header className="topbar"><div><p className="eyebrow">Gestion scolaire</p><h1>Bonjour, {currentUser?.firstName ?? 'Admin'}</h1></div><div className="topbar-actions"><button type="button" className="theme-toggle" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} aria-label="Basculer le thème">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button></div></header>
      {isLoading ? <div className="panel loading-state">Chargement des données...</div> : error ? <div className="panel form-error" role="alert">{error}</div> : <Routes>
        <Route path="/" element={<DashboardPage stats={stats} dashboard={dashboard} formatMoney={formatMoney} formatDate={formatDate} />} />
        <Route path="/balances" element={<BalancesPage classes={data.classes} schoolYears={data.schoolYears} onViewStudent={openStudentDetail} />} />
        {can('audit:read') && <Route path="/audit-logs" element={<AuditLogsPage />} />}
        {can('users:manage') && <Route path="/help" element={<HelpPage />} />}
        {can('settings:manage') && <Route path="/settings" element={<SettingsPage settings={settings} onSaved={setSettings} onReset={() => { setSettings(null); setData(emptyData); setDashboard(null); setSetupRequired(true); }} />} />}
        {visibleResources.map((kind) => { const view = rowsFor(kind); const labels: Record<typeof kind, [string, string, string]> = { students: ['Élèves', 'Gestion des élèves et de leurs statuts', '+ Ajouter un élève'], classes: ['Classes', 'Suivi des classes et niveaux', '+ Ajouter une classe'], fees: ['Frais scolaires', 'Définition des frais et échéances', '+ Nouveau frais'], payments: ['Paiements', 'Historique et encaissements', '+ Enregistrer un paiement'], 'school-years': ['Années scolaires', 'Périodes académiques actives', '+ Ajouter une année'], users: ['Utilisateurs', 'Comptes admin et caissier', '+ Ajouter un utilisateur'] }; const [title, subtitle, action] = labels[kind]; const managePermission = `${kind}:manage`.replace('school-years', 'school-years'); const canCreate = kind === 'payments' ? can('payments:create') : can(managePermission); const canEdit = kind === 'payments' ? can('payments:update') : can(managePermission); const canDelete = kind === 'payments' ? can('payments:cancel') : can(managePermission); return <Route key={kind} path={`/${kind}`} element={<ListPage title={title} subtitle={subtitle} actions={canCreate ? [action] : []} cards={pageCards} rows={view.rows} headings={view.headings} onAction={setOverlay} onDelete={canDelete ? (id) => void handleDelete(kind, id) : undefined} onView={setDetailRecord} onEdit={canEdit ? (record) => setEditRecord({ resource: kind, record }) : undefined} />} />; })}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>}
    </main>
    {overlay && <CreationOverlay type={overlay} onClose={() => setOverlay(null)} onCreated={refreshData} />}
    {detailRecord && <DetailOverlay record={detailRecord} onClose={() => setDetailRecord(null)} />}
    {editRecord && <EditOverlay resource={editRecord.resource} record={editRecord.record} classes={data.classes} students={data.students} fees={data.fees} schoolYears={data.schoolYears} onClose={() => setEditRecord(null)} onSaved={refreshData} />}
  </div>}</BrowserRouter>;
}

export default App;
