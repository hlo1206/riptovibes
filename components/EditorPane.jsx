'use client';

import dynamic from 'next/dynamic';
import { X } from './icons';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

function languageFor(path = '') {
  const ext = path.split('.').pop()?.toLowerCase();
  return {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    json: 'json', html: 'html', css: 'css', md: 'markdown', env: 'shell', yml: 'yaml', yaml: 'yaml'
  }[ext] || 'plaintext';
}

export default function EditorPane({ theme, tabs, activePath, content, dirty, onSelectTab, onCloseTab, onChange }) {
  if (!activePath) return <div className="empty-state">Open a file from the explorer or ask AI to create one.</div>;
  return (
    <>
      <div className="tabs">
        {tabs.map((tab) => (
          <button key={tab} className={`tab ${activePath === tab ? 'active' : ''}`} onClick={() => onSelectTab(tab)}>
            <span>{tab}{dirty && activePath === tab ? ' •' : ''}</span>
            <X size={13} onClick={(e) => { e.stopPropagation(); onCloseTab(tab); }} />
          </button>
        ))}
      </div>
      <MonacoEditor
        height="100%"
        path={activePath}
        language={languageFor(activePath)}
        value={content}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        onChange={(value) => onChange(value ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontLigatures: true,
          wordWrap: 'on',
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          automaticLayout: true
        }}
      />
    </>
  );
}
