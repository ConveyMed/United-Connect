import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const ManageAI = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [productName, setProductName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_docs')
      .select('id, product_name, page_count, created_at, updated_at')
      .order('product_name');

    if (error) {
      setError('Failed to load products');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.md')) {
        setError('Please select a .md (markdown) file');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleAddProduct = () => {
    setShowForm(true);
    setProductName('');
    setSourceUrl('');
    setSelectedFile(null);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setProductName('');
    setSourceUrl('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper function for iOS compatibility
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleSubmit = async () => {
    if (!productName.trim()) {
      setError('Product name is required');
      return;
    }
    if (!selectedFile) {
      setError('Please select a markdown file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Read file content (using FileReader for iOS compatibility)
      const content = await readFileAsText(selectedFile);

      // Estimate page count (roughly 500 words per page)
      const wordCount = content.split(/\s+/).length;
      const pageCount = Math.ceil(wordCount / 500);

      // Upsert to database
      const { error: dbError } = await supabase
        .from('product_docs')
        .upsert({
          product_name: productName.trim(),
          content: content,
          source_url: sourceUrl.trim() || null,
          page_count: pageCount,
        }, {
          onConflict: 'product_name'
        });

      if (dbError) throw dbError;

      setSuccess(`Successfully added "${productName.trim()}"`);
      setShowForm(false);
      setProductName('');
      setSourceUrl('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchProducts();
      setShowRefreshPrompt(true);
    } catch (err) {
      setError(err.message || 'Failed to add product');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.product_name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('product_docs')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      setSuccess(`Deleted "${product.product_name}"`);
      fetchProducts();
    } catch (err) {
      setError(err.message || 'Failed to delete product');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleRefreshNow = () => {
    setShowRefreshPrompt(false);
    window.location.reload();
  };

  const handleRefreshLater = () => {
    setShowRefreshPrompt(false);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <h1 style={styles.headerTitle}>Gemini AI</h1>
        <div style={{ width: 40 }} />
      </header>

      {/* Content */}
      <div style={styles.content}>
        {/* Info Card */}
        <div style={styles.infoCard}>
          <p style={styles.infoText}>
            Manage product documentation for the AI assistant. Upload markdown (.md) files to add new products or update existing ones.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div style={styles.errorMessage}>
            {error}
            <button style={styles.dismissButton} onClick={() => setError(null)}>x</button>
          </div>
        )}
        {success && (
          <div style={styles.successMessage}>
            {success}
            <button style={styles.dismissButton} onClick={() => setSuccess(null)}>x</button>
          </div>
        )}

        {/* Add Product Button or Form */}
        {!showForm ? (
          <button style={styles.addButton} onClick={handleAddProduct}>
            <span style={styles.plusIcon}>+</span>
            <span>Add Product</span>
          </button>
        ) : (
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>Add New Product</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Product Name *</label>
              <input
                type="text"
                style={styles.input}
                placeholder="e.g., Griplasty System"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Source URL (optional)</label>
              <input
                type="url"
                style={styles.input}
                placeholder="https://example.com/document.pdf"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Documentation File *</label>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".md"
                onChange={handleFileChange}
              />
              <button
                style={styles.fileButton}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon />
                <span>{selectedFile ? selectedFile.name : 'Choose .md file'}</span>
              </button>
            </div>

            <div style={styles.formActions}>
              <button style={styles.cancelButton} onClick={handleCancel}>
                Cancel
              </button>
              <button
                style={styles.submitButton}
                onClick={handleSubmit}
                disabled={uploading}
              >
                {uploading ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        )}

        {/* Products List */}
        <div style={styles.sectionLabel}>Products ({products.length})</div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={styles.emptyState}>
            <FileIcon />
            <p style={styles.emptyText}>No products yet</p>
            <p style={styles.emptySubtext}>Upload a markdown file to get started</p>
          </div>
        ) : (
          <div style={styles.productsList}>
            {products.map((product) => (
              <div key={product.id} style={styles.productCard}>
                <div style={styles.productInfo}>
                  <h3 style={styles.productName}>{product.product_name}</h3>
                  <p style={styles.productMeta}>
                    {product.page_count || 1} pages | Updated {formatDate(product.updated_at || product.created_at)}
                  </p>
                </div>
                <button
                  style={styles.deleteButton}
                  onClick={() => handleDelete(product)}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom padding */}
        <div style={{ height: '100px' }} />
      </div>

      {/* Refresh Prompt Modal */}
      {showRefreshPrompt && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </div>
            <h3 style={styles.modalTitle}>Refresh Required</h3>
            <p style={styles.modalText}>Refresh screen so bot can pick up new data.</p>
            <div style={styles.modalButtons}>
              <button style={styles.modalButtonPrimary} onClick={handleRefreshNow}>
                Now
              </button>
              <button style={styles.modalButtonSecondary} onClick={handleRefreshLater}>
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--background-off-white)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  backButton: {
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
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
  },
  content: {
    padding: '16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid #bfdbfe',
  },
  infoText: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--primary-blue)',
    lineHeight: '1.5',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#dc2626',
    fontSize: '14px',
  },
  successMessage: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#16a34a',
    fontSize: '14px',
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: 'inherit',
    padding: '0 4px',
  },
  addButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '16px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '24px',
  },
  plusIcon: {
    fontSize: '20px',
    fontWeight: '400',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  formTitle: {
    margin: '0 0 20px 0',
    fontSize: '17px',
    fontWeight: '600',
    color: 'var(--text-dark)',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  fileButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-muted)',
    border: '2px dashed #cbd5e1',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-muted)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  sectionLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: 'var(--primary-blue)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '12px',
  },
  loadingText: {
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    color: 'var(--text-light)',
  },
  emptyText: {
    margin: '12px 0 4px',
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--text-muted)',
  },
  emptySubtext: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-light)',
  },
  productsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  productCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    margin: '0 0 4px 0',
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-dark)',
  },
  productMeta: {
    margin: 0,
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    cursor: 'pointer',
    marginLeft: '12px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '320px',
    width: '100%',
    textAlign: 'center',
  },
  modalIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 8px 0',
  },
  modalText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '0 0 20px 0',
    lineHeight: '1.5',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
  },
  modalButtonPrimary: {
    flex: 1,
    padding: '14px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalButtonSecondary: {
    flex: 1,
    padding: '14px',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-muted)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default ManageAI;
