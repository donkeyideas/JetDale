'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { ArchetypeRow } from '@/lib/admin-types';
import s from '../admin.module.css';

export default function ArchetypesPage() {
  const [archetypes, setArchetypes] = useState<ArchetypeRow[]>([]);
  const [maxCount, setMaxCount] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<{ data: ArchetypeRow[]; maxCount: number }>('/api/admin/archetypes')
      .then((res) => {
        setArchetypes(res.data);
        setMaxCount(res.maxCount || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Archetypes</h1>
        </div>
        <div className={s.headerControls}>
          <button className={s.btnOutline}>Export</button>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading archetypes…</div></div>
      ) : (
        <div className={s.card} style={{ marginBottom: 24 }}>
          <div className={s.sectionTitle}>Archetype Distribution</div>
          {archetypes.map((arch) => (
            <div key={arch.id} className={s.hBarRow}>
              <span className={s.hBarLabel}>{arch.name}</span>
              <div className={s.hBarTrack}>
                <div className={s.hBar} style={{ width: `${Math.round((arch.project_count / maxCount) * 100)}%` }} />
              </div>
              <span className={s.hBarValue}>{arch.project_count.toLocaleString()}</span>
            </div>
          ))}
          {archetypes.length === 0 && (
            <div className={s.chartPlaceholder}>No archetypes found</div>
          )}
        </div>
      )}
    </>
  );
}
