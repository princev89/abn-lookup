import type { FilterOptions } from './types';

type Props = {
  filterOptions: FilterOptions;
  stateFilter: string;
  setStateFilter: (v: string) => void;
  gst: string;
  setGst: (v: string) => void;
  entityType: string;
  setEntityType: (v: string) => void;
  postcode: string;
  setPostcode: (v: string) => void;
};

export default function Filters({ filterOptions, stateFilter, setStateFilter, gst, setGst, entityType, setEntityType, postcode, setPostcode }: Props) {
  const hasActiveFilters = stateFilter || gst || entityType || postcode;

  const clearFilters = () => {
    setStateFilter('');
    setGst('');
    setEntityType('');
    setPostcode('');
  };

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <select className="input" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All States</option>
          {filterOptions.states.map((s, index) => (
            <option key={index} value={s}>{s}</option>
          ))}
        </select>

        <select className="input" value={gst} onChange={(e) => setGst(e.target.value)}>
          <option value="">GST Status</option>
          <option value="true">GST Registered</option>
          <option value="false">Not GST Registered</option>
        </select>

        <select className="input" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">All Entity Types</option>
          {filterOptions?.entity_type?.map((et, index) => (
            <option key={index} value={et}>{et}</option>
          ))}
        </select>

        <div className="relative">
          <input
            className="input w-full"
            placeholder="Postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
