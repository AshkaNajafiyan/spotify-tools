import React, { useEffect, useState, useRef } from 'react';

const MONTHS = [
  { v: 1, label: 'Jan' },
  { v: 2, label: 'Feb' },
  { v: 3, label: 'Mar' },
  { v: 4, label: 'Apr' },
  { v: 5, label: 'May' },
  { v: 6, label: 'Jun' },
  { v: 7, label: 'Jul' },
  { v: 8, label: 'Aug' },
  { v: 9, label: 'Sep' },
  { v: 10, label: 'Oct' },
  { v: 11, label: 'Nov' },
  { v: 12, label: 'Dec' },
];

function daysInMonth(year, month) {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

// value: "yyyy-mm-dd" or empty string
export default function DateSelector({ value, onChange, placeholder }) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [focused, setFocused] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!value) {
      setYear('');
      setMonth('');
      setDay('');
      return;
    }
    const parts = value.split('-');
    if (parts.length === 3) {
      setYear(parts[0]);
      setMonth(String(Number(parts[1])));
      setDay(String(Number(parts[2])));
    }
  }, [value]);

  useEffect(() => {
    function onDocClick(e) {
      if (calendarRef.current && !calendarRef.current.contains(e.target) && !wrapperRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function emitChange(y, m, d) {
    if (!y || !m || !d) {
      onChange('');
      return;
    }
    const ys = String(y).padStart(4, '0');
    const ms = String(m).padStart(2, '0');
    const ds = String(d).padStart(2, '0');
    onChange(`${ys}-${ms}-${ds}`);
  }

  // Allow typing without aggressive clamping; clamp only on blur/enter
  function handleYearInput(e) {
    let v = e.target.value.replace(/[^0-9]/g, '');
    if (v.length > 4) v = v.slice(0, 4);
    setYear(v);
  }

  function commitYear() {
    if (!year) {
      emitChange('', month, day);
      return;
    }
    let n = Number(year);
    if (Number.isNaN(n)) {
      setYear('');
      emitChange('', month, day);
      return;
    }
    if (n < 1900) n = 1900;
    if (n > 2999) n = 2999;
    setYear(String(n));
    // adjust day if needed
    const max = daysInMonth(n, month || 1);
    let dnum = day ? Number(day) : null;
    if (dnum && dnum > max) dnum = max;
    if (dnum) setDay(String(dnum));
    emitChange(n, month, dnum);
  }

  function handleYearKey(e) {
    if (e.key === 'Enter') {
      commitYear();
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      let n = year ? Number(year) : new Date().getFullYear();
      if (e.key === 'ArrowUp') n += 1; else n -= 1;
      if (n < 1900) n = 1900;
      if (n > 2999) n = 2999;
      setYear(String(n));
    } else if (e.key === 'ArrowLeft') {
      // move focus to month
      const sel = wrapperRef.current.querySelector('input[aria-label="Month"]');
      if (sel) sel.focus();
    } else if (e.key === 'ArrowRight') {
      const sel = wrapperRef.current.querySelector('input[aria-label="Month"]');
      if (sel) sel.focus();
    }
  }

  // Month input handler: numeric only (1-12)
  function handleMonthInput(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setMonth('');
      emitChange(year, '', day);
      return;
    }
    let n = Number(raw);
    if (Number.isNaN(n)) {
      setMonth('');
      emitChange(year, '', day);
      return;
    }
    if (n < 1) n = 1;
    if (n > 12) n = 12;
    setMonth(String(n));
    const yNum = year ? Number(year) : new Date().getFullYear();
    const max = daysInMonth(yNum, n);
    let dnum = day ? Number(day) : null;
    if (dnum && dnum > max) dnum = max;
    setDay(dnum ? String(dnum) : day);
    emitChange(year, n, dnum);
  }

  function handleMonthKey(e) {
    if (e.key === 'ArrowLeft') {
      const sel = wrapperRef.current.querySelector('input[aria-label="Year"]');
      if (sel) sel.focus();
    } else if (e.key === 'ArrowRight') {
      const sel = wrapperRef.current.querySelector('input[aria-label="Day"]');
      if (sel) sel.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      let n = month ? Number(month) : (new Date().getMonth() + 1);
      if (e.key === 'ArrowUp') n += 1; else n -= 1;
      if (n < 1) n = 1; if (n > 12) n = 12;
      setMonth(String(n));
      const yNum = year ? Number(year) : new Date().getFullYear();
      const max = daysInMonth(yNum, n);
      let dnum = day ? Number(day) : null;
      if (dnum && dnum > max) dnum = max;
      setDay(dnum ? String(dnum) : day);
      emitChange(year, n, dnum);
    } else if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  function commitDay() {
    if (!day) { emitChange(year, month, ''); return; }
    let n = Number(day);
    if (Number.isNaN(n)) { setDay(''); emitChange(year, month, ''); return; }
    const max = maxDay;
    if (n < 1) n = 1; if (n > max) n = max;
    setDay(String(n));
    emitChange(year, month, n);
  }

  function handleDayKey(e) {
    if (e.key === 'ArrowLeft') {
      const sel = wrapperRef.current.querySelector('input[aria-label="Month"]');
      if (sel) sel.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      let n = day ? Number(day) : 1;
      if (e.key === 'ArrowUp') n += 1; else n -= 1;
      if (n < 1) n = 1; if (n > maxDay) n = maxDay;
      setDay(String(n));
      emitChange(year, month, n);
    } else if (e.key === 'Enter') {
      commitDay();
      e.currentTarget.blur();
    }
  }

  function setToday() {
    const t = new Date();
    const y = t.getFullYear();
    const m = t.getMonth() + 1;
    const d = t.getDate();
    setYear(String(y));
    setMonth(String(m));
    setDay(String(d));
    emitChange(y, m, d);
    setShowCalendar(false);
  }

  const effectiveYear = year ? Number(year) : null;
  const maxDay = daysInMonth(effectiveYear || 2000, month ? Number(month) : 1);
  const hasAny = !!(year || month || day);

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-2 w-full sm:w-auto">
      <div
        className={`relative flex items-center rounded-full border border-gray-700 bg-gray-800 px-2 py-1 gap-2 focus-within:ring-2 focus-within:ring-green-500 w-full`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {/* placeholder overlay when empty; when any input exists show formatted mask */}
        {!focused && !hasAny ? (
          <div className="absolute z-20 left-3 top-1/2 -translate-y-1/2 italic text-gray-400 pointer-events-none select-none">
            {placeholder}
          </div>
        ) : null}

        <input
          type="text"
          inputMode="numeric"
          min={1900}
          max={2999}
          placeholder=""
          value={year}
          onChange={handleYearInput}
          onBlur={commitYear}
          onKeyDown={handleYearKey}
          className="z-10 w-20 bg-transparent text-sm text-white px-2 py-1 rounded-full outline-none"
          aria-label="Year"
        />

        {/* Month: numeric input (keyboard-first). Shows numbers only */}
        <input
          type="number"
          min={1}
          max={12}
          value={month}
          onChange={e => handleMonthInput(e)}
          onKeyDown={e => handleMonthKey(e)}
          className="z-10 bg-transparent text-sm text-white px-2 py-1 rounded-full outline-none w-16"
          placeholder=""
          aria-label="Month"
        />

        {/* Day: numeric input for keyboard-first behavior */}
        <input
          type="number"
          min={1}
          max={maxDay}
          value={day}
          onChange={e => setDay(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => commitDay()}
          onKeyDown={e => handleDayKey(e)}
          className="z-10 bg-transparent text-sm text-white px-2 py-1 rounded-full outline-none w-16"
          placeholder=""
          aria-label="Day"
        />
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowCalendar(v => !v)}
          title="Open calendar"
          className="rounded-full p-2 bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
          aria-label="Open calendar picker"
          aria-expanded={showCalendar}
        >
          📅
        </button>

        {showCalendar && (
          <div ref={calendarRef} className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg p-3 z-50">
            <CalendarView
              year={effectiveYear || new Date().getFullYear()}
              month={month ? Number(month) : new Date().getMonth() + 1}
              onPick={(y, m, d) => {
                setYear(String(y));
                setMonth(String(m));
                setDay(String(d));
                emitChange(y, m, d);
                setShowCalendar(false);
              }}
              onToday={setToday}
              onClear={() => { setYear(''); setMonth(''); setDay(''); emitChange('', '', ''); setShowCalendar(false); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarView({ year, month, onPick, onToday, onClear }) {
  const [y, setY] = useState(year);
  const [m, setM] = useState(month);

  useEffect(() => { setY(year); setM(month); }, [year, month]);

  const firstDay = new Date(y, m - 1, 1).getDay(); // 0-6 Sun-Sat
  const days = daysInMonth(y, m);

  function prevMonth() {
    let ny = y; let nm = m - 1;
    if (nm < 1) { nm = 12; ny -= 1; }
    if (ny < 1900) { ny = 1900; nm = 1; }
    setY(ny); setM(nm);
  }
  function nextMonth() {
    let ny = y; let nm = m + 1;
    if (nm > 12) { nm = 1; ny += 1; }
    if (ny > 2999) { ny = 2999; nm = 12; }
    setY(ny); setM(nm);
  }

  return (
    <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="px-2 py-1 rounded bg-gray-800" aria-label="Previous month">◀</button>
            <div className="text-sm font-semibold">{y} {MONTHS[m-1]?.label}</div>
            <button onClick={nextMonth} className="px-2 py-1 rounded bg-gray-800" aria-label="Next month">▶</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onToday} className="px-2 py-1 rounded-full bg-green-500 text-black text-sm" aria-label="Set to today's date">Today</button>
            <button onClick={onClear} className="px-2 py-1 rounded-full bg-red-600 text-white text-sm" aria-label="Clear date">Clear</button>
          </div>
        </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-1">
        {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const d = i + 1;
          const monthLabel = MONTHS[m-1]?.label || '';
          return (
            <button
              key={d}
              onClick={() => onPick(y, m, d)}
              className="aspect-square flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 text-sm"
              aria-label={`Select ${monthLabel} ${d}, ${y}`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// end of DateSelector
