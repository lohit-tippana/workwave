import { useEffect, useRef, useState, FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { Conversation, Message } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Avatar, EmptyState, Spinner } from '../../components/ui';
import { Send } from 'lucide-react';

export default function Messages() {
  const { user } = useAuth();
  const location = useLocation();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>((location.state as any)?.conversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvos = async () => {
    try { setConvos((await api.get('/messages/conversations')).data.data.results); }
    catch { /* ignore */ }
    finally { setLoadingConvos(false); }
  };

  const loadMessages = async (cid: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try { setMessages((await api.get(`/messages/conversations/${cid}/messages?limit=50`)).data.data.results); }
    catch { /* ignore */ }
    finally { setLoadingMsgs(false); }
  };

  useEffect(() => { loadConvos(); const t = setInterval(loadConvos, 15000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (active) { loadMessages(active); const t = setInterval(() => { loadMessages(active, true); loadConvos(); }, 8000); return () => clearInterval(t); }
  }, [active]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    setSending(true);
    try {
      const r = await api.post(`/messages/conversations/${active}/messages`, { text });
      setMessages((m) => [...m, r.data.data.message]);
      setText('');
      loadConvos();
    } finally { setSending(false); }
  };

  const activeConvo = convos.find((c) => c._id === active);
  const other = activeConvo?.participants.find((p) => p._id !== user?._id);

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold">Messages</h1>
      <div className="card flex h-[70vh] gap-0 overflow-hidden p-0">
        {/* Conversation list */}
        <div className={`w-full overflow-y-auto border-r border-slate-200 md:block md:w-72 ${active ? 'hidden' : ''}`}>
          {loadingConvos ? <Spinner /> : convos.length === 0 ? (
            <div className="p-6"><EmptyState title="No conversations yet" hint="Conversations open when a proposal is shortlisted or a project starts." /></div>
          ) : convos.map((c) => {
            const o = c.participants.find((p) => p._id !== user?._id);
            return (
              <button key={c._id} onClick={() => setActive(c._id)}
                className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${active === c._id ? 'bg-brand-50' : ''}`}>
                <Avatar user={o} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o?.name}</p>
                  <p className="truncate text-xs text-slate-500">{c.lastMessage?.text || 'No messages yet'}</p>
                </div>
                {(c.unread ?? 0) > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{c.unread}</span>}
              </button>
            );
          })}
        </div>

        {/* Thread */}
        <div className={`flex min-w-0 flex-1 flex-col ${active ? '' : 'hidden md:flex'}`}>
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Select a conversation</div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                <button className="text-xs text-brand-600 md:hidden" onClick={() => setActive(null)}>← Back</button>
                <Avatar user={other} size="sm" />
                <p className="text-sm font-medium">{other?.name}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingMsgs ? <Spinner /> : messages.map((m) => {
                  const mine = (typeof m.senderId === 'object' ? m.senderId._id : m.senderId) === user?._id;
                  return (
                    <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        <p className={`mt-1 text-[10px] ${mine ? 'text-brand-100' : 'text-slate-400'}`}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3">
                <input className="input flex-1" placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Message text" />
                <button className="btn-primary" disabled={sending || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
