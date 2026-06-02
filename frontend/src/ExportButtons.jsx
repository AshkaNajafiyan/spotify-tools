import { useState, useEffect, useRef } from 'react';

export default function ExportButtons({ handleExport, loading }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full px-5 py-2 bg-gray-800 border border-white/30 text-white hover:bg-gray-700 shadow-md transition cursor-pointer font-semibold"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Export albums"
        disabled={loading}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-semibold">Export</span>
        <svg className={`w-3 h-3 ml-1 transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-2xl p-2 shadow-2xl z-40 cursor-pointer">
          <button
            onClick={() => { setOpen(false); handleExport('csv', false); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 text-sm text-white cursor-pointer"
            title="Export all albums as CSV"
          >
            Export CSV
          </button>

          <button
            onClick={() => { setOpen(false); handleExport('csv', true); }}
            className="w-full text-left mt-2 px-3 py-2 rounded-lg hover:bg-gray-700 text-sm text-white cursor-pointer"
            title="Export filtered albums as CSV"
          >
            Export filtered CSV
          </button>

          <button
            onClick={() => { setOpen(false); handleExport('json', false); }}
            className="w-full text-left mt-2 px-3 py-2 rounded-lg hover:bg-gray-700 text-sm text-white cursor-pointer"
            title="Export all albums as JSON"
          >
            Export JSON
          </button>

          <button
            onClick={() => { setOpen(false); handleExport('json', true); }}
            className="w-full text-left mt-2 px-3 py-2 rounded-lg hover:bg-gray-700 text-sm text-white cursor-pointer"
            title="Export filtered albums as JSON"
          >
            Export filtered JSON
          </button>
        </div>
      )}
    </div>
  );
}
