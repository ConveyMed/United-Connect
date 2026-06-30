import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';
import { logAIQuery } from '../services/analytics';

const AIChatContext = createContext();

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIChat must be used within an AIChatProvider');
  }
  return context;
};

// Loading status messages for Gemini mode
const LOADING_STAGES = [
  { message: 'Finding product manual...', duration: 800 },
  { message: 'Reading documentation...', duration: 1200 },
  { message: 'Generating answer...', duration: 2000 },
];

export const AIChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode] = useState('gemini');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [messages, setMessages] = useState([]); // Conversation messages
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [aiConsentAcknowledged, setAiConsentAcknowledged] = useState(false);

  // Check if user has already acknowledged AI consent
  useEffect(() => {
    if (!user) return;
    const checkConsent = async () => {
      const { data } = await supabase
        .from('users')
        .select('ai_consent_acknowledged')
        .eq('id', user.id)
        .single();
      if (data?.ai_consent_acknowledged) {
        setAiConsentAcknowledged(true);
      }
    };
    checkConsent();
  }, [user]);

  // Acknowledge AI consent and save to Supabase
  const acknowledgeAiConsent = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('users')
      .update({ ai_consent_acknowledged: true })
      .eq('id', user.id);
    setAiConsentAcknowledged(true);
  }, [user]);

  // Fetch products from Supabase (wait for auth)
  useEffect(() => {
    if (!user) return;

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('product_docs')
        .select('product_name, source_url')
        .order('product_name');

      if (error) {
        console.error('Failed to fetch products:', error);
      }
      if (data && !error) {
        setProducts(data.map(p => p.product_name));
      }
    };

    fetchProducts();
  }, [user]);

  // Fetch chat history
  const fetchHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('ai_chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && !error) {
      setHistory(data);
    }
  }, []);

  // Fetch history when panel opens
  useEffect(() => {
    if (isOpen && mode === 'gemini') {
      fetchHistory();
    }
  }, [isOpen, mode, fetchHistory]);

  // Save conversation to history
  const saveConversation = useCallback(async (conversationMessages, product, conversationId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || conversationMessages.length === 0) return;

    // First question becomes the title
    const firstQuestion = conversationMessages.find(m => m.role === 'user')?.content || 'Untitled';

    const conversationData = {
      user_id: user.id,
      product_name: product,
      title: firstQuestion.substring(0, 100), // Truncate for title
      messages: JSON.stringify(conversationMessages),
    };

    if (conversationId) {
      // Update existing conversation
      await supabase.from('ai_chat_history')
        .update({ messages: JSON.stringify(conversationMessages) })
        .eq('id', conversationId);
    } else {
      // Create new conversation
      const { data } = await supabase.from('ai_chat_history')
        .insert(conversationData)
        .select('id')
        .single();
      if (data) {
        setCurrentConversationId(data.id);
      }
    }

    // Refresh history
    fetchHistory();
  }, [fetchHistory]);

  const toggleHistory = useCallback(() => {
    setIsHistoryOpen(prev => !prev);
  }, []);

  const loadFromHistory = useCallback((historyItem) => {
    setSelectedProduct(historyItem.product_name);
    // Parse messages from stored JSON
    const savedMessages = historyItem.messages ? JSON.parse(historyItem.messages) : [];
    setMessages(savedMessages);
    setCurrentConversationId(historyItem.id);
    setIsHistoryOpen(false);
  }, []);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen(prev => !prev), []);

  const selectProduct = useCallback((product) => {
    setSelectedProduct(product);
    setMessages([]);
    setCurrentConversationId(null);
    setError(null);
  }, []);

  // Animate through loading stages
  const animateLoading = useCallback(async () => {
    for (const stage of LOADING_STAGES) {
      setLoadingMessage(stage.message);
      await new Promise(resolve => setTimeout(resolve, stage.duration));
    }
  }, []);

  const askQuestion = useCallback(async (question) => {
    if (!selectedProduct || !question.trim()) return;

    // Add user message to conversation
    const userMessage = { role: 'user', content: question.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    setIsLoading(true);
    setError(null);

    // Start loading animation (non-blocking)
    const loadingPromise = animateLoading();

    try {
      // Send conversation history to edge function
      const { data, error: invokeError } = await supabase.functions.invoke('ai-chat', {
        body: {
          product: selectedProduct,
          question: question.trim(),
          conversationHistory: messages, // Previous messages for context
        },
      });

      // Wait for loading animation to complete for smooth UX
      await loadingPromise;

      if (invokeError) throw invokeError;

      if (data.success) {
        // Add assistant response to conversation
        const assistantMessage = {
          role: 'assistant',
          content: data.answer,
          sectionTitle: data.sectionTitle,
          pageNumber: data.pageNumber,
          sourceUrl: data.sourceUrl,
          confidence: data.confidence,
        };
        const newMessages = [...updatedMessages, assistantMessage];
        setMessages(newMessages);

        // Save conversation to history
        saveConversation(newMessages, selectedProduct, currentConversationId);

        // Log analytics with the AI's confidence so we can surface unanswered questions later
        const trackQuery = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            logAIQuery(
              user.id,
              question.trim(),
              selectedProduct,
              data.confidence || null,
              Boolean(data.sectionTitle || data.pageNumber)
            );
          }
        };
        trackQuery();
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (err) {
      console.error('AI Chat error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      // Remove the failed user message
      setMessages(messages);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [selectedProduct, messages, animateLoading, saveConversation, currentConversationId]);

  const resetChat = useCallback(() => {
    setSelectedProduct(null);
    setMessages([]);
    setCurrentConversationId(null);
    setError(null);
    setLoadingMessage('');
  }, []);

  // Start new conversation (keeps product selected)
  const newConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    setError(null);
  }, []);

  // Get last assistant message (for copy function)
  const lastResponse = messages.length > 0
    ? messages.filter(m => m.role === 'assistant').pop()
    : null;

  const value = {
    isOpen,
    openChat,
    closeChat,
    toggleChat,
    mode,
    products,
    selectedProduct,
    selectProduct,
    isLoading,
    loadingMessage,
    messages,
    lastResponse,
    error,
    askQuestion,
    resetChat,
    newConversation,
    history,
    isHistoryOpen,
    toggleHistory,
    loadFromHistory,
    aiConsentAcknowledged,
    acknowledgeAiConsent,
  };

  return (
    <AIChatContext.Provider value={value}>
      {children}
    </AIChatContext.Provider>
  );
};
