'use client';
import { useEffect, useState } from 'react';
import { Link } from '@/core/i18n/navigation';
import { LoaderCircle, ArrowRight, Images } from 'lucide-react';

type Item = {
  id: string; prompt: string; status: string; createdAt: string;
  originalUrl?: string; resultUrl?: string; credits: number;
};
export function PhotoEditHistory() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/photo-editor/edits').then(r => r.json()).then(x => {
      if (x.code !== 0) throw new Error(x.message || 'Unable to load history');
      setItems(x.data.items || []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  if (loading) return <p className="flex items-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle className="size-4 animate-spin"/>Loading your edits...</p>;
  if (error) return <p className="py-12 text-sm text-red-600">{error}. Sign in to view your edits.</p>;
  if (!items.length) return <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
    <Images className="mx-auto mb-4 size-10 text-slate-400"/><p className="font-medium">No edits yet</p>
    <p className="mt-2 text-sm text-slate-500">Your generated photos will appear here.</p>
    <Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-600">Start editing <ArrowRight className="size-4"/></Link>
  </div>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {items.map(item => <div key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-48 items-center justify-center bg-slate-100">
        {item.resultUrl || item.originalUrl ? <img src={item.resultUrl || item.originalUrl} alt="Photo edit" className="h-full w-full object-contain"/> :
          <Images className="size-10 text-slate-300"/>}
      </div>
      <div className="space-y-2 p-4">
        <p className="line-clamp-2 text-sm font-medium text-slate-900">{item.prompt}</p>
        <div className="flex justify-between text-xs text-slate-500"><span>{item.status}</span><span>{new Date(item.createdAt).toLocaleDateString()}</span></div>
        {item.resultUrl && <Link href={'/?sourceJobId=' + item.id} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">Edit again <ArrowRight className="size-4"/></Link>}
      </div>
    </div>)}
  </div>;
}
