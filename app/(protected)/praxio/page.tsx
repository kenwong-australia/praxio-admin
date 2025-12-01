'use client';

import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, MoreVertical, MessageCircle } from 'lucide-react';
import { toSydneyDateTime } from '@/lib/time';

// Mock data structure - will be replaced with real data later
interface ChatItem {
  id: number;
  title: string;
  created_at: string;
}

export default function PraxioPage() {
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatItem[]>([]);

  // Mock data - will be replaced with real API calls
  const mockChats: ChatItem[] = [
    { id: 1, title: 'CGT and income tax on 200,000 taxable income', created_at: '2025-11-30T12:26:00.000Z' },
    { id: 2, title: 'CGT and tax on sale of vacant land', created_at: '2025-11-29T10:15:00.000Z' },
    { id: 3, title: 'Income tax on 200,000 taxable income 2025-26', created_at: '2025-11-28T14:30:00.000Z' },
  ];

  const handleChatClick = (chat: ChatItem) => {
    setSelectedChat(chat);
  };

  const handleRunResearch = () => {
    if (!prompt.trim()) return;
    // Will be wired up later
    console.log('Run research:', prompt);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Mock search - will be replaced with real search
    if (query.trim()) {
      const results = mockChats.filter(chat => 
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

  return (
    <div className="h-screen flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Previous Research Sidebar - 30% */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <div className="h-full flex flex-col bg-white border-r border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
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

            {/* Chat List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {mockChats.map((chat) => (
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
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Content Area - 70% */}
        <ResizablePanel defaultSize={70} minSize={60}>
          <div className="h-full flex flex-col bg-white relative">
            {/* Conversation Display Area - Scrollable */}
            {selectedChat && (
              <ScrollArea className="flex-1">
                <div className="p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-2">{selectedChat.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {toSydneyDateTime(selectedChat.created_at)}
                      </p>
                    </div>
                    <div className="space-y-4">
                      {/* Conversation will be displayed here */}
                      <div className="text-center text-muted-foreground py-12">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Conversation will be displayed here</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}

            {/* Empty state when no chat selected */}
            {!selectedChat && (
              <>
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
                            // No prevention needed - let Enter work normally for new lines
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
              </>
            )}

            {/* Prompt Input Area - When chat is selected */}
            {selectedChat && (
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pointer-events-none">
                <div className="w-full max-w-4xl px-6 pb-6 pointer-events-auto">
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
                          // No prevention needed - let Enter work normally for new lines
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
            )}
          </div>
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

