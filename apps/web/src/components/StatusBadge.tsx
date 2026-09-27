import type { ReactNode } from 'react';
import type { BadgeTone } from './types';

type StatusBadgeProps = {
  tone: BadgeTone;
  children: ReactNode;
};

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}
