import { STEP_KINDS } from '../data.js';
import Icon from './Icon.jsx';

export default function Legend() {
  return (
    <details className="glass legend">
      <summary>
        <Icon name="info" size={16} /> What the icons and fit score mean
      </summary>
      <div className="legend-body">
        <div>
          <h3 className="sub">Steps the agent takes</h3>
          <ul className="legend-list">
            {Object.entries(STEP_KINDS).map(([k, s]) => (
              <li key={k}>
                <span className="sico"><Icon name={s.icon} size={15} /></span>
                <span>
                  <strong>{s.label}</strong>
                  <span className="muted small"> — {s.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="fitexp">
          <h3 className="sub">Fit score</h3>
          <p className="small">How well a brief matches you, out of 99:</p>
          <ul className="small">
            <li><strong>40</strong> to start</li>
            <li><strong>up to +50</strong> for the share of the brief's niche tags that match your niches or your mission</li>
            <li><strong>+10</strong> if it's where you're based</li>
            <li><strong>+5</strong> if it's remote</li>
          </ul>
          <p className="muted small">Hover or focus a score to see its breakdown. Green is 75+, yellow 55–74, red below 55.</p>
          <p className="muted small">Casting boards are job sites like Project Casting and Backstage that list paid creator and influencer campaigns.</p>
        </div>
      </div>
    </details>
  );
}
