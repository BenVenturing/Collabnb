import { useState } from 'react';
import { SAMPLE_POOL, DEFAULT_PROFILE, DEFAULT_SETTINGS } from './data.js';
import { usePersisted, fitDetails, fitExplain, draftPitch, draftExtras, confirmPatch, uid } from './lib.js';
import Feed from './views/Feed.jsx';
import Approvals from './views/Approvals.jsx';
import Tracker from './views/Tracker.jsx';
import Profile from './views/Profile.jsx';
import Connect from './views/Connect.jsx';
import Report from './views/Report.jsx';
import Appearance from './views/Appearance.jsx';
import Legend from './views/Legend.jsx';
import Icon from './views/Icon.jsx';

const TABS = [
  { id: 'feed', label: 'Opportunities', icon: 'target' },
  { id: 'approvals', label: 'Approvals', icon: 'inbox' },
  { id: 'tracker', label: 'Tracker', icon: 'board' },
  { id: 'profile', label: 'Profile & voice', icon: 'user' },
  { id: 'connect', label: 'Connect', icon: 'plug' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const RUN_STEPS = ['Scanning sources', 'Reading captions & rules', 'Screening for injected text', 'Scoring fit', 'Printing report'];

export default function App() {
  const [storedTab, setTab] = usePersisted('pg.tab', 'feed');
  const tab = TABS.some((t) => t.id === storedTab) ? storedTab : 'feed';
  const [profile, setProfile] = usePersisted('pg.profile', DEFAULT_PROFILE);
  const [opps, setOpps] = usePersisted('pg.opps', []);
  const [poolIndex, setPoolIndex] = usePersisted('pg.pool', 0);
  const [storedSettings, setSettings] = usePersisted('pg.settings', DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...storedSettings };
  const [count, setCount] = usePersisted('pg.count', 10);
  const [run, setRun] = useState(null);
  const [report, setReport] = useState(null);

  const update = (id, patch) => setOpps((all) => all.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const addOpp = (o) =>
    setOpps((all) => [{ id: uid(), status: 'found', foundAt: Date.now(), ...o }, ...all]);

  const draftPatch = (o) => ({ status: 'drafted', draft: draftPitch(o, profile), ...draftExtras(o, profile) });

  const draft = (o) => {
    update(o.id, draftPatch(o));
    setTab('approvals');
  };

  const confirmBatch = (keepIds) => {
    setOpps((all) =>
      all.map((o) => {
        if (!report?.ids.includes(o.id) || o.status !== 'found') return o;
        return keepIds.includes(o.id) ? { ...o, ...confirmPatch(o, profile, settings) } : { ...o, status: 'skipped' };
      }),
    );
    setReport(null);
    if (keepIds.length) setTab('approvals');
  };

  const runAgent = async () => {
    if (run) return;
    const n = Math.max(1, Math.min(Number(count) || 1, settings.caps.applications));
    for (let i = 0; i < RUN_STEPS.length; i++) {
      setRun({ step: i });
      await new Promise((r) => setTimeout(r, 650));
    }
    const batch = SAMPLE_POOL.slice(poolIndex, poolIndex + n).map((o) => ({
      id: uid(),
      status: 'found',
      foundAt: Date.now(),
      ...o,
    }));
    setOpps((all) => [...batch, ...all]);
    setPoolIndex(poolIndex + batch.length);
    setRun({ done: batch.length });
    setTimeout(() => setRun(null), 2200);
    if (batch.length) setReport({ ids: batch.map((o) => o.id), asked: n, at: Date.now() });
  };

  const pending = opps.filter((o) => o.status === 'drafted').length;
  const scored = opps.map((o) => {
    const d = fitDetails(o, profile, settings.mission);
    return { ...o, fit: d?.score ?? null, fitWhy: fitExplain(d) };
  });
  const theme = settings.theme;

  return (
    <div className="shell" style={{ '--c1': theme.c1, '--c2': theme.c2, '--c3': theme.c3 }}>
      <div className="bg" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      <aside className="glass sidebar">
        <div className="brand">
          <img src="/icon.svg" alt="" width="34" height="34" />
          <div>
            <strong>Pitchglass</strong>
            <small>your pitching agent</small>
          </div>
        </div>
        <nav>
          {TABS.map((t) => (
            <button key={t.id} className={`nav ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              <span className="ico"><Icon name={t.icon} size={18} /></span>
              <span className="lbl">{t.label}</span>
              {t.id === 'approvals' && pending > 0 && <span className="badge">{pending}</span>}
            </button>
          ))}
        </nav>
        <div className="glass inset status">
          <span className="dot off" /> Agent not connected
          <button className="link" onClick={() => setTab('connect')}>Set up</button>
        </div>
      </aside>

      <main>
        <header className="top">
          <div>
            <h1>{TABS.find((t) => t.id === tab)?.label}</h1>
            <p className="muted">
              {opps.length} found · {pending} awaiting approval · {opps.filter((o) => o.status === 'sent').length} sent
            </p>
          </div>
          <div className="runctl">
            <label className="glass findn">
              <span>Find</span>
              <input
                type="number"
                min="1"
                max={settings.caps.applications}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                aria-label="How many applications to find"
              />
            </label>
            <button className="btn primary" onClick={runAgent} disabled={!!run}>
              {run && !run.done ? <span className="spin" /> : <Icon name="play" size={14} />} Run agent
            </button>
          </div>
        </header>

        {run && (
          <div className="glass runbar" role="status">
            {run.done !== undefined ? (
              run.done ? `Found ${run.done} new ${run.done === 1 ? 'match' : 'matches'} (demo data).` : 'No new sample briefs left — paste real links below.'
            ) : (
              <>
                <span className="spin" /> {RUN_STEPS[run.step]}…
                <span className="steps">
                  {RUN_STEPS.map((s, i) => (
                    <i key={s} className={i <= run.step ? 'lit' : ''} />
                  ))}
                </span>
              </>
            )}
          </div>
        )}

        {tab === 'feed' && (
          <Feed
            opps={scored}
            mission={settings.mission}
            setMission={(mission) => setSettings({ ...settings, mission })}
            onAdd={addOpp}
            onDraft={draft}
            onSkip={(o) => update(o.id, { status: 'skipped' })}
            onRun={runAgent}
          />
        )}
        {tab === 'approvals' && <Approvals opps={scored} profile={profile} update={update} />}
        {tab === 'tracker' && <Tracker opps={scored} update={update} />}
        {tab === 'profile' && <Profile profile={profile} setProfile={setProfile} />}
        {tab === 'connect' && <Connect settings={settings} setSettings={setSettings} />}
        {tab === 'settings' && (
          <div className="stack">
            <Appearance theme={theme} setTheme={(t) => setSettings({ ...settings, theme: t })} />
            <Legend />
          </div>
        )}
        {report && (
          <Report
            report={report}
            opps={scored.filter((o) => report.ids.includes(o.id))}
            settings={settings}
            onConfirm={confirmBatch}
            onClose={() => setReport(null)}
          />
        )}
      </main>
    </div>
  );
}
