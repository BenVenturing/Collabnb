const INK = '#192524', SLATE = '#3C5759', SAGE = '#646B62', MINT = '#D1EBDB', LINE = '#D9D6CF';

const MAIN = [
  { id: 'pick', title: 'Pick hotel', sub: 'Nightly 01:00 UTC · confirmed boutique hosts, under 25k followers' },
  { id: 'audit', title: 'Instagram audit', sub: 'Pulls their feed, finds the headline gap' },
  { id: 'contact', title: 'Find decision maker + email', sub: 'Skipped if no email, chain, resort or too big' },
  { id: 'email', title: 'Email', sub: 'Rotates copy A → B → C' },
  { id: 'f1', title: 'Follow-up 1', sub: 'Day 3 · what a creator stay looks like' },
  { id: 'f2', title: 'Follow-up 2', sub: 'Day 7 · no fee, no contract' },
  { id: 'f3', title: 'Follow-up 3', sub: 'Day 14 · last note, audit is theirs' },
  { id: 'end', title: 'Sequence done', sub: 'No click after 3 follow-ups' },
];

export function flowPosition(r) {
  if (!r) return null;
  if (r.clicked || r.claim_token || r.built_at) return 'built';
  return r.followups >= 3 ? 'f3' : r.followups === 2 ? 'f2' : r.followups === 1 ? 'f1' : 'email';
}

function Box({ title, sub, state, accent }) {
  const bg = state === 'current' ? INK : state === 'done' ? MINT : '#fff';
  const fg = state === 'current' ? '#fff' : INK;
  return (
    <div style={{ background: bg, color: fg, border: `1.5px solid ${state ? INK : accent || LINE}`, borderRadius: 12, padding: '10px 14px' }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, opacity: state === 'current' ? 0.8 : 1, color: state === 'current' ? '#fff' : SAGE, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const Down = () => <div style={{ textAlign: 'center', color: SLATE, fontSize: 16, lineHeight: '22px' }}>↓</div>;
const Right = () => <div style={{ color: SLATE, fontSize: 16, alignSelf: 'center', textAlign: 'center' }}>→</div>;

export default function OutreachFlow({ row, onClose }) {
  const pos = flowPosition(row);
  const order = MAIN.map((s) => s.id);
  const reached = pos === 'built' ? order.indexOf('email') + (row?.followups || 0) : order.indexOf(pos);
  const stateOf = (id) => {
    if (!pos) return undefined;
    const i = order.indexOf(id);
    if (pos !== 'built' && id === pos) return 'current';
    return i <= reached ? 'done' : undefined;
  };
  const nudge = (n) => {
    if (pos !== 'built' || row.published_at) return row?.published_at && (row.publish_reminders || 0) >= n ? 'done' : undefined;
    const done = row.publish_reminders || 0;
    return done > n ? 'done' : done === n ? 'current' : undefined;
  };
  // grid rows: each main step takes 2 rows (box + arrow)
  const r = (id) => order.indexOf(id) * 2 + 1;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(25,37,36,0.45)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, maxHeight: '92vh', overflowY: 'auto', background: '#FBFCFA', borderRadius: 18, padding: '22px 22px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, color: INK }}>{row ? row.hotel : 'How auto outreach works'}</h3>
            {row && (
              <div style={{ fontSize: 13, color: SAGE, marginTop: 4 }}>
                Copy {row.variant} · {row.followups} of 3 follow-ups sent{row.replied ? ' · ' : ''}
                {row.replied && <strong style={{ color: '#4B3A78' }}>Replied</strong>}
                {row.viewed ? ` · viewed audit ×${row.viewed}` : ''}
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 22, color: SLATE, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) 28px minmax(0,1fr)', columnGap: 4 }}>
          {MAIN.map((s, i) => (
            <div key={s.id} style={{ display: 'contents' }}>
              <div style={{ gridColumn: 1, gridRow: i * 2 + 1 }}>
                <Box title={s.id === 'email' && row ? `Email · copy ${row.variant}` : s.title} sub={s.sub} state={stateOf(s.id)} />
              </div>
              {i < MAIN.length - 1 && <div style={{ gridColumn: 1, gridRow: i * 2 + 2 }}><Down /></div>}
            </div>
          ))}

          <div style={{ gridColumn: 2, gridRow: r('audit') }}><Right /></div>
          <div style={{ gridColumn: 3, gridRow: `${r('audit')} / span 3`, alignSelf: 'start' }}>
            <Box title="Skipped" sub="Private or tiny IG, no email, already has an account" accent="#E8C7C3" />
          </div>

          <div style={{ gridColumn: 2, gridRow: r('email') }}><Right /></div>
          <div style={{ gridColumn: 3, gridRow: r('email') }}>
            <Box title="DM nudge drafted" sub="Day 2 · you send it from Instagram" state={row?.dm_done ? 'done' : undefined} />
          </div>

          <div style={{ gridColumn: 2, gridRow: `${r('f1')} / span 5`, alignSelf: 'center' }}><Right /></div>
          <div style={{ gridColumn: 3, gridRow: `${r('f1')} / span 5`, alignSelf: 'center' }}>
            <div style={{ border: `1.5px dashed ${SLATE}`, borderRadius: 14, padding: 10, display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, color: SAGE }}>Any time they click it</div>
              <Box title="Clicked Build my listing" sub="From any email" state={pos === 'built' ? 'done' : undefined} />
              <Down />
              <Box title="Listing built" sub="You get a 🔥 email · follow-ups stop" state={pos === 'built' ? (row.publish_reminders || row.published_at ? 'done' : 'current') : undefined} />
              <Down />
              <Box title="Reminder on platform" sub="Same day, +4h · only if not published" state={nudge(1)} />
              <Down />
              <Box title="Reminder email" sub="Same day, +8h · only if still a draft" state={nudge(2)} />
              <Down />
              <Box title="Published" sub="Live for creators · reminders stop" state={row?.published_at ? 'current' : undefined} />
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: SAGE, marginTop: 16 }}>Replies are marked on the hotel but don't stop the follow-ups. Only a click on Build my listing does.</div>
      </div>
    </div>
  );
}
