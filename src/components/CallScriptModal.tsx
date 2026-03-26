import { useState, useMemo, useEffect } from 'react';
import { X, Copy, Check, FileText, Plus, Save, Trash2, ChevronDown, Sparkles, Phone, BookOpen } from 'lucide-react';
import type { Lead } from '../store/useStore';

// ─── Template Variable System ─────────────────────────────────────────────────

const TEMPLATE_VARIABLES = [
  { key: '{{lead.name}}', label: 'Name', group: 'Contact' },
  { key: '{{lead.phone}}', label: 'Phone', group: 'Contact' },
  { key: '{{lead.email}}', label: 'Email', group: 'Contact' },
  { key: '{{lead.propertyAddress}}', label: 'Property Address', group: 'Property' },
  { key: '{{lead.estimatedValue}}', label: 'Estimated Value', group: 'Property' },
  { key: '{{lead.status}}', label: 'Status', group: 'Pipeline' },
  { key: '{{lead.source}}', label: 'Source', group: 'Pipeline' },
  { key: '{{lead.notes}}', label: 'Notes', group: 'Details' },
  { key: '{{agent.name}}', label: 'Your Name', group: 'Agent' },
  { key: '{{date}}', label: 'Today\'s Date', group: 'Other' },
];

// ─── Built-in Script Library ──────────────────────────────────────────────────

