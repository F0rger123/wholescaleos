import React, { useRef, useState, useEffect } from 'react';
import { 
  Bold, Italic, Underline, List, ListOrdered, 
  Link as LinkIcon, Image as ImageIcon, Type, 
  AlignLeft, AlignCenter, AlignRight, 
  Maximize2, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = '300px' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sync value from prop to editor only when it's not focused to avoid cursor jumps
  useEffect(() => {
    if (editorRef.current && !isFocused && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value, isFocused]);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `email_assets/${fileName}`;

      const { error } = await supabase.storage
        .from('contract_templates') // Using existing bucket for compatibility
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('contract_templates')
        .getPublicUrl(filePath);

      // Insert image into editor
      editorRef.current?.focus();
      execCommand('insertImage', publicUrl);
      
      // Select the image and add some responsive classes if possible
      // (contenteditable doesn't easily allow classes on insertImage, 
      // but we can wrap it or just rely on global styles)
      
      toast.success('Image uploaded and inserted');
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = () => {
    if (!linkUrl) return;
    execCommand('createLink', linkUrl);
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const toolbarButtonClass = "p-2 rounded-lg hover:bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] hover:text-[var(--t-primary)] transition-all active:scale-95";

  return (
    <div className={`flex flex-col border border-[var(--t-border)] rounded-2xl bg-[var(--t-surface)] overflow-hidden transition-all ${isFocused ? 'ring-2 ring-[var(--t-primary-dim)] border-[var(--t-primary)]' : ''} ${isFullScreen ? 'fixed inset-4 z-[100] shadow-2xl' : 'relative'}`}>
      
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--t-border)] bg-[var(--t-surface-dim)]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-1 pr-2 border-r border-[var(--t-border)] mr-1">
          <button onClick={() => execCommand('bold')} className={toolbarButtonClass} title="Bold"><Bold size={16} /></button>
          <button onClick={() => execCommand('italic')} className={toolbarButtonClass} title="Italic"><Italic size={16} /></button>
          <button onClick={() => execCommand('underline')} className={toolbarButtonClass} title="Underline"><Underline size={16} /></button>
        </div>

        <div className="flex items-center gap-1 pr-2 border-r border-[var(--t-border)] mr-1">
          <button onClick={() => execCommand('insertUnorderedList')} className={toolbarButtonClass} title="Bullet List"><List size={16} /></button>
          <button onClick={() => execCommand('insertOrderedList')} className={toolbarButtonClass} title="Numbered List"><ListOrdered size={16} /></button>
        </div>

        <div className="flex items-center gap-1 pr-2 border-r border-[var(--t-border)] mr-1">
          <button onClick={() => execCommand('justifyLeft')} className={toolbarButtonClass} title="Align Left"><AlignLeft size={16} /></button>
          <button onClick={() => execCommand('justifyCenter')} className={toolbarButtonClass} title="Align Center"><AlignCenter size={16} /></button>
          <button onClick={() => execCommand('justifyRight')} className={toolbarButtonClass} title="Align Right"><AlignRight size={16} /></button>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <button 
              onClick={() => setShowLinkInput(!showLinkInput)} 
              className={`${toolbarButtonClass} ${showLinkInput ? 'bg-[var(--t-primary-dim)] text-[var(--t-primary)]' : ''}`} 
              title="Add Link"
            >
              <LinkIcon size={16} />
            </button>
            
            {showLinkInput && (
              <div className="absolute left-0 mt-2 p-3 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-2xl z-50 w-64 animate-in slide-in-from-top-2">
                <input 
                  type="url" 
                  value={linkUrl} 
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--t-border)] bg-[var(--t-bg)] outline-none focus:border-[var(--t-primary)] mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleAddLink} className="flex-1 py-2 bg-[var(--t-primary)] text-white text-xs font-bold rounded-lg uppercase tracking-widest">Apply</button>
                  <button onClick={() => setShowLinkInput(false)} className="flex-1 py-2 bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] text-xs font-bold rounded-lg uppercase tracking-widest border border-[var(--t-border)]">Cancel</button>
                </div>
              </div>
            )}
          </div>

          <label className={toolbarButtonClass + " cursor-pointer relative"}>
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </label>
          
          <button onClick={() => execCommand('formatBlock', 'h1')} className={toolbarButtonClass} title="Heading 1"><Type size={16} className="scale-125" /></button>
          <button onClick={() => execCommand('formatBlock', 'p')} className={toolbarButtonClass} title="Paragraph"><Type size={14} /></button>
        </div>

        <div className="ml-auto">
          <button onClick={() => setIsFullScreen(!isFullScreen)} className={toolbarButtonClass} title="Full Screen">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="flex-1 p-6 md:p-8 outline-none overflow-y-auto rich-text-content"
        style={{ minHeight, maxHeight: isFullScreen ? 'calc(100vh - 100px)' : '500px' }}
        data-placeholder={placeholder}
      />

      <style>{`
        .rich-text-content {
          line-height: 1.6;
          color: var(--t-text);
          font-size: 1rem;
        }
        .rich-text-content:empty:before {
          content: attr(data-placeholder);
          color: var(--t-text-muted);
          opacity: 0.5;
          pointer-events: none;
          display: block;
        }
        .rich-text-content h1 { font-size: 1.875rem; font-weight: 800; margin-bottom: 1rem; line-height: 1.2; color: var(--t-text); }
        .rich-text-content p { margin-bottom: 1rem; }
        .rich-text-content ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; }
        .rich-text-content ol { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem; }
        .rich-text-content a { color: var(--t-primary); text-decoration: underline; font-weight: 500; }
        .rich-text-content img { max-width: 100%; height: auto; border-radius: 1rem; margin: 1.5rem 0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
      `}</style>
    </div>
  );
}
