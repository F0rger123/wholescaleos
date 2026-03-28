import { useState, useRef } from 'react';
import { useStore, Lead } from '../store/useStore';
import { 
  FileText, Download, Mail, Save, Plus, Search, 
  ChevronDown, User, FileSignature
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';

interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  isCustom?: boolean;
}

const PREBUILT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'wholesale-purchase',
    name: 'Wholesale Purchase Agreement',
    category: 'Acquisitions',
    content: `
      <h1>PURCHASE AND SALE AGREEMENT</h1>
      <p>This Agreement is made and entered into on <strong>{{date}}</strong> by and between:</p>
      
      <p><strong>SELLER:</strong> {{lead.name}}<br/>
         Email: {{lead.email}}<br/>
         Phone: {{lead.phone}}</p>
         
      <p><strong>BUYER:</strong> [Your Company Name]</p>
      
      <h2>1. PROPERTY DESCRIPTION</h2>
      <p>The Seller agrees to sell and Buyer agrees to purchase the property located at:<br/>
      <strong>{{lead.propertyAddress}}</strong> (the "Property")</p>
      
      <h2>2. PURCHASE PRICE</h2>
      <p>The total purchase price for the Property is <strong>\${{lead.offerAmount}}</strong>.</p>
      
      <h2>3. EARNEST MONEY</h2>
      <p>Buyer shall deposit earnest money in the amount of $1,000 to the title company within 3 business days of acceptance.</p>
      
      <h2>4. CLOSING DATE</h2>
      <p>This transaction shall close on or before 30 days from the effective date of this agreement.</p>
      
      <h2>5. 'AS-IS' CONDITION</h2>
      <p>Buyer is purchasing the Property in "AS-IS" condition. Seller is not required to make any repairs.</p>
      
      <h2>6. RIGHT TO ASSIGN</h2>
      <p>Buyer may assign this Agreement to another entity or individual prior to closing.</p>

      <div style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div style="border-top: 1px solid black; width: 45%; padding-top: 10px;">Seller Signature</div>
        <div style="border-top: 1px solid black; width: 45%; padding-top: 10px;">Buyer Signature</div>
      </div>
    `
  },
  {
    id: 'assignment-contract',
    name: 'Assignment of Contract',
    category: 'Dispositions',
    content: `
      <h1>ASSIGNMENT OF REAL ESTATE CONTRACT</h1>
      <p>This Assignment is entered into on <strong>{{date}}</strong>.</p>
      
      <p><strong>ASSIGNOR:</strong> [Your Company Name]</p>
      <p><strong>ASSIGNEE:</strong> ___________________________</p>
      
      <h2>1. ASSIGNMENT</h2>
      <p>Assignor hereby assigns all right, title, and interest in the Purchase Agreement dated [Date of original contract] for the property located at <strong>{{lead.propertyAddress}}</strong>.</p>
      
      <h2>2. ASSIGNMENT FEE</h2>
      <p>Assignee agrees to pay an assignment fee of $__________ to Assignor.</p>

      <h2>3. ASSUMPTION</h2>
      <p>Assignee accepts the terms of the original Purchase Agreement and assumes all obligations thereunder.</p>

      <div style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div style="border-top: 1px solid black; width: 45%; padding-top: 10px;">Assignor Signature</div>
        <div style="border-top: 1px solid black; width: 45%; padding-top: 10px;">Assignee Signature</div>
      </div>
    `
  },
  {
    id: 'fix-flip',
    name: 'Fix & Flip Contract',
    category: 'Acquisitions',
    content: `
      <h1>FIX & FLIP JOINT VENTURE AGREEMENT</h1>
      <p>Agreement effective as of <strong>{{date}}</strong> regarding the property at <strong>{{lead.propertyAddress}}</strong>.</p>
      <p><strong>Owner:</strong> {{lead.name}}</p>
      <p>This outlines the responsibilities of both parties to remodel and resell the property for profit...</p>
    `
  },
  {
    id: 'seller-financing',
    name: 'Seller Financing Agreement',
    category: 'Creative Finance',
    content: `
      <h1>SELLER FINANCING ADDENDUM</h1>
      <p>Property: <strong>{{lead.propertyAddress}}</strong></p>
      <p>Seller: <strong>{{lead.name}}</strong></p>
      <p>Principal Amount: <strong>\${{lead.offerAmount}}</strong></p>
      <p>This addendum establishes the terms under which the seller provides financing to the buyer.</p>
    `
  },
  {
    id: 'standard-purchase',
    name: 'Standard Purchase Agreement',
    category: 'Acquisitions',
    content: `
      <h1>RESIDENTIAL PURCHASE AGREEMENT</h1>
      <p>Date: <strong>{{date}}</strong></p>
      <p>Property: <strong>{{lead.propertyAddress}}</strong></p>
      <p>Seller: <strong>{{lead.name}}</strong></p>
      <p>Purchase Price: <strong>\${{lead.offerAmount}}</strong></p>
      <p>Standard residential real estate purchase terms apply.</p>
    `
  },
  {
    id: 'lease-agreement',
    name: 'Lease Agreement',
    category: 'Property Management',
    content: `
      <h1>RESIDENTIAL LEASE AGREEMENT</h1>
      <p>Tenant: <strong>{{lead.name}}</strong></p>
      <p>Property: <strong>{{lead.propertyAddress}}</strong></p>
      <p>Term begins on <strong>{{date}}</strong>.</p>
      <p>Tenant agrees to pay monthly rent...</p>
    `
  },
  {
    id: 'option-contract',
    name: 'Option Contract',
    category: 'Creative Finance',
    content: `
      <h1>REAL ESTATE OPTION AGREEMENT</h1>
      <p>Date: <strong>{{date}}</strong></p>
      <p>Seller (Optionor): <strong>{{lead.name}}</strong></p>
      <p>Property: <strong>{{lead.propertyAddress}}</strong></p>
      <p>Buyer (Optionee) is granted the exclusive right and option to purchase the property for <strong>\${{lead.offerAmount}}</strong> on or before [Expiration Date].</p>
    `
  }
];

