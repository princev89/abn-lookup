import type { Result } from './types';

type Props = {
  results: Result[];
  onSelect: (abn: string) => void;
};

export default function ResultsTable({ results, onSelect }: Props) {
  if (results.length === 0) return null;

  return (
    <div className="overflow-hidden">
      {/* Fixed Header */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">ABN</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell w-40">Type</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">State</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell w-28">Postcode</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Scrollable Body */}
      <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
        <table className="min-w-full">
          <tbody className="divide-y divide-gray-50 bg-white">
            {results.map((r, index) => (
              <tr key={index} className="hover:bg-blue-50/50 transition-colors duration-150">
                <td className="px-6 py-4 w-36">
                  <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {r.abn}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{r.legal_name || '-'}</span>
                </td>
                <td className="px-6 py-4 hidden md:table-cell w-40">
                  <span className="text-sm text-gray-600">{r.entity_type || '-'}</span>
                </td>
                <td className="px-6 py-4 w-24">
                  {r.state ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {r.state}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 hidden sm:table-cell w-28">
                  <span className="text-sm text-gray-600">{r.postcode || '-'}</span>
                </td>
                <td className="px-6 py-4 text-right w-24">
                  <button
                    onClick={() => onSelect(r.abn)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                  >
                    <span>View</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
