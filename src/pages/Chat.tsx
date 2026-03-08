import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import {
  Hash, Lock, Search, Plus, Send, Smile, Paperclip, Mic, Play, Pause, X,
  Reply, Edit3, Trash2, Download, File, Image as ImageIcon, Video,
  Volume2, Users, Check, CheckCheck, MessageSquare,
  Phone, FileText, UserPlus, LogOut, Edit,
} from 'lucide-react';
import { useStore, QUICK_REACTIONS, PRESENCE_COLORS, type ChatMessage, type ChatAttachment, type ChatChannel } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMessageTime(ts: string) {
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

function formatDateDivider(ts: string) {
  const d = new Date(ts);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, MMMM d, yyyy');
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shouldGroupMessage(prev: ChatMessage | undefined, curr: ChatMessage): boolean {
  if (!prev) return false;
  if (prev.senderId !== curr.senderId) return false;
  if (prev.deleted || curr.deleted) return false;
  const diff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
  return diff < 5 * 60 * 1000;
}

// ─── Voice Recorder Component ────────────────────────────────────────────────

function VoiceRecorder({ onSend, onCancel }: { onSend: (attachment: ChatAttachment) => void; onCancel: () => void }) {
  const [recording, setRecording] = useState(true);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (recording) {
      intervalRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [recording]);

  const stopAndSend = () => {
    setRecording(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onSend({
      id: uuidv4(),
      url: '#voice-message',
      type: 'audio',
      name: `voice_message_${Date.now()}.m4a`,
      size: duration * 16000,
      duration,
    });
  };

  const mm = Math.floor(duration / 60).toString().padStart(2, '0');
  const ss = (duration % 60).toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl">
      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
      <span className="text-red-400 font-mono text-sm font-medium">{mm}:{ss}</span>
      <div className="flex-1 flex items-center gap-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-1 rounded-full bg-red-400/60" style={{ height: `${Math.random() * 16 + 4}px` }} />
        ))}
      </div>
      <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
        <Trash2 size={16} />
      </button>
      <button onClick={stopAndSend} className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors">
        <Send size={16} />
      </button>
    </div>
  );
}

// ─── Audio Player Component ──────────────────────────────────────────────────

function AudioPlayer({ attachment }: { attachment: ChatAttachment }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            setPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return p + (100 / (attachment.duration || 30));
        });
      }, 1000);
    }
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const dur = attachment.duration || 0;
  const mm = Math.floor(dur / 60).toString().padStart(2, '0');
  const ss = (dur % 60).toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-slate-700/50 rounded-xl min-w-[200px]">
      <button onClick={togglePlay} className="p-1.5 rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-colors shrink-0">
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="w-full h-1.5 bg-slate-600 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <span className="text-xs text-slate-400 font-mono">{mm}:{ss}</span>
    </div>
  );
}

// ─── File Attachment Preview ─────────────────────────────────────────────────

