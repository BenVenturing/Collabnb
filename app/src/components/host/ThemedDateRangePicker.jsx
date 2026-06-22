import { useState } from "react";
import { formatDate } from "../../lib/dateUtils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarMonth({ year, month, startDate, endDate, onDayClick }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isStart = startDate === dateStr;
    const isEnd = endDate === dateStr;
    const inRange = startDate && endDate && dateStr >= startDate && dateStr <= endDate;
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isToday = date.getTime() === new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    cells.push({ day: d, dateStr, isStart, isEnd, inRange, isPast, isToday });
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)", textAlign: "center", marginBottom: "0.5rem" }}>
        {MONTHS[month]} {year}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
        {WEEKDAYS.map((wd) => (
          <div key={wd} style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--sage)", textAlign: "center", padding: "0.25rem 0", textTransform: "uppercase" }}>
            {wd}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e${i}`} />;
          let bg = "transparent";
          let color = cell.isPast ? "var(--sage)" : "var(--ink)";
          let radius = "0";
          if (cell.isStart || cell.isEnd) {
            bg = "#4A9B7F";
            color = "white";
            radius = cell.isStart && cell.isEnd ? "50%" : cell.isStart ? "50% 0 0 50%" : "0 50% 50% 0";
          } else if (cell.inRange) {
            bg = "rgba(74,155,127,0.2)";
          }
          return (
            <button
              key={cell.day}
              onClick={() => !cell.isPast && onDayClick(cell.dateStr)}
              disabled={cell.isPast}
              style={{
                width: "100%", aspectRatio: "1",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: bg, color,
                fontSize: "0.85rem", fontWeight: cell.isStart || cell.isEnd ? 700 : cell.isToday ? 700 : 500,
                border: cell.isToday && !cell.isStart && !cell.isEnd ? "2px solid #4A9B7F" : "none",
                borderRadius: radius || (cell.isToday ? "50%" : "8px"),
                cursor: cell.isPast ? "default" : "pointer",
                fontFamily: "var(--font-body)", transition: "background 100ms",
              }}
              onMouseEnter={(e) => { if (!cell.isPast && !cell.isStart && !cell.isEnd) e.currentTarget.style.background = "rgba(74,155,127,0.12)"; }}
              onMouseLeave={(e) => { if (!cell.isPast && !cell.isStart && !cell.isEnd) e.currentTarget.style.background = cell.inRange ? "rgba(74,155,127,0.2)" : "transparent"; }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Inline two-month range picker themed to match the creator search calendar.
// Reads/writes ISO YYYY-MM-DD strings via value={{ start, end }} and onChange(start, end).
export default function ThemedDateRangePicker({ start, end, onChange }) {
  const today = new Date();
  const [baseMonth, setBaseMonth] = useState(today.getMonth());
  const [baseYear, setBaseYear] = useState(today.getFullYear());

  const isAtCurrentMonth = baseMonth === today.getMonth() && baseYear === today.getFullYear();

  const prevMonth = () => {
    if (isAtCurrentMonth) return;
    if (baseMonth === 0) { setBaseMonth(11); setBaseYear((y) => y - 1); }
    else setBaseMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (baseMonth === 11) { setBaseMonth(0); setBaseYear((y) => y + 1); }
    else setBaseMonth((m) => m + 1);
  };

  const secondMonth = (baseMonth + 1) % 12;
  const secondYear = baseMonth === 11 ? baseYear + 1 : baseYear;

  const handleDayClick = (dateStr) => {
    if (!start || (start && end)) {
      onChange(dateStr, "");
    } else if (dateStr < start) {
      onChange(dateStr, "");
    } else {
      onChange(start, dateStr);
    }
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.5)", backdropFilter: "blur(28px) saturate(160%)", WebkitBackdropFilter: "blur(28px) saturate(160%)",
      borderRadius: "1.125rem", border: "1px solid rgba(255,255,255,0.65)", padding: "18px 20px", boxShadow: "0 8px 30px rgba(25,37,36,0.10)",
    }}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <button
          onClick={prevMonth}
          disabled={isAtCurrentMonth}
          style={{ width: "1.75rem", height: "1.75rem", borderRadius: "50%", border: "1px solid rgba(25,37,36,0.1)", background: "rgba(255,255,255,0.6)", cursor: isAtCurrentMonth ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: isAtCurrentMonth ? 0.3 : 1 }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="#3C5759" strokeWidth="2" strokeLinecap="round" width="12" height="12"><polyline points="10 4 6 8 10 12" /></svg>
        </button>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink)" }}>{MONTHS[baseMonth]} {baseYear}</span>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--sage)" }}>{MONTHS[secondMonth]} {secondYear}</span>
        <button
          onClick={nextMonth}
          style={{ width: "1.75rem", height: "1.75rem", borderRadius: "50%", border: "1px solid rgba(25,37,36,0.1)", background: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="#3C5759" strokeWidth="2" strokeLinecap="round" width="12" height="12"><polyline points="6 4 10 8 6 12" /></svg>
        </button>
      </div>

      {/* Two months */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem" }}>
        <CalendarMonth year={baseYear} month={baseMonth} startDate={start} endDate={end} onDayClick={handleDayClick} />
        <CalendarMonth year={secondYear} month={secondMonth} startDate={start} endDate={end} onDayClick={handleDayClick} />
      </div>

      {/* Selected range */}
      {(start || end) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.75rem", borderRadius: "0.75rem", background: "rgba(74,155,127,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)" }}>{start ? formatDate(start) : "?"}</span>
            {end && (
              <>
                <span style={{ color: "var(--sage)", fontSize: "0.75rem" }}>→</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)" }}>{formatDate(end)}</span>
              </>
            )}
          </div>
          <button
            onClick={() => onChange("", "")}
            style={{ fontSize: "0.72rem", color: "var(--sage)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "var(--font-body)" }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
