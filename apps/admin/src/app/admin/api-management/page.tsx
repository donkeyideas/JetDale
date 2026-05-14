'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { ApiConfig } from '@/lib/admin-types';
import s from '../admin.module.css';

interface ApiManagementData {
  configs: ApiConfig[];
  kpis: {
    active_providers: number;
    total_calls: number;
    total_cost_cents: number;
    success_rate: number;
  };
  model_stats: Array<{
    model: string;
    count: number;
    cost_cents: number;
    success_rate: number;
  }>;
}

function maskApiKey(key: string | null): string {
  if (!key) return 'Not configured';
  if (key.length <= 4) return key;
  return key.slice(0, 4) + '\u2022'.repeat(Math.min(24, key.length - 4));
}

function testStatusClass(status: string | null): string {
  if (status === 'success') return s.statusGreen;
  if (status === 'failed') return s.statusRed;
  if (status === 'pending') return s.statusYellow;
  return s.statusGray;
}

function testStatusLabel(status: string | null): string {
  if (status === 'success') return 'Passed';
  if (status === 'failed') return 'Failed';
  if (status === 'pending') return 'Pending';
  return 'Not Tested';
}

export default function ApiManagementPage() {
  const [data, setData] = useState<ApiManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await adminFetch<ApiManagementData>('/api/admin/api-management');
      setData(res);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleProvider(id: string, is_active: boolean) {
    if (!data) return;
    setData({
      ...data,
      configs: data.configs.map((c) => c.id === id ? { ...c, is_active } : c),
      kpis: {
        ...data.kpis,
        active_providers: data.configs.reduce(
          (sum, c) => sum + (c.id === id ? (is_active ? 1 : 0) : (c.is_active ? 1 : 0)), 0
        ),
      },
    });
    try {
      await fetch('/api/admin/api-management', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, is_active }),
      });
    } catch {
      fetchData();
    }
  }

  async function saveApiKey(id: string) {
    const newKey = editingKeys[id];
    if (newKey === undefined) return;
    setSavingId(id);
    try {
      await fetch('/api/admin/api-management', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, api_key_encrypted: newKey }),
      });
      setEditingKeys((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchData();
    } catch {
      fetchData();
    }
    setSavingId(null);
  }

  const configs = data?.configs ?? [];
  const kpis = data?.kpis;

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>API Management</h1>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
            marginLeft: 8,
          }}>
            {configs.length} providers
          </span>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading API configs...</div></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className={s.kpiGrid}>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Active Providers</div>
              <div className={s.cardValue}>{kpis?.active_providers ?? 0}</div>
              <span className={s.cardChange} style={{ color: 'rgba(244, 241, 234, 0.5)' }}>
                {configs.length} total configured
              </span>
            </div>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Total API Calls</div>
              <div className={s.cardValue}>{(kpis?.total_calls ?? 0).toLocaleString()}</div>
            </div>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Total Cost</div>
              <div className={s.cardValue}>${((kpis?.total_cost_cents ?? 0) / 100).toFixed(2)}</div>
            </div>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Success Rate</div>
              <div className={s.cardValue}>{kpis?.success_rate ?? 0}%</div>
            </div>
          </div>

          {/* Provider Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            {configs.map((config) => (
              <div key={config.id} className={s.card}>
                {/* Provider Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: 18,
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                    }}>
                      {config.display_name}
                    </div>
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                      color: 'var(--muted)',
                      marginTop: 2,
                    }}>
                      {config.provider}
                    </div>
                  </div>
                  <span className={`${s.statusBadge} ${config.is_active ? s.statusGreen : s.statusGray}`}>
                    <span className={s.statusDot} />
                    {config.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* API Key Field */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--muted)',
                    marginBottom: 6,
                  }}>
                    API Key
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder={maskApiKey(config.api_key_encrypted)}
                      value={editingKeys[config.id] ?? ''}
                      onChange={(e) => setEditingKeys((prev) => ({ ...prev, [config.id]: e.target.value }))}
                      style={{
                        flex: 1,
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 12,
                        padding: '8px 12px',
                        border: '1px solid var(--rule)',
                        borderRadius: 6,
                        background: 'var(--paper)',
                        color: 'var(--ink)',
                      }}
                    />
                    <button
                      className={s.btnPrimary}
                      disabled={!editingKeys[config.id] || savingId === config.id}
                      onClick={() => saveApiKey(config.id)}
                      style={{
                        opacity: editingKeys[config.id] ? 1 : 0.5,
                        cursor: editingKeys[config.id] ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {savingId === config.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Base URL Field */}
                {config.base_url !== null && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--muted)',
                      marginBottom: 6,
                    }}>
                      Base URL
                    </div>
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 12,
                      padding: '8px 12px',
                      border: '1px solid var(--rule)',
                      borderRadius: 6,
                      background: 'rgba(14, 15, 12, 0.02)',
                      color: 'var(--ink)',
                      wordBreak: 'break-all',
                    }}>
                      {config.base_url}
                    </div>
                  </div>
                )}

                {/* Toggle & Test Status Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 14,
                  borderTop: '1px solid rgba(14, 15, 12, 0.06)',
                }}>
                  {/* Toggle Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => toggleProvider(config.id, !config.is_active)}
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        border: 'none',
                        cursor: 'pointer',
                        background: config.is_active ? '#22c55e' : 'var(--rule)',
                        position: 'relative',
                        transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        display: 'block',
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#fff',
                        position: 'absolute',
                        top: 3,
                        left: config.is_active ? 21 : 3,
                        transition: 'left 0.2s',
                      }} />
                    </button>
                    <span style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                      color: 'var(--muted)',
                    }}>
                      {config.is_active ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {/* Test Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className={`${s.statusBadge} ${testStatusClass(config.test_status)}`}>
                      <span className={s.statusDot} />
                      {testStatusLabel(config.test_status)}
                    </span>
                  </div>
                </div>

                {/* Last Tested */}
                {config.last_tested_at && (
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    color: 'var(--muted)',
                    marginTop: 10,
                    textAlign: 'right',
                  }}>
                    Last tested: {new Date(config.last_tested_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Model Usage Stats */}
          {(data?.model_stats ?? []).length > 0 && (
            <div className={s.card}>
              <div className={s.sectionTitle}>Usage by Model</div>
              <div style={{ border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Calls</th>
                      <th>Cost</th>
                      <th>Success Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.model_stats ?? []).map((ms) => (
                      <tr key={ms.model}>
                        <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 600 }}>
                          {ms.model}
                        </td>
                        <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
                          {ms.count.toLocaleString()}
                        </td>
                        <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
                          ${(ms.cost_cents / 100).toFixed(2)}
                        </td>
                        <td>
                          <span className={`${s.statusBadge} ${ms.success_rate >= 99 ? s.statusGreen : ms.success_rate >= 95 ? s.statusYellow : s.statusRed}`}>
                            <span className={s.statusDot} />
                            {ms.success_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
