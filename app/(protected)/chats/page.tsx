"use client";

import { useEffect, useMemo, useState } from "react";
import { getDistinctEmails, getScenariosPage } from "@/app/actions";
import { rangeLast30Sydney, toSydneyDateTime } from "@/lib/time";
import { FiltersBar } from "@/components/FiltersBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Database, FileDown, FileText, Brain } from "lucide-react";
import { ChatDetailsModal } from "@/components/ChatDetailsModal";

export default function ChatsPage() {
  const { fromUTC, toUTC } = rangeLast30Sydney();

  const [emails, setEmails] = useState<string[]>([]);
  const [filters, setFilters] = useState<{ email: string | null; from: string; to: string }>({ email: null, from: fromUTC, to: toUTC });
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [loading, setLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const maxSelectable = 10;
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const ems = await getDistinctEmails();
        setEmails(ems);
        await apply(filters.email, filters.from, filters.to, 1);
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function apply(email: string | null, from: string, to: string, newPage: number = page) {
    setLoading(true);
    try {
      setFilters({ email, from, to });
      setPage(newPage);
      const data = await getScenariosPage({ email, fromISO: from, toISO: to, page: newPage, pageSize });
      setRows(data.rows);
      setTotal(data.total);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(id: string | number) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxSelectable) return prev; // cap at 10
      return [...prev, id];
    });
  }

  const handleRowClick = (row: any, event: React.MouseEvent) => {
    // Don't open modal if clicking on checkbox
    if ((event.target as HTMLElement).closest('button, input[type="checkbox"]')) {
      return;
    }
    setSelectedChat(row);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChat(null);
  };

  const getModelBadge = (model: string | null) => {
    if (!model) return <Badge variant="outline">Unknown</Badge>;
    
    const modelColors = {
      'gpt-4': 'bg-purple-500 text-white',
      'gpt-3.5': 'bg-blue-500 text-white',
      'claude': 'bg-orange-500 text-white',
      'test ai': 'bg-blue-500 text-white',
      'default': 'bg-gray-500 text-white'
    };
    
    const modelLower = model.toLowerCase();
    const colorClass = modelColors[modelLower as keyof typeof modelColors] || modelColors.default;
    
    return (
      <Badge className={colorClass}>
        <Brain className="h-3 w-3 mr-1" />
        {model}
      </Badge>
    );
  };

  const canDownload = selectedIds.length > 0 && selectedIds.length <= maxSelectable;

  async function download(kind: "pdf" | "docx") {
    if (!canDownload) return;
    // Normalize IDs: convert numeric strings to numbers to match DB column type
    const requestIds = selectedIds.map((v) => {
      if (typeof v === 'number') return v;
      return /^\d+$/.test(v) ? Number(v) : v;
    });

    const res = await fetch(`/api/chats/export-${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: requestIds, filename: `chats_selected_${new Date().toISOString()}` }),
    });
    if (!res.ok) {
      try {
        const msg = await res.text();
        alert(msg || "Failed to generate download");
      } catch {
        alert("Failed to generate download");
      }
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chats_selected_${new Date().toISOString()}.${kind}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-8">
      <div className="max-w-none mx-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Chats</h1>
          <div className="flex items-center gap-2">
            <Button onClick={() => download("pdf")} disabled={!canDownload} className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Download PDF
            </Button>
            <Button onClick={() => download("docx")} disabled={!canDownload} className="flex items-center gap-2" variant="outline">
              <FileDown className="h-4 w-4" /> Download DOCX
            </Button>
          </div>
        </div>

        <div className="mb-4 text-sm text-muted-foreground">
          Selected {selectedIds.length} / {maxSelectable}
        </div>

        <FiltersBar
          emails={emails}
          onApply={(email, fromISO, toISO) => apply(email, fromISO, toISO, 1)}
          defaultFrom={filters.from}
          defaultTo={filters.to}
        />

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Chats
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * pageSize + 1, total)}-{Math.min(page * pageSize, total)} of {total}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No chats found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 w-10"></th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Scenario</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Model</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Research</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Questions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={(e) => handleRowClick(r, e)}
                      >
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(r.id)}
                            onCheckedChange={() => toggleSelection(r.id)}
                          />
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{toSydneyDateTime(r.created_at)}</td>
                        <td className="p-3">
                          <div className="font-medium text-sm max-w-xs truncate">{r.title?.trim() || "Untitled"}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-muted-foreground max-w-md truncate">{r.scenario?.trim() || "—"}</div>
                        </td>
                        <td className="p-3">
                          {getModelBadge(r.model)}
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-muted-foreground max-w-md truncate">{r.research?.trim() || "—"}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-muted-foreground">{Array.isArray(r.questions) ? r.questions.length : 0}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => apply(filters.email, filters.from, filters.to, page - 1)} disabled={page === 1}>Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => apply(filters.email, filters.from, filters.to, page + 1)} disabled={page === totalPages}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ChatDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        chatData={selectedChat}
      />
    </div>
  );
}


