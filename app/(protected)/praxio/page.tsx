'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getDb, getFirebaseAuth } from '@/lib/firebase';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreVertical, MessageCircle, ExternalLink, FileText, HelpCircle, Sparkles, Copy, Download, Save, Mail, CheckCircle2, ThumbsUp, ThumbsDown, PanelLeftClose, PanelLeftOpen, ArrowUp, PlusCircle, Share, FilePlus, History, X } from 'lucide-react';
import { toSydneyDateTime } from '@/lib/time';
import { getChatById, getPraxioChats, getConversationsByChatId, updateChatTitle, deleteChat, archiveChat, updateChatDraft, sendDraftEmail, updateChatFeedback, createChatWithConversation, updateChatWithConversation, saveResearchEntry, saveCitationsEntry, getResearchHistory, getCitationsHistory } from '@/app/actions';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { ConversationRow } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

// Mock data structure - will be replaced with real data later
interface ChatItem {
  id: number;
  title: string;
  created_at: string;
}

interface FullChatData {
  id: number;
  created_at: string;
  updated_on?: string | null;
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

type ModelOption = 'Praxio AI' | 'Test AI';
const MODEL_STORAGE_KEY = 'praxio_model_selection';
const BUTTON_TEXT_PREF_KEY = 'praxio_show_button_text';

export default function PraxioPage() {
  const [isPreviousOpen, setIsPreviousOpen] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [fullChatData, setFullChatData] = useState<FullChatData | null>(null);
  const [loadingChatData, setLoadingChatData] = useState(false);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatItem[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [leftAccordionValue, setLeftAccordionValue] = useState<string[]>(['research']);
  const [rightAccordionValue, setRightAccordionValue] = useState<string>('questions');
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadSection, setDownloadSection] = useState<{ type: string; content: string; title: string } | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameChatId, setRenameChatId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState<number | null>(null);
  const [deleteChatTitle, setDeleteChatTitle] = useState('');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveChatId, setArchiveChatId] = useState<number | null>(null);
  const [archiveChatTitle, setArchiveChatTitle] = useState('');
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [draftStep, setDraftStep] = useState<'edit' | 'compile' | 'share'>('edit');
  const [compileOptions, setCompileOptions] = useState({
    includeResearch: false,
    includeCitations: false,
    includeQuestions: false,
    includeConversation: false,
    includeResearchHistory: false,
    includeCitationsHistory: false,
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>('Praxio AI');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const progressTimersRef = useRef<NodeJS.Timeout[]>([]);
  const progressPersistentToastRef = useRef<string | number | null>(null);
  const [showButtonText, setShowButtonText] = useState(true);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<
    { created_at: string | null; research: string | null; citations: any }[]
  >([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  // Reset history state when switching chats
  useEffect(() => {
    setHistoryItems([]);
    setHistoryError(null);
    setHistoryDialogOpen(false);
    setCompileOptions((prev) => ({
      ...prev,
      includeResearchHistory: false,
      includeCitationsHistory: false,
    }));
  }, [fullChatData?.id]);

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

  // Load persisted model from sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(MODEL_STORAGE_KEY);
    if (stored === 'Praxio AI' || stored === 'Test AI') {
      setSelectedModel(stored as ModelOption);
    }
  }, []);

  // Fetch user role from Firestore to gate model selector and load stored email
  useEffect(() => {
    if (!userId) {
      setUserRole(null);
      setUserEmail(null);
      return;
    }
    const fetchRole = async () => {
      try {
        const db = getDb();
        const snap = await getDoc(doc(db, 'users', userId));
        const data = snap.exists() ? snap.data() : null;
        const role = data?.role as string | null;
        const profileEmail = typeof data?.email === 'string' ? data.email.trim() : '';
        const authEmail = getFirebaseAuth().currentUser?.email || '';
        const resolvedEmail = (profileEmail || authEmail || '').trim();

        setUserEmail(resolvedEmail || null);
        setUserRole(role ?? null);
        if (role !== 'admin') {
          setSelectedModel('Praxio AI');
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(MODEL_STORAGE_KEY, 'Praxio AI');
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
        setUserEmail(null);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(MODEL_STORAGE_KEY, 'Praxio AI');
        }
      }
    };
    fetchRole();
  }, [userId]);

  // Persist model selection in sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  // Load button text preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadPref = () => {
      const stored = localStorage.getItem(BUTTON_TEXT_PREF_KEY);
      setShowButtonText(stored === null ? true : stored === 'true');
    };
    loadPref();
    const handler = () => loadPref();
    window.addEventListener('praxioButtonTextPreferenceChanged', handler);
    return () => window.removeEventListener('praxioButtonTextPreferenceChanged', handler);
  }, []);

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

  // Reset accordion states to initial values when a new chat is selected
  useEffect(() => {
    if (selectedChat?.id) {
      setLeftAccordionValue(['research']);
      setRightAccordionValue('questions');
    }
  }, [selectedChat?.id]);

  // Convert markdown to HTML with inline styles for email/Word compatibility
  // Uses remark (same parser as ReactMarkdown) for consistency
  // Inline styles required because email clients and Word don't support external CSS
  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    
    try {
      // Use remark to parse markdown (same as ReactMarkdown) and convert to HTML
      const processor = remark().use(remarkHtml);
      const html = processor.processSync(markdown).toString();
      
      // Add inline styles for email/Word compatibility
      let styledHtml = html
        // Headers with inline styles
        .replace(/<h1>/g, '<h1 style="font-size: 24px; font-weight: bold; margin-top: 28px; margin-bottom: 16px; color: #000;">')
        .replace(/<h2>/g, '<h2 style="font-size: 20px; font-weight: bold; margin-top: 24px; margin-bottom: 12px; color: #222; border-bottom: 2px solid #ddd; padding-bottom: 4px;">')
        .replace(/<h3>/g, '<h3 style="font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; color: #333;">')
        .replace(/<h4>/g, '<h4 style="font-size: 16px; font-weight: bold; margin-top: 16px; margin-bottom: 8px; color: #333;">')
        // Paragraphs with inline styles
        .replace(/<p>/g, '<p style="margin: 12px 0; line-height: 1.6; color: #333;">')
        // Lists with inline styles
        .replace(/<ul>/g, '<ul style="margin: 12px 0; padding-left: 24px; list-style-type: disc;">')
        .replace(/<ol>/g, '<ol style="margin: 12px 0; padding-left: 24px;">')
        .replace(/<li>/g, '<li style="margin: 6px 0; line-height: 1.6;">')
        // Links with inline styles
        .replace(/<a href=/g, '<a style="color: #0066cc; text-decoration: underline;" href=')
        // Code blocks with inline styles
        .replace(/<pre>/g, '<pre style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; font-family: \'Courier New\', monospace; font-size: 12px; line-height: 1.5; overflow-x: auto;">')
        .replace(/<code>/g, '<code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: \'Courier New\', monospace; font-size: 90%;">')
        // Horizontal rules with inline styles
        .replace(/<hr>/g, '<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">')
        // Bold and italic with inline styles
        .replace(/<strong>/g, '<strong style="font-weight: bold;">')
        .replace(/<em>/g, '<em style="font-style: italic;">');
      
      return styledHtml;
    } catch (error) {
      console.error('Error converting markdown to HTML:', error);
      // Fallback to plain text if conversion fails
      return markdown.replace(/\n/g, '<br>');
    }
  };

  // Convert markdown to RTF (Rich Text Format) for Word/Google Docs compatibility
  // RTF is a legacy format but widely supported for document export
  const markdownToRtf = (markdown: string): string => {
    if (!markdown) return '';
    
    // RTF header with font and color tables
    // Font 0: Arial (default), Font 1: Courier New (for code)
    // Color 1: Black, Color 2: Blue (for links)
    let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0\\fnil\\fcharset0 Arial;}{\\f1\\fnil\\fcharset0 Courier New;}} {\\colortbl ;\\red0\\green0\\blue0;\\red0\\green102\\blue204;}\\f0\\fs24 ';
    
    // Escape RTF special characters
    const escapeRtf = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\r\n/g, ' ')
        .replace(/\n/g, ' ');
    };
    
    let text = markdown;
    const rtfParts: string[] = [];
    
    // Process code blocks first
    text = text.replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```/g, '').trim();
      const escaped = escapeRtf(code);
      const idx = rtfParts.length;
      rtfParts.push(`{\\f1\\fs20 ${escaped}}`);
      return `__CODEBLOCK${idx}__`;
    });
    
    // Process headers
    text = text.replace(/^#### (.*$)/gim, (match, content) => {
      const escaped = escapeRtf(content);
      return `__H4${escaped}__/H4__`;
    });
    text = text.replace(/^### (.*$)/gim, (match, content) => {
      const escaped = escapeRtf(content);
      return `__H3${escaped}__/H3__`;
    });
    text = text.replace(/^## (.*$)/gim, (match, content) => {
      const escaped = escapeRtf(content);
      return `__H2${escaped}__/H2__`;
    });
    text = text.replace(/^# (.*$)/gim, (match, content) => {
      const escaped = escapeRtf(content);
      return `__H1${escaped}__/H1__`;
    });
    
    // Process horizontal rules
    text = text.replace(/^---$/gim, '__HR__');
    text = text.replace(/^\*\*\*$/gim, '__HR__');
    
    // Process links (before bold/italic to avoid conflicts)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      const escapedText = escapeRtf(linkText);
      const escapedUrl = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `__LINK${escapedText}__URL${escapedUrl}__/LINK__`;
    });
    
    // Process bold and italic
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, (match, content) => {
      const escaped = escapeRtf(content);
      return `__BI${escaped}__/BI__`;
    });
    text = text.replace(/\*\*(.*?)\*\*/g, (match, content) => {
      const escaped = escapeRtf(content);
      return `__B${escaped}__/B__`;
    });
    text = text.replace(/\*(.*?)\*/g, (match, content) => {
      const escaped = escapeRtf(content);
      return `__I${escaped}__/I__`;
    });
    
    // Process inline code
    text = text.replace(/`([^`]+)`/g, (match, code) => {
      const escaped = escapeRtf(code);
      return `__CODE${escaped}__/CODE__`;
    });
    
    // Process lists
    const lines = text.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let listCounter = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const unorderedMatch = line.match(/^[\*\-\+] (.+)$/);
      const orderedMatch = line.match(/^\d+\. (.+)$/);
      
      if (unorderedMatch) {
        if (!inList) {
          processedLines.push('\\par ');
        }
        inList = true;
        const content = escapeRtf(unorderedMatch[1]);
        processedLines.push(`\\bullet ${content}\\par `);
      } else if (orderedMatch) {
        if (!inList) {
          listCounter = 1;
        } else {
          listCounter++;
        }
        inList = true;
        const content = escapeRtf(orderedMatch[1]);
        processedLines.push(`${listCounter}. ${content}\\par `);
      } else {
        if (inList) {
          inList = false;
          listCounter = 0;
        }
        if (line.trim() && !line.match(/^__/)) {
          processedLines.push(escapeRtf(line.trim()) + '\\par ');
        }
      }
    }
    
    text = processedLines.join('');
    
    // Replace placeholders with RTF formatting
    text = text.replace(/__CODEBLOCK(\d+)__/g, (match, idx) => {
      return rtfParts[parseInt(idx)] || '';
    });
    
    text = text.replace(/__H1(.*?)__\/H1__/g, '{\\b\\fs32 $1}\\par ');
    text = text.replace(/__H2(.*?)__\/H2__/g, '{\\b\\fs28 $1}\\par ');
    text = text.replace(/__H3(.*?)__\/H3__/g, '{\\b\\fs24 $1}\\par ');
    text = text.replace(/__H4(.*?)__\/H4__/g, '{\\b\\fs20 $1}\\par ');
    
    text = text.replace(/__HR__/g, '{\\pard\\brdrb\\brdrs\\brdrw10\\brsp20 \\par}\\pard ');
    
    text = text.replace(/__LINK(.*?)__URL(.*?)__\/LINK__/g, (match, linkText, url) => {
      return `{\\field{\\*\\fldinst{HYPERLINK "${url}"}}{\\fldrslt{\\ul\\cf2 ${linkText}}}}}`;
    });
    
    text = text.replace(/__BI(.*?)__\/BI__/g, '{\\b{\\i $1}}');
    text = text.replace(/__B(.*?)__\/B__/g, '{\\b $1}');
    text = text.replace(/__I(.*?)__\/I__/g, '{\\i $1}');
    text = text.replace(/__CODE(.*?)__\/CODE__/g, '{\\f1\\fs20 $1}');
    
    rtf += text;
    rtf += '}';
    
    return rtf;
  };

  // Copy content to clipboard as HTML and RTF
  const copyToClipboard = async (content: string, contentType: 'markdown' | 'citations' = 'markdown') => {
    try {
      let htmlContent = '';
      let rtfContent = '';
      let plainText = '';

      if (contentType === 'citations') {
        // Format citations as HTML list
        const citationsList = citations.map((citation, index) => {
          const urlPart = citation.url 
            ? `<a href="${citation.url}" style="color: #0066cc; text-decoration: underline;">${citation.url}</a>`
            : '<em style="font-style: italic;">Legislation reference</em>';
          return `<li style="margin: 6px 0; line-height: 1.6;"><strong style="font-weight: bold;">${citation.title}</strong><br>${urlPart}</li>`;
        }).join('');
        htmlContent = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;"><ul style="margin: 12px 0; padding-left: 24px; list-style-type: disc;">${citationsList}</ul></div>`;
        plainText = citations.map(c => `${c.title}${c.url ? ` - ${c.url}` : ' (Legislation reference)'}`).join('\n');
        
        // RTF for citations
        const rtfCitations = citations.map((citation, index) => {
          const urlPart = citation.url 
            ? `{\\field{\\*\\fldinst{HYPERLINK "${citation.url}"}}{\\fldrslt{\\ul\\cf2 ${citation.url}}}}`
            : '{\\i Legislation reference}';
          return `{\\pntext\\f0\\\'B7\\tab}{\\b ${citation.title}}\\par ${urlPart}\\par `;
        }).join('');
        rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Arial;}} {\\colortbl ;\\red0\\green0\\blue0;\\red0\\green102\\blue204;}\\f0\\fs24 {\\pntext\\f0\\\'B7\\tab}${rtfCitations}}`;
      } else {
        // Convert markdown to HTML and RTF
        htmlContent = markdownToHtml(content);
        rtfContent = markdownToRtf(content);
        plainText = content;
      }

      // Use Clipboard API with multiple formats (HTML, RTF, and plain text)
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/rtf': new Blob([rtfContent], { type: 'text/rtf' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' })
      });

      await navigator.clipboard.write([clipboardItem]);
      toast.success('Content Copied', {
        description: 'Content has been copied to your clipboard',
        duration: 2000,
      });
    } catch (error) {
      // Fallback to plain text if multi-format copy fails
      try {
        await navigator.clipboard.writeText(contentType === 'citations' 
          ? citations.map(c => `${c.title}${c.url ? ` - ${c.url}` : ' (Legislation reference)'}`).join('\n')
          : content
        );
        toast.success('Content Copied', {
          description: 'Content has been copied to your clipboard',
          duration: 2000,
        });
      } catch (err) {
        toast.error('Failed to copy', {
          description: 'Please try again',
          duration: 2000,
        });
      }
    }
  };

  // Format filename: Title_section_date
  const formatFilename = (title: string, section: string, date: Date): string => {
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const cleanTitle = sanitize(title || 'Untitled');
    const cleanSection = sanitize(section);
    return `${cleanTitle}_${cleanSection}_${dateStr}`;
  };

  // Handle download icon click
  const handleDownloadClick = (sectionType: string, content: string, sectionTitle: string) => {
    setDownloadSection({ type: sectionType, content, title: sectionTitle });
    setDownloadDialogOpen(true);
  };

  // Download as PDF
  const downloadAsPdf = async () => {
    if (!downloadSection || !fullChatData) return;
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const chatDate = new Date(fullChatData.created_at);
      const filename = formatFilename(fullChatData.title || 'Untitled', downloadSection.title, chatDate);
      
      // Create a temporary container with formatted content
      const container = document.createElement('div');
      container.style.padding = '40px';
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.color = '#000';
      
      // Format content based on section type
      let contentHtml = '';
      if (downloadSection.type === 'citations') {
        // Format citations as HTML list
        const citationsList = citations.map((citation) => {
          const urlPart = citation.url 
            ? `<a href="${citation.url}" style="color: #0066cc;">${citation.url}</a>`
            : '<em style="color: #666;">Legislation reference</em>';
          return `<li style="margin-bottom: 10px;"><strong>${citation.title}</strong><br>${urlPart}</li>`;
        }).join('');
        contentHtml = `<ul style="list-style: none; padding-left: 0;">${citationsList}</ul>`;
      } else {
        contentHtml = markdownToHtml(downloadSection.content);
      }
      
      // Add title and date
      container.innerHTML = `
        <h1 style="font-size: 24px; margin-bottom: 10px; font-weight: bold;">${fullChatData.title || 'Untitled'}</h1>
        <p style="font-size: 12px; color: #666; margin-bottom: 20px;">${toSydneyDateTime(fullChatData.created_at)}</p>
        <h2 style="font-size: 18px; margin-bottom: 15px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px;">${downloadSection.title}</h2>
        <div style="font-size: 12px; line-height: 1.6;">${contentHtml}</div>
      `;
      
      document.body.appendChild(container);
      
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${filename}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(container)
        .save();
      
      document.body.removeChild(container);
      setDownloadDialogOpen(false);
      toast.success('Download Started', {
        description: 'PDF download has started',
        duration: 2000,
      });
    } catch (error) {
      console.error('PDF download failed', error);
      toast.error('Download Failed', {
        description: 'Could not generate PDF. Please try again.',
        duration: 3000,
      });
    }
  };

  // Download as DOCX
  const downloadAsDocx = async () => {
    if (!downloadSection || !fullChatData) return;
    
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
      const chatDate = new Date(fullChatData.created_at);
      const filename = formatFilename(fullChatData.title || 'Untitled', downloadSection.title, chatDate);
      
      // Convert markdown to plain text with basic formatting
      const sections: any[] = [
        new Paragraph({
          children: [new TextRun({ text: fullChatData.title || 'Untitled', bold: true, size: 32 })],
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Generated: ${toSydneyDateTime(fullChatData.created_at)}`, italics: true, size: 20 })],
        }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({
          children: [new TextRun({ text: downloadSection.title, bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
      ];

      // Process content into paragraphs
      if (downloadSection.type === 'citations') {
        // Format citations as list
        for (const citation of citations) {
          sections.push(new Paragraph({
            children: [new TextRun({ text: citation.title, bold: true, size: 22 })],
          }));
          if (citation.url) {
            sections.push(new Paragraph({
              children: [new TextRun({ text: citation.url, size: 20, color: '0066CC' })],
            }));
          } else {
            sections.push(new Paragraph({
              children: [new TextRun({ text: 'Legislation reference', italics: true, size: 20 })],
            }));
          }
          sections.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
        }
      } else {
        // Process markdown content into paragraphs
        const content = downloadSection.content;
        const lines = content.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            sections.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
            continue;
          }
          
          // Headers
          if (trimmed.startsWith('### ')) {
            sections.push(new Paragraph({
              children: [new TextRun({ text: trimmed.substring(4), bold: true, size: 24 })],
              heading: HeadingLevel.HEADING_3,
            }));
          } else if (trimmed.startsWith('## ')) {
            sections.push(new Paragraph({
              children: [new TextRun({ text: trimmed.substring(3), bold: true, size: 26 })],
              heading: HeadingLevel.HEADING_2,
            }));
          } else if (trimmed.startsWith('# ')) {
            sections.push(new Paragraph({
              children: [new TextRun({ text: trimmed.substring(2), bold: true, size: 28 })],
              heading: HeadingLevel.HEADING_1,
            }));
          } else if (trimmed.match(/^[\*\-\+] |^\d+\. /)) {
            // List items
            const listText = trimmed.replace(/^[\*\-\+] |^\d+\. /, '');
            sections.push(new Paragraph({
              children: [new TextRun({ text: `• ${listText}`, size: 22 })],
            }));
          } else {
            // Regular paragraph
            sections.push(new Paragraph({
              children: [new TextRun({ text: trimmed, size: 22 })],
            }));
          }
        }
      }

      const doc = new Document({
        sections: [{ children: sections }],
      });

      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setDownloadDialogOpen(false);
      toast.success('Download Started', {
        description: 'DOCX download has started',
        duration: 2000,
      });
    } catch (error) {
      console.error('DOCX download failed', error);
      toast.error('Download Failed', {
        description: 'Could not generate DOCX. Please try again.',
        duration: 3000,
      });
    }
  };

  const handleChatClick = (chat: ChatItem) => {
    setSelectedChat(chat);
  };

  const handleNewResearch = () => {
    setSelectedChat(null);
    setFullChatData(null);
    setPrompt('');
  };

  const persistResearchArtifacts = async (chatId: number, researchContent: string | null | undefined, citations: any) => {
    try {
      const [researchRes, citationsRes] = await Promise.all([
        saveResearchEntry({ chat_id: chatId, content: researchContent ?? null }),
        saveCitationsEntry({ chat_id: chatId, usedcitationsArray: citations }),
      ]);

      if (!researchRes?.success) {
        console.error('Failed to save research entry:', researchRes?.error);
      }
      if (!citationsRes?.success) {
        console.error('Failed to save citations entry:', citationsRes?.error);
      }
    } catch (persistError) {
      console.error('Error saving research/citations history:', persistError);
    }
  };

  const loadHistoryData = async (chatId: number) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const [researchRes, citationsRes] = await Promise.all([
        getResearchHistory(chatId),
        getCitationsHistory(chatId),
      ]);

      if (!researchRes.success) {
        setHistoryError(researchRes.error || 'Failed to load research history');
      }
      if (!citationsRes.success) {
        setHistoryError((prev) => prev || citationsRes.error || 'Failed to load citations history');
      }

      const researchRows = researchRes.rows || [];
      const citationRows = citationsRes.rows || [];
      const maxLen = Math.max(researchRows.length, citationRows.length);
      const combined = [];
      for (let i = 0; i < maxLen; i++) {
        combined.push({
          created_at: researchRows[i]?.created_at || citationRows[i]?.created_at || null,
          research: researchRows[i]?.content ?? null,
          citations: citationRows[i]?.usedcitationsArray ?? null,
        });
      }
      setHistoryItems(combined);
    } catch (err: any) {
      console.error('Error loading history data:', err);
      setHistoryError(err?.message || 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = async () => {
    if (!fullChatData?.id) return;
    setHistoryDialogOpen(true);
    if (historyItems.length === 0 || historyError) {
      await loadHistoryData(fullChatData.id);
    }
  };

  const handleRunResearch = async () => {
    if (!prompt.trim() || isRunning) return;
    if (!userId) {
      toast.error('Please sign in', { description: 'User not authenticated.' });
      return;
    }

    const isFollowUp = Boolean(fullChatData);
    const endpoint =
      selectedModel === 'Test AI'
        ? 'https://tax-law-api-test.onrender.com/query'
        : 'https://tax-law-api-launch.onrender.com/query';

    const nowStr = new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const conversationHistory = conversations
      .map((c) => `${c.type === 'user' ? 'User' : 'Assistant'}: ${c.content || ''}`)
      .join('\n');

    const latestResearch = fullChatData?.research || '';
    const existingCitations = fullChatData?.usedcitationsArray
      ? (typeof fullChatData.usedcitationsArray === 'string'
          ? fullChatData.usedcitationsArray
          : JSON.stringify(fullChatData.usedcitationsArray))
      : '';

    const queryString = isFollowUp
      ? `It is now ${nowStr}.  Please update research based on this additional information. ${latestResearch}\n${conversationHistory}\n${prompt.trim()}`
      : `It is now ${nowStr}. Please research the following tax scenario: ${prompt.trim()}`;

    const payload = {
      query: queryString,
      title: '',
      tax_research: isFollowUp ? latestResearch : '',
      used_citations: isFollowUp ? existingCitations : '',
      draft_client_response: '',
      clarifying_questions: '',
      confirmation: '',
      initial: !isFollowUp,
    };

    setIsRunning(true);
    scheduleProgressToasts(isFollowUp);

    try {
    const resp = await fetch('/api/praxio-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // send model hint for proxy routing; proxy strips it before forwarding
      body: JSON.stringify({ ...payload, __model: selectedModel }),
    });

    const wrapped = await resp.json();
    if (!resp.ok || wrapped?.ok === false) {
      const errMsg = wrapped?.error || `API error ${resp.status}`;
      const upstream = wrapped?.upstreamBody ? ` | Upstream: ${wrapped.upstreamBody}` : '';
      throw new Error(errMsg + upstream);
    }

    const result = wrapped?.data || {};

      const usedCitationsArray = Array.isArray(result.citations)
        ? result.citations
        : Array.isArray(result.used_citations)
        ? result.used_citations.map((c: any) => ({
            fullreference: typeof c === 'string' ? c : String(c),
            url: '',
          }))
        : [];

      const conversationRows: { type: 'user' | 'Praxio AI'; content: string }[] | undefined = isFollowUp
        ? [
            { type: 'user', content: prompt.trim() },
            { type: 'Praxio AI', content: result.confirmation || '' },
          ]
        : undefined; // For initial runs, skip creating conversation rows

      if (isFollowUp && fullChatData?.id) {
        const update = await updateChatWithConversation({
          chat_id: fullChatData.id,
          research: result.tax_research || '',
          usedcitationsArray: usedCitationsArray,
          questions: result.clarifying_questions || '',
          draft: result.draft_client_response || '',
          processTime: typeof result.processing_time === 'number' ? result.processing_time : null,
          model: result.model || selectedModel,
          email: userEmail ?? null,
          conversation: conversationRows,
        });

        if (!update.success || !update.chat) {
          throw new Error(update.error || 'Failed to update research');
        }

        const chatIdForHistory = update.chat.id ?? fullChatData?.id;
        if (chatIdForHistory) {
          await persistResearchArtifacts(chatIdForHistory, result.tax_research || '', usedCitationsArray);
        }

        setFullChatData(update.chat);
        setPrompt('');

        try {
          const refreshedConversations = await getConversationsByChatId(update.chat.id);
          setConversations(refreshedConversations);
        } catch (refreshError) {
          console.error('Error refreshing conversations after follow-up:', refreshError);
        }

        toast.success('Research updated', {
          description: update.chat.title || 'Chat updated',
        });
        playChime();
        return;
      }

      const insert = await createChatWithConversation({
        title: result.title || prompt.trim().slice(0, 80) || 'Untitled',
        scenario: prompt.trim(),
        research: result.tax_research || '',
        usedcitationsArray: usedCitationsArray,
        questions: result.clarifying_questions || '',
        draft: result.draft_client_response || '',
        processTime: typeof result.processing_time === 'number' ? result.processing_time : null,
        model: result.model || selectedModel,
        user_id: userId,
        email: userEmail ?? null,
        conversation: conversationRows,
      });

      if (!insert.success || !insert.chat) {
        throw new Error(insert.error || 'Failed to save research');
      }

      if (insert.chat?.id) {
        await persistResearchArtifacts(insert.chat.id, result.tax_research || '', usedCitationsArray);
      }

      await refreshChats();
      setSelectedChat({
        id: insert.chat.id,
        title: insert.chat.title || `Chat #${insert.chat.id}`,
        created_at: insert.chat.created_at,
      });
      setPrompt('');

      toast.success('Research ready', {
        description: insert.chat.title || 'New research created',
      });
      playChime();
    } catch (error: any) {
      console.error('Run research failed:', error);
      const msg: string =
        error?.message || 'Please try again.';
      const friendly =
        msg.includes('Failed to fetch')
          ? 'Could not reach /api/praxio-query. Check server logs and upstream /query.'
          : msg;
      toast.error('API request failed', {
        description: friendly,
        position: 'bottom-center',
        duration: 8000,
      });
    } finally {
      clearProgressToasts();
      setIsRunning(false);
    }
  };

  const handleUpvote = async () => {
    if (!fullChatData?.id) return;
    
    try {
      const result = await updateChatFeedback(fullChatData.id, 1);
      if (result.success) {
        // Update local state
        setFullChatData((prev: FullChatData | null) => prev ? { ...prev, feedback: 1 } : null);
        toast.success('Thank you for your feedback!', {
          duration: 2000,
        });
      } else {
        toast.error('Failed to submit feedback', {
          description: result.error || 'Please try again.',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error submitting upvote:', error);
      toast.error('Failed to submit feedback', {
        description: 'An unexpected error occurred.',
        duration: 3000,
      });
    }
  };

  const handleDownvote = () => {
    if (!fullChatData?.id) return;
    setFeedbackDialogOpen(true);
  };

  const handleFeedbackSubmitted = async () => {
    // Refresh chat data to get updated feedback
    if (fullChatData?.id) {
      try {
        const data = await getChatById(fullChatData.id);
        if (data) {
          setFullChatData(data);
        }
      } catch (error) {
        console.error('Error refreshing chat data:', error);
      }
    }
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

  // Refresh chat list
  const refreshChats = async () => {
    if (!userId) return;
    setLoadingChats(true);
    try {
      const data = await getPraxioChats(userId);
      setChats(data.map((chat: any) => ({
        id: chat.id,
        title: chat.title || `Chat #${chat.id}`,
        created_at: chat.created_at
      })));
    } catch (error) {
      console.error('Error refreshing chats:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  const handleRename = (chatId: number) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setRenameChatId(chatId);
      setRenameTitle(chat.title);
      setRenameDialogOpen(true);
    }
  };

  const handleConfirmRename = async () => {
    if (!renameChatId || !renameTitle.trim()) return;
    
    const result = await updateChatTitle(renameChatId, renameTitle.trim());
    if (result.success) {
      setRenameDialogOpen(false);
      setRenameChatId(null);
      setRenameTitle('');
      await refreshChats();
      // Update selected chat if it's the one being renamed
      if (selectedChat?.id === renameChatId) {
        setSelectedChat({ ...selectedChat, title: renameTitle.trim() });
      }
      toast.success('Chat Renamed', {
        description: `Title updated to "${renameTitle.trim()}"`,
        duration: 4000,
      });
    } else {
      toast.error('Rename Failed', {
        description: result.error || 'Could not rename chat. Please try again.',
        duration: 4000,
      });
    }
  };

  const handleDelete = (chatId: number) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setDeleteChatId(chatId);
      setDeleteChatTitle(chat.title);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteChatId) return;
    
    const chatTitle = deleteChatTitle; // Capture before clearing
    const result = await deleteChat(deleteChatId);
    if (result.success) {
      setDeleteDialogOpen(false);
      setDeleteChatId(null);
      setDeleteChatTitle('');
      // Clear selection if deleted chat was selected
      if (selectedChat?.id === deleteChatId) {
        setSelectedChat(null);
        setFullChatData(null);
      }
      await refreshChats();
      toast.success('Chat Deleted', {
        description: `"${chatTitle}" has been permanently deleted`,
        duration: 4000,
      });
    } else {
      toast.error('Delete Failed', {
        description: result.error || `Could not delete "${chatTitle}". Please try again.`,
        duration: 4000,
      });
    }
  };

  const handleArchive = (chatId: number) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setArchiveChatId(chatId);
      setArchiveChatTitle(chat.title);
      setArchiveDialogOpen(true);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveChatId) return;
    
    const chatTitle = archiveChatTitle; // Capture before clearing
    const result = await archiveChat(archiveChatId);
    if (result.success) {
      setArchiveDialogOpen(false);
      setArchiveChatId(null);
      setArchiveChatTitle('');
      // Clear selection if archived chat was selected
      if (selectedChat?.id === archiveChatId) {
        setSelectedChat(null);
        setFullChatData(null);
      }
      await refreshChats();
      toast.success('Chat Archived', {
        description: `"${chatTitle}" has been archived (this can be reversed later)`,
        duration: 4000,
      });
    } else {
      toast.error('Archive Failed', {
        description: result.error || `Could not archive "${chatTitle}". Please try again.`,
        duration: 4000,
      });
    }
  };

  // Auto-save draft after 3 seconds of inactivity
  useEffect(() => {
    if (!draftDialogOpen || !selectedChat?.id || draftContent === (fullChatData?.draft || '')) {
      return;
    }

    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    setAutoSaveStatus('idle');

    draftSaveTimeoutRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      const result = await updateChatDraft(selectedChat.id, draftContent);
      if (result.success) {
        setAutoSaveStatus('saved');
        // Update fullChatData to reflect the saved draft
        if (fullChatData) {
          setFullChatData({ ...fullChatData, draft: draftContent });
        }
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } else {
        setAutoSaveStatus('idle');
        toast.error('Auto-save Failed', {
          description: 'Could not save draft automatically',
          duration: 2000,
        });
      }
    }, 3000);

    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [draftContent, draftDialogOpen, selectedChat?.id, fullChatData]);

  // Generate compiled output preview
  const getCompiledOutput = (): string => {
    let output = '';
    
    // Always include Client Draft
    if (draftContent.trim()) {
      output += '# Client Draft\n\n';
      output += draftContent.trim();
      output += '\n\n';
    }
    
    // Include selected sections
    if (compileOptions.includeResearch && fullChatData?.research?.trim()) {
      output += '---\n\n';
      output += '# Research\n\n';
      output += fullChatData.research.trim();
      output += '\n\n';
    }
    
    if (compileOptions.includeCitations && citations.length > 0) {
      output += '---\n\n';
      output += '# Citations\n\n';
      citations.forEach((citation, index) => {
        output += `${index + 1}. **${citation.title}**\n`;
        if (citation.url) {
          output += `   ${citation.url}\n`;
        } else {
          output += `   Legislation reference\n`;
        }
        output += '\n';
      });
    }
    
    if (compileOptions.includeQuestions && fullChatData?.questions?.trim()) {
      output += '---\n\n';
      output += '# Questions to Refine Research\n\n';
      output += fullChatData.questions.trim();
      output += '\n\n';
    }

    if (compileOptions.includeResearchHistory && historyItems.length > 0) {
      output += '---\n\n';
      output += '# Research History\n\n';
      historyItems.forEach((item, index) => {
        const label = item.created_at ? toSydneyDateTime(item.created_at) : 'Unknown date';
        output += `## Run ${index + 1} - ${label}\n\n`;
        if (item.research?.trim()) {
          output += item.research.trim();
        } else {
          output += '_No research text_';
        }
        output += '\n\n';
      });
    }

    if (compileOptions.includeCitationsHistory && historyItems.length > 0) {
      output += '---\n\n';
      output += '# Citations History\n\n';
      historyItems.forEach((item, index) => {
        const label = item.created_at ? toSydneyDateTime(item.created_at) : 'Unknown date';
        output += `## Run ${index + 1} - ${label}\n\n`;
        const histCitations = parseCitations(item.citations);
        if (histCitations.length === 0) {
          output += '_No citations_\n\n';
        } else {
          histCitations.forEach((c, i) => {
            output += `${i + 1}. **${c.title || 'Citation'}**`;
            if (c.url) {
              output += ` - ${c.url}`;
            } else {
              output += ' (Legislation reference)';
            }
            output += '\n';
          });
          output += '\n';
        }
      });
    }
    
    return output.trim();
  };

  // Share functions
  const handleShareEmail = async () => {
    if (!fullChatData?.email) {
      toast.error('No Email', {
        description: 'No email address found for this chat',
        duration: 2000,
      });
      return;
    }

    // Prepare data for loops.so template - all optional, fetched from chatID record
    // Draft from chat record (or use draftContent if user has edited it)
    const draftFromRecord = fullChatData?.draft || '';
    const draftHtml = draftFromRecord.trim() 
      ? markdownToHtml(draftFromRecord)
      : null;
    
    // Research from chat record
    const researchHtml = compileOptions.includeResearch && fullChatData?.research?.trim()
      ? markdownToHtml(fullChatData.research) 
      : null;
    
    // Citations from chat record (usedcitationsArray)
    const citationsText = compileOptions.includeCitations && citations.length > 0
      ? citations.map(c => `${c.title}${c.url ? ` - ${c.url}` : ' (Legislation reference)'}`).join('\n')
      : null;
    
    // Questions from chat record
    const questionsHtml = compileOptions.includeQuestions && fullChatData?.questions?.trim()
      ? markdownToHtml(fullChatData.questions)
      : null;
    
    // Format conversation from conversations array
    let conversationHtml: string | null = null;
    if (compileOptions.includeConversation && conversations.length > 0) {
      const conversationParts = conversations.map((conv) => {
        const isUser = conv.type === 'user';
        const role = isUser ? 'User' : 'Assistant';
        const contentHtml = markdownToHtml(conv.content || '');
        return `<div style="margin-bottom: 16px; padding: 12px; border-radius: 8px; ${isUser ? 'background-color: #f3f4f6; text-align: left;' : 'background-color: #eff6ff; text-align: right;'}">
          <div style="font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 8px; ${isUser ? 'text-align: left;' : 'text-align: right;'}">${role}</div>
          <div style="font-size: 14px; line-height: 1.5; word-wrap: break-word;">${contentHtml}</div>
          <div style="font-size: 10px; color: #6b7280; margin-top: 8px; ${isUser ? 'text-align: left;' : 'text-align: right;'}">${toSydneyDateTime(conv.created_at)}</div>
        </div>`;
      });
      conversationHtml = conversationParts.join('');
    }
    
    try {
      const result = await sendDraftEmail(
        fullChatData.email,
        draftHtml,   // Draft section HTML (optional, from chat record)
        researchHtml, // Research section HTML (optional, from chat record)
        citationsText,  // Citations as text (optional, from chat record)
        questionsHtml,  // Questions HTML (optional, from chat record)
        conversationHtml  // Conversation HTML (optional, from conversation table)
      );
      
      if (result.success) {
        toast.success('Email Sent', {
          description: `Email sent successfully to ${fullChatData.email}`,
          duration: 2000,
        });
      } else {
        toast.error('Email Failed', {
          description: result.error || 'Could not send email. Please try again.',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Email Failed', {
        description: 'Could not send email. Please try again.',
        duration: 3000,
      });
    }
  };

  const handleShareDownloadDocx = async () => {
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
      const chatDate = new Date(fullChatData?.created_at || new Date());
      const sections = [];
      
      // Build filename
      const selectedSections = [];
      if (compileOptions.includeResearch) selectedSections.push('Research');
      if (compileOptions.includeCitations) selectedSections.push('Citations');
      if (compileOptions.includeQuestions) selectedSections.push('Questions');
      if (compileOptions.includeResearchHistory) selectedSections.push('ResearchHistory');
      if (compileOptions.includeCitationsHistory) selectedSections.push('CitationsHistory');
      const sectionStr = selectedSections.length > 0 ? selectedSections.join('_') : 'ClientDraft';
      const filename = formatFilename(fullChatData?.title || 'Untitled', `ClientDraft_${sectionStr}`, chatDate);
      
      const compiledContent = getCompiledOutput();
      const lines = compiledContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          sections.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
          continue;
        }
        
        if (trimmed.startsWith('# ')) {
          sections.push(new Paragraph({
            children: [new TextRun({ text: trimmed.substring(2), bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_1,
          }));
        } else if (trimmed.startsWith('## ')) {
          sections.push(new Paragraph({
            children: [new TextRun({ text: trimmed.substring(3), bold: true, size: 26 })],
            heading: HeadingLevel.HEADING_2,
          }));
        } else if (trimmed.match(/^\d+\. /)) {
          sections.push(new Paragraph({
            children: [new TextRun({ text: trimmed, size: 22 })],
          }));
        } else {
          sections.push(new Paragraph({
            children: [new TextRun({ text: trimmed, size: 22 })],
          }));
        }
      }

      const doc = new Document({
        sections: [{ children: sections }],
      });

      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Download Started', {
        description: 'DOCX download has started',
        duration: 2000,
      });
    } catch (error) {
      console.error('DOCX download failed', error);
      toast.error('Download Failed', {
        description: 'Could not generate DOCX. Please try again.',
        duration: 3000,
      });
    }
  };

  const handleShareDownloadPdf = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const chatDate = new Date(fullChatData?.created_at || new Date());
      
      // Build filename
      const selectedSections = [];
      if (compileOptions.includeResearch) selectedSections.push('Research');
      if (compileOptions.includeCitations) selectedSections.push('Citations');
      if (compileOptions.includeQuestions) selectedSections.push('Questions');
      if (compileOptions.includeResearchHistory) selectedSections.push('ResearchHistory');
      if (compileOptions.includeCitationsHistory) selectedSections.push('CitationsHistory');
      const sectionStr = selectedSections.length > 0 ? selectedSections.join('_') : 'ClientDraft';
      const filename = formatFilename(fullChatData?.title || 'Untitled', `ClientDraft_${sectionStr}`, chatDate);
      
      const compiledContent = getCompiledOutput();
      const htmlContent = markdownToHtml(compiledContent);
      
      const container = document.createElement('div');
      container.style.padding = '40px';
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.color = '#000';
      
      container.innerHTML = `
        <h1 style="font-size: 24px; margin-bottom: 10px; font-weight: bold;">${fullChatData?.title || 'Untitled'}</h1>
        <p style="font-size: 12px; color: #666; margin-bottom: 20px;">${toSydneyDateTime(fullChatData?.created_at || new Date().toISOString())}</p>
        <div style="font-size: 12px; line-height: 1.6;">${htmlContent}</div>
      `;
      
      document.body.appendChild(container);
      
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${filename}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(container)
        .save();
      
      document.body.removeChild(container);
      
      toast.success('Download Started', {
        description: 'PDF download has started',
        duration: 2000,
      });
    } catch (error) {
      console.error('PDF download failed', error);
      toast.error('Download Failed', {
        description: 'Could not generate PDF. Please try again.',
        duration: 3000,
      });
    }
  };

  const handleShareCopy = async () => {
    const compiledContent = getCompiledOutput();
    await copyToClipboard(compiledContent);
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

  // Utility: play short chime when work completes
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // silently ignore audio errors
    }
  };

  // Utility: gentle ping to signal long-running status
  const playProgressPing = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // ignore audio errors
    }
  };

  const clearProgressToasts = () => {
    progressTimersRef.current.forEach((t) => clearTimeout(t));
    progressTimersRef.current = [];
    if (progressPersistentToastRef.current !== null) {
      toast.dismiss(progressPersistentToastRef.current);
      progressPersistentToastRef.current = null;
    }
  };

  const renderActionLabel = (label: string, IconComp: typeof ArrowUp) =>
    showButtonText ? (
      label
    ) : (
      <IconComp className="h-4 w-4" aria-hidden="true" />
    );

  const scheduleProgressToasts = (isFollowUp: boolean) => {
    clearProgressToasts();
    const messages = isFollowUp
      ? [
          'Sending user re-prompt...',
          'Analysing new information...',
          'Fetching legislation and ATO references...',
          'Researching and redrafting client response...',
        ]
      : [
          'Sending user prompt...',
          'Analysing scenario...',
          'Fetching legislation and ATO references...',
          'Researching and drafting client response...',
        ];

    const intervalMs = 8000; // show progress every 8s
    messages.forEach((msg, idx) => {
      const timer = setTimeout(() => {
        const isLast = idx === messages.length - 1;
        const toastId = toast.message(msg, isLast ? {} : { duration: 4000 });
        if (isLast) {
          progressPersistentToastRef.current = toastId;
          playProgressPing();
        }
      }, idx * intervalMs);
      progressTimersRef.current.push(timer);
    });
  };

  return (
    <div className="h-screen flex flex-col relative">
      {/* Main 3-column research layout. Resizable panels are used on desktop widths;
          the app-shell wrapper in ProtectedLayout keeps the whole UI centered. */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
        {/* Previous Research Sidebar - collapsible */}
        {isPreviousOpen ? (
          <div className="w-[240px] h-full flex flex-col bg-white border-r border-slate-200 flex-shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Previous</h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSearchOpen(true)}
                    className="h-7 w-7"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPreviousOpen(false)}
                    className="h-7 w-7"
                    title="Collapse previous"
                  >
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  </Button>
                </div>
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
                    className={`
                      group relative flex w-full items-start gap-2
                      rounded-lg cursor-pointer transition-colors
                      ${selectedChat?.id === chat.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-slate-50 border border-transparent'}
                    `}
                  >
                  {/* TEXT COLUMN - wrap long titles */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="font-medium text-xs text-foreground break-words">
                      {chat.title}
                    </div>
                  </div>

                    {/* 3-dot menu, hidden for now */}
                  <div className="flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 group-hover:delay-[2000ms]"
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
        ) : (
          <div className="w-[44px] h-full flex flex-col items-center justify-start bg-white border-r border-slate-200 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPreviousOpen(true)}
              className="m-2 h-7 w-7"
              title="Expand previous"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Main Content Area - 70% */}
        <ResizablePanel defaultSize={70} minSize={58}>
          <div className="h-full relative">
          {/* Keep model selector visible for admins before results are shown */}
          {userRole === 'admin' && !fullChatData && (
            <div className="absolute top-4 left-4 z-20">
              <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as ModelOption)}>
                <SelectTrigger className="h-9 w-[180px] text-sm shadow-sm bg-white/90 backdrop-blur border border-slate-200">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Praxio AI">Praxio AI</SelectItem>
                  <SelectItem value="Test AI">Test AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
                <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
                  {/* Left Column - Scenario, Research, Citations */}
                  <ResizablePanel defaultSize={50} className="min-w-0">
                    <ScrollArea className="h-full">
                      <div className="p-5 space-y-3">
                      <Accordion 
                        type="multiple" 
                        className="w-full space-y-4" 
                        value={leftAccordionValue}
                        onValueChange={setLeftAccordionValue}
                        defaultValue={['research']}
                      >
                      {/* Scenario */}
                      {fullChatData.scenario?.trim() && (
                          <AccordionItem value="scenario" className="border rounded-lg px-3">
                            <AccordionTrigger className="hover:no-underline py-2">
                              <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                                  <span className="font-medium text-sm">Scenario</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(fullChatData.scenario || '');
                                    }}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadClick('scenario', fullChatData.scenario || '', 'Scenario');
                                    }}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <div className="max-h-[400px] overflow-y-auto pr-2">
                                <div className="prose prose-sm max-w-none break-words prose-headings:font-semibold prose-p:leading-relaxed prose-ul:my-4 prose-ol:my-4 prose-li:my-2 prose-p:text-sm prose-headings:text-base prose-ul:text-sm prose-ol:text-sm prose-li:text-sm">
                                  <ReactMarkdown>{fullChatData.scenario}</ReactMarkdown>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                      )}

                      {/* Research */}
                      {fullChatData.research?.trim() && (
                          <AccordionItem value="research" className="border rounded-lg px-3">
                            <AccordionTrigger className="hover:no-underline py-2">
                              <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-2">
                                  <Search className="h-3.5 w-3.5 text-green-600" />
                                  <span className="font-medium text-sm">Research</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-6 w-6 ${
                                      fullChatData.feedback === 1
                                        ? 'text-green-600 hover:text-green-700'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpvote();
                                    }}
                                    title="Vote up"
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-6 w-6 ${
                                      fullChatData.feedback === -1
                                        ? 'text-red-600 hover:text-red-700'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownvote();
                                    }}
                                    title="Vote down"
                                  >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenHistory();
                                    }}
                                    title="History"
                                  >
                                    <History className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(fullChatData.research || '');
                                    }}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadClick('research', fullChatData.research || '', 'Research');
                                    }}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <div className={`overflow-y-auto pr-2 ${
                                leftAccordionValue.includes('scenario') && leftAccordionValue.includes('citations')
                                  ? 'max-h-[400px]'
                                  : leftAccordionValue.includes('scenario')
                                  ? 'max-h-[450px]'
                                  : leftAccordionValue.includes('citations')
                                  ? 'max-h-[500px]'
                                  : 'max-h-[600px]'
                              }`}>
                                <div className="mb-3 pb-2 border-b border-slate-200">
                                  <p className="text-xs text-muted-foreground">
                                    Research Date: {toSydneyDateTime(fullChatData.updated_on || fullChatData.created_at)}
                                  </p>
                                </div>
                                <div className="prose prose-sm max-w-none break-words prose-headings:font-semibold prose-p:leading-relaxed prose-ul:my-4 prose-ol:my-4 prose-li:my-2 prose-pre:whitespace-pre-wrap prose-pre:break-words prose-p:text-sm prose-headings:text-base prose-ul:text-sm prose-ol:text-sm prose-li:text-sm prose-code:text-xs">
                            <ReactMarkdown>{fullChatData.research}</ReactMarkdown>
                          </div>
                        </div>
                            </AccordionContent>
                          </AccordionItem>
                      )}

                      {/* Citations */}
                      {citations.length > 0 && (
                            <AccordionItem value="citations" className="border rounded-lg px-3">
                              <AccordionTrigger className="hover:no-underline py-2">
                              <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-2">
                                  <ExternalLink className="h-3.5 w-3.5 text-purple-600" />
                                  <span className="font-medium text-sm">Citations ({citations.length})</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard('', 'citations');
                                    }}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const citationsText = citations.map(c => 
                                        `${c.title}${c.url ? ` - ${c.url}` : ' (Legislation reference)'}`
                                      ).join('\n');
                                      handleDownloadClick('citations', citationsText, 'Citations');
                                    }}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                              <div className="max-h-[400px] overflow-y-auto pr-2">
                                <div className="space-y-3">
                                  {citations.map((citation, index) => (
                                    <div key={index} className="flex items-start gap-2 p-2.5 bg-muted/50 rounded-lg w-full min-w-0">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-xs mb-0.5 line-clamp-2">
                                          {citation.title}
                                        </p>
                                        {citation.url ? (
                                          <a
                                            href={citation.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-[10px] flex items-start gap-1 break-all whitespace-normal min-w-0"
                                          >
                                            <ExternalLink className="h-2.5 w-2.5 shrink-0 mt-[2px]" />
                                            <span className="leading-snug break-all">{citation.url}</span>
                                          </a>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground italic">
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
                        )}
                          </Accordion>
                    </div>
                  </ScrollArea>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Column - Questions, Conversation Widget */}
                <ResizablePanel defaultSize={50} className="min-w-0">
                  <div className="h-full flex flex-col">
                    <ScrollArea className="flex-shrink-0">
                      <div className="p-5 pb-3">
                        {/* Questions */}
                        {fullChatData.questions?.trim() && (
                          <Accordion 
                            type="single" 
                            collapsible 
                            className="w-full" 
                            value={rightAccordionValue}
                            onValueChange={setRightAccordionValue}
                            defaultValue="questions"
                          >
                            <AccordionItem value="questions" className="border rounded-lg px-3">
                              <AccordionTrigger className="hover:no-underline py-2">
                                <div className="flex items-center justify-between w-full pr-2">
                                  <div className="flex items-center gap-2">
                                    <HelpCircle className="h-3.5 w-3.5 text-orange-600" />
                                    <span className="font-medium text-sm">Questions to refine research</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(fullChatData.questions || '');
                                      }}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadClick('questions', fullChatData.questions || '', 'Questions');
                                      }}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                <div className="max-h-[400px] overflow-y-auto pr-2">
                                  <div className="prose prose-sm max-w-none break-words prose-headings:font-semibold prose-p:leading-relaxed prose-ul:my-4 prose-ol:my-4 prose-li:my-2 prose-p:text-sm prose-headings:text-base prose-ul:text-sm prose-ol:text-sm prose-li:text-sm">
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
                        <div className="p-4">
                          {loadingConversations ? (
                            <div className="flex items-center justify-center h-32 text-muted-foreground">
                              <div className="text-center">
                                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
                                <p className="text-xs">Loading conversation...</p>
                              </div>
                            </div>
                          ) : conversations.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-muted-foreground">
                              <div className="text-center">
                                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-xs">No conversation messages yet</p>
                                <p className="text-[10px] mt-1">Start a conversation below</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {conversations.map((conv) => {
                                const isUser = conv.type === 'user';
                                return (
                                  <div
                                    key={conv.id}
                                    className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                                  >
                                    <div
                                      className={`max-w-[80%] rounded-lg p-3 ${
                                        isUser
                                          ? 'bg-muted/50 text-left'
                                          : 'bg-blue-50 text-right'
                                      }`}
                                    >
                                      <div className={`text-[10px] font-medium text-muted-foreground mb-1.5 ${isUser ? 'text-left' : 'text-right'}`}>
                                        {isUser ? 'User' : 'Assistant'}
                                      </div>
                                      <div className="prose prose-sm max-w-none break-words prose-pre:whitespace-pre-wrap prose-pre:break-words prose-p:text-sm prose-headings:text-sm prose-ul:text-sm prose-ol:text-sm prose-li:text-sm">
                                        <ReactMarkdown>{conv.content || ''}</ReactMarkdown>
                                      </div>
                                      <div className={`mt-1.5 text-[10px] text-muted-foreground ${isUser ? 'text-left' : 'text-right'}`}>
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
                      <div className="border-t border-slate-200 p-4 bg-white space-y-2">
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-3 flex-wrap">
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
                              className="w-full min-h-[32px] max-h-[200px] px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto leading-normal text-sm"
                              rows={1}
                              onKeyDown={(e) => {
                                // Allow Enter to create new lines - only button click submits
                              }}
                            />
                          </div>
                          <div className="flex items-start">
                            <Button
                              onClick={handleRunResearch}
                              disabled={!prompt.trim() || isRunning}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 shrink-0 flex-shrink-0 disabled:opacity-60"
                              aria-label={showButtonText ? undefined : fullChatData ? 'Re-run Research' : 'Run Research'}
                            >
                              {renderActionLabel(fullChatData ? 'Re-run Research' : 'Run Research', ArrowUp)}
                            </Button>
                            </div>
                          </div>
                        {userRole === 'admin' && fullChatData && (
                          <div className="flex flex-wrap gap-2 items-start">
                            <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as ModelOption)}>
                              <SelectTrigger className="h-9 w-[180px] text-sm shadow-sm bg-white border border-slate-200">
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Praxio AI">Praxio AI</SelectItem>
                                <SelectItem value="Test AI">Test AI</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        </div>
                        <div className="flex gap-2 justify-end flex-wrap">
                          <Button
                            onClick={handleNewResearch}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3"
                            aria-label={showButtonText ? undefined : 'New Scenario'}
                          >
                            {renderActionLabel('New Scenario', PlusCircle)}
                          </Button>
                          <Button
                            onClick={() => {
                              // Shortcut: Go directly to share step with research and citations included
                              // Use existing draft if available, otherwise empty (will just send research + citations)
                              setDraftContent(fullChatData?.draft || '');
                              setDraftStep('share');
                              setCompileOptions({
                                includeResearch: true,
                                includeCitations: true,
                                includeQuestions: false,
                                includeConversation: false,
                                includeResearchHistory: false,
                                includeCitationsHistory: false,
                              });
                              setDraftDialogOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                            aria-label={showButtonText ? undefined : 'Send Results to Me'}
                          >
                            {renderActionLabel('Send Results to Me', Share)}
                          </Button>
                          <Button
                            onClick={() => {
                              setDraftContent(fullChatData.draft || '');
                              setDraftStep('edit');
                              setCompileOptions({
                                includeResearch: false,
                                includeCitations: false,
                                includeQuestions: false,
                                includeConversation: false,
                                includeResearchHistory: false,
                                includeCitationsHistory: false,
                              });
                              setDraftDialogOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                            aria-label={showButtonText ? undefined : 'Create Client Draft'}
                          >
                            {renderActionLabel('Create Client Draft', FilePlus)}
                          </Button>
                        </div>
                        {/* Disclaimer */}
                        <div className="pt-3 border-t border-slate-200">
                          <div className="text-center space-y-1">
                            <p className="text-[10px] text-slate-600">
                              Praxio AI may be inaccurate. Verify with official sources.
                            </p>
                            <p className="text-[10px] text-slate-600">
                              Do not enter client information such as TFN, ABN etc.
                            </p>
                            {fullChatData?.processTime && (
                              <p className="text-[10px] text-slate-500">
                                Praxio AI thought for {fullChatData.processTime.toFixed(1)}s
                              </p>
                            )}
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
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                  aria-label={showButtonText ? undefined : 'Start New Research'}
                >
                  {renderActionLabel('Start New Research', PlusCircle)}
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
                            className="w-full min-h-[32px] max-h-[200px] px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto leading-normal text-sm"
                        rows={1}
                        onKeyDown={(e) => {
                          // Allow Enter to create new lines - only button click submits
                        }}
                      />
                    </div>
                    <div className="flex items-start">
                      <Button
                        onClick={handleRunResearch}
                        disabled={!prompt.trim() || isRunning}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 shrink-0 flex-shrink-0 disabled:opacity-60"
                    aria-label={showButtonText ? undefined : fullChatData ? 'Re-run Research' : 'Run Research'}
                      >
                    {renderActionLabel(fullChatData ? 'Re-run Research' : 'Run Research', ArrowUp)}
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

      {/* Download Dialog */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Download {downloadSection?.title}</DialogTitle>
            <DialogDescription>
              Choose a format to download this section
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={downloadAsPdf}
              className="w-full justify-start"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Download as PDF
            </Button>
            <Button
              onClick={downloadAsDocx}
              className="w-full justify-start"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Download as DOCX
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new title for this chat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              placeholder="Enter chat title..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmRename();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRenameDialogOpen(false);
                  setRenameChatId(null);
                  setRenameTitle('');
                }}
                className="text-xs h-8 px-3"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRename}
                disabled={!renameTitle.trim()}
                className="text-xs h-8 px-3"
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteChatTitle}"? This action cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteChatId(null);
                setDeleteChatTitle('');
              }}
              className="text-xs h-8 px-3"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="text-xs h-8 px-3"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive "{archiveChatTitle}"? This can be reversed later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setArchiveDialogOpen(false);
                setArchiveChatId(null);
                setArchiveChatTitle('');
              }}
              className="text-xs h-8 px-3"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmArchive}
              className="text-xs h-8 px-3"
            >
              Archive
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Client Draft Dialog */}
      <Dialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
        <DialogContent className={`w-[80vw] ${draftStep === 'compile' ? 'max-w-[520px] h-[360px] max-h-[360px]' : 'max-w-[1200px] h-[800px] max-h-[800px]'} overflow-hidden flex flex-col p-0`}>
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {draftStep === 'compile' ? 'Compile final output' : 'Create Client Draft'}
                </DialogTitle>
                <DialogDescription>
                  {draftStep === 'compile' 
                    ? 'Select section to include with Client Draft'
                    : 'Edit the draft directly below and then move to compile it with supporting sections'}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {autoSaveStatus === 'saving' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Save className="h-4 w-4 animate-pulse" />
                    <span>Saving...</span>
                  </div>
                )}
                {autoSaveStatus === 'saved' && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Saved</span>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs value={draftStep} onValueChange={(v) => setDraftStep(v as 'edit' | 'compile' | 'share')} className="flex-1 flex flex-col min-h-0">
            <TabsContent value="edit" className="flex-1 min-h-0 mt-0">
              <div className="p-6 flex flex-col h-full">
                <div className="flex-1 flex flex-col min-h-0">
                  <style jsx global>{`
                    .w-md-editor {
                      height: 100% !important;
                    }
                    .w-md-editor-text {
                      flex: 1 !important;
                    }
                    .w-md-editor-preview {
                      flex: 1 !important;
                      padding: 1.5rem !important;
                    }
                  `}</style>
                  <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
                    <MDEditor
                      value={draftContent}
                      onChange={(value) => setDraftContent(value || '')}
                      preview="edit"
                      hideToolbar={false}
                      visibleDragbar={true}
                      data-color-mode="light"
                      height="100%"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraftDialogOpen(false);
                      setDraftContent('');
                      setDraftStep('edit');
                    }}
                    className="text-xs h-8 px-3"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      if (draftContent.trim()) {
                        setDraftStep('compile');
                      }
                    }}
                    disabled={!draftContent.trim()}
                    className="text-xs h-8 px-3"
                  >
                    Next: Compile Output
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="compile" className="flex-1 min-h-0 mt-0">
              <div className="p-6 h-full flex flex-col">
                <div className="mb-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-research"
                        checked={compileOptions.includeResearch}
                        onCheckedChange={(checked) =>
                          setCompileOptions({ ...compileOptions, includeResearch: checked === true })
                        }
                      />
                      <label htmlFor="include-research" className="text-sm font-medium cursor-pointer">
                        Research
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-citations"
                        checked={compileOptions.includeCitations}
                        onCheckedChange={(checked) =>
                          setCompileOptions({ ...compileOptions, includeCitations: checked === true })
                        }
                      />
                      <label htmlFor="include-citations" className="text-sm font-medium cursor-pointer">
                        Citations ({citations.length})
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-questions"
                        checked={compileOptions.includeQuestions}
                        onCheckedChange={(checked) =>
                          setCompileOptions({ ...compileOptions, includeQuestions: checked === true })
                        }
                      />
                      <label htmlFor="include-questions" className="text-sm font-medium cursor-pointer">
                        Questions
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-conversation"
                        checked={compileOptions.includeConversation}
                        onCheckedChange={(checked) =>
                          setCompileOptions({ ...compileOptions, includeConversation: checked === true })
                        }
                      />
                      <label htmlFor="include-conversation" className="text-sm font-medium cursor-pointer">
                        Conversation ({conversations.length})
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-research-history"
                        checked={compileOptions.includeResearchHistory}
                        onCheckedChange={async (checked) => {
                          const next = checked === true;
                          if (next && fullChatData?.id && historyItems.length === 0) {
                            await loadHistoryData(fullChatData.id);
                          }
                          setCompileOptions({ ...compileOptions, includeResearchHistory: next });
                        }}
                      />
                      <label htmlFor="include-research-history" className="text-sm font-medium cursor-pointer">
                        Research history ({historyItems.length})
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-citations-history"
                        checked={compileOptions.includeCitationsHistory}
                        onCheckedChange={async (checked) => {
                          const next = checked === true;
                          if (next && fullChatData?.id && historyItems.length === 0) {
                            await loadHistoryData(fullChatData.id);
                          }
                          setCompileOptions({ ...compileOptions, includeCitationsHistory: next });
                        }}
                      />
                      <label htmlFor="include-citations-history" className="text-sm font-medium cursor-pointer">
                        Citations history ({historyItems.length})
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDraftStep('edit')}
                    className="text-xs h-8 px-3"
                  >
                    Back to Edit
                  </Button>
                  <Button
                    onClick={() => setDraftStep('share')}
                    className="text-xs h-8 px-3"
                  >
                    Next: Share
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="share" className="flex-1 min-h-0 mt-0">
              <div className="p-6 h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4">Share compiled output:</h3>
                <div className="space-y-3">
                  <Button
                    onClick={handleShareEmail}
                    className="w-full justify-start text-xs h-8"
                    variant="outline"
                    disabled={!fullChatData?.email}
                  >
                    <Mail className="h-3.5 w-3.5 mr-2" />
                    Send to {fullChatData?.email || 'user email'}
                  </Button>
                  <Button
                    onClick={handleShareDownloadDocx}
                    className="w-full justify-start text-xs h-8"
                    variant="outline"
                  >
                    <Download className="h-3.5 w-3.5 mr-2" />
                    Download as DOCX
                  </Button>
                  <Button
                    onClick={handleShareDownloadPdf}
                    className="w-full justify-start text-xs h-8"
                    variant="outline"
                  >
                    <Download className="h-3.5 w-3.5 mr-2" />
                    Download as PDF
                  </Button>
                  <Button
                    onClick={handleShareCopy}
                    className="w-full justify-start text-xs h-8"
                    variant="outline"
                  >
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Copy to Clipboard
                  </Button>
                </div>

                <div className="mt-6 flex justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDraftStep('compile')}
                    className="text-xs h-8 px-3"
                  >
                    Back to Compile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraftDialogOpen(false);
                      setDraftStep('edit');
                    }}
                    className="text-xs h-8 px-3"
                  >
                    Back
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="relative max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Research & Citations History</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="absolute right-3 top-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Share history"
              onClick={() => {
                setCompileOptions((prev) => ({
                  ...prev,
                  includeResearchHistory: true,
                  includeCitationsHistory: true,
                }));
                setDraftDialogOpen(true);
                setDraftStep('compile');
                setHistoryDialogOpen(false);
              }}
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2">
            {historyLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading history...</div>
            ) : historyError ? (
              <div className="py-6 text-center text-sm text-red-600">
                {historyError}
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fullChatData?.id && loadHistoryData(fullChatData.id)}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No history found for this chat yet.
              </div>
            ) : (
              <ScrollArea className="max-h-[70vh] pr-4">
                <Accordion
                  type="single"
                  collapsible
                  defaultValue="run-0"
                  className="space-y-3 pb-4"
                >
                  {historyItems.map((item, idx) => {
                    const histCitations = parseCitations(item.citations);
                    const runLabel = idx === 0 ? 'Latest' : 'Previous';
                    const headerDate = item.created_at ? toSydneyDateTime(item.created_at) : 'Unknown date';
                    return (
                      <AccordionItem
                        key={`${item.created_at || 'run'}-${idx}`}
                        value={`run-${idx}`}
                        className="border rounded-lg px-3"
                      >
                        <AccordionTrigger className="hover:no-underline py-2">
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-sm font-semibold">{runLabel}</span>
                              <span className="text-xs text-muted-foreground">{headerDate}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Research</span>
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                              <span>Citations: {histCitations.length}</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-3">
                          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">Research</div>
                              {item.research?.trim() ? (
                                <div className="prose prose-sm max-w-none break-words prose-p:text-sm prose-li:text-sm prose-headings:text-base">
                                  <ReactMarkdown>{item.research}</ReactMarkdown>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No research text</p>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">
                                Citations ({histCitations.length})
                              </div>
                              {histCitations.length > 0 ? (
                                <div className="space-y-2">
                                  {histCitations.map((c, i) => (
                                    <div key={i} className="text-xs">
                                      <span className="font-medium">{i + 1}. {c.title}</span>
                                      <span className="text-muted-foreground">
                                        {c.url ? ` - ${c.url}` : ' (Legislation reference)'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No citations</p>
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      {fullChatData?.id && (
        <FeedbackDialog
          isOpen={feedbackDialogOpen}
          onClose={() => setFeedbackDialogOpen(false)}
          chatId={fullChatData.id}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      )}
    </div>
  );
}

