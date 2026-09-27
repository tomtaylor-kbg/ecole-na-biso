import { TrendingUp } from 'lucide-react';
import type { Stat } from './types';

export function StatCard({ label, value, hint, icon: Icon }: Stat) {
  return (
    <article className="stat-card">
      <div className="stat-card-topline">
        <span>{label}</span>
        <Icon size={18} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <small><TrendingUp size={13} aria-hidden="true" /> {hint}</small>
    </article>
  );
}
