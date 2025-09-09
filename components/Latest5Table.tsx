"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toSydneyDateTime } from "@/lib/time";
import { Clock, Mail } from "lucide-react";
import { ChatDetailsModal } from "@/components/ChatDetailsModal";

export function Latest5Table({ rows }: { rows: any[] }) {
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (row: any) => {
    setSelectedChat(row);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChat(null);
  };

  return (
    <>
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Latest 5 Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scenarios found for the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">ID</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Scenario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, index) => (
                    <tr 
                      key={r.id} 
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(r)}
                    >
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
                        <div className="text-sm text-muted-foreground max-w-md truncate">
                          {r.scenario ? r.scenario.substring(0, 100) + (r.scenario.length > 100 ? '...' : '') : 'No scenario'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <ChatDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        chatData={selectedChat}
      />
    </>
  );
}