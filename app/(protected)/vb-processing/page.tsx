"use client";

import { useEffect, useMemo, useState } from "react";
import { getVBRuns, getVBEvents } from "@/app/actions";
import { rangeLast30Sydney, toSydneyDateTime } from "@/lib/time";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";

type RunsResult = Awaited<ReturnType<typeof getVBRuns>>;
type EventsResult = Awaited<ReturnType<typeof getVBEvents>>;

export default function VBProcessingPage() {
  const { fromUTC, toUTC } = rangeLast30Sydney();

  const [activeTab, setActiveTab] = useState<"runs" | "events">("runs");

  const [filters, setFilters] = useState({
    component: null as string | null,
    level: null as string | null,
    event: null as string | null,
    topic: null as string | null,
    search: "",
    fromISO: fromUTC,
    toISO: toUTC,
  });

  const [runs, setRuns] = useState<RunsResult>({ rows: [], total: 0 });
  const [runsPage, setRunsPage] = useState(1);

  const [events, setEvents] = useState<EventsResult>({ rows: [], total: 0 });
  const [eventsPage, setEventsPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const pageSize = 25;

  async function loadRuns(page = runsPage) {
    const res = await getVBRuns({
      component: filters.component,
      fromISO: filters.fromISO,
      toISO: filters.toISO,
      page,
      pageSize,
    });
    setRuns(res);
    setRunsPage(page);
  }

  async function loadEvents(page = eventsPage) {
    const res = await getVBEvents({
      component: filters.component,
      level: filters.level,
      event: filters.event,
      topic: filters.topic,
      search: filters.search || undefined,
      fromISO: filters.fromISO,
      toISO: filters.toISO,
      page,
      pageSize,
    });
    setEvents(res);
    setEventsPage(page);
  }

  useEffect(() => {
    // initial load
    loadRuns(1);
    loadEvents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    loadRuns(1);
    loadEvents(1);
  }

  const totalRunsPages = useMemo(() => Math.max(1, Math.ceil((runs.total || 0) / pageSize)), [runs.total]);
  const totalEventPages = useMemo(() => Math.max(1, Math.ceil((events.total || 0) / pageSize)), [events.total]);

  return (
    <div className="p-8">
      <div className="max-w-none mx-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">VB Processing</h1>
          <p className="text-muted-foreground">Vector DB ingestion runs and events</p>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={filters.component ?? undefined} onValueChange={(v) => setFilters((f) => ({ ...f, component: v || null }))}>
              <SelectTrigger><SelectValue placeholder="Component" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                <SelectItem value="ingest">ingest</SelectItem>
                <SelectItem value="chunk">chunk</SelectItem>
                <SelectItem value="embed">embed</SelectItem>
                <SelectItem value="upsert">upsert</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.level ?? undefined} onValueChange={(v) => setFilters((f) => ({ ...f, level: v || null }))}>
              <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                <SelectItem value="debug">debug</SelectItem>
                <SelectItem value="info">info</SelectItem>
                <SelectItem value="warn">warn</SelectItem>
                <SelectItem value="error">error</SelectItem>
              </SelectContent>
            </Select>

            <Input placeholder="Event name" value={filters.event ?? ''} onChange={(e) => setFilters((f) => ({ ...f, event: e.target.value || null }))} />
            <Input placeholder="Topic" value={filters.topic ?? ''} onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value || null }))} />
            <Input placeholder="Search message/url" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} className="md:col-span-2" />

            <div className="flex gap-2">
              <Button onClick={applyFilters}>Apply</Button>
              <Button variant="secondary" onClick={() => { setFilters((f) => ({ ...f, component: null, level: null, event: null, topic: null, search: "" })); }}>Reset</Button>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

          <TabsContent value="runs">
            <Card className="p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Run ID</th>
                      <th className="py-2 pr-4">Component</th>
                      <th className="py-2 pr-4">Started</th>
                      <th className="py-2 pr-4">Finished</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.rows.map((r) => (
                      <tr key={r.run_id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">{r.run_id}</td>
                        <td className="py-2 pr-4">{r.component ?? '-'}</td>
                        <td className="py-2 pr-4">{r.started_at ? toSydneyDateTime(r.started_at) : '-'}</td>
                        <td className="py-2 pr-4">{r.finished_at ? toSydneyDateTime(r.finished_at) : '-'}</td>
                      </tr>
                    ))}
                    {runs.rows.length === 0 && (
                      <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No runs</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="text-xs text-muted-foreground">{runs.total} total</div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e)=>{e.preventDefault(); if(runsPage>1) loadRuns(runsPage-1);}} />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e)=>{e.preventDefault(); if(runsPage<totalRunsPages) loadRuns(runsPage+1);}} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card className="p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-2 w-6"></th>
                      <th className="py-2 pr-4">Time</th>
                      <th className="py-2 pr-4">Level</th>
                      <th className="py-2 pr-4">Component</th>
                      <th className="py-2 pr-4">Event</th>
                      <th className="py-2 pr-4">Message</th>
                      <th className="py-2 pr-4">Topic</th>
                      <th className="py-2 pr-4">Run</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.rows.map((e) => (
                      <>
                        <tr key={e.id} className="border-b align-top">
                          <td className="py-2 pr-2">
                            <button
                              aria-label="Expand row"
                              className="h-6 w-6 grid place-items-center rounded hover:bg-slate-100"
                              onClick={() => setExpanded((ex) => ({ ...ex, [e.id]: !ex[e.id] }))}
                            >
                              {expanded[e.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="py-2 pr-4 whitespace-nowrap">{e.timestamp ? toSydneyDateTime(e.timestamp) : '-'}</td>
                          <td className="py-2 pr-4">{e.level ?? '-'}</td>
                          <td className="py-2 pr-4">{e.component ?? '-'}</td>
                          <td className="py-2 pr-4">{e.event ?? '-'}</td>
                          <td className="py-2 pr-4 max-w-[600px] truncate" title={e.message ?? ''}>{e.message ?? '-'}</td>
                          <td className="py-2 pr-4">{e.topic ?? '-'}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{e.run_id ?? '-'}</td>
                        </tr>
                        {expanded[e.id] && (
                          <tr className="bg-slate-50 border-b last:border-0">
                            <td></td>
                            <td colSpan={7} className="py-3 pr-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs text-muted-foreground">Payload</div>
                                <button
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                  onClick={() => navigator.clipboard.writeText(JSON.stringify(e.payload ?? {}, null, 2))}
                                >
                                  <Copy className="h-3 w-3" /> Copy JSON
                                </button>
                              </div>
                              <pre className="text-[11px] leading-[1.25rem] whitespace-pre-wrap bg-white border rounded p-3 overflow-x-auto max-h-80">
{JSON.stringify(e.payload ?? {}, null, 2)}
                              </pre>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
                                <div><span className="text-muted-foreground">file_id:</span> <span className="font-mono">{e.file_id ?? '-'}</span></div>
                                <div><span className="text-muted-foreground">doc_id:</span> <span className="font-mono">{e.doc_id ?? '-'}</span></div>
                                <div><span className="text-muted-foreground">url:</span> <a className="text-blue-600 hover:underline" href={e.url ?? '#'} target="_blank" rel="noreferrer">{e.url ?? '-'}</a></div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {events.rows.length === 0 && (
                      <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No events</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="text-xs text-muted-foreground">{events.total} total</div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(ev)=>{ev.preventDefault(); if(eventsPage>1) loadEvents(eventsPage-1);}} />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(ev)=>{ev.preventDefault(); if(eventsPage<totalEventPages) loadEvents(eventsPage+1);}} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


