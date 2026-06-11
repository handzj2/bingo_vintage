'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api/client';
import { Users, Search, X } from 'lucide-react';

interface ClientResult {
  id:         number;
  first_name: string;
  last_name:  string;
  phone:      string;
  email?:     string;
  nin?:       string;
  status:     string;
}

interface ClientSearchProps {
  onSelect:  (client: ClientResult) => void;
  selected?: ClientResult | null;
  onClear?:  () => void;
}

export default function ClientSearch({ onSelect, selected, onClear }: ClientSearchProps) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<ClientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const containerRef          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<ClientResult[]>(`/clients?search=${encodeURIComponent(query)}&limit=8`);
        if (res.success) setResults(res.data ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-green-600 font-bold text-sm">
              {selected.first_name[0]}{selected.last_name[0]}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {selected.first_name} {selected.last_name}
            </p>
            <p className="text-xs text-gray-500">{selected.phone}</p>
          </div>
        </div>
        {onClear && (
          <button type="button" onClick={onClear} className="p-1 hover:bg-green-100 rounded-full transition-colors">
            <X className="w-4 h-4 text-green-600" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients by name, phone or NIN..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && (results.length > 0 || query.length >= 2) && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {results.length === 0 && !loading ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              No clients matching &ldquo;{query}&rdquo;
            </p>
          ) : (
            results.map(client => (
              <button
                key={client.id}
                type="button"
                onClick={() => { onSelect(client); setOpen(false); setQuery(''); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
              >
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">
                    {client.first_name[0]}{client.last_name[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {client.first_name} {client.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{client.phone}</p>
                </div>
                {client.nin && (
                  <p className="text-xs text-gray-400 font-mono flex-shrink-0">{client.nin}</p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