function FilePreview({ attachment }: { attachment: ChatAttachment }) {
  const iconMap = {
    image: ImageIcon,
    video: Video,
    audio: Volume2,
    document: FileText,
  };
  const Icon = iconMap[attachment.type] || File;
  const colorMap = {
    image: 'text-purple-400 bg-purple-500/15',
    video: 'text-pink-400 bg-pink-500/15',
    audio: 'text-cyan-400 bg-cyan-500/15',
    document: 'text-blue-400 bg-blue-500/15',
  };
  const color = colorMap[attachment.type] || 'text-slate-400 bg-slate-500/15';

  if (attachment.type === 'audio') {
    return <AudioPlayer attachment={attachment} />;
  }

  if (attachment.type === 'image') {
    return (
      <div className="group relative rounded-xl overflow-hidden border border-slate-700 max-w-[280px]">
        <div className="w-full h-40 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
          <ImageIcon size={32} className="text-slate-500" />
          <span className="absolute bottom-2 left-2 text-xs text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded">{attachment.name}</span>
        </div>
        <button className="absolute top-2 right-2 p-1 rounded-md bg-slate-900/80 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
          <Download size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-700/40 rounded-xl border border-slate-700 max-w-[300px] group">
      <div className={`p-2 rounded-lg ${color} shrink-0`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">{attachment.name}</p>
        <p className="text-xs text-slate-500">{formatFileSize(attachment.size)}</p>
      </div>
      <button className="p-1 rounded-md text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
        <Download size={14} />
      </button>
    </div>
  );
}

// ─── Mention Autocomplete ────────────────────────────────────────────────────

function MentionAutocomplete({
  query,
  members,
  onSelect,
  position,
}: {
  query: string;
  members: { id: string; name: string; avatar: string; presenceStatus: string }[];
  onSelect: (member: { id: string; name: string }) => void;
  position: { bottom: number; left: number };
}) {
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute z-50 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 overflow-hidden"
      style={{ bottom: position.bottom, left: position.left }}
    >
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Members</div>
      {filtered.map(m => (
        <button
          key={m.id}
          onClick={() => onSelect({ id: m.id, name: m.name })}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/70 transition-colors text-left"
        >
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
              {m.avatar}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-800"
              style={{ backgroundColor: PRESENCE_COLORS[m.presenceStatus as keyof typeof PRESENCE_COLORS] || '#64748b' }}
            />
          </div>
          <span className="text-sm text-slate-200">{m.name}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Emoji Picker ────────────────────────────────────────────────────────────

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const allEmojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌',
    '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑',
    '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
    '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '👍', '👎', '👌', '✌️', '🤞', '🤝', '👏', '🙌', '💪', '🎉', '🎊', '🏆',
    '🔥', '💯', '⭐', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔',
    '🏠', '🏢', '🏗️', '📈', '📉', '💰', '💵', '🤝', '📋', '📝', '✅', '❌',
  ];

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-14 left-0 z-50 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <Smile size={16} className="text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">Quick Reactions</span>
      </div>
      <div className="flex gap-1 mb-3 pb-3 border-b border-slate-700">
        {QUICK_REACTIONS.map(emoji => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="text-xl p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
        {allEmojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="text-lg p-1 hover:bg-slate-700 rounded-md transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Reaction Bar on Message ─────────────────────────────────────────────────

function ReactionBar({
  reactions,
  channelId,
  messageId,
  currentUserId,
}: {
  reactions: { emoji: string; users: string[] }[];
  channelId: string;
  messageId: string;
  currentUserId: string;
}) {
  const { addReaction, removeReaction } = useStore();

  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map(r => {
        const isMine = r.users.includes(currentUserId);
        return (
          <button
            key={r.emoji}
            onClick={() => {
              if (isMine) removeReaction(channelId, messageId, r.emoji, currentUserId);
              else addReaction(channelId, messageId, r.emoji, currentUserId);
            }}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs transition-colors ${
              isMine
                ? 'bg-brand-500/20 border border-brand-500/40 text-brand-300'
                : 'bg-slate-700/50 border border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <span className="text-sm">{r.emoji}</span>
            <span>{r.users.length}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isGrouped,
  replyMessage,
  channelId,
  currentUserId,
  onReply,
  team,
}: {
  message: ChatMessage;
  isGrouped: boolean;
  replyMessage?: ChatMessage;
  channelId: string;
  currentUserId: string;
  onReply: (msgId: string) => void;
  team: { id: string; name: string }[];
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const { editMessage, deleteMessage, addReaction } = useStore();
  const isMine = message.senderId === currentUserId;

  const renderContent = (text: string) => {
    if (message.deleted) return <span className="text-slate-500 italic">{text}</span>;
    let parts: (string | React.ReactElement)[] = [text];
    for (const member of team) {
      const newParts: (string | React.ReactElement)[] = [];
      for (const part of parts) {
        if (typeof part !== 'string') { newParts.push(part); continue; }
        const mention = `@${member.name.split(' ')[0]}`;
        const idx = part.indexOf(mention);
        if (idx === -1) { newParts.push(part); continue; }
        if (idx > 0) newParts.push(part.slice(0, idx));
        newParts.push(
          <span key={`${member.id}-${idx}`} className="px-1 py-0.5 rounded bg-brand-500/20 text-brand-300 font-medium text-sm">
            {mention}
          </span>
        );
        newParts.push(part.slice(idx + mention.length));
      }
      parts = newParts;
    }
    return parts;
  };

  if (message.type === 'system') {
    return (
      <div className="flex items-center justify-center gap-2 my-3">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-xs text-slate-500 px-3">{message.content}</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>
    );
  }

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.content) {
      editMessage(channelId, message.id, editText);
    }
    setEditing(false);
  };

  const readCount = message.readBy.length;
  const allRead = readCount > 1;

  return (
    <div
      className={`group flex gap-3 px-6 py-0.5 hover:bg-slate-800/30 transition-colors relative ${isGrouped ? '' : 'mt-3'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false); }}
    >
      <div className="w-9 shrink-0">
        {!isGrouped && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white mt-0.5">
            {message.senderAvatar}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-semibold text-slate-200">{message.senderName}</span>
            <span className="text-[11px] text-slate-500">{formatMessageTime(message.timestamp)}</span>
            {message.edited && <span className="text-[10px] text-slate-600">(edited)</span>}
          </div>
        )}

        {replyMessage && !replyMessage.deleted && (
          <div className="flex items-center gap-2 mb-1 pl-3 border-l-2 border-slate-600">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[7px] font-bold text-white shrink-0">
              {replyMessage.senderAvatar}
            </div>
            <span className="text-xs text-slate-400 truncate max-w-xs">
              <span className="font-medium text-slate-300">{replyMessage.senderName}</span>{' '}
              {replyMessage.content.slice(0, 80)}{replyMessage.content.length > 80 ? '...' : ''}
            </span>
          </div>
        )}

        {editing ? (
          <div className="flex items-center gap-2">
            <input
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditing(false); }}
              autoFocus
            />
            <button onClick={handleSaveEdit} className="text-xs text-brand-400 hover:text-brand-300">Save</button>
            <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
          </div>
        ) : (
          <div className="text-sm text-slate-300 leading-relaxed break-words">
            {renderContent(message.content)}
          </div>
        )}

        {message.attachments.length > 0 && (
          <div className="flex flex-col gap-2 mt-1.5">
            {message.attachments.map(att => (
              <FilePreview key={att.id} attachment={att} />
            ))}
          </div>
        )}

        <ReactionBar reactions={message.reactions} channelId={channelId} messageId={message.id} currentUserId={currentUserId} />

        {isMine && isGrouped === false && (
          <div className="flex items-center gap-1 mt-0.5">
            {allRead ? (
              <CheckCheck size={12} className="text-brand-400" />
            ) : (
              <Check size={12} className="text-slate-500" />
            )}
            <span className="text-[10px] text-slate-600">
              {allRead ? `Read by ${readCount - 1}` : 'Sent'}
            </span>
          </div>
        )}
      </div>

      {showActions && !message.deleted && !editing && (
        <div className="absolute -top-3 right-6 flex items-center bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-20">
          {QUICK_REACTIONS.slice(0, 4).map(emoji => (
            <button
              key={emoji}
              onClick={() => addReaction(channelId, message.id, emoji, currentUserId)}
              className="px-1.5 py-1 hover:bg-slate-700 transition-colors text-sm"
            >
              {emoji}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-700" />
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1.5 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            <Smile size={14} />
          </button>
          <button
            onClick={() => onReply(message.id)}
            className="p-1.5 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            <Reply size={14} />
          </button>
          {isMine && (
            <>
              <button
                onClick={() => { setEditing(true); setShowActions(false); }}
                className="p-1.5 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => deleteMessage(channelId, message.id)}
                className="p-1.5 hover:bg-slate-700 transition-colors text-red-400 hover:text-red-300"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      )}

      {showReactionPicker && (
        <div className="absolute -top-52 right-6 z-30">
          <EmojiPicker
            onSelect={(emoji) => { addReaction(channelId, message.id, emoji, currentUserId); setShowReactionPicker(false); }}
            onClose={() => setShowReactionPicker(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Add Member Modal ────────────────────────────────────────────────────────

function AddMemberModal({ channelId, currentMembers, onClose }: { 
  channelId: string; 
  currentMembers: string[];
  onClose: () => void;
}) {
  const { team, addChannelMember } = useStore();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const availableMembers = team.filter(m => !currentMembers.includes(m.id));

  const filteredMembers = searchQuery
    ? availableMembers.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableMembers;

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    if (selectedMembers.length === 0) return;
    selectedMembers.forEach(userId => {
      addChannelMember(channelId, userId);
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Add Members</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search team members..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No members available to add</p>
            ) : (
              filteredMembers.map(m => {
                const selected = selectedMembers.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left ${
                      selected ? 'bg-brand-500/15 border border-brand-500/30' : 'hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {m.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">{m.name}</p>
                      <p className="text-[10px] text-slate-500">{m.role}</p>
                    </div>
                    {selected && <Check size={16} className="text-brand-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button
            onClick={handleAdd}
            disabled={selectedMembers.length === 0}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-500 disabled:opacity-40"
          >
            Add {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Channel Name Modal ─────────────────────────────────────────────────

function EditChannelNameModal({ channel, onClose }: { channel: ChatChannel; onClose: () => void }) {
  const { updateChannel } = useStore();
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');

  const handleSave = () => {
    if (!name.trim()) return;
    updateChannel(channel.id, { name: name.trim(), description: description.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Edit Channel</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">Channel Name</label>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3">
              <Hash size={14} className="text-slate-500" />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Channel name"
                className="flex-1 bg-transparent py-2.5 text-sm text-slate-200 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">Description (optional)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-500 disabled:opacity-40"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Channel Info Sidebar (Updated with Management Features) ─────────────────

function ChannelInfoPanel({ channel, onClose }: { channel: ChatChannel; onClose: () => void }) {
  const { team, messages, currentUser, deleteChannel, removeChannelMember, leaveChannel } = useStore();
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditChannel, setShowEditChannel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const channelMembers = team.filter(m => channel.members.includes(m.id));
  const msgCount = (messages[channel.id] || []).filter(m => !m.deleted).length;
  const fileCount = (messages[channel.id] || []).reduce((sum, m) => sum + m.attachments.length, 0);
  
  const isCreator = currentUser?.id === channel.createdBy;
  const isMember = channel.members.includes(currentUser?.id || '');

  const handleDeleteChannel = () => {
    deleteChannel(channel.id);
    onClose();
  };

  const handleLeaveChannel = () => {
    leaveChannel(channel.id);
    onClose();
  };

  const handleRemoveMember = (userId: string, userName: string) => {
    if (confirm(`Remove ${userName} from this channel?`)) {
      removeChannelMember(channel.id, userId);
    }
  };

  return (
    <>
      <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white">Channel Info</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Channel header with actions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {channel.type === 'group' ? (
                <span className="text-2xl">{channel.avatar}</span>
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                  {channel.avatar}
                </div>
              )}
              <div className="flex-1">
                <h4 className="text-base font-semibold text-white">
                  {channel.type === 'group' ? `#${channel.name}` : channel.name}
                </h4>
                <p className="text-xs text-slate-500">
                  Created {format(new Date(channel.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
              
              {/* Channel actions for group chats */}
              {channel.type === 'group' && (
                <div className="flex gap-1">
                  {isCreator && (
                    <>
                      <button
                        onClick={() => setShowEditChannel(true)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        title="Edit channel"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setShowAddMember(true)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        title="Add members"
                      >
                        <UserPlus size={14} />
                      </button>
                    </>
                  )}
                  {isMember && !isCreator && (
                    <button
                      onClick={handleLeaveChannel}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-600/20 hover:text-amber-400 transition-colors"
                      title="Leave channel"
                    >
                      <LogOut size={14} />
                    </button>
                  )}
                  {isCreator && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-600/20 hover:text-red-400 transition-colors"
                      title="Delete channel"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
            {channel.description && (
              <p className="text-sm text-slate-400 mt-2">{channel.description}</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-lg font-bold text-white">{msgCount}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Messages</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-lg font-bold text-white">{fileCount}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Files</p>
            </div>
          </div>

          {/* Members list with management */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Members — {channelMembers.length}
              </h5>
              {isCreator && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>
            <div className="space-y-1">
              {channelMembers.map(m => {
                const isCurrentUser = m.id === currentUser?.id;
                const canRemove = isCreator && !isCurrentUser && channel.type === 'group';
                
                return (
                  <div key={m.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors group">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {m.avatar}
                      </div>
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900"
                        style={{ backgroundColor: PRESENCE_COLORS[m.presenceStatus] }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate flex items-center gap-1">
                        {m.name}
                        {m.id === channel.createdBy && (
                          <span className="text-[10px] px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded">Creator</span>
                        )}
                        {isCurrentUser && (
                          <span className="text-[10px] px-1 py-0.5 bg-brand-500/20 text-brand-400 rounded">You</span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{m.role}</p>
                    </div>
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveMember(m.id, m.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
                        title="Remove member"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared Files */}
          {fileCount > 0 && (
            <div>
              <h5 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                Shared Files
              </h5>
              <div className="space-y-1">
                {(messages[channel.id] || [])
                  .flatMap(m => m.attachments.map(a => ({ ...a, sender: m.senderName, time: m.timestamp })))
                  .slice(-5)
                  .reverse()
                  .map(f => (
                    <div key={f.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-slate-800/30">
                      <FileText size={14} className="text-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 truncate">{f.name}</p>
                        <p className="text-[10px] text-slate-500">{f.sender} · {formatFileSize(f.size)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddMember && (
        <AddMemberModal
          channelId={channel.id}
          currentMembers={channel.members}
          onClose={() => setShowAddMember(false)}
        />
      )}

      {showEditChannel && (
        <EditChannelNameModal
          channel={channel}
          onClose={() => setShowEditChannel(false)}
        />
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Delete Channel?</h3>
              <p className="text-sm text-slate-400 mb-6">
                This will permanently delete the channel and all message history. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteChannel}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── New Channel Modal ───────────────────────────────────────────────────────

function NewChannelModal({ onClose }: { onClose: () => void }) {
  const { team, createChannel, setCurrentChannel } = useStore();
  const [tab, setTab] = useState<'group' | 'direct'>('group');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreate = () => {
    if (tab === 'group' && !name.trim()) return;
    if (selectedMembers.length === 0) return;

    const channelName = tab === 'group' ? name : team.find(m => m.id === selectedMembers[0])?.name || 'DM';
    const id = createChannel(channelName, tab, selectedMembers, description);
    setCurrentChannel(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">New Conversation</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="flex gap-1 px-5 pt-4">
          {(['group', 'direct'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {t === 'group' ? 'Group Channel' : 'Direct Message'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === 'group' && (
            <>
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1 block">Channel Name</label>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3">
                  <Hash size={14} className="text-slate-500" />
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g., closings"
                    className="flex-1 bg-transparent py-2.5 text-sm text-slate-200 focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1 block">Description (optional)</label>
                <input
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What's this channel about?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none placeholder:text-slate-600"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-slate-400 font-medium mb-2 block">
              {tab === 'direct' ? 'Select Member' : 'Add Members'}
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {team.map(m => {
                const selected = selectedMembers.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (tab === 'direct') setSelectedMembers([m.id]);
                      else toggleMember(m.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left ${
                      selected ? 'bg-brand-500/15 border border-brand-500/30' : 'hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {m.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">{m.name}</p>
                      <p className="text-[10px] text-slate-500">{m.role}</p>
                    </div>
                    {selected && <Check size={16} className="text-brand-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={tab === 'group' ? !name.trim() || selectedMembers.length === 0 : selectedMembers.length === 0}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {tab === 'group' ? 'Create Channel' : 'Start Chat'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Sidebar ────────────────────────────────────────────────────────────

function ChatSidebar({
  channels,
  currentChannelId,
  onSelect,
  unreadCounts,
  onNewChannel,
  searchQuery,
  onSearch,
}: {
  channels: ChatChannel[];
  currentChannelId: string | null;
  onSelect: (id: string) => void;
  unreadCounts: Record<string, number>;
  onNewChannel: () => void;
  searchQuery: string;
  onSearch: (q: string) => void;
}) {
  const { messages } = useStore();
  const groupChannels = channels.filter(ch => ch.type === 'group');
  const directChannels = channels.filter(ch => ch.type === 'direct');

  const getLastMessage = (chId: string) => {
    const msgs = messages[chId] || [];
    return msgs.filter(m => !m.deleted).slice(-1)[0];
  };

  const filteredGroup = searchQuery
    ? groupChannels.filter(ch => ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : groupChannels;
  const filteredDirect = searchQuery
    ? directChannels.filter(ch => ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : directChannels;

  return (
    <div className="w-72 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0">
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-brand-400" />
            Chat
          </h2>
          <button onClick={onNewChannel} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Plus size={18} />
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchQuery} onChange={e => onSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 mb-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-2 py-1">Channels</p>
        </div>
        {filteredGroup.map(ch => {
          const unread = unreadCounts[ch.id] || 0;
          const last = getLastMessage(ch.id);
          const active = ch.id === currentChannelId;
          return (
            <button
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className={`w-full flex items-start gap-2.5 px-4 py-2.5 transition-colors text-left ${
                active ? 'bg-brand-500/10 border-r-2 border-brand-500' : 'hover:bg-slate-800/50'
              }`}
            >
              <span className="text-lg mt-0.5 shrink-0">{ch.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${active ? 'text-brand-400' : unread > 0 ? 'text-white' : 'text-slate-300'}`}>
                    #{ch.name}
                  </span>
                  {last && (
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatDistanceToNow(new Date(last.timestamp), { addSuffix: false })}
                    </span>
                  )}
                </div>
                {last && (
                  <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                    <span className="text-slate-400">{last.senderName.split(' ')[0]}:</span> {last.content.slice(0, 40)}
                  </p>
                )}
              </div>
              {unread > 0 && (
                <span className="bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center mt-1 shrink-0">
                  {unread}
                </span>
              )}
            </button>
          );
        })}

        <div className="px-3 mt-3 mb-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-2 py-1">Direct Messages</p>
        </div>
        {filteredDirect.map(ch => {
          const unread = unreadCounts[ch.id] || 0;
          const last = getLastMessage(ch.id);
          const active = ch.id === currentChannelId;
          return (
            <button
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className={`w-full flex items-start gap-2.5 px-4 py-2.5 transition-colors text-left ${
                active ? 'bg-brand-500/10 border-r-2 border-brand-500' : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                {ch.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${active ? 'text-brand-400' : unread > 0 ? 'text-white' : 'text-slate-300'}`}>
                    {ch.name}
                  </span>
                  {last && (
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatDistanceToNow(new Date(last.timestamp), { addSuffix: false })}
                    </span>
                  )}
                </div>
                {last && (
                  <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                    {last.content.slice(0, 50)}
                  </p>
                )}
              </div>
              {unread > 0 && (
                <span className="bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center mt-1 shrink-0">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Message Input ───────────────────────────────────────────────────────────

function MessageInput({
  channelId,
  replyToId,
  onClearReply,
  replyMessage,
  team,
}: {
  channelId: string;
  replyToId: string | null;
  onClearReply: () => void;
  replyMessage?: ChatMessage;
  team: { id: string; name: string; avatar: string; presenceStatus: string }[];
}) {
  const { sendMessage, setTypingUser, clearTypingUser, currentUser } = useStore();
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTextChange = (val: string) => {
    setText(val);

    if (currentUser) {
      setTypingUser(channelId, currentUser.id);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        if (currentUser) clearTypingUser(channelId, currentUser.id);
      }, 3000);
    }

    const lastAtIdx = val.lastIndexOf('@');
    if (lastAtIdx >= 0 && lastAtIdx === val.length - 1) {
      setShowMentions(true);
      setMentionQuery('');
    } else if (lastAtIdx >= 0) {
      const afterAt = val.slice(lastAtIdx + 1);
      if (!afterAt.includes(' ')) {
        setShowMentions(true);
        setMentionQuery(afterAt);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (member: { id: string; name: string }) => {
    const lastAtIdx = text.lastIndexOf('@');
    const newText = text.slice(0, lastAtIdx) + `@${member.name.split(' ')[0]} `;
    setText(newText);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;

    const mentionIds = team
      .filter(m => text.includes(`@${m.name.split(' ')[0]}`))
      .map(m => m.id);

    sendMessage(channelId, text, 'text', mentionIds, replyToId, attachments);
    setText('');
    setAttachments([]);
    onClearReply();
    if (currentUser) clearTypingUser(channelId, currentUser.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileAttach = () => {
    const fileTypes: { type: ChatAttachment['type']; ext: string }[] = [
      { type: 'document', ext: 'pdf' }, { type: 'document', ext: 'xlsx' }, { type: 'image', ext: 'png' },
    ];
    const ft = fileTypes[Math.floor(Math.random() * fileTypes.length)];
    const mockFiles: ChatAttachment[] = [
      { id: uuidv4(), url: '#', type: ft.type, name: `file_${Date.now()}.${ft.ext}`, size: Math.round(Math.random() * 5000000 + 100000) },
    ];
    setAttachments(prev => [...prev, ...mockFiles]);
  };

  const handleVoiceSend = (attachment: ChatAttachment) => {
    sendMessage(channelId, '🎤 Voice message', 'voice', [], null, [attachment]);
    setIsRecording(false);
  };

  if (isRecording) {
    return (
      <div className="px-4 pb-4">
        <VoiceRecorder
          onSend={handleVoiceSend}
          onCancel={() => setIsRecording(false)}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 relative">
      {replyMessage && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-slate-800/70 rounded-xl border border-slate-700">
          <Reply size={14} className="text-brand-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-brand-400 font-medium">Replying to {replyMessage.senderName}</span>
            <p className="text-xs text-slate-400 truncate">{replyMessage.content.slice(0, 60)}</p>
          </div>
          <button onClick={onClearReply} className="p-1 rounded text-slate-400 hover:text-white"><X size={14} /></button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((att, i) => (
            <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
              <FileText size={14} className="text-blue-400" />
              <span className="text-xs text-slate-300 truncate max-w-[120px]">{att.name}</span>
              <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-white">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showMentions && (
        <MentionAutocomplete
          query={mentionQuery}
          members={team}
          onSelect={handleMentionSelect}
          position={{ bottom: 70, left: 16 }}
        />
      )}

      {showEmojis && (
        <EmojiPicker
          onSelect={(emoji) => { setText(prev => prev + emoji); inputRef.current?.focus(); }}
          onClose={() => setShowEmojis(false)}
        />
      )}

      <div className="flex items-end gap-2 bg-slate-800 border border-slate-700 rounded-2xl px-3 py-2 focus-within:ring-1 focus-within:ring-brand-500/50 focus-within:border-brand-500/50 transition-all">
        <button onClick={() => setShowEmojis(!showEmojis)} className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-slate-700 transition-colors shrink-0 mb-0.5">
          <Smile size={18} />
        </button>
        <button onClick={handleFileAttach} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-700 transition-colors shrink-0 mb-0.5">
          <Paperclip size={18} />
        </button>

        <textarea
          ref={inputRef}
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (@ to mention)"
          rows={1}
          className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none placeholder:text-slate-500 resize-none max-h-24 py-1.5"
          style={{ minHeight: '32px' }}
        />

        <button
          onClick={() => setIsRecording(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors shrink-0 mb-0.5"
        >
          <Mic size={18} />
        </button>
        <button
          onClick={handleSend}
          disabled={!text.trim() && attachments.length === 0}
          className="p-2 rounded-xl bg-brand-600 text-white hover:bg-brand-500 transition-colors shrink-0 mb-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Search Results Panel ────────────────────────────────────────────────────

function SearchResultsPanel({
  query, onClose, onGoTo,
}: {
  query: string;
  onClose: () => void;
  onGoTo: (channelId: string) => void;
}) {
  const { channels, messages: allMessages } = useStore();
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const found: ChatMessage[] = [];
    for (const channelMsgs of Object.values(allMessages)) {
      for (const msg of channelMsgs) {
        if (!msg.deleted && msg.content.toLowerCase().includes(lower)) {
          found.push(msg);
        }
      }
    }
    return found.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [query, allMessages]);

  const getChannelName = (id: string) => {
    const ch = channels.find(c => c.id === id);
    return ch ? (ch.type === 'group' ? `#${ch.name}` : ch.name) : 'Unknown';
  };

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-white">Search Results ({results.length})</h3>
        <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">No messages found</div>
        )}
        {results.map(msg => (
          <button
            key={msg.id}
            onClick={() => onGoTo(msg.channelId)}
            className="w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[8px] font-bold text-white">
                {msg.senderAvatar}
              </div>
              <span className="text-xs font-medium text-slate-300">{msg.senderName}</span>
              <span className="text-[10px] text-slate-500">in {getChannelName(msg.channelId)}</span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">
              {msg.content.split(new RegExp(`(${query})`, 'gi')).map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                  ? <mark key={i} className="bg-yellow-500/30 text-yellow-300 rounded px-0.5">{part}</mark>
                  : part
              )}
            </p>
            <span className="text-[10px] text-slate-600 mt-1 block">{formatMessageTime(msg.timestamp)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Load Messages from Supabase ─────────────────────────────────────────────

async function loadMessagesFromSupabase(channelId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      id: msg.id,
      channelId: msg.channel_id,
      senderId: msg.user_id,
      senderName: msg.sender_name,
      senderAvatar: msg.sender_avatar || msg.sender_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
      content: msg.content,
      timestamp: msg.created_at,
      type: msg.type || 'text',
      mentions: msg.mentions || [],
      reactions: [],
      replyToId: msg.reply_to_id,
      attachments: msg.attachments || [],
      edited: msg.edited || false,
      readBy: [msg.user_id],
      deleted: msg.deleted || false,
    }));
  } catch (error) {
    console.error('Failed to load messages:', error);
    return [];
  }
}

// ─── Main Chat Page ──────────────────────────────────────────────────────────

export function Chat() {
  const {
    channels, messages, currentChannelId, setCurrentChannel, typingUsers,
    unreadCounts, markChannelRead, team, currentUser, setBulkData,
  } = useStore();

  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentChannel = channels.find(ch => ch.id === currentChannelId);
  const channelMessages = currentChannelId ? (messages[currentChannelId] || []) : [];
  const sortedMessages = [...channelMessages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Load channels from Supabase when component mounts
  useEffect(() => {
    const loadChannels = async () => {
      setLoadingChannels(true);
      console.log('Loading channels from Supabase...');
      
      if (!isSupabaseConfigured || !supabase) {
        console.log('Supabase not configured');
        setLoadingChannels(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('channels')
          .select('*, channel_members(user_id)')
          .order('last_message_at', { ascending: false });

        if (error) {
          console.error('Error loading channels:', error);
          setLoadingChannels(false);
          return;
        }

        console.log('Loaded channels from Supabase:', data);

        if (data && data.length > 0) {
          // Convert to your ChatChannel format
          const loadedChannels = data.map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            members: (ch.channel_members || []).map((cm: any) => cm.user_id),
            description: ch.description || '',
            avatar: ch.avatar || (ch.type === 'group' ? '💬' : ch.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)),
            createdAt: ch.created_at,
            createdBy: ch.created_by,
            lastMessageAt: ch.last_message_at,
            pinnedMessageIds: [],
          }));

          console.log('Converted channels:', loadedChannels);

          // Update store with loaded channels
          setBulkData({ channels: loadedChannels });
          
          // Set first channel as active if none selected
          if (!currentChannelId && loadedChannels.length > 0) {
            console.log('Setting current channel to:', loadedChannels[0].id);
            setCurrentChannel(loadedChannels[0].id);
          }
        } else {
          console.log('No channels found in Supabase');
        }
      } catch (error) {
        console.error('Failed to load channels:', error);
      } finally {
        setLoadingChannels(false);
      }
    };

    loadChannels();
  }, [setBulkData, setCurrentChannel, currentChannelId]);

  // Load messages when channel changes
  useEffect(() => {
    if (!currentChannelId) {
      setLoadingMessages(false);
      return;
    }

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const loadedMessages = await loadMessagesFromSupabase(currentChannelId);
        
        // Update store with loaded messages
        setBulkData({
          messages: {
            ...messages,
            [currentChannelId]: loadedMessages,
          },
        });
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [currentChannelId, setBulkData]);

  // Mark channel read on switch
  useEffect(() => {
    if (currentChannelId) {
      markChannelRead(currentChannelId);
    }
  }, [currentChannelId, markChannelRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length, currentChannelId]);

  const handleSelectChannel = useCallback((id: string) => {
    setCurrentChannel(id);
    setReplyToId(null);
    setShowChannelInfo(false);
  }, [setCurrentChannel]);

  const handleReply = useCallback((msgId: string) => {
    setReplyToId(msgId);
  }, []);

  const replyMessage = replyToId ? channelMessages.find(m => m.id === replyToId) : undefined;

  const currentTyping = currentChannelId ? (typingUsers[currentChannelId] || []) : [];
  const typingNames = currentTyping
    .filter(uid => uid !== currentUser?.id)
    .map(uid => team.find(m => m.id === uid)?.name.split(' ')[0] || 'Someone');

  const messagesWithDividers: { type: 'divider' | 'message'; date?: string; message?: ChatMessage; isGrouped?: boolean }[] = [];
  let lastDate = '';
  for (let i = 0; i < sortedMessages.length; i++) {
    const msg = sortedMessages[i];
    const msgDate = format(new Date(msg.timestamp), 'yyyy-MM-dd');
    if (msgDate !== lastDate) {
      messagesWithDividers.push({ type: 'divider', date: msg.timestamp });
      lastDate = msgDate;
    }
    const isGrouped = shouldGroupMessage(sortedMessages[i - 1], msg) && format(new Date(sortedMessages[i - 1]?.timestamp || ''), 'yyyy-MM-dd') === msgDate;
    messagesWithDividers.push({ type: 'message', message: msg, isGrouped });
  }

  const teamForMentions = team.map(m => ({ id: m.id, name: m.name, avatar: m.avatar, presenceStatus: m.presenceStatus }));
  const teamForBubble = team.map(m => ({ id: m.id, name: m.name }));

  // Show loading indicator while channels are loading
  if (loadingChannels) {
    return (
      <div className="flex h-[calc(100vh-73px)] -m-6 bg-slate-950 items-center justify-center">
        <div className="text-center">
          <div className="flex gap-2 justify-center mb-4">
            <div className="w-3 h-3 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-slate-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-73px)] -m-6 bg-slate-950">
      <ChatSidebar
        channels={channels}
        currentChannelId={currentChannelId}
        onSelect={handleSelectChannel}
        unreadCounts={unreadCounts}
        onNewChannel={() => setShowNewChannel(true)}
        searchQuery={sidebarSearch}
        onSearch={setSidebarSearch}
      />

      {currentChannel ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              {currentChannel.type === 'group' ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currentChannel.avatar}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Hash size={14} className="text-slate-400" />
                      {currentChannel.name}
                    </h3>
                    {currentChannel.description && (
                      <p className="text-[11px] text-slate-500 truncate max-w-md">{currentChannel.description}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {currentChannel.avatar}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Lock size={12} className="text-slate-500" />
                      {currentChannel.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">Direct Message</p>
                  </div>
                </div>
              )}
              <span className="text-xs text-slate-600 ml-2">
                {currentChannel.members.length} members
              </span>
            </div>

            <div className="flex items-center gap-1">
              <div className="relative mr-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={globalSearch}
                  onChange={e => { setGlobalSearch(e.target.value); setShowSearchResults(!!e.target.value); }}
                  placeholder="Search messages..."
                  className="w-48 pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-500"
                />
              </div>
              <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                <Phone size={16} />
              </button>
              <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                <Video size={16} />
              </button>
              <button
                onClick={() => { setShowChannelInfo(!showChannelInfo); setShowSearchResults(false); }}
                className={`p-2 rounded-lg transition-colors ${showChannelInfo ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Users size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <div ref={containerRef} className="flex-1 overflow-y-auto py-4">
                {/* Loading indicator */}
                {loadingMessages && (
                  <div className="flex justify-center py-8">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                {/* Channel welcome */}
                {!loadingMessages && sortedMessages.length === 0 && (
                  <div className="px-6 pb-4 mb-2 border-b border-slate-800/50">
                    <div className="flex items-center gap-3 mb-2">
                      {currentChannel.type === 'group' ? (
                        <span className="text-3xl">{currentChannel.avatar}</span>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                          {currentChannel.avatar}
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {currentChannel.type === 'group' ? `#${currentChannel.name}` : currentChannel.name}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {currentChannel.type === 'group'
                            ? currentChannel.description || 'This is the start of the channel.'
                            : 'This is the beginning of your conversation.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages list */}
                {messagesWithDividers.map((item, i) => {
                  if (item.type === 'divider') {
                    return (
                      <div key={`divider-${i}`} className="flex items-center gap-3 px-6 my-3">
                        <div className="h-px flex-1 bg-slate-800" />
                        <span className="text-[11px] text-slate-500 font-medium px-3 py-0.5 bg-slate-800/50 rounded-full">
                          {formatDateDivider(item.date!)}
                        </span>
                        <div className="h-px flex-1 bg-slate-800" />
                      </div>
                    );
                  }
                  const msg = item.message!;
                  const replyMsg = msg.replyToId ? channelMessages.find(m => m.id === msg.replyToId) : undefined;
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isGrouped={!!item.isGrouped}
                      replyMessage={replyMsg}
                      channelId={currentChannelId!}
                      currentUserId={currentUser?.id || ''}
                      onReply={handleReply}
                      team={teamForBubble}
                    />
                  );
                })}

                {/* Typing indicator */}
                {typingNames.length > 0 && (
                  <div className="flex items-center gap-2 px-6 py-2 mt-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-slate-500 italic">
                      {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <MessageInput
                channelId={currentChannelId!}
                replyToId={replyToId}
                onClearReply={() => setReplyToId(null)}
                replyMessage={replyMessage}
                team={teamForMentions}
              />
            </div>

            {showChannelInfo && <ChannelInfoPanel channel={currentChannel} onClose={() => setShowChannelInfo(false)} />}
            {showSearchResults && globalSearch && (
              <SearchResultsPanel
                query={globalSearch}
                onClose={() => { setShowSearchResults(false); setGlobalSearch(''); }}
                onGoTo={(chId) => { handleSelectChannel(chId); setShowSearchResults(false); setGlobalSearch(''); }}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <MessageSquare size={48} className="text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-400">Select a conversation</h3>
            <p className="text-sm text-slate-600 mt-1">Choose a channel or start a new conversation</p>
            <button
              onClick={() => setShowNewChannel(true)}
              className="mt-4 px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-500 transition-colors"
            >
              <Plus size={16} className="inline mr-1.5 -mt-0.5" /> New Conversation
            </button>
          </div>
        </div>
      )}

      {showNewChannel && <NewChannelModal onClose={() => setShowNewChannel(false)} />}
    </div>
  );
}