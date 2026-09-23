'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function Charts({
  byProvincia,
  prezzi,
}: {
  byProvincia: { provincia: string; count: number }[];
  prezzi: { fascia: string; count: number }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="font-bold">Aste attive per provincia (top 15)</h3>
        <p className="text-xs text-slate-500">Campione max 5000 record (limite free).</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byProvincia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="provincia" fontSize={11} interval={0} angle={-30} dy={10} height={60} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#2754e3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="font-bold">Distribuzione prezzi base</h3>
        <p className="text-xs text-slate-500">Solo aste attive con prezzo noto.</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={prezzi}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fascia" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#0e9f6e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