export default function Contracts() {
  const { leads } = useStore();
  
  const [activeTemplate, setActiveTemplate] = useState<ContractTemplate>(PREBUILT_TEMPLATES[0]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isExporting, setIsExporting] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  // Parse template with lead data
  const renderTemplateContent = (template: string, lead?: Lead) => {
    let html = template;
    const now = format(new Date(), 'MMMM do, yyyy');
    
    html = html.replace(/{{date}}/g, now);
    
    if (lead) {
      html = html.replace(/{{lead.name}}/g, lead.name || '[Lead Name]');
      html = html.replace(/{{lead.email}}/g, lead.email || '[Lead Email]');
      html = html.replace(/{{lead.phone}}/g, lead.phone || '[Lead Phone]');
      html = html.replace(/{{lead.propertyAddress}}/g, lead.propertyAddress || '[Property Address]');
      html = html.replace(/{{lead.estimatedValue}}/g, lead.estimatedValue?.toLocaleString() || '[Estimated Value]');
      html = html.replace(/{{lead.offerAmount}}/g, lead.offerAmount?.toLocaleString() || '[Offer Amount]');
    } else {
      // Unfilled placeholders
      html = html.replace(/{{lead.name}}/g, '<span class="text-[var(--t-warning)] bg-[var(--t-warning-dim)] px-1 rounded">[Lead Name]</span>');
      html = html.replace(/{{lead.email}}/g, '<span class="text-[var(--t-warning)] bg-[var(--t-warning-dim)] px-1 rounded">[Lead Email]</span>');
      html = html.replace(/{{lead.phone}}/g, '<span class="text-[var(--t-warning)] bg-[var(--t-warning-dim)] px-1 rounded">[Lead Phone]</span>');
      html = html.replace(/{{lead.propertyAddress}}/g, '<span class="text-[var(--t-warning)] bg-[var(--t-warning-dim)] px-1 rounded">[Property Address]</span>');
      html = html.replace(/{{lead.estimatedValue}}/g, '<span class="text-[var(--t-warning)] bg-[var(--t-warning-dim)] px-1 rounded">[Estimated Value]</span>');
      html = html.replace(/{{lead.offerAmount}}/g, '<span class="text-[var(--t-warning)] bg-[var(--t-warning-dim)] px-1 rounded">[Offer Amount]</span>');
    }

    return html;
  };

  const generatePDF = async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    
    try {
      const element = documentRef.current;
      const opt = {
        margin:       1,
        filename:     `${activeTemplate.name.replace(/\s+/g, '_')}_${selectedLead?.name.replace(/\s+/g, '_') || 'Draft'}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Check console.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToLead = () => {
    if (!selectedLead) {
      alert('Please select a lead first to attach this document to.');
      return;
    }
    // Simulation
    alert(`Document "${activeTemplate.name}" mock-saved to lead ${selectedLead.name}'s profile!`);
  };

  const handleEmailLead = () => {
    if (!selectedLead || !selectedLead.email) {
      alert('Please select a lead with a valid email address.');
      return;
    }
    // Simulation
    alert(`Document "${activeTemplate.name}" attached and email draft created for ${selectedLead.email}!`);
  };

  return (
    <div className="flex h-full bg-[var(--t-bg)]">
      {/* Sidebar - Templates */}
      <div className="w-80 flex flex-col border-r border-[var(--t-border)] bg-[var(--t-surface)] z-10">
        <div className="p-6 border-b border-[var(--t-border)]">
          <h2 className="text-xl font-bold text-[var(--t-text)] flex items-center gap-2">
            <FileSignature className="text-[var(--t-primary)]" />
            Contracts
          </h2>
          <p className="text-xs text-[var(--t-text-muted)] mt-1">
            Pre-built and custom templates
          </p>
        </div>

        <div className="p-4 border-b border-[var(--t-border)]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)]" />
            <input 
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-border)] text-[var(--t-text)] focus:ring-2 focus:ring-[var(--t-primary)] outline-none"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {['Acquisitions', 'Dispositions', 'Creative Finance', 'Property Management'].map(category => {
            const temps = PREBUILT_TEMPLATES.filter(t => t.category === category && t.name.toLowerCase().includes(searchQuery.toLowerCase()));
            if (temps.length === 0) return null;
            
            return (
              <div key={category}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--t-text-muted)] mb-3 px-2">
                  {category}
                </h3>
                <div className="space-y-1">
                  {temps.map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => setActiveTemplate(tmpl)}
                      className={`w-full flex items-start text-left p-3 rounded-xl transition-all ${
                        activeTemplate.id === tmpl.id 
                          ? 'bg-[var(--t-primary-dim)] border border-[var(--t-primary)] shadow-[var(--t-glow-shadow)]' 
                          : 'hover:bg-[var(--t-surface-hover)] border border-transparent'
                      }`}
                    >
                      <FileText size={16} className={`mt-0.5 shrink-0 mr-3 ${activeTemplate.id === tmpl.id ? 'text-[var(--t-primary)]' : 'text-[var(--t-text-muted)]'}`} />
                      <div>
                        <p className={`text-sm font-medium ${activeTemplate.id === tmpl.id ? 'text-[var(--t-primary-text)]' : 'text-[var(--t-text)]'}`}>
                          {tmpl.name}
                        </p>
                        {tmpl.isCustom && <span className="text-[9px] bg-[var(--t-surface-subtle)] px-2 py-0.5 rounded-full mt-1 inline-block">Custom</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-[var(--t-border)]">
          <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--t-border)] border-dashed hover:border-[var(--t-primary)] hover:bg-[var(--t-primary-dim)] hover:text-[var(--t-primary)] transition-colors text-sm text-[var(--t-text-muted)]">
            <Plus size={16} />
            Upload Custom Template
          </button>
        </div>
      </div>

      {/* Main Content - Editor/Preview */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--t-surface-dim)]">
        {/* Toolbar */}
        <div className="h-20 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-8 px-6 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-6 flex-1 max-w-lg">
            <div>
              <label className="text-xs font-medium text-[var(--t-text-muted)] mb-1 block">Data Source (Lead)</label>
              <div className="relative">
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-[300px] appearance-none pl-10 pr-10 py-2.5 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-border)] text-[var(--t-text)] focus:ring-2 focus:ring-[var(--t-primary)] outline-none"
                >
                  <option value="">-- View Blank Template --</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} • {lead.propertyAddress?.split(',')[0]}
                    </option>
                  ))}
                </select>
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)]" />
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)] pointer-events-none" />
              </div>
            </div>
            
            {selectedLead && (
              <div className="h-10 w-px bg-[var(--t-border)]" />
            )}
            
            {selectedLead && (
               <div className="flex flex-col justify-center">
                 <p className="text-xs font-semibold text-[var(--t-text)] truncate">{selectedLead.propertyAddress}</p>
                 <p className="text-[10px] text-[var(--t-text-muted)]">Valued at ${selectedLead.estimatedValue?.toLocaleString()}</p>
               </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleEmailLead}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-[var(--t-border)] hover:bg-[var(--t-surface-hover)] text-[var(--t-text)]"
            >
              <Mail size={16} /> Email
            </button>
            <button 
              onClick={handleSaveToLead}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-[var(--t-border)] hover:bg-[var(--t-surface-hover)] text-[var(--t-text)]"
            >
              <Save size={16} /> Save to Lead
            </button>
            <button 
              onClick={generatePDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-colors bg-[var(--t-primary)] text-white hover:bg-[var(--t-primary)]/90 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="flex-1 overflow-y-auto p-12 flex justify-center pb-24" style={{ 
          backgroundImage: 'radial-gradient(circle at center, var(--t-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}>
          {/* Document Container */}
          <div 
            className="w-[8.5in] min-h-[11in] bg-white shadow-2xl rounded-sm p-[1in] shrink-0 text-gray-800 transition-all doc-container"
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0,0,0,0.05)'
            }}
          >
            {/* The actual printable area */}
            <div 
              ref={documentRef}
              className="prose prose-sm max-w-none contract-content"
              style={{
                fontFamily: '"Times New Roman", Times, serif',
                lineHeight: '1.6',
              }}
              dangerouslySetInnerHTML={{ 
                __html: renderTemplateContent(activeTemplate.content, selectedLead) 
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Global styles for the injected HTML content */}
      <style>{`
        .contract-content h1 {
          text-align: center;
          font-size: 1.5rem;
          margin-bottom: 2rem;
          text-transform: uppercase;
        }
        .contract-content h2 {
          font-size: 1.1rem;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
        }
        .contract-content p {
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
