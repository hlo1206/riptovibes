'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import FileTree from '@/components/FileTree';
import EditorPane from '@/components/EditorPane';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import {
  Activity, Bot, CheckCircle2, CircleStop, Code2, Download, ExternalLink, Eye, File, Github,
  Image, KeyRound, Loader2, LogOut, Moon, Play, Plus, RefreshCw, Save, Search, Send, Settings,
  Sparkles, Sun, Terminal, Trash2, Upload, Wand2, X
} from '@/components/icons';
import { apiBlob, apiFetch, clearSession, downloadBlob, filenameFromPath, getSession, previewUrl, saveSession, testConnection } from '@/lib/api';

const DEFAULT_API = process.env.NEXT_PUBLIC_API_BASE || 'http://fr.glitchnode.cloud:25574';

function prettyDate(value) {
  if (!value) return 'Recently';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function normalizeTemplate(value) {
  if (value === 'discord') return 'discord';
  if (value === 'html') return 'html';
  return 'blank';
}

function Login({ onLogin }) {
  const [apiBase, setApiBase] = useState(DEFAULT_API);
  const [password, setPassword] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = getSession();
    setApiBase(session.apiBase || DEFAULT_API);
    setPassword(session.password || '');
  }, []);

  async function submit(e) {
    e.preventDefault();
    setTesting(true); setError('');
    try {
      await testConnection(apiBase, password);
      saveSession({ apiBase, password });
      onLogin();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setTesting(false); }
  }

  return (
    <div className="app-shell login-wrap" data-theme="dark">
      <motion.form className="login-card" onSubmit={submit} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="brand">
          <div className="logo">RV</div>
          <div>
            <h1 className="brand-title">Ripto Vibes</h1>
            <p className="brand-sub">Your private AI coding workspace</p>
          </div>
        </div>
        <div className="field">
          <label className="label">Backend URL</label>
          <input className="input" value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder="http://fr.glitchnode.cloud:25574" />
        </div>
        <div className="field">
          <label className="label">App password</label>
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Your APP_PASSWORD" />
        </div>
        {error ? <div className="msg" style={{ color: 'var(--danger)', marginTop: 14 }}>{error}</div> : null}
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }} disabled={testing}>
          {testing ? <Loader2 size={17} className="spin" /> : <KeyRound size={17} />} Enter Studio
        </button>
        <p className="muted" style={{ fontSize: '.82rem', lineHeight: 1.5 }}>This stores only your backend URL and app password in your browser localStorage.</p>
      </motion.form>
    </div>
  );
}

function ProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('My Vibe Project');
  const [type, setType] = useState('html');
  return (
    <Modal title="Create project" onClose={onClose} actions={(
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onCreate({ name, type: normalizeTemplate(type) })}><Plus size={16} /> Create</button>
      </>
    )}>
      <div className="field"><label className="label">Project name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label className="label">Template</label><select className="select" value={type} onChange={(e) => setType(e.target.value)}><option value="html">HTML/CSS/JS website</option><option value="discord">Discord.js bot</option><option value="blank">Blank project</option></select></div>
    </Modal>
  );
}

