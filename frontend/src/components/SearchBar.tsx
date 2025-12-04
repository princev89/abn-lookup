type Props = {
  q: string;
  setQ: (v: string) => void;
  abn: string;
  setAbn: (v: string) => void;
  limit: number;
  setLimit: (n: number) => void;
};

export default function SearchBar({ q, setQ, abn, setAbn, limit, setLimit }: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <input
        className="input w-full pl-11"
        placeholder="Search by company name, business name or keyword..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input w-full sm:w-44 pl-10"
          placeholder="ABN number"
          value={abn}
          onChange={(e) => setAbn(e.target.value)}
        />
        <select
          className="input w-full sm:w-36"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>
    </div>
  );
}
