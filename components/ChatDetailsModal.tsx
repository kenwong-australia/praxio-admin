'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toSydneyDateTime } from '@/lib/time';
import { Clock, Mail, Hash, ExternalLink, FileText, Search, HelpCircle, PenTool, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatData: any;
}

interface Citation {
  title: string;
  url: string | null;
}

export function ChatDetailsModal({ isOpen, onClose, chatData }: ChatDetailsModalProps) {
  if (!chatData) return null;

  // Parse citations from Supabase JSONB field (already parsed by client)
  const parseCitations = (usedcitationsArray: any): Citation[] => {
    if (!usedcitationsArray) {
      return [];
    }
    
    // Supabase JSONB fields are already parsed by the client
    if (Array.isArray(usedcitationsArray)) {
      return usedcitationsArray
        .filter(item => item && 
                      typeof item === 'object' && 
                      item.fullreference?.trim())
        .map(item => ({
          title: item.fullreference, // Use fullreference as the title
          url: item.url?.trim() || null // URL is optional for legislation references
        }));
    }
    
    // If it's a string, try to parse it (fallback for edge cases)
    if (typeof usedcitationsArray === 'string') {
      try {
        const parsed = JSON.parse(usedcitationsArray);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(item => item && 
                          typeof item === 'object' && 
                          item.fullreference?.trim())
            .map(item => ({
              title: item.fullreference, // Use fullreference as the title
              url: item.url?.trim() || null // URL is optional for legislation references
            }));
        }
      } catch (error) {
        // Silent fallback for parsing errors
      }
    }
    
    return [];
  };

  const citations = parseCitations(chatData.usedcitationsArray || chatData.usedCitationsArray);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-h-[90vh] max-w-[1200px] lg:max-w-[1400px] p-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Hash className="h-5 w-5 text-blue-600" />
            Chat Details #{chatData.id}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 flex gap-1 overflow-x-auto max-w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="overview" className="shrink min-w-0 flex items-center gap-2">
              <Hash className="h-4 w-4" />
              <span className="truncate">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="research" className="shrink min-w-0 flex items-center gap-1">
              <Search className="h-4 w-4" />
              <span className="hidden md:inline truncate">Research & Analysis</span>
              <span className="md:hidden truncate">Research</span>
            </TabsTrigger>
            <TabsTrigger value="draft" className="shrink min-w-0 flex items-center gap-1">
              <PenTool className="h-4 w-4" />
              <span className="truncate">Draft</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="shrink min-w-0 flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span className="truncate">Feedback</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 px-6 pb-6">
            <TabsContent value="overview" className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Chat ID</p>
                      <Badge variant="outline" className="font-mono">
                        #{chatData.id}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{toSydneyDateTime(chatData.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">User Email</p>
                      <p className="font-medium">{chatData.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Processing Time</p>
                      <p className="font-medium">
                        {chatData.processTime ? `${chatData.processTime.toFixed(2)}s` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {chatData.title?.trim() && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Title</p>
                  </div>
                  <p className="font-medium text-lg">{chatData.title}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="research" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-[60vh]">
                <div className="px-6">
                  <Accordion type="multiple" defaultValue={["scenario", "research", "citations", "questions"]} className="space-y-2">
                  {chatData.scenario?.trim() && (
                    <AccordionItem value="scenario" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Scenario</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{chatData.scenario}</ReactMarkdown>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {chatData.research?.trim() && (
                    <AccordionItem value="research" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Research</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{chatData.research}</ReactMarkdown>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {citations.length > 0 && (
                    <AccordionItem value="citations" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">Citations ({citations.length})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <div className="space-y-3">
                          {citations.map((citation, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm mb-1 line-clamp-2">
                                  {citation.title}
                                </p>
                                {citation.url ? (
                                  <a
                                    href={citation.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 truncate"
                                  >
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                    {citation.url}
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    Legislation reference
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {chatData.questions?.trim() && (
                    <AccordionItem value="questions" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">Questions</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{chatData.questions}</ReactMarkdown>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  </Accordion>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="draft" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-[60vh]">
                <div className="px-6">
                  {chatData.draft ? (
                    <div className="prose prose-sm max-w-none break-words prose-pre:whitespace-pre-wrap prose-pre:break-words">
                      <ReactMarkdown>{chatData.draft ?? ''}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      <div className="text-center">
                        <PenTool className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No draft content available</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="feedback" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-[60vh]">
                <div className="px-6">
                  <div className="prose prose-sm max-w-none space-y-6">
                    {/* Feedback Rating */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                        Feedback Rating
                      </h3>
                      <div className="flex items-center gap-3">
                        {chatData.feedback === 1 ? (
                          <Badge className="bg-green-500 text-white">👍 Positive</Badge>
                        ) : chatData.feedback === -1 ? (
                          <Badge className="bg-red-500 text-white">👎 Negative</Badge>
                        ) : (
                          <Badge variant="outline">No feedback</Badge>
                        )}
                      </div>
                    </div>

                    {/* Comment Selection */}
                    {chatData.comment_selection && chatData.comment_selection.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Selected Comments</h3>
                        <div className="flex flex-wrap gap-2">
                          {chatData.comment_selection.map((comment: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-sm">
                              {comment}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Comments */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">Additional Comments</h3>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p>
                          {chatData.comment_additional?.trim() || 'No additional comments'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}