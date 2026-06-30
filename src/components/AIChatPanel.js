import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAIChat } from '../context/AIChatContext';
import { openInAppBrowser } from '../utils/browser';

// Icons
const ChevronDownIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const AIBotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
    <circle cx="8" cy="14" r="1" />
    <circle cx="16" cy="14" r="1" />
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const XCloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CopyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Set this to the company/app name - will display as "{APP_NAME} Product Expert"
const APP_NAME = 'United Orthopedic';

const AIChatPanel = () => {
  const {
    isOpen,
    closeChat,
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
  } = useAIChat();

  const [question, setQuestion] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const contentRef = useRef(null);

  // Copy full conversation to clipboard
  const copyToClipboard = async () => {
    if (messages.length === 0) return;

    // Build formatted text directly
    let text = `================================\nPRODUCT: ${selectedProduct}\n================================\n\n`;

    let questionNum = 1;
    messages.forEach((msg) => {
      if (msg.role === 'user') {
        text += `QUESTION ${questionNum}:\n${msg.content}\n\n`;
      } else {
        text += `ANSWER:\n${msg.content}\n\n`;
        if (msg.sectionTitle || msg.pageNumber) {
          const ref = [
            msg.sectionTitle ? `"${msg.sectionTitle}"` : '',
            msg.pageNumber ? `(${msg.pageNumber})` : ''
          ].filter(Boolean).join(' ');
          text += `Reference: ${ref}\n`;
        }
        if (msg.sourceUrl) {
          text += `Source: ${msg.sourceUrl}\n`;
        }
        text += `\n--------------------------------\n\n`;
        questionNum++;
      }
    });

    text += `Disclaimer: Educational only - not medical advice.\nConsult a qualified clinician for patient-specific decisions.`;

    try {
      // Try Capacitor Clipboard first
      if (window.Capacitor?.Plugins?.Clipboard) {
        await window.Capacitor.Plugins.Clipboard.write({ string: text });
      } else {
        // Fallback to web API
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      const scrollHeight = textareaRef.current.scrollHeight;
      if (scrollHeight > 40) {
        textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
      }
    }
  }, [question]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = () => {
    if (!question.trim() || !selectedProduct || isLoading) return;
    askQuestion(question);
    setQuestion('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleNewQuestion = () => {
    resetChat();
    setQuestion('');
  };

  const handleNewChat = () => {
    resetChat();
    setQuestion('');
  };

  if (!isOpen) return null;

  // Show consent prompt on first use
  if (!aiConsentAcknowledged) {
    return (
      <>
        <div style={styles.backdrop} onClick={closeChat} />
        <div style={styles.panel}>
          <div style={styles.dragHandleArea} onClick={closeChat}>
            <div style={styles.dragHandle} />
          </div>
          <div style={consentStyles.container}>
            <div style={consentStyles.iconWrap}>
              <AIBotIcon />
            </div>
            <h2 style={consentStyles.title}>AI Product Assistant</h2>
            <p style={consentStyles.text}>
              This feature uses Google Gemini to answer your product questions. Only your question
              and product documentation are processed. No personal information is shared or stored
              by the AI service. Your prompts are not used to train AI models.
            </p>
            <p style={consentStyles.link}>
              For full details, see our <a href="/privacy" style={consentStyles.linkText}>Privacy Policy</a>.
            </p>
            <button style={consentStyles.button} onClick={acknowledgeAiConsent}>
              Got It
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={closeChat} />

      {/* Panel */}
      <div style={styles.panel}>
        {/* Drag Handle */}
        <div style={styles.dragHandleArea} onClick={closeChat}>
          <div style={styles.dragHandle} />
        </div>

        {/* Header with Toggle */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerAvatar}>
              <AIBotIcon />
            </div>
            <div style={styles.headerInfo}>
              <span style={styles.headerTitle}>{APP_NAME} Product Expert</span>
            </div>
          </div>

          <button style={styles.closeButton} onClick={closeChat}>
            <ChevronDownIcon />
          </button>
        </div>

        {/* Content Area */}
          <>
            {/* History Side Panel */}
            {isHistoryOpen && (
              <>
                <div style={styles.historyBackdrop} onClick={toggleHistory} />
                <div style={styles.historyPanel}>
                  <div style={styles.historyHeader}>
                    <h3 style={styles.historyTitle}>Recent Questions</h3>
                    <button style={styles.historyClose} onClick={toggleHistory}>
                      <XCloseIcon />
                    </button>
                  </div>
                  <div style={styles.historyList}>
                    {history.length === 0 ? (
                      <p style={styles.historyEmpty}>No conversations yet</p>
                    ) : (
                      history.map((item) => (
                        <button
                          key={item.id}
                          style={styles.historyItem}
                          onClick={() => loadFromHistory(item)}
                        >
                          <span style={styles.historyProduct}>{item.product_name}</span>
                          <span style={styles.historyQuestion}>{item.title || item.question}</span>
                          <span style={styles.historyDate}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Toolbar with hamburger */}
            <div style={styles.toolbar}>
              <button style={styles.menuButton} onClick={toggleHistory}>
                <MenuIcon />
              </button>
              <span style={styles.toolbarTitle}>
                {selectedProduct ? selectedProduct : 'Ask a Question'}
              </span>
              {messages.length > 0 && (
                <button
                  style={{
                    ...styles.copyButton,
                    ...(copied ? styles.copyButtonSuccess : {})
                  }}
                  onClick={copyToClipboard}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
              )}
              <button style={styles.newChatButton} onClick={handleNewChat}>
                <PlusIcon />
              </button>
            </div>

            <div style={styles.content} ref={contentRef}>
              {/* AI Disclaimer */}
              <div style={styles.aiDisclaimerBanner}>
                <p style={styles.aiDisclaimerText}>
                  <strong>AI Disclaimer:</strong> This AI Agent may occasionally produce inaccurate information. Verify any critical business or medical information before relying on it. Prompts and data are not used to train public AI models.
                </p>
              </div>

              {/* Bot greeting - always shown first */}
              <div style={styles.assistantMessage}>
                <div style={styles.assistantContent}>
                  <p style={styles.assistantMessageText}>Select a product below to start asking questions.</p>
                </div>
              </div>

              {/* User's product selection */}
              {selectedProduct && (
                <div style={styles.userMessage}>
                  <p style={styles.userMessageText}>{selectedProduct}</p>
                </div>
              )}

              {/* Bot response to product selection */}
              {selectedProduct && (
                <div style={styles.assistantMessage}>
                  <div style={styles.assistantContent}>
                    <p style={styles.assistantMessageText}>What would you like to know about {selectedProduct}?</p>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {messages.map((msg, index) => (
                <div
                  key={index}
                  style={msg.role === 'user' ? styles.userMessage : styles.assistantMessage}
                >
                  {msg.role === 'user' ? (
                    <p style={styles.userMessageText}>{msg.content}</p>
                  ) : (
                    <div style={styles.assistantContent}>
                      <div className="markdownContent" style={styles.markdownContent}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {(msg.sectionTitle || msg.pageNumber) && (
                        <p style={styles.messageReference}>
                          {msg.sectionTitle && `"${msg.sectionTitle}"`}
                          {msg.sectionTitle && msg.pageNumber && ' '}
                          {msg.pageNumber && `(${msg.pageNumber})`}
                        </p>
                      )}
                      {msg.sourceUrl && (
                        <button
                          onClick={() => openInAppBrowser(msg.sourceUrl)}
                          style={styles.messageSourceLink}
                        >
                          View Source <ExternalLinkIcon />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading State */}
              {isLoading && (
                <div style={styles.assistantMessage}>
                  <div style={styles.loadingDots}>
                    <span style={styles.dot} />
                    <span style={styles.dot} />
                    <span style={styles.dot} />
                  </div>
                  <p style={styles.loadingText}>{loadingMessage}</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div style={styles.errorContainer}>
                  <p style={styles.errorText}>{error}</p>
                  <button style={styles.retryButton} onClick={handleNewQuestion}>
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Area - Products as suggestions OR Input */}
            {!isLoading && (
              <div style={styles.bottomArea}>
                {/* Product Suggestions - show when no product selected */}
                {!selectedProduct && products.length > 0 && (
                  <div style={styles.suggestionsContainer}>
                    <p style={styles.suggestionsLabel}>Select a product:</p>
                    <div style={styles.suggestionsGrid}>
                      {products.map((product) => (
                        <button
                          key={product}
                          style={styles.suggestionChip}
                          onClick={() => selectProduct(product)}
                        >
                          {product}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area - always visible when product selected */}
                <div style={styles.inputContainer}>
                  <div style={{
                    ...styles.inputWrapper,
                    opacity: selectedProduct ? 1 : 0.5,
                  }}>
                    <textarea
                      ref={textareaRef}
                      style={styles.textInput}
                      placeholder={selectedProduct ? (messages.length > 0 ? "Ask a follow-up question..." : "Type your question...") : "Select a product first..."}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      disabled={!selectedProduct}
                    />
                    <button
                      style={{
                        ...styles.sendButton,
                        opacity: question.trim() && selectedProduct ? 1 : 0.3,
                      }}
                      onClick={handleSubmit}
                      disabled={!question.trim() || !selectedProduct}
                    >
                      <SendIcon />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideRight {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .markdownContent p { margin: 0 0 12px 0; }
        .markdownContent p:last-child { margin-bottom: 0; }
        .markdownContent strong { font-weight: 600; color: #0f172a; }
        .markdownContent ul, .markdownContent ol { margin: 8px 0; padding-left: 20px; }
        .markdownContent li { margin: 4px 0; }
        .markdownContent h1, .markdownContent h2, .markdownContent h3 {
          font-weight: 600;
          margin: 16px 0 8px 0;
          color: #0f172a;
        }
        .markdownContent h1 { font-size: 18px; }
        .markdownContent h2 { font-size: 16px; }
        .markdownContent h3 { font-size: 15px; }
      `}</style>
    </>
  );
};

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9998,
    animation: 'fadeIn 0.2s ease-out',
  },
  panel: {
    position: 'fixed',
    top: 'calc(60px + env(safe-area-inset-top, 0px))',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--background-off-white)',
    borderTopLeftRadius: '20px',
    borderTopRightRadius: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.3s ease-out',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  dragHandleArea: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 0 8px',
    cursor: 'pointer',
  },
  dragHandle: {
    width: '40px',
    height: '4px',
    backgroundColor: '#cbd5e1',
    borderRadius: '2px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px 16px',
    borderBottom: '1px solid #e2e8f0',
    gap: '12px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: '17px',
    fontWeight: '600',
    color: 'var(--text-dark)',
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  menuButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: 'var(--background-off-white)',
    borderBottom: '1px solid #e2e8f0',
    gap: '8px',
  },
  toolbarTitle: {
    flex: 1,
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-dark)',
  },
  copyButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  copyButtonSuccess: {
    color: '#16a34a',
  },
  dialogBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '85%',
    maxWidth: '320px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    zIndex: 21,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
  },
  dialogTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    textAlign: 'center',
  },
  dialogText: {
    margin: '0 0 20px 0',
    fontSize: '15px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    lineHeight: '1.5',
  },
  dialogButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  dialogButtonPrimary: {
    padding: '14px 20px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dialogButtonSecondary: {
    padding: '14px 20px',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-dark)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  dialogButtonCancel: {
    padding: '14px 20px',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  historyBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
  historyPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '280px',
    backgroundColor: '#ffffff',
    zIndex: 11,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
    animation: 'slideRight 0.2s ease-out',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  historyTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
  },
  historyClose: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  historyList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  historyEmpty: {
    textAlign: 'center',
    color: 'var(--text-light)',
    fontSize: '14px',
    padding: '40px 20px',
  },
  historyItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: 'var(--background-off-white)',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  historyProduct: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--primary-blue)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  historyQuestion: {
    fontSize: '14px',
    color: 'var(--text-dark)',
    lineHeight: '1.4',
    marginBottom: '6px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  historyDate: {
    fontSize: '11px',
    color: 'var(--text-light)',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
  },
  section: {
    marginBottom: '20px',
  },
  promptText: {
    fontSize: '16px',
    color: 'var(--text-dark)',
    marginBottom: '16px',
    fontWeight: '500',
  },
  productGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  productButton: {
    padding: '12px 18px',
    backgroundColor: '#ffffff',
    border: '1px solid var(--primary-blue)',
    borderRadius: '12px',
    color: 'var(--primary-blue)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  selectedProductBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  lockedMessageArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px 20px',
    textAlign: 'center',
  },
  lockedIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
    marginBottom: '16px',
  },
  lockedText: {
    fontSize: '16px',
    color: 'var(--text-light)',
    fontWeight: '500',
  },
  bottomArea: {
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
  },
  suggestionsContainer: {
    padding: '12px 16px 16px',
  },
  suggestionsLabel: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginBottom: '10px',
    fontWeight: '500',
  },
  suggestionsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  suggestionChip: {
    padding: '10px 16px',
    backgroundColor: 'var(--primary-blue)',
    border: 'none',
    borderRadius: '20px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  userMessage: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    padding: '12px 16px',
    borderRadius: '18px 18px 4px 18px',
    marginBottom: '12px',
  },
  userMessageText: {
    margin: 0,
    fontSize: '15px',
    lineHeight: '1.5',
  },
  aiDisclaimerBanner: {
    backgroundColor: '#fef9e7',
    border: '1px solid #f0e4b8',
    borderRadius: '8px',
    padding: '10px 14px',
    margin: '0 0 12px 0',
  },
  aiDisclaimerText: {
    margin: 0,
    fontSize: '12px',
    color: '#6b5c00',
    lineHeight: '1.5',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    backgroundColor: '#ffffff',
    padding: '12px 16px',
    borderRadius: '18px 18px 18px 4px',
    marginBottom: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  assistantContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  assistantMessageText: {
    margin: 0,
    fontSize: '15px',
    lineHeight: '1.6',
    color: 'var(--text-dark)',
  },
  markdownContent: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: 'var(--text-dark)',
  },
  messageReference: {
    margin: 0,
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  messageSourceLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--primary-blue)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
  loadingDots: {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px',
  },
  dot: {
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--primary-blue)',
    borderRadius: '50%',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  newChatButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: 'var(--primary-blue)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    fontSize: '15px',
    color: 'var(--primary-blue)',
    fontWeight: '500',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  errorContainer: {
    padding: '20px',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '12px',
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  responseContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  responseSection: {
    marginBottom: '20px',
  },
  responseLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  responseValue: {
    fontSize: '15px',
    color: 'var(--text-dark)',
    lineHeight: '1.5',
  },
  responseAnswer: {
    fontSize: '15px',
    color: 'var(--text-dark)',
    lineHeight: '1.6',
    backgroundColor: 'var(--background-off-white)',
    padding: '12px 16px',
    borderRadius: '8px',
    borderLeft: '3px solid var(--primary-blue)',
  },
  sourceLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--primary-blue)',
    fontSize: '15px',
    textDecoration: 'none',
  },
  disclaimerSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  disclaimerText: {
    fontSize: '12px',
    color: 'var(--text-light)',
    lineHeight: '1.5',
    fontStyle: 'italic',
  },
  newQuestionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    marginTop: '20px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  inputContainer: {
    padding: '12px 16px',
    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'var(--bg-light)',
    borderRadius: '24px',
    padding: '4px 4px 4px 16px',
  },
  textInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '15px',
    lineHeight: '20px',
    resize: 'none',
    fontFamily: 'inherit',
    color: 'var(--text-dark)',
    height: '40px',
    maxHeight: '120px',
    padding: '10px 0',
    margin: 0,
    boxSizing: 'border-box',
  },
  sendButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    cursor: 'pointer',
    flexShrink: 0,
  },
};

const consentStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    textAlign: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    backgroundColor: '#f0f4f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    color: 'var(--primary-blue)',
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 16px 0',
  },
  text: {
    fontSize: 14,
    lineHeight: '1.6',
    color: '#555',
    margin: '0 0 12px 0',
    maxWidth: 360,
  },
  link: {
    fontSize: 13,
    color: '#777',
    margin: '0 0 28px 0',
  },
  linkText: {
    color: 'var(--primary-blue)',
    textDecoration: 'underline',
  },
  button: {
    padding: '14px 48px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'var(--primary-blue)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default AIChatPanel;
