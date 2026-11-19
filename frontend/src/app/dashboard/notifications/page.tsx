'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, RefreshCw, CheckCheck } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getH = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, pending] = await Promise.all([
        fetch(`${API_URL}/notifications`, { headers: getH() }),
        fetch(`${API_URL}/notifications/pending-count`, { headers: getH() }),
      ]);
      if (list.ok) setItems(await list.json());
      if (pending.ok) {
        const p = await pending.json();
        setCount(p.count ?? 0);
      }
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: number) => {
    await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH', headers: getH() });
    load();
  };

  const markAll = async () => {
    await fetch(`${API_URL}/notifications/mark-all-read`, { method: 'PATCH', headers: getH() });
    toast.success('All marked read');
    load();
  };

  return (
    <div className="min-h-screen bg-bv-hover p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-bv-text">Notifications</h1>
            <p className="text-sm text-bv-muted">{count} unread</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 rounded-xl bg-bv-surface border border-bv-border">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {count > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-bv-border text-sm font-bold">
                <CheckCheck className="w-4 h-4" /> Mark all read
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-bv-accent" /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-bv-muted py-12 text-sm">No notifications</p>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <div key={n.id}
                className={`rounded-2xl border p-4 ${n.isRead || n.is_read ? 'bg-bv-surface border-bv-border' : 'bg-bv-info-bg border-bv-accent/30'}`}>
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm text-bv-text">{n.title}</p>
                    {n.body && <p className="text-sm text-bv-muted mt-0.5">{n.body}</p>}
                    <p className="text-xs text-bv-meta mt-1">{n.type} · {n.createdAt || n.created_at}</p>
                  </div>
                  {!(n.isRead || n.is_read) && (
                    <button onClick={() => markRead(n.id)} className="text-xs font-bold text-bv-accent shrink-0">Mark read</button>
                  )}
                </div>
                {(n.linkPath || n.link_path) && (
                  <Link href={n.linkPath || n.link_path} className="text-xs font-bold text-bv-accent mt-2 inline-block">Open →</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
