"use client";

import { useEffect, useState } from "react";
import { getDistinctEmails, getKPIs, getLatest5, getScenariosPage } from "@/app/actions";
import { rangeLast30Sydney } from "@/lib/time";
import { KpiCard } from "@/components/KpiCard";
import { FiltersBar } from "@/components/FiltersBar";
import { Latest5Table } from "@/components/Latest5Table";
import { ScenariosTable } from "@/components/ScenariosTable";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPIData } from "@/lib/types";

export default function AdminPage() {
  const { fromUTC, toUTC } = rangeLast30Sydney();

  const [emails, setEmails] = useState<string[]>([]);
  const [filters, setFilters] = useState({ 
    email: null as string | null, 
    from: fromUTC, 
    to: toUTC 
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [latest, setLatest] = useState<any[]>([]);
  const [scenariosData, setScenariosData] = useState<{ rows: any[]; total: number }>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);

  // Load emails + default data on mount
  useEffect(() => {
    async function initialize() {
      setLoading(true);
      try {
        const ems = await getDistinctEmails();
        setEmails(ems);
        await applyFilters(filters.email, filters.from, filters.to, 1);
      } catch (error) {
        console.error('Error initializing:', error);
      } finally {
        setLoading(false);
      }
    }
    initialize();
  }, []);

  async function applyFilters(email: string | null, from: string, to: string, page: number = currentPage) {
    setLoading(true);
    try {
      setFilters({ email, from, to });
      setCurrentPage(page);

      const [k, l, s] = await Promise.all([
        getKPIs({ email, fromISO: from, toISO: to }),
        getLatest5({ email, fromISO: from, toISO: to }),
        getScenariosPage({ email, fromISO: from, toISO: to, page, pageSize })
      ]);

      setKpis(k);
      setLatest(l);
      setScenariosData(s);
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePageChange(page: number) {
    applyFilters(filters.email, filters.from, filters.to, page);
  }

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground">
            Monitor and analyze your AI scenarios, user engagement, and system performance.
          </p>
        </div>

        <FiltersBar
          emails={emails}
          onApply={(email, from, to) => applyFilters(email, from, to, 1)}
          defaultFrom={filters.from}
          defaultTo={filters.to}
        />

        {loading ? (
          <LoadingSkeleton />
        ) : kpis ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <KpiCard title="Total Scenarios" value={kpis.totalScenarios} />
            <KpiCard title="Total Processing Time (s)" value={kpis.totalProcessingTime} />
            <KpiCard title="Avg Processing Time (s)" value={kpis.avgProcessingTime} />
            <KpiCard title="Engagement Rate" value={kpis.engagementRate} />
            <KpiCard title="Total Feedback" value={kpis.totalFeedback} />
            <KpiCard title="Avg Feedback Score" value={kpis.avgFeedbackScore} />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8">
          <Latest5Table rows={latest} />
          <ScenariosTable 
            rows={scenariosData.rows} 
            total={scenariosData.total}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
}