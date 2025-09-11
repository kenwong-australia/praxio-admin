'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toSydneyDateTime } from '@/lib/time';
import { Clock, Mail, Hash, ExternalLink, FileText, Search, HelpCircle, PenTool } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatData: any;
}

interface Citation {
  title: string;
  url: string;
}

export function ChatDetailsModal({ isOpen, onClose, chatData }: ChatDetailsModalProps) {
  if (!chatData) return null;

  // Parse citations from JSON string
  const parseCitations = (usedcitationsArray: string | null): Citation[] => {
    if (!usedcitationsArray) return [];
    try {
      const parsed = JSON.parse(usedcitationsArray);
      // Handle both array and object formats
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item && typeof item === 'object' && item.title && item.url);
      }
      return [];
    } catch {
      return [];
    }
  };

  const citations = parseCitations(chatData.usedcitationsArray || chatData.usedCitationsArray);
  
  // Debug log to help troubleshoot
  console.log('Citations data:', {
    raw: chatData.usedcitationsArray || chatData.usedCitationsArray,
    parsed: citations,
    length: citations.length
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-[90vw] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Hash className="h-5 w-5 text-blue-600" />
            Chat Details #{chatData.id}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="research" className="flex items-center gap-2 text-xs sm:text-sm">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Research & Analysis</span>
              <span className="sm:hidden">Research</span>
            </TabsTrigger>
            <TabsTrigger value="draft" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Draft
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

              {chatData.title && (
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
              <ScrollArea className="h-[60vh] pr-4">
                <Accordion type="multiple" className="space-y-2">
                  {chatData.scenario && (
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

                  {chatData.research && (
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
                              <Badge variant="outline" className="text-xs font-mono shrink-0">
                                [{index + 1}]
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm mb-1 line-clamp-2">
                                  {citation.title}
                                </p>
                                <a
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 truncate"
                                >
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  {citation.url}
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {chatData.questions && (
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
              </ScrollArea>
            </TabsContent>

            <TabsContent value="draft" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-[60vh] pr-4">
                {chatData.draft ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{chatData.draft}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                      <PenTool className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No draft content available</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}