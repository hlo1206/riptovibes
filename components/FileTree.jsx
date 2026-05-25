'use client';

import { ChevronRight, FileCode2, Folder } from './icons';

function nodeKey(node, prefix) {
  return `${prefix}/${node.name}`.replace(/^\//, '');
}

export default function FileTree({ files = [], activePath, onOpen, prefix = '', level = 0 }) {
  return (
    <div className={level === 0 ? 'file-tree' : ''}>
      {files.map((node) => {
        const currentPath = node.path || nodeKey(node, prefix);
        const isDir = node.type === 'directory' || node.children;
        return (
          <div key={currentPath || node.name}>
            <div
              className={`file-row ${isDir ? 'folder' : ''} ${activePath === currentPath ? 'active' : ''}`}
              style={{ paddingLeft: 8 + level * 13 }}
              onClick={() => !isDir && onOpen(currentPath)}
              title={currentPath}
            >
              {isDir ? <ChevronRight size={14} /> : <span style={{ width: 14 }} />}
              {isDir ? <Folder size={16} /> : <FileCode2 size={16} />}
              <span className="name">{node.name}</span>
            </div>
            {isDir && node.children?.length ? (
              <FileTree files={node.children} activePath={activePath} onOpen={onOpen} prefix={currentPath} level={level + 1} />
            ) : null}
          </div>
        );
      })}
      {!files.length ? <div className="empty-state" style={{ minHeight: 180 }}>No files yet</div> : null}
    </div>
  );
}