function GitHubModal({ mode, onClose, onClone, onPush }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [message, setMessage] = useState('Update from Ripto Vibes');
  return (
    <Modal title={mode === 'clone' ? 'Clone GitHub repository' : 'Push to GitHub'} onClose={onClose} actions={(
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => mode === 'clone' ? onClone(repoUrl) : onPush({ repoUrl, branch, message })}><Github size={16} /> {mode === 'clone' ? 'Clone' : 'Push'}</button>
      </>
    )}>
      <div className="field"><label className="label">Repository URL</label><input className="input" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/user/repo.git" /></div>
      {mode === 'push' ? <><div className="field"><label className="label">Branch</label><input className="input" value={branch} onChange={(e) => setBranch(e.target.value)} /></div><div className="field"><label className="label">Commit message</label><input className="input" value={message} onChange={(e) => setMessage(e.target.value)} /></div></> : null}
    </Modal>
  );
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [activePath, setActivePath] = useState('');
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Tell me what to build. I can create files, edit selected file, fix errors, read screenshots, clone GitHub repos, and push code.' }]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [search, setSearch] = useState('');
  const uploadRef = useRef(null);
  const aiUploadRef = useRef(null);

  const session = useMemo(() => getSession(), [ready]);
  const dirty = content !== savedContent;

  const showToast = useCallback((message, title = 'Ripto Vibes') => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 4200);
  }, []);

  const loadProjects = useCallback(async () => {
    const data = await apiFetch('/api/projects');
    setProjects(data.projects || []);
    if (!activeProject && data.projects?.length) setActiveProject(data.projects[0]);
  }, [activeProject]);

  const refreshFiles = useCallback(async (id = activeProject?.id) => {
    if (!id) return;
    const data = await apiFetch(`/api/projects/${id}/files`);
    setFiles(data.files || []);
  }, [activeProject]);

  const refreshLogs = useCallback(async (id = activeProject?.id) => {
    if (!id) return;
    const data = await apiFetch(`/api/projects/${id}/logs?limit=300`);
    setLogs(data.logs || []);
  }, [activeProject]);

  const refreshActions = useCallback(async (id = activeProject?.id) => {
    if (!id) return;
    const data = await apiFetch(`/api/projects/${id}/ai/actions`);
    setActions(data.actions || []);
  }, [activeProject]);

  useEffect(() => {
    const s = getSession();
    const t = localStorage.getItem('rv_theme') || 'dark';
    setTheme(t);
    if (s.password) setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('rv_theme', theme);
  }, [theme]);

  useEffect(() => { if (ready) loadProjects().catch((e) => showToast(e.message, 'Connection error')); }, [ready]);
  useEffect(() => {
    if (!activeProject) return;
    refreshFiles(activeProject.id).catch((e) => showToast(e.message, 'Files error'));
    refreshLogs(activeProject.id).catch(() => {});
    refreshActions(activeProject.id).catch(() => {});
    setTabs([]); setActivePath(''); setContent(''); setSavedContent('');
    const socket = io(session.apiBase, { transports: ['websocket', 'polling'] });
    socket.emit('joinProject', activeProject.id);
    socket.on('log', (log) => setLogs((prev) => [...prev.slice(-299), log]));
    return () => { socket.emit('leaveProject', activeProject.id); socket.disconnect(); };
  }, [activeProject?.id]);

  async function createProject(payload) {
    setBusy(true);
    try {
      const data = await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(payload) });
      setProjects((p) => [data.project, ...p]);
      setActiveProject(data.project); setModal(null); showToast('Project created');
    } catch (e) { showToast(e.message, 'Create failed'); } finally { setBusy(false); }
  }

  async function deleteProject(project) {
    if (!confirm(`Delete ${project.name}?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      setProjects((p) => p.filter((x) => x.id !== project.id));
      if (activeProject?.id === project.id) setActiveProject(null);
      showToast('Project deleted');
    } catch (e) { showToast(e.message, 'Delete failed'); } finally { setBusy(false); }
  }

  async function openFile(path) {
    if (!activeProject) return;
    setBusy(true);
    try {
      const data = await apiFetch(`/api/projects/${activeProject.id}/file?path=${encodeURIComponent(path)}`);
      setActivePath(data.path); setContent(data.content); setSavedContent(data.content);
      setTabs((old) => old.includes(data.path) ? old : [...old, data.path]);
    } catch (e) { showToast(e.message, 'Open failed'); } finally { setBusy(false); }
  }

  async function saveFile() {
    if (!activeProject || !activePath) return;
    setBusy(true);
    try {
      await apiFetch(`/api/projects/${activeProject.id}/file`, { method: 'PUT', body: JSON.stringify({ path: activePath, content }) });
      setSavedContent(content); await refreshFiles(); await refreshActions(); showToast('File saved');
    } catch (e) { showToast(e.message, 'Save failed'); } finally { setBusy(false); }
  }

  async function deleteFile() {
    if (!activeProject || !activePath || !confirm(`Delete ${activePath}?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/projects/${activeProject.id}/file?path=${encodeURIComponent(activePath)}`, { method: 'DELETE' });
      setTabs((t) => t.filter((x) => x !== activePath)); setActivePath(''); setContent(''); setSavedContent('');
      await refreshFiles(); await refreshActions(); showToast('File deleted');
    } catch (e) { showToast(e.message, 'Delete failed'); } finally { setBusy(false); }
  }

  async function runProject(command) {
    if (!activeProject) return;
    setBusy(true);
    try {
      await apiFetch(`/api/projects/${activeProject.id}/run`, { method: 'POST', body: JSON.stringify({ command, autoFix: true }) });
      await refreshLogs(); setPreviewOpen(true); showToast('Runner started. Auto-fix is on.');
    } catch (e) { showToast(e.message, 'Run failed'); } finally { setBusy(false); }
  }

  async function stopProject() {
    if (!activeProject) return;
    setBusy(true);
    try { await apiFetch(`/api/projects/${activeProject.id}/stop`, { method: 'POST' }); await refreshLogs(); showToast('Project stopped'); }
    catch (e) { showToast(e.message, 'Stop failed'); } finally { setBusy(false); }
  }

  async function sendAi({ withScreenshot = false, mode = 'project' } = {}) {
    if (!activeProject || !prompt.trim()) return;
    const userText = prompt.trim();
    setPrompt(''); setMessages((m) => [...m, { role: 'user', text: userText }]); setBusy(true);
    try {
      let data;
      if (withScreenshot) {
        data = await apiFetch(`/api/projects/${activeProject.id}/ai/screenshot`, { method: 'POST', body: JSON.stringify({ prompt: userText }) });
      } else if (mode === 'file' && activePath) {
        data = await apiFetch(`/api/projects/${activeProject.id}/ai/file`, { method: 'POST', body: JSON.stringify({ path: activePath, prompt: userText }) });
      } else {
        const form = new FormData(); form.append('prompt', userText);
        data = await apiFetch(`/api/projects/${activeProject.id}/ai`, { method: 'POST', body: form });
      }
      setMessages((m) => [...m, { role: 'ai', text: data.summary || 'AI action completed.' }]);
      await refreshFiles(); await refreshActions(); await refreshLogs();
      if (activePath) await openFile(activePath).catch(() => {});
      showToast('AI completed changes');
    } catch (e) { setMessages((m) => [...m, { role: 'ai', text: `Error: ${e.message}` }]); showToast(e.message, 'AI failed'); } finally { setBusy(false); }
  }

  async function uploadFiles(filesToUpload, ai = false) {
    if (!activeProject || !filesToUpload?.length) return;
    setBusy(true);
    try {
      const form = new FormData();
      [...filesToUpload].forEach((f) => form.append(ai ? 'attachments' : 'files', f));
      if (ai) {
        form.append('prompt', prompt || 'Use these attached files/images as context and update the project where needed.');
        const data = await apiFetch(`/api/projects/${activeProject.id}/ai`, { method: 'POST', body: form });
        setMessages((m) => [...m, { role: 'ai', text: data.summary || 'AI used attachments.' }]);
      } else {
        await apiFetch(`/api/projects/${activeProject.id}/upload`, { method: 'POST', body: form });
      }
      await refreshFiles(); await refreshActions(); showToast(ai ? 'Attachment sent to AI' : 'Files uploaded');
    } catch (e) { showToast(e.message, 'Upload failed'); } finally { setBusy(false); }
  }

  async function downloadProject() {
    if (!activeProject) return;
    try { downloadBlob(await apiBlob(`/api/projects/${activeProject.id}/download`), `${activeProject.name || 'project'}.zip`); }
    catch (e) { showToast(e.message, 'Download failed'); }
  }

  async function downloadCurrentFile() {
    if (!activeProject || !activePath) return;
    try { downloadBlob(await apiBlob(`/api/projects/${activeProject.id}/download-file?path=${encodeURIComponent(activePath)}`), filenameFromPath(activePath)); }
    catch (e) { showToast(e.message, 'File download failed'); }
  }

  async function screenshot() {
    if (!activeProject) return;
    setBusy(true);
    try {
      const blob = await apiBlob(`/api/projects/${activeProject.id}/screenshot`);
      const url = URL.createObjectURL(blob);
      if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
      setScreenshotUrl(url); showToast('Screenshot captured');
    } catch (e) { showToast(e.message, 'Screenshot failed'); } finally { setBusy(false); }
  }

  async function cloneRepo(repoUrl) {
    if (!activeProject) return;
    setBusy(true);
    try { await apiFetch(`/api/projects/${activeProject.id}/github/clone`, { method: 'POST', body: JSON.stringify({ repoUrl }) }); await refreshFiles(); setModal(null); showToast('Repository cloned'); }
    catch (e) { showToast(e.message, 'Clone failed'); } finally { setBusy(false); }
  }

  async function pushRepo(body) {
    if (!activeProject) return;
    setBusy(true);
    try { await apiFetch(`/api/projects/${activeProject.id}/github/push`, { method: 'POST', body: JSON.stringify(body) }); setModal(null); showToast('Pushed to GitHub'); }
    catch (e) { showToast(e.message, 'Push failed'); } finally { setBusy(false); }
  }

  const filteredProjects = projects.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()));
  const logsText = logs.map((l) => `[${l.level || 'info'}] ${l.message || l}`).join('\n');

  if (!ready) return <Login onLogin={() => setReady(true)} />;

  return (
    <div className="app-shell" data-theme={theme}>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand"><div className="logo">RV</div><div><h1 className="brand-title">Ripto Vibes</h1><p className="brand-sub hide-mobile">Minimal AI coding studio</p></div></div>
          <span className="pill"><span className="status-dot" /> {session.apiBase.replace(/^https?:\/\//, '')}</span>
        </div>
        <div className="topbar-right">
          {busy ? <span className="pill"><Loader2 size={14} className="spin" /> Working</span> : <span className="pill"><CheckCircle2 size={14} /> Ready</span>}
          <button className="btn btn-small" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button className="btn btn-small" onClick={() => { clearSession(); location.reload(); }}><LogOut size={16} /></button>
        </div>
      </div>

      <div className="main">
        <aside className="sidebar">
          <div className="section-title"><h2>Projects</h2><button className="btn btn-small btn-primary" onClick={() => setModal('project')}><Plus size={15} /></button></div>
          <div className="field" style={{ marginTop: 0 }}><div className="row"><Search size={15} className="muted" /><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects" /></div></div>
          <button className="btn" style={{ width: '100%', margin: '10px 0' }} onClick={() => loadProjects()}><RefreshCw size={15} /> Refresh</button>
          {filteredProjects.map((project) => (
            <div key={project.id} className={`project-card ${activeProject?.id === project.id ? 'active' : ''}`} onClick={() => setActiveProject(project)}>
              <div className="row" style={{ justifyContent: 'space-between' }}><div className="project-name">{project.name}</div><button className="btn btn-small btn-ghost btn-danger" onClick={(e) => { e.stopPropagation(); deleteProject(project); }}><Trash2 size={14} /></button></div>
              <div className="project-meta"><Code2 size={13} /> {project.type || 'project'} · {project.status || 'idle'}</div>
              <div className="project-meta">{prettyDate(project.updated_at)}</div>
            </div>
          ))}
        </aside>

        <main className="content">
          {!activeProject ? (
            <div className="empty-state"><div><Sparkles size={38} /><h2>No project selected</h2><p>Create a project to start building with AI.</p><button className="btn btn-primary" onClick={() => setModal('project')}><Plus size={16} /> New project</button></div></div>
          ) : (
            <div className="workspace">
              <div className="workspace-head">
                <div className="workspace-title"><h1>{activeProject.name}</h1><p>{activeProject.id} · {activeProject.type || 'project'} · Auto-fix enabled</p></div>
                <div className="workspace-actions">
                  <button className="btn btn-small" onClick={() => runProject()}><Play size={15} /> Run</button>
                  <button className="btn btn-small" onClick={stopProject}><CircleStop size={15} /> Stop</button>
                  <button className="btn btn-small" onClick={() => setPreviewOpen(true)}><Eye size={15} /> Preview</button>
                  <button className="btn btn-small" onClick={screenshot}><Image size={15} /> Screenshot</button>
                  <button className="btn btn-small" onClick={downloadProject}><Download size={15} /> ZIP</button>
                  <button className="btn btn-small" onClick={() => setModal('clone')}><Github size={15} /> Clone</button>
                  <button className="btn btn-small btn-primary" onClick={() => setModal('push')}><Github size={15} /> Push</button>
                </div>
              </div>

              <div className="workspace-grid">
                <section className="panel">
                  <div className="panel-head"><span className="panel-title">Files</span><div className="row"><button className="btn btn-small" onClick={() => uploadRef.current?.click()}><Upload size={14} /></button><button className="btn btn-small" onClick={() => refreshFiles()}><RefreshCw size={14} /></button></div></div>
                  <div className="panel-body"><FileTree files={files} activePath={activePath} onOpen={openFile} /></div>
                  <input ref={uploadRef} type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
                </section>

                <section className="panel">
                  <div className="editor-shell">
                    <EditorPane theme={theme} tabs={tabs} activePath={activePath} content={content} dirty={dirty} onSelectTab={openFile} onCloseTab={(tab) => { setTabs((t) => t.filter((x) => x !== tab)); if (activePath === tab) { setActivePath(''); setContent(''); setSavedContent(''); } }} onChange={setContent} />
                    <div className="logs">
                      <div className="logs-head"><span><Terminal size={14} /> Logs</span><div className="row"><button className="btn btn-small" onClick={refreshLogs}><RefreshCw size={13} /></button><button className="btn btn-small" onClick={() => { setPrompt(`Fix these errors:\n\n${logsText.slice(-4000)}`); }}><Wand2 size={13} /> Ask AI</button></div></div>
                      <pre className="logs-pre">{logsText || 'No logs yet. Run the project to see output here.'}</pre>
                    </div>
                  </div>
                  <div className="panel-head" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="row"><button className="btn btn-small btn-primary" disabled={!activePath || !dirty} onClick={saveFile}><Save size={14} /> Save</button><button className="btn btn-small" disabled={!activePath} onClick={downloadCurrentFile}><Download size={14} /> File</button><button className="btn btn-small btn-danger" disabled={!activePath} onClick={deleteFile}><Trash2 size={14} /></button></div>
                    <span className="muted" style={{ fontSize: '.78rem' }}>{activePath || 'No file open'}</span>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-head"><span className="panel-title">AI Agent</span><div className="row"><button className="btn btn-small" onClick={() => aiUploadRef.current?.click()}><Upload size={14} /></button><button className="btn btn-small" onClick={refreshActions}><Activity size={14} /></button></div></div>
                  <div className="ai-box">
                    <div className="ai-actions"><button className="btn btn-small" onClick={() => setPrompt('Create a clean modern homepage with dark and light mode.')}>Website</button><button className="btn btn-small" onClick={() => setPrompt('Create a production-ready Discord.js bot with commands and clean embeds.')}>Discord bot</button><button className="btn btn-small" onClick={() => setPrompt('Fix all visible errors from logs and explain what changed.')}>Fix logs</button></div>
                    <div className="ai-feed">
                      {messages.map((m, i) => <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'ai'}`}><div className="msg-title">{m.role === 'user' ? 'You' : 'Ripto AI'}</div>{m.text}</div>)}
                      {screenshotUrl ? <div className="msg ai"><div className="msg-title">Screenshot</div><img className="screenshot" src={screenshotUrl} alt="Project screenshot" /></div> : null}
                      <div className="msg ai"><div className="msg-title">Latest AI Actions</div>{actions.slice(0, 8).map((a) => <div key={a.id} className="muted" style={{ marginBottom: 6 }}>• {a.action_type} {a.file_path ? `→ ${a.file_path}` : ''}</div>)}{!actions.length ? 'No actions yet.' : null}</div>
                    </div>
                    <div className="ai-compose">
                      <div className="file-pick"><span>{activePath ? `Selected: ${activePath}` : 'No selected file'}</span><button className="btn btn-small" onClick={() => setPrompt(`Edit only ${activePath}: `)} disabled={!activePath}><File size={13} /> Specific file</button></div>
                      <textarea className="textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask AI to create, edit, fix, refactor, or inspect the screenshot..." />
                      <div className="row" style={{ justifyContent: 'space-between' }}><div className="row"><button className="btn btn-primary" disabled={busy || !prompt.trim()} onClick={() => sendAi()}><Send size={15} /> Send</button><button className="btn" disabled={busy || !prompt.trim() || !activePath} onClick={() => sendAi({ mode: 'file' })}><File size={15} /> File edit</button></div><button className="btn" disabled={busy || !prompt.trim()} onClick={() => sendAi({ withScreenshot: true })}><Image size={15} /> With screenshot</button></div>
                      <input ref={aiUploadRef} type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files, true)} />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>{previewOpen && activeProject ? <motion.div className="preview-wrap" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .98 }}><div className="preview-head"><div className="row"><Eye size={16} /><strong>Preview</strong><span className="muted">{previewUrl(activeProject.id)}</span></div><div className="row"><a className="btn btn-small" href={previewUrl(activeProject.id)} target="_blank"><ExternalLink size={14} /> Open</a><button className="btn btn-small" onClick={() => setPreviewOpen(false)}><X size={14} /></button></div></div><iframe className="preview-frame" src={previewUrl(activeProject.id)} /></motion.div> : null}</AnimatePresence>
      {modal === 'project' ? <ProjectModal onClose={() => setModal(null)} onCreate={createProject} /> : null}
      {modal === 'clone' ? <GitHubModal mode="clone" onClose={() => setModal(null)} onClone={cloneRepo} /> : null}
      {modal === 'push' ? <GitHubModal mode="push" onClose={() => setModal(null)} onPush={pushRepo} /> : null}
      <Toast toast={toast} onClose={() => setToast(null)} />
      <style jsx global>{`.spin { animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
