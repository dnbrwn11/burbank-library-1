import { useState, useRef } from 'react';
import { analytics } from '../analytics';

const ACCENT = '#B89030';
const BORDER = '#E5E5E0';
const BG = '#F9F9F8';

// Extract significant keywords from a string (words 4+ chars, skip numbers)
function keywords(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && isNaN(w));
}

// Score how well two strings match (0–1)
function matchScore(a, b) {
  const ak = new Set(keywords(a));
  const bk = new Set(keywords(b));
  if (!ak.size || !bk.size) return 0;
  let hits = 0;
  ak.forEach(w => { if (bk.has(w)) hits++; });
  return hits / Math.min(ak.size, bk.size);
}

// Find the most likely "description" column index from a header row
function findDescCol(header) {
  const names = header.map(h => String(h || '').toLowerCase());
  const priority = ['description', 'desc', 'item', 'scope', 'work', 'csi', 'activity', 'trade', 'task'];
  for (const p of priority) {
    const idx = names.findIndex(n => n.includes(p));
    if (idx >= 0) return idx;
  }
  // Fall back to the column with the longest average cell content
  return 0;
}

// Parse CSV text → array of string arrays
function parseCSV(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    // Handle quoted fields
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue; }
      if (line[i] === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
      cur += line[i];
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

// Pull description strings out of a 2D array of cells
function extractDescriptions(rows) {
  if (!rows.length) return [];
  const headerRow = rows[0];
  const col = findDescCol(headerRow);
  return rows
    .slice(1)
    .map(row => String(row[col] ?? '').trim())
    .filter(d => d.length > 3 && !d.match(/^\d+(\.\d+)?$/)); // skip pure numbers
}

// Compare uploaded descriptions against estimate line items
function analyzeGaps(uploadDescs, estimateItems) {
  const active = estimateItems.filter(i => !i.isArchived);
  const MATCH_THRESHOLD = 0.35;

  const matchedEstimateIds = new Set();
  const matched = [];
  const uploadOnly = [];

  for (const ud of uploadDescs) {
    let best = null, bestScore = 0;
    for (const item of active) {
      const corpus = `${item.category} ${item.subcategory || ''} ${item.description}`;
      const score = matchScore(ud, corpus);
      if (score > bestScore) { bestScore = score; best = item; }
    }
    if (best && bestScore >= MATCH_THRESHOLD) {
      matched.push({ uploadDesc: ud, item: best, score: bestScore });
      matchedEstimateIds.add(best.id);
    } else {
      uploadOnly.push(ud);
    }
  }

  const estimateOnly = active.filter(i => !matchedEstimateIds.has(i.id));
  return { matched, uploadOnly, estimateOnly };
}

export default function ScopeGapAnalysis({ items, project, scenario }) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [results, setResults] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);

  async function processFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setParseError('Please upload an Excel (.xlsx / .xls) or CSV file.');
      return;
    }
    setParsing(true);
    setParseError(null);
    setResults(null);
    setFileName(file.name);
    try {
      let rows = [];
      if (ext === 'csv') {
        const text = await file.text();
        rows = parseCSV(text);
      } else {
        // Dynamic import keeps xlsx out of the main bundle
        const XLSX = (await import('xlsx')).default;
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      }
      const descs = extractDescriptions(rows);
      if (!descs.length) {
        setParseError('No description text found. Make sure the file has a column with scope/item descriptions.');
        setParsing(false);
        return;
      }
      const analysis = analyzeGaps(descs, items || []);
      setResults({ ...analysis, uploadCount: descs.length });
      analytics.auditRun(ext);
    } catch (err) {
      setParseError(err.message || 'Failed to parse file.');
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function onInputChange(e) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function reset() {
    setResults(null);
    setParseError(null);
    setFileName(null);
  }

  return (
    <div style={{ marginTop: 28 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h3 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 15, color: '#111', margin: '0 0 3px' }}>
            Scope Gap Analysis
          </h3>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#999', margin: 0 }}>
            Compare an external file against your estimate to find missing or unmatched scope.
          </p>
        </div>
        {results && (
          <button
            onClick={reset}
            style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px 12px', fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#666', cursor: 'pointer' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Upload zone — always visible */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !parsing && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? ACCENT : BORDER}`,
          borderRadius: 10,
          background: dragging ? '#fffdf5' : '#fff',
          padding: '28px 24px',
          textAlign: 'center',
          cursor: parsing ? 'default' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          marginBottom: results || parseError ? 20 : 0,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={onInputChange}
          style={{ display: 'none' }}
        />

        {parsing ? (
          <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#aaa' }}>
            Analysing <strong>{fileName}</strong>…
          </div>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 10, lineHeight: 1 }}>📂</div>
            <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 500 }}>
              Upload a budget or estimate to check for missing scope.
            </div>
            <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#bbb' }}>
              Drag &amp; drop here, or click to browse · .xlsx, .xls, .csv
            </div>
            {fileName && !results && (
              <div style={{ marginTop: 8, fontFamily: "'Figtree', sans-serif", fontSize: 11, color: ACCENT }}>
                {fileName}
              </div>
            )}
          </>
        )}
      </div>

      {/* Parse error */}
      {parseError && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: `1px solid #fca5a5`, borderRadius: 8, fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
          {parseError}
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Items in upload', val: results.uploadCount, color: '#555' },
              { label: 'Matched to estimate', val: results.matched.length, color: '#16a34a' },
              { label: 'Missing from estimate', val: results.uploadOnly.length, color: '#dc2626' },
              { label: 'Not in upload', val: results.estimateOnly.length, color: '#d97706' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 16px', flex: '1 1 130px', minWidth: 0 }}>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#888', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Gaps: in upload but not in estimate */}
          {results.uploadOnly.length > 0 && (
            <ResultSection
              title="In upload — not found in estimate"
              color="#dc2626"
              bg="#fef2f2"
              items={results.uploadOnly.map(d => ({ label: d }))}
              emptyText=""
            />
          )}

          {/* Gaps: in estimate but not in upload */}
          {results.estimateOnly.length > 0 && (
            <ResultSection
              title="In estimate — not covered by upload"
              color="#d97706"
              bg="#fffbeb"
              items={results.estimateOnly.map(i => ({ label: i.description, sub: `${i.category}${i.subcategory ? ' · ' + i.subcategory : ''}` }))}
              emptyText=""
            />
          )}

          {/* Matched items */}
          {results.matched.length > 0 && (
            <ResultSection
              title="Matched items"
              color="#16a34a"
              bg="#f0fdf4"
              collapsed
              items={results.matched.map(m => ({ label: m.uploadDesc, sub: m.item.description }))}
              emptyText=""
            />
          )}

          {results.uploadOnly.length === 0 && results.estimateOnly.length === 0 && (
            <div style={{ padding: '20px 24px', background: '#f0fdf4', border: `1px solid #bbf7d0`, borderRadius: 10, textAlign: 'center', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#166534' }}>
              No scope gaps found — all uploaded items matched the estimate.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, color, bg, items, emptyText, collapsed = false }) {
  const [open, setOpen] = useState(!collapsed);
  if (!items.length && !emptyText) return null;
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 16px', background: bg, border: 'none', cursor: 'pointer',
          borderBottom: open ? `1px solid ${BORDER}` : 'none',
        }}
      >
        <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 12, color, letterSpacing: 0.5 }}>
          {title} <span style={{ fontWeight: 400, opacity: 0.7 }}>({items.length})</span>
        </span>
        <span style={{ color, fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div>
          {items.length === 0 ? (
            <div style={{ padding: '12px 16px', fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#aaa' }}>{emptyText}</div>
          ) : (
            items.map((item, i) => (
              <div
                key={i}
                style={{ padding: '8px 16px', borderBottom: i < items.length - 1 ? `1px solid ${BORDER}` : 'none', display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#222' }}>{item.label}</div>
                {item.sub && (
                  <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#aaa' }}>{item.sub}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
