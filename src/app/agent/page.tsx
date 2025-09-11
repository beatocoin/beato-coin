"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import Loading from "@/components/ui/loading"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InfoIcon, PanelRightIcon, XIcon, Clipboard, CheckCircle } from "lucide-react"
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalTitle, 
  ModalTrigger 
} from "@/components/ui/modal"
import { ChatInterface, ChatMessage } from "@/components/chat/ChatInterface"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import { useTheme } from "@/contexts/ThemeContext"
import Link from "next/link"
import Image from "next/image"
import DataDisplay from "@/components/data-display/DataTable"
import React from "react"
import { marked } from 'marked'
import UserCredits from "@/components/UserCredits"
import SaveImageButton from '@/components/buttons/SaveImageButton'

// Simple type assertions to fix build issues with Next.js 15.2.1
const LoadingComponent = Loading as any
const CardComponent = Card as any
const CardContentComponent = CardContent as any
const ButtonComponent = Button as any
const InfoIconComponent = InfoIcon as any
const PanelRightIconComponent = PanelRightIcon as any
const XIconComponent = XIcon as any
const ModalComponent = Modal as any
const ModalContentComponent = ModalContent as any
const ModalHeaderComponent = ModalHeader as any
const ModalTitleComponent = ModalTitle as any
const ModalTriggerComponent = ModalTrigger as any
const LinkComponent = Link as any
const ClipboardComponent = Clipboard as any
const CheckCircleComponent = CheckCircle as any

// Define Agent interface
interface Agent {
  id: string
  name: string
  description: string
  api_url: string | null
  prompt: string | null
  agent_role: string | null
  is_public: boolean
  config: Record<string, any> | null
}

// Define ChatHistoryItem interface
interface ChatHistoryItem {
  id: string
  session_id: string
  prompt: string
  message: string
  created_at: string
}

// Cache for conversation history to reduce database queries
interface ConversationCache {
  [key: string]: {
    lastUpdated: number;
    initialMessage: string;
    responses: {
      content: string;
      created_at: string;
    }[];
  }
}

// Define additional types
interface AgentItem {
  id: string;
  name: string;
  description: string;
  // Add other properties as needed
}

// Utility to insert images into markdown before paragraphs, distributing them evenly
function insertImagesIntoMarkdown(markdown: string, images: string[]): string {
  if (!images || images.length === 0) return markdown;
  // Split markdown into paragraphs (double newlines)
  const paragraphs = markdown.split(/(\n\s*\n)/);
  // Find indices of paragraphs (not just whitespace)
  const paraIndices = paragraphs
    .map((p, i) => (p.trim().length > 0 && !p.trim().startsWith('<img') ? i : null))
    .filter(i => i !== null) as number[];
  if (paraIndices.length === 0) return markdown;
  // Distribute images as evenly as possible
  const step = Math.max(1, Math.floor(paraIndices.length / images.length));
  let imgIdx = 0;
  for (let i = 0; i < paraIndices.length && imgIdx < images.length; i += step) {
    const idx = paraIndices[i];
    paragraphs[idx] = `<img class=\"bot-post-img\" src=\"${images[imgIdx]}\" />\n` + paragraphs[idx];
    imgIdx++;
  }
  return paragraphs.join('');
}

