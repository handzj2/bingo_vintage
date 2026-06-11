'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api/client';
import { Bike, Search, X } from 'lucide-react';
import { formatUGX } from '@/shared/api-types';

interface BikeResult {
  id:                  number;
  model:               string;
  frame_number:        string;
  engine_number?:      string;
  registration_number?: string;
  sale_price:          number;
  status:              string;
}

interface BikeSearchProps {
  onSelect:  (bike: BikeResult) => void;
  selected?: BikeResult | null;
  onClear?:  () => void;
}

export default function BikeSearch({ onSelect, selected, onClear }: BikeSearchProps) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<BikeResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const containerRef            = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<BikeResult[]>(`/bikes?status=AVAILABLE&search=${encodeURIComponent(query)}`);
        if (res.success) setResults(res.data ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <Bike className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{selected.model}</p>
            <p className="text-xs text-gray-500">{selected.frame_number} · {formatUGX(Number(selected.sale_price))}</p>
          </div>
        </div>
        {onClear && (
          <button type="button" onClick={onClear} className="p-1 hover:bg-blue-100 rounded-full transition-colors">
            <X className="w-4 h-4 text-blue-500" />
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
          placeholder="Search available bikes by model or frame..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && (results.length > 0 || query.length > 0) && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {results.length === 0 && !loading ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              No available bikes matching &ldquo;{query}&rdquo;
            </p>
          ) : (
            results.map(bike => (
              <button
                key={bike.id}
                type="button"
                onClick={() => { onSelect(bike); setOpen(false); setQuery(''); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bike className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{bike.model}</p>
                  <p className="text-xs text-gray-500">{bike.frame_number}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm text-gray-900">{formatUGX(Number(bike.sale_price))}</p>
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Available</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
