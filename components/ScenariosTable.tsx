"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toSydneyDateTime } from "@/lib/time";
import { ChevronLeft, ChevronRight, Database, Mail, Clock, Star, Brain } from "lucide-react";

interface ScenariosTableProps {
  rows: any[];
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function ScenariosTable({ rows, total, currentPage, pageSize, onPageChange }: ScenariosTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = ((currentPage - 1) * pageSize) + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  const getFeedbackBadge = (feedback: number | null) => {
    if (feedback === null) return <Badge variant="outline">No feedback</Badge>;
    if (feedback === 1) return <Badge className="bg-green-500 text-white">👍 Positive</Badge>;
    if (feedback === -1) return <Badge className="bg-red-500 text-white">👎 Negative</Badge>;
    return <Badge variant="outline">Neutral</Badge>;
  };

  const getModelBadge = (model: string | null) => {
    if (!model) return <Badge variant="outline">Unknown</Badge>;
    
    const modelColors = {
      'gpt-4': 'bg-purple-500 text-white',
      'gpt-3.5': 'bg-blue-500 text-white',
      'claude': 'bg-orange-500 text-white',
      'default': 'bg-gray-500 text-white'
    };
    
    const colorClass = modelColors[model as keyof typeof modelColors] || modelColors.default;
    
    return (
      <Badge className={colorClass}>
        <Brain className="h-3 w-3 mr-1" />
        {model}
      </Badge>
    );
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            All Scenarios
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Showing {startItem}-{endItem} of {total} scenarios
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scenarios found for the selected criteria.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">ID</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Model</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Process Time</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{r.id}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {toSydneyDateTime(r.created_at)}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-sm max-w-xs truncate">
                          {r.title || 'Untitled'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{r.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {getModelBadge(r.model)}
                      </td>
                      <td className="p-4">
                        {r.processTime ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-mono">{r.processTime.toFixed(2)}s</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {getFeedbackBadge(r.feedback)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => onPageChange(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}