export default function AgentPage() {
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [sessionId, setSessionId] = useState<string>(crypto.randomUUID())
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [isHistoricalSession, setIsHistoricalSession] = useState(false)
  const [conversationCache, setConversationCache] = useState<ConversationCache>({})
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userSettings, setUserSettings] = useState<any>(null)
  const [websiteOptions, setWebsiteOptions] = useState<Record<string, string>>({})
  const [formFields, setFormFields] = useState<any[]>([])
  const [userId, setUserId] = useState<string>('')
  const [isMobile, setIsMobile] = useState(false)
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [newChatName, setNewChatName] = useState<string>('')
  const supabase = createClient()
  const { colors } = useTheme()
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  // Add state for modal and fields
  const [showCreatePostModal, setShowCreatePostModal] = useState<string | null>(null); // message.id or null
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("");
  // Add state for form field values
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [enablePosts, setEnablePosts] = useState<boolean | null>(null);
  
  // Set up responsive state
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    // Initial check
    checkMobile()
    
    // Listen for window resize
    window.addEventListener('resize', checkMobile)
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Get URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSearchParams(params)
    
    const id = params.get('agent_id')
    setAgentId(id)

    // Check login status and admin role
    const checkLoginStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      
      if (user) {
        setUserId(user.id)
        // Check if user is admin
        const { data: userData } = await supabase
          .from('user_data')
          .select('user_role')
          .eq('UID', user.id)
          .single()

        setIsAdmin(userData?.user_role === 'admin')
      }
    }
    checkLoginStatus()
  }, [supabase])

  // Function to fetch chat history for this agent and user
  const fetchChatHistory = useCallback(async () => {
    if (!agentId) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: chatHistory, error } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('agent_id', agentId)
        .eq('"UID"', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      // Filter to only the first message for each unique session_id and agent_id
      const uniqueSessions = new Set();
      const firstMessages = [];
      for (const msg of (chatHistory || []).slice().reverse()) { // reverse to get earliest first
        const key = `${msg.session_id}_${msg.agent_id}`;
        if (!uniqueSessions.has(key)) {
          uniqueSessions.add(key);
          firstMessages.push(msg);
        }
      }
      setChatHistory(firstMessages.reverse()); // reverse again to keep most recent at top
    } catch (error) {
      console.error('Error fetching chat history:', error)
    }
  }, [supabase, agentId])

  // Function to fetch user settings
  const fetchUserSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user_settings column from user_data table
      const { data: settingsData, error } = await supabase
        .from('user_data') // Changed table from 'user_settings' to 'user_data'
        .select('user_settings') // Select only the 'user_settings' column
        .eq('UID', user.id) // Match using 'UID' instead of 'user_id'
        .single()

      if (error) throw error

      // Extract the user_settings object from the returned data
      setUserSettings(settingsData?.user_settings || null) // Adjust to access the nested column

    } catch (error) {
      console.error('Error fetching user settings:', error)
    }
  }, [supabase])

  // Check login status and admin status
  useEffect(() => {
    const checkLoginStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      
      if (user) {
        setUserId(user.id)
        const { data: userData } = await supabase
          .from('user_data')
          .select('user_role')
          .eq('UID', user.id)
          .single()
        
        setIsAdmin(userData?.user_role === 'admin')
      }
    }
    checkLoginStatus()
  }, [supabase])

  // Fetch chat history when sidebar is opened
  useEffect(() => {
    if (isSidebarOpen && agentId) {
      fetchChatHistory()
    }
  }, [isSidebarOpen, agentId, fetchChatHistory])

  // Function to start a new conversation
  const startNewConversation = () => {
    // Clear all messages from the UI
    setMessages([])
    
    // Generate a new session ID
    const newSessionId = crypto.randomUUID();
    
    // Reset historical session flag
    setIsHistoricalSession(false)
    
    // Update the session ID
    setSessionId(newSessionId)
    
    // Create a new empty cache entry for this session
    if (agentId) {
      const cacheKey = `${newSessionId}_${agentId}`;
      
      // Update the cache with a new empty entry
      setConversationCache(prev => {
        // Create a new cache object excluding the previous session
        const newCache = { ...prev };
        
        // If the old session exists in the cache, remove it
        if (sessionId && prev[`${sessionId}_${agentId}`]) {
          delete newCache[`${sessionId}_${agentId}`];
        }
        
        // Add the new empty session
        newCache[cacheKey] = {
          lastUpdated: Date.now(),
          initialMessage: '',
          responses: []
        };
        
        return newCache;
      });
    }
  }

  // Function to load a specific conversation by session ID
  const loadConversation = async (selectedSessionId: string) => {
    if (!agentId) return
    
    setIsLoadingConversation(true)
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return // Ensure user is logged in
      }
      
      // Query all messages for this session
      const { data, error } = await supabase
        .from('agent_messages')
        .select('prompt, message, created_at, post_id')
        .eq('session_id', selectedSessionId)
        .eq('agent_id', agentId)
        .eq('UID', user.id)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error loading conversation:', error)
        return
      }
      
      if (!data || data.length === 0) {
        console.error('No messages found for this session')
        return
      }
      
      // Clear existing messages
      setMessages([])
      
      // Create new message objects from the data
      const newMessages: ChatMessage[] = [];
      
      // Extract initial message (first user prompt)
      const initialMessage = data.length > 0 ? data[0]?.prompt || '' : '';
      
      // Get assistant responses for cache - we want the last 2 assistant responses
      // By taking the last 2 message entries from the data array
      const agentResponses = data
        .slice(-4) // Take last 4 entries (2 user messages + 2 assistant responses)
        .filter((_: any, index: number) => index % 2 === 1) // Keep only odd indexes (assistant responses)
        .map((item: { message: string; created_at: string }) => ({
          content: item.message,
          created_at: item.created_at
        }));
      
      // Create chat messages for display
      data.forEach((item: { prompt: string; message: string; created_at: string; post_id?: string }) => {
        // Add user message
        newMessages.push({
          id: crypto.randomUUID(),
          role: 'user',
          content: item.prompt,
          timestamp: new Date(item.created_at)
        });
        
        // Add assistant message
        newMessages.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: item.message,
          timestamp: new Date(item.created_at),
          post_id: item.post_id
        });
      });
      
      // Update messages state
      setMessages(newMessages)
      
      // Update session ID to the loaded session
      setSessionId(selectedSessionId)
      
      // Set historical session flag
      setIsHistoricalSession(true)
      
      // Update the cache
      const cacheKey = `${selectedSessionId}_${agentId}`;
      setConversationCache(prev => ({
        ...prev,
        [cacheKey]: {
          lastUpdated: Date.now(),
          initialMessage: initialMessage,
          responses: agentResponses
        }
      }));
      
    } catch (error) {
      console.error('Failed to load conversation:', error)
    } finally {
      setIsLoadingConversation(false)
      // Close the sidebar after loading a conversation
      setIsSidebarOpen(false)
    }
  }

  // Function to clean markdown and special characters from text
  const cleanMarkdown = (text: string) => {
    if (!text) return '';
    
    // First, handle code blocks (which can contain other markdown)
    const withoutCodeBlocks = text.replace(/```[\s\S]*?```/g, '');
    
    // Then process other markdown elements
    return withoutCodeBlocks
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers but keep content
      .replace(/\*([^*]+)\*/g, '$1')     // Remove italic markers but keep content
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just the text
      .replace(/#{1,6}\s+([^\n]+)/g, '$1') // Remove heading markers but keep content
      .replace(/`([^`]+)`/g, '$1')        // Remove inline code markers but keep content
      .replace(/>\s([^\n]+)/g, '$1')      // Remove blockquote markers but keep content
      .replace(/\n- ([^\n]+)/g, '\n$1')   // Remove list item markers but keep content
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images entirely
      .replace(/\n\s*\n/g, '\n')          // Collapse multiple newlines
      .replace(/\|[^\n]*\|/g, ' ')        // Remove table rows
      .replace(/\s*---+\s*/g, ' ')        // Remove horizontal rules
      .replace(/~~([^~]+)~~/g, '$1')      // Remove strikethrough
      .replace(/<\/?[^>]+(>|$)/g, '')     // Remove HTML tags
      .replace(/\b(https?:\/\/\S+)/g, '') // Remove URLs
      .replace(/[^\w\s.,?!;:'"()-]/g, '') // Remove special characters not in the allowed list
      .replace(/\s+/g, ' ')               // Collapse multiple spaces
      .trim();                             // Trim leading/trailing whitespace
  }
  
  // Function to truncate text
  const truncateText = (text: string, maxLength: number): string => {
    if (!text) return '';
    const cleaned = cleanMarkdown(text)
    
    if (cleaned.length <= maxLength) return cleaned
    return cleaned.substring(0, maxLength) + '...'
  }

  // Process form fields based on agent config and user settings
  const processFormFields = (agent: Agent, userSettings: any) => {
    if (!agent?.config?.body) return []
    
    const fields = agent.config.body.map((param: any) => {
      // Handle website_credentials specifically
      if (param.input === 'website_credentials' && userSettings?.websites) {
        // Create dropdown options from user's websites
        const websiteOptions: Record<string, string> = {}
        userSettings.websites.forEach((website: {id: string, website_name: string}) => {
          if (website.id && website.website_name) {
            websiteOptions[website.id] = website.website_name
          }
        })
        
        // Save website options for later use
        setWebsiteOptions(websiteOptions)
        
        return {
          input: 'website_credentials',
          input_label: param.input_label || 'Select Website',
          dropdown_options: websiteOptions
        }
      }
      
      // Handle regular form fields
      const paramName = Object.keys(param).find(key => 
        !['input', 'input_label', 'dropdown_options'].includes(key)
      )
      
      if (!paramName) return null
      
      if (param.input === 'dropdown' && param.dropdown_options) {
        return {
          [paramName]: param[paramName],
          input: param.input,
          input_label: param.input_label || paramName,
          dropdown_options: param.dropdown_options
        }
      }
      
      return {
        [paramName]: param[paramName],
        input: param.input,
        input_label: param.input_label || paramName
      }
    }).filter(Boolean)
    
    return fields
  }

  // Check authentication and fetch agent data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // Ensure loading state is set at the beginning
      setError(null); // Reset error state

      try {
        // Get current user (if logged in)
        const { data: { user } } = await supabase.auth.getUser()

        // Fetch agent data if we have an agent ID
        if (agentId) {
          const { data, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('id', agentId)
            .single()

          if (agentError) {
            console.error('Error fetching agent data:', agentError)
            setError('Failed to load agent data')
            // Removed setIsLoading(false) here, will be handled in finally block
            return
          }

          if (!data) {
            setError('Agent not found')
            // Removed setIsLoading(false) here
            return
          }

          // Check if agent is not public and not owned by the current user
          if (!data.is_public && (!user || data.UID !== user.id)) {
            // Allow admins to view any agent
            const { data: userData } = await supabase
              .from('user_data')
              .select('user_role')
              .eq('UID', user?.id)
              .single()

            if (userData?.user_role !== 'admin') {
              setError('You must be logged in and own this agent or be an admin to view it')
              // Removed setIsLoading(false) here
              return
            }
          }

          setAgent(data as Agent) // Update agent state

          // If agent has website_credentials in config, trigger fetching user settings
          if (data.config?.body && data.config.body.some((param: any) => param.input === 'website_credentials')) {
            fetchUserSettings(); // Call fetchUserSettings, which updates userSettings state
          }
          // REMOVED form field processing from here
        } else {
          setError('No agent ID provided')
        }
      } catch (error) {
        console.error('Error:', error)
        setError('An error occurred while fetching data')
      } finally {
        setIsLoading(false); // Set loading to false in the finally block
      }
    }

    if (agentId) {
      fetchData()
    } else {
      setIsLoading(false) // Set loading false if no agentId
      setError('No agent ID specified in the URL.') // Add specific error message
    }
    // fetchUserSettings is stable due to useCallback, but including it prevents potential lint warnings
  }, [supabase, agentId, fetchUserSettings])

  // New useEffect to process form fields when agent or userSettings change
  useEffect(() => {
    if (agent) {
      // Process form fields using the current agent and userSettings state
      const fields = processFormFields(agent, userSettings);
      setFormFields(fields);
    } else {
      // Clear form fields if agent becomes null
      setFormFields([]);
    }
  }, [agent, userSettings]); // Dependency array includes agent and userSettings

  /**
   * Fetches the recent conversation history with caching
   * @returns Object containing initial message and last 2 agent responses
   */
  const fetchConversationHistory = async () => {
    if (!agentId || !sessionId) {
      return { initialMessage: '', responses: [] };
    }
    
    const cacheKey = `${sessionId}_${agentId}`;
    
    // Check cache first - cache expires after 10 minutes
    const currentTime = Date.now();
    const cachedData = conversationCache[cacheKey];
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    if (cachedData && (currentTime - cachedData.lastUpdated) < CACHE_TTL) {
      return {
        initialMessage: cachedData.initialMessage || '',
        responses: cachedData.responses || []
      };
    }
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { initialMessage: '', responses: [] };
      }
      
      // Get initial message (first user message in this session)
      const { data: initialData, error: initialError } = await supabase
        .from('agent_messages')
        .select('prompt')
        .eq('session_id', sessionId)
        .eq('agent_id', agentId)
        .eq('UID', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      
      if (initialError) {
        console.error('Error fetching initial message:', initialError);
      }
      
      const initialMessage = initialData && initialData.length > 0 ? initialData[0].prompt : '';
      
      // Get the last 2 agent responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('agent_messages')
        .select('message, created_at')
        .eq('session_id', sessionId)
        .eq('agent_id', agentId)
        .eq('UID', user.id)
        .order('created_at', { ascending: false })
        .limit(2);
      
      if (responsesError) {
        console.error('Error fetching agent responses:', responsesError);
        return { initialMessage, responses: [] };
      }
      
      // Process responses data
      const responses = responsesData ? responsesData.map((item: { message: string; created_at: string }) => ({
        content: item.message,
        created_at: item.created_at
      })).reverse() : [];
      
      // Store in cache
      setConversationCache(prev => ({
        ...prev,
        [cacheKey]: {
          lastUpdated: currentTime,
          initialMessage,
          responses
        }
      }));
      
      return { initialMessage, responses };
      
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
      return { initialMessage: '', responses: [] };
    }
  };

  const handleSendMessage = async (content: string, formData?: Record<string, any>) => {
    if (!agent) return
    if (isSending) return

    // If we're in a historical session, start a new session
    if (isHistoricalSession) {
      setSessionId(crypto.randomUUID())
      setIsHistoricalSession(false)
    }

    // Add the new user message to the state
    setMessages(prev => [...prev, {
      role: 'user',
      content,
      id: crypto.randomUUID(),
      timestamp: new Date()
    }])

    setIsSending(true)

    try {
      
      // Start constructing the request body
      const requestBody: Record<string, any> = {}
      
      // If the agent has an API URL, make the API call
      if (agent.api_url) {
        
        // Check if this is a local n8n webhook
        const isLocalN8n = agent.api_url.includes('localhost:5678') || agent.api_url.includes('127.0.0.1:5678')
        
        // Prepare the query parameter by combining prompt and user input if available
        if (agent.prompt) {
          // Replace [user_message] or [user_input] with the actual message in the prompt
          const formattedPrompt = agent.prompt
            .replace('[user_message]', content)
            .replace('[user_input]', content)
          
          // Use the formatted prompt as the query
          requestBody.query = formattedPrompt
        } else {
          // If no prompt, just use the content directly
          requestBody.query = content
        }
        
        // Extract headers from config
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        
        // Add custom headers from config if available
        if (agent.config?.headers) {
          Object.entries(agent.config.headers).forEach(([key, value]) => {
            headers[key] = value as string
          })
        }
        
        // Get current user ID and add it to the request body
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          requestBody.UID = user.id
          requestBody.session_id = sessionId as string
        }
        
        // Add agent_role from agent if available
        if (agent.agent_role) {
          requestBody.agent_role = agent.agent_role
        }

        // Process body parameters from config
        if (agent.config?.body) {
          agent.config.body.forEach((param: any) => {
            // Special handling for website_credentials
            if (param.input === 'website_credentials' && formData && formData['website_id'] && userSettings?.websites) {
              // Find the selected website from user settings
              const selectedWebsite = userSettings.websites.find((site: {id: string}) => site.id === formData['website_id'])
              
              if (selectedWebsite) {
                // Add website_name parameter only - not the credentials for security
                requestBody.website_name = selectedWebsite.website_name;
                requestBody.website_url = selectedWebsite.website_url;
                
                // DO NOT add website_credentials to the request for security reasons
                // Server-side code should handle authentication using the website name
              }
            } else {
              // Regular parameter handling (existing code)
              const paramName = Object.keys(param).find(key => 
                !['input', 'input_label', 'dropdown_options'].includes(key)
              );

              if (paramName) {
                // If this parameter has a form input type
                if (param.input === 'dropdown' && formData && formData[paramName]) {
                  // For dropdowns, use the selected value directly
                  requestBody[paramName] = formData[paramName];
                } else if (param.input && formData && formData[paramName]) {
                  // For other input types, use the form value
                  requestBody[paramName] = formData[paramName];
                } else {
                  // Use the default value from the config
                  requestBody[paramName] = param[paramName];
                }
              }
            }
          });
        }
        
        // Add model options from config if available
        if (agent.config?.options) {
          // Add max_tokens if available
          if (agent.config.options.max_tokens) {
            try {
              requestBody.max_tokens = parseInt(agent.config.options.max_tokens);
            } catch (e) {
              requestBody.max_tokens = agent.config.options.max_tokens;
            }
          }
          
          // Add temperature if available
          if (agent.config.options.temperature) {
            try {
              requestBody.temperature = parseFloat(agent.config.options.temperature);
            } catch (e) {
              requestBody.temperature = agent.config.options.temperature;
            }
          }
          
          // Add top_p if available
          if (agent.config.options.top_p) {
            try {
              requestBody.top_p = parseFloat(agent.config.options.top_p);
            } catch (e) {
              requestBody.top_p = agent.config.options.top_p;
            }
          }
        }
        
        // Make the API call
        let response;
        if (isLocalN8n) {
          // For local n8n webhooks, use the n8n host from the MCP server config
          const webhookPath = new URL(agent.api_url).pathname;
          
          try {
            response = await fetch(`http://localhost:5678${webhookPath}`, {
              method: 'POST',
              headers,
              body: JSON.stringify(requestBody)
            });
          } catch (fetchError: any) {
            // Handle certificate errors
            if (fetchError.message && 
                (fetchError.message.includes('certificate') || 
                 fetchError.message.includes('ERR_CERT_COMMON_NAME_INVALID') || 
                 fetchError.message.includes('Failed to fetch'))) {
              console.warn('Certificate error detected on localhost, trying alternative host');
              
              // Try with alternative localhost notation (127.0.0.1)
              response = await fetch(`http://127.0.0.1:5678${webhookPath}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
              });
            } else {
              // Re-throw other errors
              throw fetchError;
            }
          }
          
          if (!response.ok) {
            console.error('API response not OK:', response.status, response.statusText)
            throw new Error(`API call failed: ${response.statusText}`)
          }

          const data = await response.json();
          const responseData = Array.isArray(data) ? data[0] : data;
          
          // Debug log to see what type of response we're getting
          console.log('API Response structure:', {
            hasToolName: responseData?.tool_name ? true : false,
            hasToolType: responseData?.tool_type ? true : false,
            hasVideos: responseData?.message?.videos ? true : false,
            responseType: typeof responseData,
            responseKeys: responseData ? Object.keys(responseData) : []
          });
          
          // Check if response is an empty array or if responseData is undefined/null
          if ((Array.isArray(data) && data.length === 0) || !responseData) {
            console.error('Received empty array or null response from agent API');
            // Create a specific error message for empty responses
            const emptyResponseMessage: ChatMessage = {
              role: 'assistant',
              content: "I am sorry but there was no response from the agent. Please contact support.",
              id: crypto.randomUUID(),
              timestamp: new Date()
            };
            setMessages(prev => [...prev, emptyResponseMessage]);
            
            // Store the conversation with error message in Supabase
            try {
              const { data: { user } } = await supabase.auth.getUser()
              
              if (!user) {
                console.error('User not authenticated when storing conversation history')
                return
              }
              
              // Store the message exchange in the database with the error message
              const { error: insertError } = await supabase
                .from('agent_messages')
                .insert({
                  session_id: sessionId as string,
                  UID: user.id,
                  agent_id: agent.id,
                  prompt: content,
                  message: "I am sorry but there was no response from the agent. Please contact support."
                })
                
              if (insertError) {
                console.error('Error storing conversation history:', insertError)
              }
            } catch (storageError) {
              console.error('Failed to store conversation history:', storageError)
            }
          } else if (responseData.tool_name || responseData.tool_type) {
            // Handle structured data with tool_name/tool_type for special rendering
            // If this is a blog post with images, insert images into the markdown
            if (responseData.tool_type === 'blog' && Array.isArray(responseData.images) && responseData.images.length > 0 && typeof responseData.message === 'string') {
              responseData.message = insertImagesIntoMarkdown(responseData.message, responseData.images);
            }
            // For blog posts, store only the processed message string as content
            if (responseData.tool_type === 'blog' && typeof responseData.message === 'string') {
              const newMessage: ChatMessage = {
                role: 'assistant',
                content: responseData.message,
                id: crypto.randomUUID(),
                timestamp: new Date()
              };
              setMessages(prev => [...prev, newMessage]);
            } else {
              // For other tool types, store the whole object
              const newMessage: ChatMessage = {
                role: 'assistant',
                content: responseData,
                id: crypto.randomUUID(),
                timestamp: new Date()
              };
              setMessages(prev => [...prev, newMessage]);
            }
            // Create a message with the structured data object
            const newMessage: ChatMessage = {
              role: 'assistant',
              content: responseData,
              id: crypto.randomUUID(),
              timestamp: new Date()
            };
            setMessages(prev => [...prev, newMessage]);
            
            // Store the conversation in Supabase
            try {
              const { data: { user } } = await supabase.auth.getUser()
              
              if (!user) {
                console.error('User not authenticated when storing conversation history')
                return
              }
              
              // Store the JSON data as a string in the database
              const { error: insertError } = await supabase
                .from('agent_messages')
                .insert({
                  session_id: sessionId as string,
                  UID: user.id,
                  agent_id: agent.id,
                  prompt: content,
                  message: JSON.stringify(responseData)
                })
                
              if (insertError) {
                console.error('Error storing conversation history:', insertError)
              }
            } catch (storageError) {
              console.error('Failed to store conversation history:', storageError)
            }
          } else {
            // Handle regular text response
            // Create the new message with the actual message content
            const newMessage: ChatMessage = {
              role: 'assistant',
              content: responseData.message,
              id: crypto.randomUUID(),
              timestamp: new Date()
            };
            setMessages(prev => [...prev, newMessage]);
            
            // Store the conversation in Supabase
            try {
              const { data: { user } } = await supabase.auth.getUser()
              
              if (!user) {
                console.error('User not authenticated when storing conversation history')
                return
              }
              
              // Store the message exchange in the database
              const { data: insertData, error: insertError } = await supabase
                .from('agent_messages')
                .insert({
                  session_id: sessionId as string,
                  UID: user.id,
                  agent_id: agent.id,
                  prompt: content,
                  message: responseData.message
                })
                .select()
                
              if (insertError) {
                console.error('Error storing conversation history:', insertError)
                // Show error to user
                const errorMessage: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: "There was an error saving your message. Please try again.",
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, errorMessage])
              } else {
                // Update the cache with the new message exchange
                const cacheKey = `${sessionId}_${agentId}`;
                const currentTime = Date.now();
                
                // Create assistant message for cache
                const newAssistantResponse = {
                  content: responseData.message,
                  created_at: new Date().toISOString()
                };
                
                setConversationCache(prev => {
                  const existingCache = prev[cacheKey]?.responses || [];
                  // If this is the first message in this session, use it as the initial message
                  const isFirstMessage = messages.length === 0;
                  const initialMsg = isFirstMessage ? content : (prev[cacheKey]?.initialMessage || '');
                  
                  return {
                    ...prev,
                    [cacheKey]: {
                      lastUpdated: currentTime,
                      initialMessage: initialMsg,
                      responses: [...existingCache, newAssistantResponse].slice(-2)
                    }
                  };
                });
              }
            } catch (storageError) {
              console.error('Failed to store conversation history:', storageError)
            }
            
            // If there are sources, add them as a separate message
            if (responseData.sources && Array.isArray(responseData.sources) && responseData.sources.length > 0) {
              const sourcesMessage: ChatMessage = {
                role: 'assistant',
                content: '**Sources:**\n' + responseData.sources.map((source: string) => `- [${source}](${source})`).join('\n'),
                id: crypto.randomUUID(),
                timestamp: new Date()
              };
              setMessages(prev => [...prev, sourcesMessage]);
            }
          }
        } else {
          // For external APIs, use the full URL
          try {
            response = await fetch(agent.api_url, {
              method: 'POST',
              headers,
              body: JSON.stringify(requestBody)
            });
          } catch (fetchError: any) {
            // Handle certificate errors by trying HTTP if HTTPS fails
            // This is common in development environments
            if (fetchError.message && 
                (fetchError.message.includes('certificate') || 
                 fetchError.message.includes('ERR_CERT_COMMON_NAME_INVALID') || 
                 fetchError.message.includes('Failed to fetch'))) {
              console.warn('Certificate error detected, trying HTTP fallback');
              
              // Try with HTTP instead of HTTPS as a fallback
              const apiUrl = agent.api_url.replace('https://', 'http://');
              response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
              });
            } else {
              // Re-throw other errors
              throw fetchError;
            }
          }
          
          if (!response.ok) {
            console.error('API response not OK:', response.status, response.statusText)
            throw new Error(`API call failed: ${response.statusText}`)
          }

          const data = await response.json();
          
          // Debug log to see what type of response we're getting
          console.log('API Response structure:', {
            hasToolName: data?.tool_name ? true : false,
            hasToolType: data?.tool_type ? true : false,
            hasVideos: data?.message?.videos ? true : false,
            responseType: typeof data,
            responseKeys: data ? Object.keys(data) : []
          });
          
          // Handle response that comes as an array
          const responseData = Array.isArray(data) ? data[0] : data;
          
          // Check if response is an empty array or if responseData is undefined/null
          if ((Array.isArray(data) && data.length === 0) || !responseData) {
            console.error('Received empty array or null response from agent API');
            // Create a specific error message for empty responses
            const emptyResponseMessage: ChatMessage = {
              role: 'assistant',
              content: "I am sorry but there was no response from the agent. Please contact support.",
              id: crypto.randomUUID(),
              timestamp: new Date()
            };
            setMessages(prev => [...prev, emptyResponseMessage]);
            
            // Store the conversation with error message in Supabase
            try {
              const { data: { user } } = await supabase.auth.getUser()
              
              if (!user) {
                console.error('User not authenticated when storing conversation history')
                return
              }
              
              // Store the message exchange in the database with the error message
              const { error: insertError } = await supabase
                .from('agent_messages')
                .insert({
                  session_id: sessionId as string,
                  UID: user.id,
                  agent_id: agent.id,
                  prompt: content,
                  message: "I am sorry but there was no response from the agent. Please contact support."
                })
                
              if (insertError) {
                console.error('Error storing conversation history:', insertError)
              }
            } catch (storageError) {
              console.error('Failed to store conversation history:', storageError)
            }
          } else if (responseData.tool_name || responseData.tool_type) {
            // Handle structured data with tool_name/tool_type for special rendering
            // If this is a blog post with images, insert images into the markdown
            if (responseData.tool_type === 'blog' && Array.isArray(responseData.images) && responseData.images.length > 0 && typeof responseData.message === 'string') {
              responseData.message = insertImagesIntoMarkdown(responseData.message, responseData.images);
            }
            // For blog posts, store only the processed message string as content
            if (responseData.tool_type === 'blog' && typeof responseData.message === 'string') {
              const newMessage: ChatMessage = {
                role: 'assistant',
                content: responseData.message,
                id: crypto.randomUUID(),
                timestamp: new Date()
              };
              setMessages(prev => [...prev, newMessage]);
            } else {
              // For other tool types, store the whole object
              const newMessage: ChatMessage = {
                role: 'assistant',
                content: responseData,
                id: crypto.randomUUID(),
                timestamp: new Date()
              };
              setMessages(prev => [...prev, newMessage]);
            }
            // Create a message with the structured data object
            const newMessage: ChatMessage = {
              role: 'assistant',
              content: responseData,
              id: crypto.randomUUID(),
              timestamp: new Date()
            };
            setMessages(prev => [...prev, newMessage]);
            
            // Store the conversation in Supabase
            try {
              const { data: { user } } = await supabase.auth.getUser()
              
              if (!user) {
                console.error('User not authenticated when storing conversation history')
                return
              }
              
              // Store the JSON data as a string in the database
              const { error: insertError } = await supabase
                .from('agent_messages')
                .insert({
                  session_id: sessionId as string,
                  UID: user.id,
                  agent_id: agent.id,
                  prompt: content,
                  message: JSON.stringify(responseData)
                })
                
              if (insertError) {
                console.error('Error storing conversation history:', insertError)
              }
            } catch (storageError) {
              console.error('Failed to store conversation history:', storageError)
            }
          } else {
            // Handle regular text response
            // Create the new message with the actual message content
            const newMessage: ChatMessage = {
              role: 'assistant',
              content: responseData.message,
              id: crypto.randomUUID(),
              timestamp: new Date()
            };
            setMessages(prev => [...prev, newMessage]);
            
            // Store the conversation in Supabase
            try {
              const { data: { user } } = await supabase.auth.getUser()
              
              if (!user) {
                console.error('User not authenticated when storing conversation history')
                return
              }
              
              // Store the message exchange in the database
              const { data: insertData, error: insertError } = await supabase
                .from('agent_messages')
                .insert({
                  session_id: sessionId as string,
                  UID: user.id,
                  agent_id: agent.id,
                  prompt: content,
                  message: responseData.message
                })
                .select()
                
              if (insertError) {
                console.error('Error storing conversation history:', insertError)
                // Show error to user
                const errorMessage: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: "There was an error saving your message. Please try again.",
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, errorMessage])
              } else {
                // Update the cache with the new message exchange
                const cacheKey = `${sessionId}_${agentId}`;
                const currentTime = Date.now();
                
                // Create assistant message for cache
                const newAssistantResponse = {
                  content: responseData.message,
                  created_at: new Date().toISOString()
                };
                
                setConversationCache(prev => {
                  const existingCache = prev[cacheKey]?.responses || [];
                  // If this is the first message in this session, use it as the initial message
                  const isFirstMessage = messages.length === 0;
                  const initialMsg = isFirstMessage ? content : (prev[cacheKey]?.initialMessage || '');
                  
                  return {
                    ...prev,
                    [cacheKey]: {
                      lastUpdated: currentTime,
                      initialMessage: initialMsg,
                      responses: [...existingCache, newAssistantResponse].slice(-2)
                    }
                  };
                });
              }
            } catch (storageError) {
              console.error('Failed to store conversation history:', storageError)
            }
            
            // If there are sources, add them as a separate message
            if (responseData.sources && Array.isArray(responseData.sources) && responseData.sources.length > 0) {
              const sourcesMessage: ChatMessage = {
                role: 'assistant',
                content: '**Sources:**\n' + responseData.sources.map((source: string) => `- [${source}](${source})`).join('\n'),
                id: crypto.randomUUID(),
                timestamp: new Date()
              };
              setMessages(prev => [...prev, sourcesMessage]);
            }
          }
        }
      } else {
        // For agents without an API URL, generate a placeholder response
        
        const responseMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `This is a placeholder response from ${agent.name}. No API endpoint is configured for this agent.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, responseMessage])
        
        // Store the conversation in Supabase
        try {
          const { data: { user } } = await supabase.auth.getUser()
          
          if (!user) {
            console.error('User not authenticated when storing conversation history')
            return
          }
          
          // Only store if the response doesn't include "Error:"
          if (!responseMessage.content.includes('Error:')) {
            const { error: insertError } = await supabase
              .from('agent_messages')
              .insert({
                session_id: sessionId as string,
                UID: user.id,
                agent_id: agent.id,
                prompt: content,
                message: responseMessage.content
              })
              
            if (insertError) {
              console.error('Error storing conversation history:', insertError)
            } else {
              // Update the cache with the new message exchange (placeholder)
              const cacheKey = `${sessionId}_${agentId}`;
              const currentTime = Date.now();
              
              // Create assistant message for cache
              const newAssistantResponse = {
                content: responseMessage.content,
                created_at: new Date().toISOString()
              };
              
              setConversationCache(prev => {
                const existingCache = prev[cacheKey]?.responses || [];
                // If this is the first message in this session, use it as the initial message
                const isFirstMessage = messages.length === 0;
                const initialMsg = isFirstMessage ? content : (prev[cacheKey]?.initialMessage || '');
                
                return {
                  ...prev,
                  [cacheKey]: {
                    lastUpdated: currentTime,
                    initialMessage: initialMsg,
                    responses: [...existingCache, newAssistantResponse].slice(-2) // Keep last 2 responses
                  }
                };
              });
            }
          }
        } catch (storageError) {
          console.error('Failed to store conversation history:', storageError)
          // Non-critical error, so we don't throw and break the user experience
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Add an error message to the chat
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `An error occurred while processing your request. Please try again later.`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  // Helper function to render agent info field with proper formatting
  const renderAgentInfoField = (label: string, value: any) => {
    let displayValue = value;
    
    // Format null values
    if (value === null) {
      displayValue = "Not specified";
    }
    
    // Format objects (like config)
    if (typeof value === 'object' && value !== null) {
      // Special handling for config object to make it more readable
      if (label === "Configuration" && value) {
        const configDisplay = [];
        
        // Format headers section if present
        if (value.headers && Object.keys(value.headers).length > 0) {
          configDisplay.push("**Headers:**");
          Object.entries(value.headers).forEach(([key, val]) => {
            // Mask API keys for security
            if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
              const maskedValue = typeof val === 'string' && val.length > 8 
                ? `${(val as string).substring(0, 4)}...${(val as string).substring((val as string).length - 4)}`
                : '********';
              configDisplay.push(`- ${key}: ${maskedValue}`);
            } else {
              configDisplay.push(`- ${key}: ${val}`);
            }
          });
        }
        
        // Add spacing between sections if needed
        if ((value.headers && Object.keys(value.headers).length > 0) && 
            ((value.body && Object.keys(value.body).length > 0) || 
             (value.options && Object.keys(value.options).length > 0))) {
          configDisplay.push("");
        }
        
        // Format body parameters section if present
        if (value.body && Object.keys(value.body).length > 0) {
          configDisplay.push("**Body Parameters:**");
          Object.entries(value.body).forEach(([key, val]) => {
            configDisplay.push(`- ${key}: ${JSON.stringify(val)}`);
          });
        }
        
        // Add spacing between sections if needed
        if ((value.body && Object.keys(value.body).length > 0) && 
            (value.options && Object.keys(value.options).length > 0)) {
          configDisplay.push("");
        }
        
        // Format options section if present
        if (value.options && Object.keys(value.options).length > 0) {
          configDisplay.push("**Model Options:**");
          Object.entries(value.options).forEach(([key, val]) => {
            configDisplay.push(`- ${key}: ${val}`);
          });
        }
        
        return (
          <div className="mb-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              <ReactMarkdown 
                rehypePlugins={[rehypeRaw]}
                components={{
                  // Enhanced newline handling 
                  p: ({node, ...props}) => {
                    const newChildren = React.Children.map(
                      props.children,
                      child => {
                        if (typeof child === 'string') {
                          return child.split('\n').map((text, i, array) => (
                            <React.Fragment key={i}>
                              {text}
                              {i < array.length - 1 && <br />}
                            </React.Fragment>
                          ));
                        }
                        return child;
                      }
                    );
                    return <p {...props}>{newChildren}</p>;
                  },
                  // Text handling for non-paragraph text
                  text: ({node, ...props}) => {
                    const value = String(props.children);
                    if (value.includes('\n')) {
                      return value.split('\n').map((text, i, array) => (
                        <React.Fragment key={i}>
                          {text}
                          {i < array.length - 1 && <br />}
                        </React.Fragment>
                      ));
                    }
                    return <>{value}</>;
                  },
                  // Ensure strong tags work for * and **
                  strong: ({node, ...props}) => <strong {...props} />,
                  // Enhanced table formatting
                  table: ({node, ...props}) => (
                    <table className="min-w-full border border-gray-300 my-4 text-sm">
                      {props.children}
                    </table>
                  ),
                  thead: ({node, ...props}) => (
                    <thead className="bg-gray-100">
                      {props.children}
                    </thead>
                  ),
                  tbody: ({node, ...props}) => (
                    <tbody>{props.children}</tbody>
                  ),
                  tr: ({node, ...props}) => (
                    <tr className="border-b border-gray-200 last:border-0">
                      {props.children}
                    </tr>
                  ),
                  th: ({node, ...props}) => (
                    <th className="px-4 py-2 font-semibold text-left bg-gray-50 border border-gray-300">
                      {props.children}
                    </th>
                  ),
                  td: ({node, ...props}) => (
                    <td className="px-4 py-2 border border-gray-300">
                      {props.children}
                    </td>
                  ),
                }}
              >
                {configDisplay.join("\n")}
              </ReactMarkdown>
            </div>
          </div>
        );
      }
      
      displayValue = JSON.stringify(value, null, 2);
    }
    
    // Format booleans
    if (typeof value === 'boolean') {
      displayValue = value ? "Yes" : "No";
    }
    
    return (
      <div className="mb-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {typeof displayValue === 'string' && displayValue.includes('{') ? (
            <pre className="mt-1 whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto">
              {displayValue}
            </pre>
          ) : (
            <span className="mt-1">{displayValue}</span>
          )}
        </div>
      </div>
    );
  }

  // Update deleteChat function with more detailed logging
  const deleteChat = async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('User not authenticated when deleting chat')
        return
      }
      
      // First, get the session_id for this message
      const { data: messageData, error: checkError } = await supabase
        .from('agent_messages')
        .select('session_id')
        .eq('id', chatId)
        .single()
      
      if (checkError) {
        console.error('Error checking message:', checkError)
        return
      }
      
      if (!messageData) {
        console.error('Message not found')
        return
      }
      
      // Delete all messages in this session
      const { data: deleteData, error: deleteError } = await supabase
        .from('agent_messages')
        .delete()
        .eq('session_id', messageData.session_id)
        .eq('UID', user.id)
        .select()
      
      if (deleteError) {
        console.error('Error deleting chat session:', deleteError)
        return
      }
      
      // Refresh chat history
      await fetchChatHistory()
      
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  }

  // Function to copy message content to clipboard
  const copyToClipboard = (content: string, messageId: string) => {
    navigator.clipboard.writeText(
      typeof content === 'string' 
        ? content 
        : JSON.stringify(content, null, 2)
    ).then(() => {
      // Show copied indicator
      setCopiedMessageId(messageId);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy message: ', err);
    });
  };

  // Function to handle renaming a chat
  const handleRenameChat = async (chatId: string) => {
    if (!newChatName.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('User not authenticated when renaming chat')
        return
      }

      console.log('Renaming chat:', { chatId, userId: user.id, newChatName });

      // Update the prompt column for this chat message using only id
      const { data, error } = await supabase
        .from('agent_messages')
        .update({ prompt: newChatName })
        .eq('id', chatId)
        .select();

      console.log('Supabase update result:', { data, error });

      if (error) {
        console.error('Error renaming chat:', error)
        return
      }

      // Update local chat history state
      setChatHistory(prev => 
        prev.map(item => 
          item.id === chatId ? { ...item, prompt: newChatName } : item
        )
      )

      // Reset rename state
      setRenamingChatId(null)
      setNewChatName('')

    } catch (error) {
      console.error('Failed to rename chat:', error)
    }
  }

  // Function to delete an assistant message and its associated user prompt
  const deleteChatMessage = async (messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated when deleting message');
        return;
      }
      // Find the index of the assistant message
      setMessages(prevMessages => {
        const idx = prevMessages.findIndex(msg => msg.id === messageId);
        if (idx === -1) return prevMessages;
        // Find the previous user message (prompt)
        const toDelete = [prevMessages[idx]];
        if (idx > 0 && prevMessages[idx - 1].role === 'user') {
          toDelete.unshift(prevMessages[idx - 1]);
        }
        // Delete both from the database
        toDelete.forEach(async (msg) => {
          await supabase
            .from('agent_messages')
            .delete()
            .eq('id', msg.id)
            .eq('UID', user.id);
        });
        // Remove both from the UI
        return prevMessages.filter(msg => !toDelete.some(del => del.id === msg.id));
      });
    } catch (error) {
      console.error('Failed to delete message and prompt:', error);
    }
  };

  // Fetch website_settings.enable_posts on mount
  useEffect(() => {
    const fetchEnablePosts = async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('enable_posts')
        .single();
      if (!error && data) {
        setEnablePosts(data.enable_posts);
      }
    };
    fetchEnablePosts();
  }, [supabase]);

  if (isLoading) {
    return <LoadingComponent />
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-800">Error</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Fixed Chat History Button on Desktop */}
      <div className="hidden md:block">
        <div className="fixed top-24 right-8 z-50">
          <ButtonComponent
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ backgroundColor: colors.dark, color: 'white' }}
            className="flex items-center gap-2 rounded-md shadow-lg px-6"
          >
            <PanelRightIconComponent className="h-4 w-4" />
            Chat History
          </ButtonComponent>
        </div>
      </div>
      {/* Absolute button for mobile */}
      <div className="block md:hidden absolute top-4 right-4 z-10">
        <ButtonComponent
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ backgroundColor: colors.dark, color: 'white' }}
          className="flex items-center gap-2 rounded-md shadow-md"
        >
          <PanelRightIconComponent className="h-4 w-4" />
          Chat History
        </ButtonComponent>
      </div>
      
      {/* Right Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full bg-white/95 backdrop-blur-sm shadow-lg transition-all duration-300 ease-in-out overflow-y-auto z-20`} 
        style={{ 
          width: isMobile ? '90%' : '25%', 
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: `1px solid ${colors.dark}20`
        }}
      >
        <div className="p-6">
          {/* X icon to close sidebar */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{ color: colors.dark }}>Chat History</h2>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: colors.dark }}
              aria-label="Close sidebar"
            >
              <XIconComponent className="h-5 w-5 text-white" />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            Showing the initial exchange for each of your previous conversations with this agent.
            Click on any conversation to view the full chat history.
          </p>
          
          {/* Chat History List */}
          <div className="mt-4">
            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <LoadingComponent size="sm" />
              </div>
            ) : chatHistory.length > 0 ? (
              <div className="space-y-4">
                {chatHistory.map((item: ChatHistoryItem, index: number) => (
                  <div 
                    key={index} 
                    className="group p-4 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1 mr-4"
                        onClick={() => loadConversation(item.session_id)}
                      >
                        <div className="text-sm font-medium mb-2 line-clamp-2" style={{ color: colors.dark }}>
                          {truncateText(item.prompt, 60)}
                        </div>
                        <div className="text-xs text-gray-600 whitespace-pre-line" style={{ maxHeight: '3.5em', overflow: 'hidden' }}>
                          {truncateText(item.message, 120)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-full hover:bg-red-50 transition-all duration-200"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <div className="text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      
                      {renamingChatId === item.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={newChatName}
                            onChange={(e) => setNewChatName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="New name..."
                            className="text-xs py-1 px-2 border rounded-md w-32"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameChat(item.id);
                            }}
                            className="text-xs bg-primary hover:bg-primary/90 text-white px-2 py-1 rounded-md"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingChatId(item.id);
                            setNewChatName(item.prompt);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-xs text-primary hover:text-primary/80 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-all duration-200"
                        >
                          Rename
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-2">No chat history found for this agent.</p>
                <p className="text-sm text-gray-400">Start a new conversation to see it here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center space-y-8">
        <div className="w-full max-w-[1200px]">
          <div className="left-8 z-50">
            {/* Remove {enableCredits && <UserCredits />} from the render */}
          </div>
          {agent ? (
            <>
              <h1 
                className="text-4xl font-bold mb-4 text-center text-transparent"
                style={{
                  background: `linear-gradient(to right, ${colors.primary}, ${colors.accent1})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text'
                }}
              >
                {agent.name}
              </h1>
              {/* Render agent description as HTML if present */}
              {agent.description ? (
                <div
                  className="text-lg text-center text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: agent.description }}
                />
              ) : null}

              {/* Historical session notification */}
              {isHistoricalSession && !isLoadingConversation && (
                <div 
                  className="mb-8 p-6 rounded-xl text-center bg-gradient-to-r from-secondary/10 to-secondary/5 border border-secondary/20 shadow-sm" 
                >
                  <p className="mb-4 text-lg" style={{ color: colors.dark }}>
                    You are viewing a historical conversation.
                  </p>
                  <ButtonComponent 
                    onClick={startNewConversation}
                    style={{ 
                      backgroundColor: colors.primary,
                      color: 'white'
                    }}
                    className="px-6 py-2 rounded-full hover:opacity-90 transition-all duration-200 hover:shadow-md"
                  >
                    Start New Conversation
                  </ButtonComponent>
                </div>
              )}

              {/* Display loading indicator when loading conversation */}
              {isLoadingConversation && (
                <div className="flex justify-center items-center py-20">
                  <LoadingComponent />
                  <p className="ml-4 text-gray-500 animate-pulse">Loading conversation history...</p>
                </div>
              )}

              {/* Display messages if there are any and not loading conversation */}
              {!isLoadingConversation && messages.length > 0 && (
                <CardComponent className="mb-8 shadow-lg bg-white">
                  <CardContentComponent className="px-8 py-10">
                    <div className="space-y-8">
                      {messages.map((message) => {
                        let renderedContent: React.ReactNode = null;
                        // DALL-E image detection logic
                        const isDalleImage = (
                          (typeof message.content === 'string' && /https:\/\/oaidalleapiprodscus\.blob\.core\.windows\.net[^\s)"']+/.test(message.content)) ||
                          (message.content && typeof message.content === 'object' && (
                            (typeof (message.content as any).message === 'string' && (message.content as any).message.startsWith('https://oaidalleapiprodscus.blob.core.windows.net')) ||
                            (typeof (message.content as any).image_url === 'string' && (message.content as any).image_url.startsWith('https://oaidalleapiprodscus.blob.core.windows.net'))
                          ))
                        );
                        // If code block string
                        if (typeof message.content === 'string' && message.content.includes('```')) {
                          renderedContent = (
                            <pre className={`whitespace-pre-wrap font-mono text-sm ${message.role === 'user' ? 'text-white bg-opacity-25' : 'bg-gray-900/5'} p-4 rounded-lg overflow-x-auto`}>
                              {message.content}
                            </pre>
                          );
                        } else if (typeof message.content === 'string') {
                          // Regex to extract DALL-E blob URL
                          const dalleUrlMatch = message.content.match(/https:\/\/oaidalleapiprodscus\.blob\.core\.windows\.net[^\s)"']+/);
                          if (dalleUrlMatch) {
                            // Optionally, check for orientation in the message object if available
                            let orientation = undefined;
                            if (typeof message === 'object' && (message as any).orientation) {
                              orientation = (message as any).orientation;
                            }
                            let width = '95%';
                            if (!isMobile) {
                              if (orientation === 'portrait') width = '50%';
                              else if (orientation === 'landscape') width = '75%';
                            }
                            renderedContent = (
                              <div className="flex justify-center w-full">
                                <img
                                  src={dalleUrlMatch[0]}
                                  alt="Generated AI Image"
                                  style={{ width, height: 'auto', display: 'block', margin: 'auto', borderRadius: '12px' }}
                                />
                              </div>
                            );
                          } else {
                            renderedContent = (
                              <ReactMarkdown
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                  // ... existing ReactMarkdown components ...
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            );
                          }
                        } else if (
                          message.content &&
                          typeof message.content === 'object' &&
                          (
                            (typeof (message.content as any).message === 'string' && (message.content as any).message.startsWith('https://oaidalleapiprodscus.blob.core.windows.net')) ||
                            (typeof (message.content as any).image_url === 'string' && (message.content as any).image_url.startsWith('https://oaidalleapiprodscus.blob.core.windows.net'))
                          )
                        ) {
                          // Prefer image_url if present, else fallback to message
                          const imageUrl = (message.content as any).image_url || (message.content as any).message;
                          const orientation = (message.content as any).orientation;
                          let width = '75%'; // Default to landscape
                          if (!isMobile && orientation === 'portrait') {
                            width = '50%';
                          } else if (isMobile) {
                            width = '95%';
                          }
                          renderedContent = (
                            <div className="flex flex-col items-center w-full">
                              <img
                                src={imageUrl}
                                alt="Generated AI Image"
                                style={{ width, height: 'auto', display: 'block', margin: 'auto', borderRadius: '12px' }}
                              />
                              {message.role === 'assistant' && userId && imageUrl && (() => {
                                let imageUrl: string | undefined = undefined;
                                let orientation: 'portrait' | 'landscape' | undefined = undefined;
                                if (message.content && typeof message.content === 'object' && ('image_url' in message.content || 'message' in message.content)) {
                                  imageUrl = (message.content as any).image_url || (message.content as any).message;
                                  const o = (message.content as any).orientation;
                                  if (o === 'portrait' || o === 'landscape') orientation = o;
                                } else if (typeof message.content === 'string') {
                                  // Type-safe check for DALL-E image URL
                                  if (/https:\/\/oaidalleapiprodscus\.blob\.core\.windows\.net[^\s)"']+/.test(message.content)) {
                                    imageUrl = (message.content as string).match(/https:\/\/oaidalleapiprodscus\.blob\.core\.windows\.net[^\s)"']+/)?.[0];
                                  }
                                }
                                if (typeof imageUrl === 'string') {
                                  return (
                                    <div className="flex gap-2">
                                      <SaveImageButton imageUrl={imageUrl} orientation={orientation} userId={userId} />
                                      <button
                                        onClick={() => deleteChatMessage(message.id)}
                                        className="text-xs text-red-500 border border-[#d8d8d8] bg-white px-5 py-2 rounded hover:bg-red-50 transition-colors"
                                        title="Delete message"
                                        aria-label="Delete message"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          );
                        } else {
                          renderedContent = (
                            <div className="w-full data-display-container">
                              <DataDisplay data={message.content} />
                            </div>
                          );
                        }
                        return (
                          <div 
                            key={message.id}
                            className={`flex w-full flex-col sm:flex-row ${message.role === 'user' ? 'sm:justify-end items-end' : 'sm:justify-start items-start'} mb-6`}
                          >
                            <div 
                              className={`relative rounded-xl pt-10 pr-4 pb-10 pl-7 sm:p-4 w-full sm:w-auto
                              ${message.role === 'user' 
                                  ? 'text-white sm:max-w-[45%]' 
                                  : 'bg-gray-50 border border-[#d8d8d8] sm:max-w-[85%]'
                              }`}
                              style={{
                                backgroundColor: message.role === 'user' ? colors.dark : undefined,
                                minWidth: message.role === 'user' ? '30%' : undefined
                              }}
                            >
                              <div className={`prose prose-sm max-w-none ${message.role === 'user' ? 'text-white prose-headings:text-white prose-a:text-white prose-strong:text-white' : ''}`}>
                                {renderedContent}
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <div className="text-xs opacity-70">
                                  {message.timestamp.toLocaleTimeString()}
                                </div>
                                {/* User message copy button */}
                                {message.role === 'user' && (
                                  <button
                                    onClick={() => copyToClipboard(message.content, message.id)}
                                    className="text-xs border border-[#d8d8d8] bg-white px-5 py-2 rounded hover:bg-gray-50 transition-colors"
                                    title="Copy message"
                                    aria-label="Copy message"
                                    style={{ color: '#33363B' }}
                                  >
                                    {copiedMessageId === message.id ? (
                                      <span className="flex items-center gap-1 text-green-600"><CheckCircleComponent className="w-4 h-4" /> Copied</span>
                                    ) : (
                                      'Copy'
                                    )}
                                  </button>
                                )}
                                {/* Assistant controls: DALL-E image = Save Image + Delete, else normal controls */}
                                {message.role === 'assistant' && isDalleImage && userId && (() => {
                                  let imageUrl: string | undefined = undefined;
                                  let orientation: 'portrait' | 'landscape' | undefined = undefined;
                                  if (message.content && typeof message.content === 'object' && ('image_url' in message.content || 'message' in message.content)) {
                                    imageUrl = (message.content as any).image_url || (message.content as any).message;
                                    const o = (message.content as any).orientation;
                                    if (o === 'portrait' || o === 'landscape') orientation = o;
                                  } else if (typeof message.content === 'string') {
                                    // Type-safe check for DALL-E image URL
                                    if (/https:\/\/oaidalleapiprodscus\.blob\.core\.windows\.net[^\s)"']+/.test(message.content)) {
                                      imageUrl = (message.content as string).match(/https:\/\/oaidalleapiprodscus\.blob\.core\.windows\.net[^\s)"']+/)?.[0];
                                    }
                                  }
                                  if (typeof imageUrl === 'string') {
                                    return (
                                      <div className="flex gap-2">
                                        <SaveImageButton imageUrl={imageUrl} orientation={orientation} userId={userId} />
                                        <button
                                          onClick={() => deleteChatMessage(message.id)}
                                          className="text-xs text-red-500 border border-[#d8d8d8] bg-white px-5 py-2 rounded hover:bg-red-50 transition-colors"
                                          title="Delete message"
                                          aria-label="Delete message"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                {message.role === 'assistant' && !isDalleImage && (enablePosts !== false) && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setShowCreatePostModal(message.id);
                                        setNewPostTitle("");
                                        setNewPostCategory("");
                                      }}
                                      className="text-xs border border-green-600 bg-green-500 text-white px-5 py-2 rounded hover:bg-green-600 transition-colors"
                                      title="Create Post"
                                      aria-label="Create Post"
                                    >
                                      Create Post
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(message.content, message.id)}
                                      className="text-xs border border-[#d8d8d8] bg-white px-5 py-2 rounded hover:bg-gray-50 transition-colors"
                                      title="Copy message"
                                      aria-label="Copy message"
                                    >
                                      Copy
                                    </button>
                                    <button
                                      onClick={() => deleteChatMessage(message.id)}
                                      className="text-xs text-red-500 border border-[#d8d8d8] bg-white px-5 py-2 rounded hover:bg-red-50 transition-colors"
                                      title="Delete message"
                                      aria-label="Delete message"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContentComponent>
                </CardComponent>
              )}

              {/* Chat interface */}
              <CardComponent>
                <CardContentComponent className="px-6 py-8">
                  {isLoggedIn ? (
                    <ChatInterface 
                      onSendMessage={handleSendMessage}
                      isLoading={isSending}
                      disabled={isLoadingConversation}
                      placeholder={
                        isHistoricalSession 
                          ? "Continue this conversation or start a new one..."
                          : (agent.config?.options?.placeholder || agent.config?.placeholder || `Ask ${agent.name} anything...`)
                      }
                      formFields={formFields}
                      userId={userId}
                      agentId={agentId || ''}
                      formData={formData}
                      setFormData={setFormData}
                      secondaryButton={
                        agentId && sessionId && conversationCache[`${sessionId}_${agentId}`]?.initialMessage ? (
                          <ButtonComponent
                            onClick={startNewConversation}
                            style={{ 
                              backgroundColor: colors.accent1,
                              color: 'white'
                            }}
                            className="flex items-center gap-2"
                            type="button"
                          >
                            Start New Chat
                          </ButtonComponent>
                        ) : null
                      }
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Please create a free account to use this agent.</p>
                      <LinkComponent href="/auth?tab=register">
                        <ButtonComponent
                          style={{ 
                            backgroundColor: colors.primary,
                            color: 'white'
                          }}
                          className="flex items-center gap-2 mx-auto"
                        >
                          Create Free Account
                        </ButtonComponent>
                      </LinkComponent>
                    </div>
                  )}
                </CardContentComponent>
              </CardComponent>
              
              {/* Agent Info Button and Modal */}
              {isAdmin && (
                <div className="fixed bottom-6 right-6">
                  <ModalComponent>
                    <ModalTriggerComponent asChild>
                      <ButtonComponent 
                        variant="outline" 
                        className="flex items-center gap-2 rounded-full shadow-md"
                      >
                        <InfoIconComponent className="h-4 w-4" />
                        Agent Info
                      </ButtonComponent>
                    </ModalTriggerComponent>
                    <ModalContentComponent className="max-w-[1000px] max-h-[calc(80vh+100px)] overflow-hidden">
                      <ModalHeaderComponent className="border-b pb-2">
                        <ModalTitleComponent className="text-xl">{agent.name}</ModalTitleComponent>
                      </ModalHeaderComponent>
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh+40px)]">
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                          <div className="grid grid-cols-1 gap-3">
                            {renderAgentInfoField("ID", agent.id)}
                            {renderAgentInfoField("Name", agent.name)}
                            {renderAgentInfoField("Description", agent.description)}
                            {renderAgentInfoField("Public", agent.is_public)}
                          </div>
                        </div>
                        
                        <div className="border-t pt-4">
                          <h3 className="text-lg font-semibold mb-3">API Details</h3>
                          <div className="grid grid-cols-1 gap-3">
                            {renderAgentInfoField("API URL", agent.api_url)}
                            {renderAgentInfoField("Agent Role", agent.agent_role)}
                          </div>
                        </div>
                        
                        <div className="border-t pt-4">
                          <h3 className="text-lg font-semibold mb-3">Prompt & Configuration</h3>
                          <div className="grid grid-cols-1 gap-3">
                            {renderAgentInfoField("Prompt", agent.prompt)}
                            {renderAgentInfoField("Configuration", agent.config)}
                          </div>
                        </div>
                      </div>
                    </ModalContentComponent>
                  </ModalComponent>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              <p>No agent data found. Please check the agent ID and try again.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
