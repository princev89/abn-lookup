import { useEffect, useState } from 'react';
import './index.css';
import type { Result, EntityDetail, FilterOptions } from './components/types';
import SearchBar from './components/SearchBar';
import Filters from './components/Filters';
import ResultsTable from './components/ResultsTable';
import Pagination from './components/Pagination';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function App() {
  const [q, setQ] = useState('');
  const [abn, setAbn] = useState('');
  const [limit, setLimit] = useState<number>(20);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<EntityDetail | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ entity_type: [], states: [] });
  const [stateFilter, setStateFilter] = useState('');
  const [gst, setGst] = useState('');
  const [entityType, setEntityType] = useState('');
  const [postcode, setPostcode] = useState('');

  const totalPages = Math.ceil(totalCount / limit);

  useEffect(() => {
    fetch(`${API_BASE}/filters`).then((r) => r.json()).then((d) => setFilterOptions(d.data || {}));
    fetch(`${API_BASE}/stats`).then((r) => r.json()).then((d) => setTotalCount(d.totalEntities || 0));
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [q, abn, stateFilter, gst, entityType, postcode, limit]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (abn) params.set('abn', abn);
      if (stateFilter) params.set('state', stateFilter);
      if (gst) params.set('gst', gst);
      if (entityType) params.set('entity_type', entityType);
      if (postcode) params.set('postcode', postcode);
      params.set('limit', String(limit));
      params.set('page', String(page));

      fetch(`${API_BASE}/search?${params.toString()}`).then((r) => r.json()).then((d) => {
        setResults(d.results || []);
        if (d.total !== undefined) {
          setTotalCount(d.total);
        }
      }).catch(() => {
        setResults([]);
      }).finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(t);
  }, [q, abn, page, limit, stateFilter, gst, entityType, postcode]);

  async function handleSelect(abn: string) {
    const r = await fetch(`${API_BASE}/abn/${abn}`);
    const d = await r.json();
    setSelected(d || null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">ABN Search</h1>
          </div>
          <p className="text-gray-500 ml-13">Search Australian Business Numbers and company details</p>
        </div>

        {/* Search Card */}
        <div className="card mb-6">
          <SearchBar q={q} setQ={setQ} abn={abn} setAbn={setAbn} limit={limit} setLimit={setLimit} />
          <Filters filterOptions={filterOptions} stateFilter={stateFilter} setStateFilter={setStateFilter} gst={gst} setGst={setGst} entityType={entityType} setEntityType={setEntityType} postcode={postcode} setPostcode={setPostcode} />
        </div>

        {/* Results */}
        <div className="table-container">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="spinner mb-4"></div>
              <p className="text-gray-500">Searching...</p>
            </div>
          ) : (
            <>
              <ResultsTable results={results} onSelect={handleSelect} />
              {results.length > 0 && (
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-gray-500">
                      Showing <span className="font-medium text-gray-700">{(page - 1) * limit + 1}</span> to{' '}
                      <span className="font-medium text-gray-700">{Math.min(page * limit, totalCount)}</span> of{' '}
                      <span className="font-medium text-gray-700">{totalCount.toLocaleString()}</span> results
                    </p>
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                  </div>
                </div>
              )}
              {results.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium">No results found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Modal */}
        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selected.legal_name || selected.businessNames?.[0] || 'Business Details'}
                </h2>
                <button onClick={() => setSelected(null)} className="btn-icon">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailItem label="ABN" value={selected.abn} />
                  <DetailItem label="Legal Name" value={selected.legal_name} />
                  <DetailItem label="Entity Type" value={selected.entity_type} />
                  <DetailItem label="State" value={selected.state} />
                  <DetailItem label="Postcode" value={selected.postcode} />
                  <DetailItem label="GST Registered" value={selected.gst_registered ? 'Yes' : 'No'} />
                  {selected.businessNames && selected.businessNames.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-500 mb-1">Business Names</p>
                      <div className="flex flex-wrap gap-2">
                        {selected.businessNames.map((name, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button onClick={() => setSelected(null)} className="btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-gray-900 font-medium">{value || '-'}</p>
    </div>
  );
}

export default App;
