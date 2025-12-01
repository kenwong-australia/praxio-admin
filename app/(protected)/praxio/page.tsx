'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, MoreVertical, MessageCircle, ExternalLink, FileText, HelpCircle, Sparkles } from 'lucide-react';
import { toSydneyDateTime } from '@/lib/time';
import { getChatById, getPraxioChats, getConversationsByChatId } from '@/app/actions';
import { ConversationRow } from '@/lib/types';
import ReactMarkdown from 'react-markdown';

// Mock data structure - will be replaced with real data later
interface ChatItem {
  id: number;
  title: string;
  created_at: string;
}

interface FullChatData {
  id: number;
  created_at: string;
  title: string | null;
  email: string | null;
  model: string | null;
  scenario: string | null;
  research: string | null;
  usedcitationsArray: any;
  questions: string | null;
  draft: string | null;
  processTime: number | null;
  feedback: number | null;
  comment_selection: string[] | null;
  comment_additional: string | null;
}

interface Citation {
  title: string;
  url: string | null;
}

export default function PraxioPage() {
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [fullChatData, setFullChatData] = useState<FullChatData | null>(null);
  const [loadingChatData, setLoadingChatData] = useState(false);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatItem[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Get authenticated user UID (Firebase user ID)
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (user: User | null) => {
      if (user?.uid) {
        setUserId(user.uid);
        console.log('PraxioPage: Authenticated user UID:', user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsub();
  }, []);

  // Fetch chats from Supabase when user ID is available
  useEffect(() => {
    async function loadChats() {
      if (!userId) {
        console.log('PraxioPage: Waiting for user ID...');
        return; // Wait for user ID
      }
      
      console.log('PraxioPage: Loading chats for user_id:', userId);
      setLoadingChats(true);
      try {
        const data = await getPraxioChats(userId);
        console.log('PraxioPage: Received chats:', data.length);
        setChats(data.map((chat: any) => ({
          id: chat.id,
          title: chat.title || `Chat #${chat.id}`,
          created_at: chat.created_at
        })));
      } catch (error) {
        console.error('Error loading chats:', error);
        setChats([]);
      } finally {
        setLoadingChats(false);
      }
    }
    loadChats();
  }, [userId]);

  // Fetch full chat data when a chat is selected
  useEffect(() => {
    if (selectedChat?.id) {
      setLoadingChatData(true);
      setFullChatData(null); // Clear previous data
      getChatById(selectedChat.id)
        .then((data) => {
          console.log('Chat data fetched:', data);
          if (data) {
            setFullChatData(data);
          } else {
            console.warn('No chat data returned for ID:', selectedChat.id);
            setFullChatData(null);
          }
        })
        .catch((error) => {
          console.error('Error loading chat data:', error);
          setFullChatData(null);
        })
        .finally(() => {
          setLoadingChatData(false);
        });
    } else {
      setFullChatData(null);
    }
  }, [selectedChat?.id]);

  // Fetch conversations when a chat is selected
  useEffect(() => {
    if (selectedChat?.id) {
      setLoadingConversations(true);
      getConversationsByChatId(selectedChat.id)
        .then((data) => {
          setConversations(data);
        })
        .catch((error) => {
          console.error('Error loading conversations:', error);
          setConversations([]);
        })
        .finally(() => {
          setLoadingConversations(false);
        });
    } else {
      setConversations([]);
    }
  }, [selectedChat?.id]);

  // Auto-scroll to bottom when conversations update
  useEffect(() => {
    if (conversationEndRef.current && conversations.length > 0) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations]);

  const handleChatClick = (chat: ChatItem) => {
    setSelectedChat(chat);
  };

  const handleNewResearch = () => {
    setSelectedChat(null);
    setFullChatData(null);
    setPrompt('');
  };

  const handleRunResearch = () => {
    if (!prompt.trim()) return;
    // Will be wired up later
    console.log('Run research:', prompt);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Search through loaded chats
    if (query.trim()) {
      const results = chats.filter(chat => 
        chat.title.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleRename = (chatId: number) => {
    // Will be wired up later
    console.log('Rename chat:', chatId);
  };

  const handleDelete = (chatId: number) => {
    // Will be wired up later
    console.log('Delete chat:', chatId);
  };

  const handleArchive = (chatId: number) => {
    // Will be wired up later
    console.log('Archive chat:', chatId);
  };

  // Parse citations from Supabase JSONB field (same logic as ChatDetailsModal)
  const parseCitations = (usedcitationsArray: any): Citation[] => {
    if (!usedcitationsArray) {
      return [];
    }
    
    if (Array.isArray(usedcitationsArray)) {
      return usedcitationsArray
        .filter(item => item && 
                      typeof item === 'object' && 
                      item.fullreference?.trim())
        .map(item => ({
          title: item.fullreference,
          url: item.url?.trim() || null
        }));
    }
    
    if (typeof usedcitationsArray === 'string') {
      try {
        const parsed = JSON.parse(usedcitationsArray);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(item => item && 
                          typeof item === 'object' && 
                          item.fullreference?.trim())
            .map(item => ({
              title: item.fullreference,
              url: item.url?.trim() || null
            }));
        }
      } catch (error) {
        // Silent fallback for parsing errors
      }
    }
    
    return [];
  };

  const citations = fullChatData ? parseCitations(fullChatData.usedcitationsArray || fullChatData.usedcitationsArray) : [];

  return (
    <div className="h-screen flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Previous Research Sidebar - 30% */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <div className="h-full flex flex-col bg-white border-r border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
              <Button
                onClick={handleNewResearch}
                className="w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                New Research
              </Button>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Previous Research</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchOpen(true)}
                  className="h-8 w-8"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {loadingChats ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Loading chats...
                  </div>
                ) : chats.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No previous research found
                  </div>
                ) : (
                  chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => handleChatClick(chat)}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedChat?.id === chat.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {chat.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {toSydneyDateTime(chat.created_at)}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRename(chat.id); }}>
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(chat.id); }}>
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleDelete(chat.id); }}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Content Area - 70% */}
        <ResizablePanel defaultSize={70} minSize={60}>
          {selectedChat && loadingChatData ? (
            // Loading state
            <div className="h-full flex items-center justify-center bg-white">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50 animate-pulse" />
                <p className="text-lg">Loading chat data...</p>
              </div>
            </div>
          ) : selectedChat && !loadingChatData && fullChatData ? (
            // When chat is selected and data loaded: Show split columns
            <div className="h-full flex flex-col bg-white">
              <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* Left Column - Scenario, Research, Citations */}
                <ResizablePanel defaultSize={50}>
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-4">
                      {/* Scenario */}
                      {fullChatData.scenario?.trim() && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="scenario" className="border rounded-lg px-4">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">Scenario</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <div className="max-h-[400px] overflow-y-auto pr-2">
                                <div className="prose prose-sm max-w-none break-words prose-headings:font-semibold prose-p:leading-relaxed prose-ul:my-4 prose-ol:my-4 prose-li:my-2">
                                  <ReactMarkdown>{fullChatData.scenario}</ReactMarkdown>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}

                      {/* Research */}
                      {fullChatData.research?.trim() && (
                        <Accordion type="single" collapsible className="w-full" defaultValue="research">
                          <AccordionItem value="research" className="border rounded-lg px-4">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-green-600" />
                                <span className="font-medium">Research</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <div className="max-h-[600px] overflow-y-auto pr-2">
                                <div className="prose prose-sm max-w-none break-words prose-headings:font-semibold prose-p:leading-relaxed prose-ul:my-4 prose-ol:my-4 prose-li:my-2 prose-pre:whitespace-pre-wrap prose-pre:break-words">
                                  <ReactMarkdown>{fullChatData.research}</ReactMarkdown>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}

                      {/* Citations */}
                      {citations.length > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="citations" className="border rounded-lg px-4">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2">
                                <ExternalLink className="h-4 w-4 text-purple-600" />
                                <span className="font-medium">Citations ({citations.length})</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <div className="max-h-[400px] overflow-y-auto pr-2">
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
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  </ScrollArea>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Column - Questions, Conversation Widget */}
                <ResizablePanel defaultSize={50}>
                  <div className="h-full flex flex-col">
                    <ScrollArea className="flex-shrink-0">
                      <div className="p-6 pb-4">
                        {/* Questions */}
                        {fullChatData.questions?.trim() && (
                          <Accordion type="single" collapsible className="w-full" defaultValue="questions">
                            <AccordionItem value="questions" className="border rounded-lg px-4">
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <HelpCircle className="h-4 w-4 text-orange-600" />
                                  <span className="font-medium">Questions to refine research</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                <div className="max-h-[400px] overflow-y-auto pr-2">
                                  <div className="prose prose-sm max-w-none break-words prose-headings:font-semibold prose-p:leading-relaxed prose-ul:my-4 prose-ol:my-4 prose-li:my-2">
                                    <ReactMarkdown>{fullChatData.questions}</ReactMarkdown>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Conversation Widget - Messages + Prompt Box */}
                    <div className="flex-1 flex flex-col border-t border-slate-200 bg-white min-h-0">
                      {/* Conversation Messages */}
                      <ScrollArea className="flex-1">
                        <div className="p-6">
                          {loadingConversations ? (
                            <div className="flex items-center justify-center h-32 text-muted-foreground">
                              <div className="text-center">
                                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
                                <p className="text-sm">Loading conversation...</p>
                              </div>
                            </div>
                          ) : conversations.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-muted-foreground">
                              <div className="text-center">
                                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No conversation messages yet</p>
                                <p className="text-xs mt-1">Start a conversation below</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {conversations.map((conv) => {
                                const isUser = conv.type === 'user';
                                return (
                                  <div
                                    key={conv.id}
                                    className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                                  >
                                    <div
                                      className={`max-w-[80%] rounded-lg p-4 ${
                                        isUser
                                          ? 'bg-muted/50 text-left'
                                          : 'bg-blue-50 text-right'
                                      }`}
                                    >
                                      <div className={`text-xs font-medium text-muted-foreground mb-2 ${isUser ? 'text-left' : 'text-right'}`}>
                                        {isUser ? 'User' : 'Assistant'}
                                      </div>
                                      <div className="prose prose-sm max-w-none break-words prose-pre:whitespace-pre-wrap prose-pre:break-words">
                                        <ReactMarkdown>{conv.content || ''}</ReactMarkdown>
                                      </div>
                                      <div className={`mt-2 text-xs text-muted-foreground ${isUser ? 'text-left' : 'text-right'}`}>
                                        {toSydneyDateTime(conv.created_at)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              <div ref={conversationEndRef} />
                            </div>
                          )}
                        </div>
                      </ScrollArea>

                      {/* Prompt Box - Fixed at bottom */}
                      <div className="border-t border-slate-200 p-6 bg-white">
                        <div className="flex gap-3">
                          <div className="flex-1 relative">
                            <textarea
                              value={prompt}
                              onChange={(e) => {
                                setPrompt(e.target.value);
                                // Auto-resize textarea
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                              }}
                              placeholder="Add further details here..."
                              className="w-full min-h-[44px] max-h-[200px] px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto leading-normal"
                              rows={1}
                              onKeyDown={(e) => {
                                // Allow Enter to create new lines - only button click submits
                              }}
                            />
                          </div>
                          <div className="flex items-start">
                            <Button
                              onClick={handleRunResearch}
                              disabled={!prompt.trim()}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-6 shrink-0 flex-shrink-0"
                              style={{ 
                                height: '44px',
                                minHeight: '44px',
                                marginTop: '0px'
                              }}
                            >
                              Run Research
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          ) : selectedChat && !loadingChatData && !fullChatData ? (
            // Error/No data state - chat selected but data not found
            <div className="h-full flex items-center justify-center bg-white">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Chat data not found</p>
                <p className="text-sm mb-4">Chat ID: {selectedChat.id}</p>
                <Button
                  onClick={handleNewResearch}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Start New Research
                </Button>
              </div>
            </div>
          ) : (
            // Empty state - No chat selected
            <div className="h-full flex flex-col bg-white relative">
              {/* Icon above prompt */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-muted-foreground mb-40">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                </div>
              </div>

              {/* Prompt Input Area - Centered vertically in middle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full max-w-4xl px-6 pointer-events-auto">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={prompt}
                        onChange={(e) => {
                          setPrompt(e.target.value);
                          // Auto-resize textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                        }}
                        placeholder="Enter your scenario here..."
                        className="w-full min-h-[44px] max-h-[200px] px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto leading-normal"
                        rows={1}
                        onKeyDown={(e) => {
                          // Allow Enter to create new lines - only button click submits
                        }}
                      />
                    </div>
                    <div className="flex items-start">
                      <Button
                        onClick={handleRunResearch}
                        disabled={!prompt.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 shrink-0 flex-shrink-0"
                        style={{ 
                          height: '44px',
                          minHeight: '44px',
                          marginTop: '0px'
                        }}
                      >
                        Run Research
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text below prompt box */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-muted-foreground mt-40">
                  <p className="text-lg">Or select from Previous Research to view the conversation</p>
                </div>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Search Modal */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search Chats</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by title, content..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full"
              autoFocus
            />
            <ScrollArea className="max-h-[400px]">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => {
                        handleChatClick(chat);
                        setIsSearchOpen(false);
                      }}
                      className="p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                    >
                      <div className="font-medium text-sm">{chat.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {toSydneyDateTime(chat.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="text-center text-muted-foreground py-8">
                  No results found
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Start typing to search...
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
