'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { AdminUserRow, PaginatedResponse } from '@/lib/admin-types';
import s from '../admin.module.css';
import u from './users.module.css';

const PLAN_FILTERS = ['all', 'pro', 'team', 'free', 'trial', 'churned'] as const;

function planTag(plan: string) {
  const map: Record<string, string> = { pro: s.tagPro, free: s.tagFree, team: s.tagTeam, trial: s.tagTrial, churned: s.tagChurn };
  return `${s.tag} ${map[plan] ?? ''}`;
}

function statusBadge(subStatus: string | null) {
  const st = subStatus ?? 'active';
  const map: Record<string, string> = { active: s.statusGreen, inactive: s.statusGray, canceled: s.statusRed, trialing: s.statusYellow };
  const labelMap: Record<string, string> = { active: 'Active', inactive: 'Inactive', canceled: 'Churned', trialing: 'Trial' };
  return (
    <span className={`${s.statusBadge} ${map[st] ?? s.statusGray}`}>
      <span className={s.statusDot} />
      {labelMap[st] ?? st}
    </span>
  );
}

export default function UsersPage() {
  const [data, setData] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('all');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<PaginatedResponse<AdminUserRow>>('/api/admin/users', {
        page,
        pageSize: 20,
        search: search || undefined,
        plan: plan !== 'all' ? plan : undefined,
      });
      setData(res.data);
      setTotal(res.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, plan]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleSearch(val: string) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Users</h1>
          <span className={u.userCount}>{total.toLocaleString()} total</span>
        </div>
        <div className={s.headerControls}>
          <button className={s.btnOutline}>Export CSV</button>
        </div>
      </header>

      <div className={u.filterBar}>
        <div className={s.searchWrapper}>
          <svg className={s.searchIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" />
          </svg>
          <input
            className={s.searchInput}
            type="text"
            placeholder="Search users..."
            defaultValue={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className={s.filterGroup}>
          {PLAN_FILTERS.map((f) => (
            <button
              key={f}
              className={`${s.filterPill} ${plan === f ? s.filterPillActive : ''}`}
              onClick={() => { setPlan(f); setPage(1); }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading users…</div></div>
      ) : (
        <div className={u.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Projects</th>
                <th>MRR</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user) => {
                const initials = user.full_name
                  ? user.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
                  : user.email.slice(0, 2).toUpperCase();
                return (
                  <tr key={user.id}>
                    <td>
                      <div className={s.userCell}>
                        <div className={s.tableAvatar}>{initials}</div>
                        <div>
                          <div className={s.userCellName}>{user.full_name ?? user.email}</div>
                          <div className={s.userCellEmail}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={planTag(user.plan_tier ?? 'free')}>{user.plan_tier ?? 'free'}</span></td>
                    <td>{statusBadge(user.subscription_status)}</td>
                    <td className={u.monoCell}>{user.project_count}</td>
                    <td className={u.monoCell}>${(user.mrr_cents / 100).toFixed(0)}</td>
                    <td className={u.mutedCell}>{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={s.pagination}>
          <span className={s.paginationInfo}>Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, total)} of {total.toLocaleString()} users</span>
          <div className={s.paginationButtons}>
            <button className={s.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>&lsaquo;</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`${s.pageBtn} ${p === page ? s.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className={s.pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>&rsaquo;</button>
          </div>
        </div>
      )}
    </>
  );
}