const BUILTIN_TEMPLATES: { id: string; name: string; category: string; body: string }[] = [
  {
    id: 'cold-call',
    name: 'Cold Call Script',
    category: 'Outbound',
    body: `Hi, is this {{lead.name}}? My name is {{agent.name}}, and I'm a local real estate specialist. I noticed your property at {{lead.propertyAddress}} and wanted to reach out.

I've been working with homeowners in your area, and properties like yours have been getting a lot of attention lately. Current estimates put your property value around {{lead.estimatedValue}}.

Would you have a few minutes to discuss what options might be available for your property? There's absolutely no obligation — I just want to make sure you're aware of the current market conditions in your area.

[IF INTERESTED]
Great! I'd love to schedule a quick 15-minute call or meet in person. What works best for you this week?

[IF NOT INTERESTED]
I completely understand. Would it be okay if I sent you a quick market report for your area? It's free and might be useful down the road. What's the best email to send that to?`,
  },
  {
    id: 'follow-up',
    name: 'Follow-Up Script',
    category: 'Outbound',
    body: `Hi {{lead.name}}, this is {{agent.name}} calling back. We spoke recently about your property at {{lead.propertyAddress}}.

I wanted to follow up and see if you've had a chance to think about our conversation. I've also pulled together some additional market data that I think you'll find interesting.

Since we last spoke, I've seen some comparable properties sell in your area, which could give us a clearer picture of where your property stands.

Do you have a few minutes to go over these numbers? I think you'll be pleasantly surprised.

[IF YES]
Perfect! Let me walk you through what I've found...

[IF NO/BUSY]
No problem at all. When would be a better time for me to call back? I want to make sure I catch you when it's convenient.`,
  },
  {
    id: 'open-house',
    name: 'Open House Invitation',
    category: 'Events',
    body: `Hello {{lead.name}}, this is {{agent.name}}! I hope you're doing well.

I'm hosting an open house in your neighborhood this weekend and wanted to personally invite you. Even if you're not actively looking to sell, it's a great opportunity to see what homes in your area are going for.

The open house is at [ADDRESS] on [DATE] from [TIME]. There will be refreshments, and I'll have free market analysis reports available for anyone interested.

Would you be able to stop by? It's completely casual — no pressure at all.

[IF YES]
Wonderful! I'll look forward to seeing you there. Can I add {{lead.email}} to send you a reminder with the details?

[IF MAYBE]
I totally understand. Let me send you the details just in case — if your schedule opens up, you're more than welcome!`,
  },
  {
    id: 'offer-negotiation',
    name: 'Offer Negotiation',
    category: 'Deals',
    body: `Hi {{lead.name}}, it's {{agent.name}}.

I have some exciting news — we've received an offer on your property at {{lead.propertyAddress}}! I'd like to go over the details with you.

Here's a quick summary:
• Offer Price: [OFFER AMOUNT]
• Estimated Property Value: {{lead.estimatedValue}}
• Closing Timeline: [TIMELINE]
• Contingencies: [LIST]

I want to make sure we get you the best possible outcome. Based on my analysis, I believe we have room to [NEGOTIATE/ACCEPT].

Can we schedule a time today or tomorrow to review this together in detail? This is time-sensitive, so the sooner we can discuss, the better.

[AFTER DISCUSSION]
I'll prepare the counter-offer / acceptance paperwork and have it ready for your review by [TIME].`,
  },
  {
    id: 'buyer-consultation',
    name: 'Buyer Consultation',
    category: 'Consultations',
    body: `Hello {{lead.name}}, thank you for reaching out! This is {{agent.name}}.

I received your inquiry and I'd love to help you find the perfect property. To make sure I'm searching for exactly what you need, I have a few quick questions:

1. What area/neighborhood are you most interested in?
2. What's your ideal price range?
3. How many bedrooms/bathrooms are you looking for?
4. Do you have a timeline for when you'd like to move?
5. Are you pre-approved for a mortgage, or would you like me to connect you with a trusted lender?

Based on what you've told me, I already have a few properties in mind that might be a great fit.

Would you like to schedule a time to view some properties this week? I'm also happy to set you up with automatic alerts whenever new listings match your criteria.`,
  },
  {
    id: 'seller-consultation',
    name: 'Seller Consultation',
    category: 'Consultations',
    body: `Hi {{lead.name}}, this is {{agent.name}}. Thank you for considering me to help with the sale of your property at {{lead.propertyAddress}}.

I've done some preliminary research on your area and I'm excited about the potential. Before we meet, I wanted to share a few things:

Current Market Snapshot:
• Your estimated property value: {{lead.estimatedValue}}
• Average days on market in your area: [DAYS]
• Recent comparable sales: [COMPS]

What I'll Bring to the Table:
1. Professional photography & virtual tours
2. Targeted marketing to qualified buyers
3. Expert negotiation to maximize your return
4. Full-service support from listing to closing

I'd love to schedule a complimentary in-home consultation at your convenience. During our meeting, I'll provide a detailed Comparative Market Analysis and discuss the best strategy to sell your home for top dollar.

What day works best for you this week?`,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface CallScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  agentName?: string;
}

export function CallScriptModal({ isOpen, onClose, lead, agentName = 'Agent' }: CallScriptModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('cold-call');
  const [customBody, setCustomBody] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showVarHelp, setShowVarHelp] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<{ id: string; name: string; body: string }[]>([]);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // Load saved templates from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ws-custom-call-templates');
      if (saved) setSavedTemplates(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const persistTemplates = (templates: typeof savedTemplates) => {
    setSavedTemplates(templates);
    localStorage.setItem('ws-custom-call-templates', JSON.stringify(templates));
  };

  // Get the raw template body
  const rawTemplate = useMemo(() => {
    if (isCustom) return customBody;
    const builtin = BUILTIN_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (builtin) return builtin.body;
    const custom = savedTemplates.find(t => t.id === selectedTemplateId);
    return custom?.body || '';
  }, [selectedTemplateId, isCustom, customBody, savedTemplates]);

  // Fill template variables
  const filledScript = useMemo(() => {
    let script = rawTemplate;
    if (lead) {
      script = script
        .replace(/\{\{lead\.name\}\}/g, lead.name || '[Name]')
        .replace(/\{\{lead\.phone\}\}/g, lead.phone || '[Phone]')
        .replace(/\{\{lead\.email\}\}/g, lead.email || '[Email]')
        .replace(/\{\{lead\.propertyAddress\}\}/g, lead.propertyAddress || '[Address]')
        .replace(/\{\{lead\.estimatedValue\}\}/g, lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '[Value]')
        .replace(/\{\{lead\.status\}\}/g, lead.status || '[Status]')
        .replace(/\{\{lead\.source\}\}/g, lead.source || '[Source]')
        .replace(/\{\{lead\.notes\}\}/g, lead.notes || '[Notes]');
    }
    script = script
      .replace(/\{\{agent\.name\}\}/g, agentName)
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
    return script;
  }, [rawTemplate, lead, agentName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(filledScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTemplate = () => {
    if (!saveTemplateName.trim() || !customBody.trim()) return;
    const newTemplate = {
      id: `custom-${Date.now()}`,
      name: saveTemplateName.trim(),
      body: customBody,
    };
    persistTemplates([...savedTemplates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
    setIsCustom(false);
    setSaveTemplateName('');
    setShowSaveInput(false);
  };

  const handleDeleteTemplate = (id: string) => {
    persistTemplates(savedTemplates.filter(t => t.id !== id));
    if (selectedTemplateId === id) {
      setSelectedTemplateId('cold-call');
    }
  };

  if (!isOpen) return null;

  const currentBuiltin = BUILTIN_TEMPLATES.find(t => t.id === selectedTemplateId);
  const currentSaved = savedTemplates.find(t => t.id === selectedTemplateId);
  const currentName = isCustom ? 'Custom Script' : currentBuiltin?.name || currentSaved?.name || 'Script';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--t-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--t-primary-dim)]">
              <Phone size={18} className="text-[var(--t-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--t-text)]">Call Script Generator</h2>
              <p className="text-xs text-[var(--t-text-muted)]">
                {lead ? `For: ${lead.name}` : 'Select a template or create your own'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--t-surface-hover)] transition-colors">
            <X size={18} className="text-[var(--t-text-muted)]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Template Selector */}
          <div className="w-64 border-r border-[var(--t-border)] flex flex-col overflow-y-auto shrink-0">
            {/* Library Toggle */}
            <button
              onClick={() => setShowLibrary(!showLibrary)}
              className="flex items-center justify-between px-4 py-3 text-xs font-bold text-[var(--t-text)] border-b border-[var(--t-border)] hover:bg-[var(--t-surface-hover)] transition-colors"
            >
              <span className="flex items-center gap-2"><BookOpen size={14} /> Template Library</span>
              <ChevronDown size={12} className={`transition-transform ${showLibrary ? 'rotate-180' : ''}`} />
            </button>

            {showLibrary && (
              <div className="border-b border-[var(--t-border)]">
                {BUILTIN_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTemplateId(t.id); setIsCustom(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                      !isCustom && selectedTemplateId === t.id
                        ? 'bg-[var(--t-primary-dim)] text-[var(--t-primary)] font-bold'
                        : 'text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-text)]'
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="text-[8px] uppercase tracking-wider opacity-50">{t.category}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Saved Templates */}
            {savedTemplates.length > 0 && (
              <>
                <div className="px-4 py-2 text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider">Saved</div>
                {savedTemplates.map(t => (
                  <div key={t.id} className="flex items-center group">
                    <button
                      onClick={() => { setSelectedTemplateId(t.id); setIsCustom(false); }}
                      className={`flex-1 text-left px-4 py-2.5 text-xs transition-colors truncate ${
                        !isCustom && selectedTemplateId === t.id
                          ? 'bg-[var(--t-primary-dim)] text-[var(--t-primary)] font-bold'
                          : 'text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-text)]'
                      }`}
                    >
                      {t.name}
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="p-1.5 mr-2 opacity-0 group-hover:opacity-100 hover:text-[var(--t-error)] transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Write Custom */}
            <button
              onClick={() => setIsCustom(true)}
              className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors flex items-center gap-2 border-t border-[var(--t-border)] ${
                isCustom
                  ? 'bg-[var(--t-accent)]/10 text-[var(--t-accent)]'
                  : 'text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-text)]'
              }`}
            >
              <Plus size={14} />
              Write Custom Script
            </button>
          </div>

          {/* Right: Script Preview / Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Script Name + Actions */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--t-border)]">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-[var(--t-primary)]" />
                <span className="text-sm font-bold text-[var(--t-text)]">{currentName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowVarHelp(!showVarHelp)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                    showVarHelp ? 'bg-[var(--t-accent)]/20 text-[var(--t-accent)]' : 'bg-[var(--t-surface-hover)] text-[var(--t-text-muted)]'
                  }`}
                >
                  <Sparkles size={10} />
                  Variables
                </button>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-[var(--t-primary)] text-white text-[10px] font-bold flex items-center gap-1.5 hover:bg-[var(--t-primary-active)] transition-all active:scale-95"
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {copied ? 'Copied!' : 'Copy Script'}
                </button>
              </div>
            </div>

            {/* Variable Help Panel */}
            {showVarHelp && (
              <div className="px-5 py-3 border-b border-[var(--t-border)] bg-[var(--t-surface-hover)]/50">
                <p className="text-[10px] font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-wider">Available Variables (Click to Insert)</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map(v => (
                    <button
                      key={v.key}
                      onClick={() => {
                        if (isCustom) {
                          setCustomBody(prev => prev + v.key);
                        }
                      }}
                      className="px-2 py-1 rounded-md bg-[var(--t-surface)] border border-[var(--t-border)] text-[9px] font-mono text-[var(--t-accent)] hover:bg-[var(--t-accent)]/10 transition-colors"
                      title={`${v.group}: ${v.label}`}
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Script Content */}
            <div className="flex-1 overflow-y-auto">
              {isCustom ? (
                <div className="h-full flex flex-col">
                  <textarea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder="Write your custom call script here... Use {{lead.name}}, {{lead.phone}}, etc. for dynamic variables."
                    className="flex-1 w-full p-5 bg-transparent text-sm text-[var(--t-text)] resize-none focus:outline-none font-mono leading-relaxed"
                    style={{ minHeight: '300px' }}
                  />
                  {/* Save Custom Template */}
                  <div className="px-5 py-3 border-t border-[var(--t-border)] flex items-center gap-2">
                    {showSaveInput ? (
                      <>
                        <input
                          value={saveTemplateName}
                          onChange={(e) => setSaveTemplateName(e.target.value)}
                          placeholder="Template name..."
                          className="flex-1 px-3 py-2 rounded-lg bg-[var(--t-input-bg)] border border-[var(--t-input-border)] text-xs text-[var(--t-text)] focus:outline-none focus:border-[var(--t-primary)]"
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                        />
                        <button
                          onClick={handleSaveTemplate}
                          disabled={!saveTemplateName.trim() || !customBody.trim()}
                          className="px-3 py-2 rounded-lg bg-[var(--t-success)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-30 transition-all flex items-center gap-1.5"
                        >
                          <Save size={12} /> Save
                        </button>
                        <button
                          onClick={() => { setShowSaveInput(false); setSaveTemplateName(''); }}
                          className="px-3 py-2 rounded-lg bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] text-xs font-bold hover:text-white transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowSaveInput(true)}
                        className="px-4 py-2 rounded-lg bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] text-xs font-bold hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <Save size={12} /> Save as Template
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  <pre className="whitespace-pre-wrap text-sm text-[var(--t-text)] font-sans leading-relaxed">
                    {filledScript || 'Select a template from the library to preview your script.'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
