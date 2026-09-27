import { ArrowUpRight, Eye, Pencil, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { StatusBadge } from './StatusBadge';
import type { DetailRecord, ListRow, OverlayType, PageCard } from './types';

type ListPageProps = {
  title: string;
  subtitle: string;
  actions: string[];
  cards: PageCard[];
  rows: ListRow[];
  headings: string[];
  onDelete?: (id: string) => void;
  onView?: (record: DetailRecord) => void;
  onEdit?: (record: DetailRecord) => void;
  onAction?: (type: OverlayType) => void;
};

export function ListPage({ title, subtitle, actions, cards, rows, headings, onAction, onDelete, onView, onEdit }: ListPageProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const statuses = useMemo(() => Array.from(new Set(rows.map((row) => row.status?.label).filter(Boolean))) as string[], [rows]);
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    return rows.filter((row) => {
      const matchesQuery = !normalizedQuery || [...row.cells, row.status?.label ?? ''].join(' ').toLocaleLowerCase('fr').includes(normalizedQuery);
      const matchesStatus = status === 'all' || row.status?.label === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, rows, status]);

  return (
    <>
      <section className="page-header"><div><p className="eyebrow">Gestion</p><h2>{title}</h2></div><div className="page-header-actions">{actions.map((action) => <button key={action} type="button" className="primary-button" onClick={() => { const type = actionToOverlay(action); if (type) onAction?.(type); }}>{action}</button>)}</div></section>
      <p className="page-subtitle">{subtitle}</p>
      <section className="overview-cards">{cards.map((card) => <article key={card.title} className="mini-card"><div><span className="mini-label">{card.title}</span><strong>{card.count}</strong></div><small>{card.description}</small><span className="mini-trend"><ArrowUpRight size={14} />12%</span></article>)}</section>
      <section className="panel">
        <div className="panel-header table-panel-header"><h3>{title}</h3><div className="table-filters"><label className="table-search"><Search size={16} /><span className="sr-only">Rechercher dans {title}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher..." />{query && <button type="button" className="filter-clear" onClick={() => setQuery('')} aria-label="Effacer la recherche"><X size={14} /></button>}</label>{statuses.length > 0 && <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrer par statut"><option value="all">Tous les statuts</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>}</div></div>
        <div className="table-wrap"><table><thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}<th>Statut</th><th>Actions</th></tr></thead><tbody>{filteredRows.map((row) => { const record = { title, headings, row }; return <tr key={row.id}>{row.cells.map((cell, index) => <td key={`${row.id}-${index}`}>{cell}</td>)}<td>{row.status && <StatusBadge tone={row.status.tone}>{row.status.label}</StatusBadge>}</td><td><div className="row-actions">{onView && <button type="button" className="icon-table-action" title="Voir la fiche" aria-label="Voir la fiche" onClick={() => onView(record)}><Eye size={16} /></button>}{onEdit && <button type="button" className="icon-table-action" title="Modifier" aria-label="Modifier" onClick={() => onEdit(record)}><Pencil size={16} /></button>}{onDelete && <button type="button" className="icon-table-action danger" title="Supprimer" aria-label="Supprimer" onClick={() => onDelete(row.id)}><Trash2 size={16} /></button>}</div></td></tr>; })}{filteredRows.length === 0 && <tr><td colSpan={headings.length + 2} className="table-empty">Aucun résultat pour ces filtres.</td></tr>}</tbody></table></div>
      </section>
    </>
  );
}

function actionToOverlay(action: string): OverlayType | null {
  if (action.includes('élève')) return 'student';
  if (action.includes('classe')) return 'class';
  if (action.includes('paiement')) return 'payment';
  if (action.includes('frais')) return 'fee';
  if (action.includes('année')) return 'school-year';
  if (action.includes('utilisateur')) return 'user';
  return null;
}
