import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardChart from './DashboardChart';
import DashboardCalendar from './DashboardCalendar';
import DashboardModal from './DashboardModal';
import CalendarFull from './CalendarFull';
import collabnbLogo from '../../assets/collabnb-logo.png';
import {
  Search, Menu, X, LayoutDashboard, Calendar as CalendarIcon,
  DollarSign, CheckCircle2, Users, Clock, Upload, ChevronDown, FileText,
} from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const seriesFor = (values) => MONTHS.map((m, i) => ({ month: m, value: values[i] ?? 0 }));

// Sample/placeholder numbers — wire to live Convex queries in a follow-up pass.
const ROLE_CONFIG = {
  creator: {
    greetingSubtitle: "Here's an overview of your collabs.",
    sidebarMoneyLabel: 'Earnings',
    chartTitle: 'Earnings Overview',
    statCards: [
      { key: 'active',  label: 'Active Collabs',        value: '4',      sub: '+2 this month',        icon: Users,      presetKey: 'active' },
      { key: 'pending', label: 'Pending Applications',  value: '3',      sub: '1 awaiting reply',      icon: Clock,      presetKey: 'pending_applications' },
      { key: 'earned',  label: 'Total Earned',          value: '$2,150', sub: '+18% vs last month',    icon: DollarSign, presetKey: 'earned' },
      { key: 'due',     label: 'Content Due',           value: '2',      sub: 'Next in 3 days',        icon: Upload,     presetKey: 'content_due' },
    ],
    chart: {
      money:  { label: 'Earnings',     unit: '$', data: seriesFor([120, 180, 90, 240, 310, 180, 260, 420, 0, 0, 0, 0]) },
      volume: { label: 'Applications', unit: '',  data: seriesFor([1, 2, 1, 3, 2, 2, 3, 4, 0, 0, 0, 0]) },
    },
    todo: [
      { type: 'pending_action', title: 'Respond to host — Floating Boathouse',            date: '2026-08-05' },
      { type: 'deadline',       title: 'Upload Reels — Glacier Prime Cabin',               date: '2026-08-07' },
      { type: 'pending_action', title: 'Sign contract — Cliffside Villa',                  date: '2026-08-09' },
      { type: 'stay_date',      title: 'Check-in — Desert Solar House',                    date: '2026-08-14' },
      { type: 'deadline',       title: 'Submit photos — Treehouse Canopy Suite',           date: '2026-08-18' },
    ],
  },
  host: {
    greetingSubtitle: "Here's an overview of your proposals.",
    sidebarMoneyLabel: 'Spend',
    chartTitle: 'Spend Overview',
    statCards: [
      { key: 'new',     label: 'New Applications', value: '7',      sub: '+3 this week',           icon: Users,       presetKey: 'new_applications' },
      { key: 'review',  label: 'Pending Review',   value: '3',      sub: 'Avg 1.2 day response',   icon: Clock,       presetKey: 'pending_review' },
      { key: 'active',  label: 'Active Collabs',   value: '5',      sub: 'Across 4 listings',       icon: CheckCircle2, presetKey: 'active_collabs' },
      { key: 'spend',   label: 'Total Spend',      value: '$3,800', sub: 'This month',              icon: DollarSign, presetKey: 'completed' },
    ],
    chart: {
      money:  { label: 'Spend',        unit: '$', data: seriesFor([300, 450, 220, 600, 780, 540, 690, 940, 0, 0, 0, 0]) },
      volume: { label: 'Applications', unit: '',  data: seriesFor([3, 5, 2, 7, 9, 6, 8, 11, 0, 0, 0, 0]) },
    },
    todo: [
      { type: 'pending_action', title: "Review Priya Nair's application — Glacier Prime Cabin", date: '2026-08-05' },
      { type: 'pending_action', title: 'Sign counter-pitch — Jordan Ellis',                      date: '2026-08-08' },
      { type: 'deadline',       title: "Lena Park's content due — Glacier Prime Cabin",          date: '2026-08-12' },
      { type: 'stay_date',      title: 'Maya Chen check-in — Cliffside Villa',                   date: '2026-08-14' },
      { type: 'deadline',       title: "Kai Yamamoto's Reels due — Treehouse Canopy Suite",      date: '2026-08-20' },
    ],
  },
};

const TODO_META = {
  deadline:       { label: 'Content deadline', icon: Upload,       color: '#b45309', bg: 'rgba(212,168,67,0.14)' },
  pending_action: { label: 'Pending action',   icon: Clock,        color: '#5b4db8', bg: 'rgba(123,104,200,0.12)' },
  stay_date:      { label: 'Stay date',        icon: CalendarIcon, color: '#2d7d5e', bg: 'rgba(74,155,127,0.12)' },
};

