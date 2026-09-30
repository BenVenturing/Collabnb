import { STAGES, STAGE_LABEL } from '../data.js';
import { SourceChip } from './Card.jsx';

export default function Tracker({ opps, update }) {
  return (
    <section className="board">
      {STAGES.map((s) => {
        const col = opps.filter((o) => o.status === s);
        return (
          <div key={s} className="glass col">
            <h2 className="sub">{STAGE_LABEL[s]} <span className="count">{col.length}</span></h2>
            {col.map((o) => (
              <div key={o.id} className="glass inset mini">
                <SourceChip source={o.source} />
                <span className="t">{o.title}</span>
                <span className="muted small">{o.brand}</span>
                <label className="sr" htmlFor={`st-${o.id}`}>Stage</label>
                <select id={`st-${o.id}`} value={o.status} onChange={(e) => update(o.id, { status: e.target.value })}>
                  {[...STAGES, 'skipped'].map((x) => <option key={x} value={x}>{STAGE_LABEL[x]}</option>)}
                </select>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
