import { useState } from 'react';
import ContentLibraryScreen from '../components/ContentLibraryScreen';

const TABS = [
  { id: 'library', label: 'Sales Tools' },
  { id: 'training', label: 'Training' },
  { id: 'forms', label: 'Forms' },
];

const Resources = () => {
  const [activeTab, setActiveTab] = useState('library');

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.headerTitle}>Sales Tools</h1>
        </div>
        {/* Tab Bar */}
        <div style={styles.tabBar}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={styles.headerBorder} />
      </header>

      {/* Content */}
      <div style={styles.content}>
        <ContentLibraryScreen
          key={activeTab}
          type={activeTab}
          title={TABS.find(t => t.id === activeTab)?.label || 'Resources'}
          hideHeader
        />
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100%',
    backgroundColor: 'var(--background-off-white)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    width: '100%',
    backgroundColor: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  headerTitle: {
    color: 'var(--primary-blue)',
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    padding: '0 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
    width: '100%',
  },
  tab: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    fontWeight: '600',
  },
  headerBorder: {
    maxWidth: '600px',
    margin: '0 auto',
    height: '2px',
    backgroundColor: 'rgba(var(--primary-blue-rgb), 0.15)',
    borderRadius: '1px',
  },
  content: {
    flex: 1,
    overflow: 'auto',
  },
};

export default Resources;