const sidebarItems = (moneyLabelKey) => [
  { key: 'overview', labelKey: 'nav.overview', icon: LayoutDashboard, action: 'tab' },
  { key: 'chart',    labelKey: moneyLabelKey,  icon: DollarSign,      action: 'modal-chart' },
  { key: 'calendar', labelKey: 'nav.calendar', icon: CalendarIcon,    action: 'modal-calendar' },
  { key: 'activity', labelKey: 'nav.activity', icon: CheckCircle2,    action: 'tab' },
  { key: 'contract', labelKey: 'nav.contract', icon: FileText,        action: 'nav' },
];

export default function ProposalsOverview({ role, search, onSearchChange, filters = [], onStatClick, children }) {
  const cfg = ROLE_CONFIG[role];
  const { t } = useTranslation('proposalsOverview');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isPending = profile?.tier === 'waitlist' && !profile?.is_verified;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const visibleTodo = selectedDate
    ? cfg.todo.filter((t) => t.date === selectedDate)
    : cfg.todo;

  const firstName = profile?.full_name?.split(' ')[0] || t('there');

  const chartTitle = t(role === 'host' ? 'chartTitle.host' : 'chartTitle.creator');
  const chartDatasets = {
    money: { ...cfg.chart.money, label: t(role === 'host' ? 'chart.money.host' : 'chart.money.creator') },
    volume: { ...cfg.chart.volume, label: t('chart.volume') },
  };

  const handleSidebarClick = (item) => {
    if (item.action === 'tab') setActiveTab(item.key);
    else if (item.action === 'modal-chart') setChartModalOpen(true);
    else if (item.action === 'modal-calendar') setCalendarModalOpen(true);
    else if (item.action === 'nav') navigate('/contract');
    setSidebarOpen(false);
  };

  const handleStatClick = (presetKey) => {
    onStatClick?.(presetKey);
    setActiveTab('activity');
  };

  return (
    <div style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem clamp(1rem, 2vw, 1.5rem) 0' }}>
      <style>{`
        .dbo-hamburger { display: none; }
        .dbo-stats-grid { grid-template-columns: repeat(4, 1fr); }
        .dbo-charts-grid { grid-template-columns: 2fr 1fr; }
        @media (max-width: 980px) {
          .dbo-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dbo-charts-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          .dbo-sidebar { position: fixed !important; top: 0 !important; bottom: 0; left: 0; z-index: 200; width: 240px !important;
            border-radius: 0 1.25rem 1.25rem 0 !important; transform: translateX(-100%);
            transition: transform 260ms var(--ease-out-quart); }
          .dbo-sidebar.open { transform: translateX(0); }
          .dbo-hamburger { display: flex !important; }
          .dbo-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 190 }} />
      )}

      {/* ── Sidebar (page-local) — sticky, but always clear of the floating glass nav ── */}
      <div className={`dbo-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        width: 220, flexShrink: 0, background: 'var(--ink)', color: 'var(--bone)',
        borderRadius: '1.25rem', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
        alignSelf: 'flex-start', position: 'sticky',
        top: `calc(7rem + var(--banner-h, 0rem)${isPending ? ' + 1.8rem' : ''})`,
        maxHeight: `calc(100vh - 7rem - var(--banner-h, 0rem)${isPending ? ' - 1.8rem' : ''} - 1.25rem)`,
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.25rem' }}>
          <img src={collabnbLogo} alt="" width="24" height="24" style={{ borderRadius: 6 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem' }}>Collabnb</span>
          <button
            className="dbo-hamburger"
            onClick={() => setSidebarOpen(false)}
            aria-label={t('closeSidebar')}
            style={{ marginLeft: 'auto', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--bone)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {sidebarItems(role === 'host' ? 'nav.money.host' : 'nav.money.creator').map((item) => {
            const Icon = item.icon;
            const selected = item.action === 'tab' && activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSidebarClick(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', textAlign: 'left',
                  padding: '0.65rem 0.75rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                  background: selected ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: selected ? 'var(--bone)' : 'rgba(239,236,233,0.75)',
                  fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                  transition: 'background 150ms, color 150ms',
                }}
                onMouseEnter={(e) => { if (!selected) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--bone)'; } }}
                onMouseLeave={(e) => { if (!selected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,236,233,0.75)'; } }}
              >
                <Icon size={16} />
                {t(item.labelKey)}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 'auto', padding: '0.85rem', borderRadius: '0.9rem', background: 'rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '0.72rem', color: 'rgba(239,236,233,0.6)', margin: 0, lineHeight: 1.5 }}>
            {t(role === 'host' ? 'sidebarTip.host' : 'sidebarTip.creator')}
          </p>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '1.25rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            className="dbo-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('openSidebar')}
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(25,37,36,0.1)', borderRadius: '0.75rem', width: 38, height: 38, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink)', flexShrink: 0 }}
          >
            <Menu size={18} />
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', color: 'var(--ink)', margin: '0 0 0.3rem' }}>
              {t('hello', { name: firstName })}
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--slate)', margin: 0 }}>{t(`greeting.${role}`)}</p>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Stat cards — click to jump into Activity, pre-filtered */}
            <div className="dbo-stats-grid" style={{ display: 'grid', gap: '1rem' }}>
              {cfg.statCards.map(({ key, value, sub, icon: Icon, presetKey }) => (
                <button
                  key={key}
                  onClick={() => handleStatClick(presetKey)}
                  className="glass-card"
                  style={{ padding: '1.1rem 1.25rem', textAlign: 'left', cursor: 'pointer', border: 'none', font: 'inherit', transition: 'transform 150ms' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)' }}>{t(`stat.${role}.${key}.label`)}</span>
                    <div style={{ width: 30, height: 30, borderRadius: '0.6rem', background: 'rgba(60,87,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} color="var(--slate)" />
                    </div>
                  </div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.55rem', color: 'var(--ink)', margin: '0 0 0.2rem' }}>{value}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: 0 }}>{sub}</p>
                </button>
              ))}
            </div>

            {/* Chart + Calendar (compact previews — full views open from the sidebar) */}
            <div className="dbo-charts-grid" style={{ display: 'grid', gap: '1rem', alignItems: 'stretch' }}>
              <DashboardChart datasets={chartDatasets} title={chartTitle} />
              <DashboardCalendar todoItems={cfg.todo} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </div>

            {/* Upcoming — nested under Overview */}
            <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--ink)', margin: 0 }}>{t('upcoming')}</h3>
                {selectedDate && (
                  <button onClick={() => setSelectedDate(null)} style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--sage)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {t('clearDateFilter')}
                  </button>
                )}
              </div>
              {visibleTodo.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--sage)', textAlign: 'center', padding: '1rem 0' }}>{t('nothingScheduled')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {visibleTodo.map((todo, i) => {
                    const meta = TODO_META[todo.type];
                    const Icon = meta.icon;
                    const d = new Date(`${todo.date}T00:00:00`);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.7rem', borderRadius: '0.85rem', background: 'rgba(25,37,36,0.03)' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '0.6rem', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={14} color={meta.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{todo.title}</p>
                          <p style={{ fontSize: '0.68rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>{t(`todoMeta.${todo.type}`)}</p>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)', flexShrink: 0 }}>
                          {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'activity' && (
          <>
            {/* Search + filters — scoped to Activity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div style={{
                flex: '1 1 200px', maxWidth: 340, display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(25,37,36,0.1)',
                borderRadius: '9999px', padding: '0.5rem 0.9rem',
              }}>
                <Search size={15} color="var(--sage)" style={{ flexShrink: 0 }} />
                <input
                  value={search}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder={t(role === 'host' ? 'searchHost' : 'searchCreator')}
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem', fontFamily: 'var(--font-body)', color: 'var(--ink)', flex: 1, minWidth: 0 }}
                />
              </div>

              {filters.map((f) => (
                <div key={f.key} style={{ position: 'relative', flexShrink: 0 }}>
                  <select
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                    style={{
                      appearance: 'none', WebkitAppearance: 'none',
                      background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(25,37,36,0.1)',
                      borderRadius: '9999px', padding: '0.5rem 1.8rem 0.5rem 0.9rem',
                      fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', maxWidth: 160,
                    }}
                  >
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--sage)' }} />
                </div>
              ))}
            </div>

            {children}
          </>
        )}
      </div>

      {chartModalOpen && (
        <DashboardModal title={chartTitle} onClose={() => setChartModalOpen(false)} maxWidth={640}>
          <DashboardChart datasets={chartDatasets} title="" />
        </DashboardModal>
      )}

      {calendarModalOpen && (
        <DashboardModal title={t('nav.calendar')} onClose={() => setCalendarModalOpen(false)} maxWidth={920}>
          <CalendarFull todoItems={cfg.todo} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </DashboardModal>
      )}
    </div>
  );
}
