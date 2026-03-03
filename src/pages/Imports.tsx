import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  useStore,
  type ImportSource,
  type ColumnMapping,
  type ScrapedPropertyData,
  type PropertyType,
  type LeadSource,
  parsePastedData,
  type ParsedPasteResult,
  DETECTED_TYPE_COLORS,
  DETECTED_TYPE_TO_TARGET,
} from '../store/useStore';
import {
  fetchGoogleSheet,
  smartDetectColumns,
  isGoogleSheetsUrl,
} from '../lib/google-sheets';
import { supabase } from '../lib/supabase';
import {
  FileSpreadsheet, Globe, FileText, Link2, ArrowRight, ArrowLeft,
  Search, Check, X, ChevronDown, Upload, Download, Trash2,
  AlertTriangle, CheckCircle2, XCircle, Loader2, Eye, Users,
  RefreshCw, Copy, Plus, Settings, Shield,
  GripVertical, MapPin, DollarSign, User, Mail, Phone, Home,
  StickyNote, Clock, Filter, FileImage, Sparkles, ClipboardPaste,
  Type, AtSign, TableProperties,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

// ─── Constants ──────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<ImportSource, { label: string; icon: React.ElementType; color: string; bg: string; border: string; desc: string }> = {
  'google-sheets': { label: 'Google Sheets', icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', desc: 'Import leads from a shared Google Sheet — no API key needed' },
  'homes-com': { label: 'Homes.com', icon: Home, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', desc: 'Scrape property data from Homes.com listings' },
  'url': { label: 'Any URL', icon: Globe, color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', desc: 'Smart-detect property data from any website' },
  'pdf': { label: 'PDF Upload', icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', desc: 'Extract lead data from PDF documents' },
  'csv': { label: 'CSV Upload', icon: FileSpreadsheet, color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', desc: 'Upload a CSV file' },
  'smart-paste': { label: 'Smart Paste', icon: ClipboardPaste, color: 'text-pink-400', bg: 'bg-pink-500/15', border: 'border-pink-500/30', desc: 'Paste any text — AI auto-detects fields' },
};

const TARGET_FIELDS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: 'name', label: 'Owner Name', icon: User },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'propertyAddress', label: 'Property Address', icon: MapPin },
  { value: 'estimatedValue', label: 'Estimated Value', icon: DollarSign },
  { value: 'propertyType', label: 'Property Type', icon: Home },
  { value: 'notes', label: 'Notes', icon: StickyNote },
  { value: 'skip', label: '— Skip Field —', icon: X },
];

const inputClass = 'w-full px-3 py-2.5 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50';

function parseValue(raw: string): number {
  return parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
}

function mapPropertyType(raw: string): PropertyType {
  const lower = raw.toLowerCase();
  if (lower.includes('multi')) return 'multi-family';
  if (lower.includes('commercial') || lower.includes('retail')) return 'commercial';
  if (lower.includes('land') || lower.includes('lot')) return 'land';
  if (lower.includes('condo') || lower.includes('apartment')) return 'condo';
  return 'single-family';
}

// ─── Confidence Badge ───────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'text-emerald-400 bg-emerald-500/15' : score >= 70 ? 'text-amber-400 bg-amber-500/15' : 'text-red-400 bg-red-500/15';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>
      {score}%
    </span>
  );
}

// ─── Import Status Badge ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; icon: React.ElementType }> = {
    completed: { color: 'text-emerald-400 bg-emerald-500/15', icon: CheckCircle2 },
    failed: { color: 'text-red-400 bg-red-500/15', icon: XCircle },
    importing: { color: 'text-blue-400 bg-blue-500/15', icon: Loader2 },
    pending: { color: 'text-amber-400 bg-amber-500/15', icon: Clock },
    mapping: { color: 'text-purple-400 bg-purple-500/15', icon: Settings },
    reviewing: { color: 'text-cyan-400 bg-cyan-500/15', icon: Eye },
  };
  const c = configs[status] || configs.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.color}`}>
      <c.icon size={11} className={status === 'importing' ? 'animate-spin' : ''} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function Imports() {
  const {
    importTemplates, importHistory, duplicateSettings,
    addImportTemplate, deleteImportTemplate,
    addImportHistory, updateDuplicateSettings,
    getMockScrapedProperty, getMockPdfExtraction,
    importLeadsFromData, addLead, teamId,
  } = useStore();

  // Custom Fields State
  const [customFields, setCustomFields] = useState<Array<{ id: string; name: string; field_key: string; field_type: 'text' | 'number' }>>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number'>('text');
  const [fieldSaveSuccess, setFieldSaveSuccess] = useState(false);

  // Load custom fields from Supabase
  useEffect(() => {
    if (!supabase || !teamId) return;
    
    const loadCustomFields = async () => {
      const { data, error } = await supabase!
        .from('custom_fields')
        .select('*')
        .eq('team_id', teamId)
        .order('display_order');
      
      if (error) {
        console.error('Error loading custom fields:', error);
      } else if (data) {
        setCustomFields(data);
      }
    };
    
    loadCustomFields();
  }, [teamId]);

  // Wizard state
  const [activeView, setActiveView] = useState<'home' | 'wizard'>('home');
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);

  // Source-specific state
  const [sheetUrl, setSheetUrl] = useState('');
  const [homesUrl, setHomesUrl] = useState('');
  const [genericUrl, setGenericUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Sheet data
  const [sheetData, setSheetData] = useState<Record<string, string>[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');

  // Scraped data
  const [scrapedData, setScrapedData] = useState<ScrapedPropertyData[]>([]);
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set());

  // Import results
  const [importResult, setImportResult] = useState<{ total: number; imported: number; skipped: number; duplicates: number } | null>(null);

  // Smart Paste state
  const [pastedText, setPastedText] = useState('');
  const [parseResult, setParseResult] = useState<ParsedPasteResult | null>(null);
  const [pasteColumnMappings, setPasteColumnMappings] = useState<ColumnMapping[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editedRows, setEditedRows] = useState<string[][]>([]);

  // History filter
  const [historyFilter, setHistoryFilter] = useState<ImportSource | 'all'>('all');

  // ─── Reset ──────────────────────────────────────────────

  const resetWizard = useCallback(() => {
    setWizardStep(0);
    setSelectedSource(null);
    setSheetUrl('');
    setHomesUrl('');
    setGenericUrl('');
    setIsLoading(false);
    setIsConnected(false);
    setSheetData([]);
    setColumnMappings([]);
    setSelectedTemplate(null);
    setTemplateName('');
    setScrapedData([]);
    setSelectedForImport(new Set());
    setImportResult(null);
    setPastedText('');
    setParseResult(null);
    setPasteColumnMappings([]);
    setEditingCell(null);
    setEditedRows([]);
    setConnectionError(null);
    setActiveView('home');
  }, []);

  // ─── Connect / Fetch data ──────────────────────────────

  // Connection error message
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connectGoogleSheets = async () => {
    setConnectionError(null);

    if (!sheetUrl.trim()) {
      setConnectionError('Please paste a Google Sheets URL first.');
      return;
    }

    if (!isGoogleSheetsUrl(sheetUrl)) {
      setConnectionError('This doesn\'t look like a Google Sheets URL. Please paste the full URL from your browser (e.g., https://docs.google.com/spreadsheets/d/...)');
      return;
    }

    setIsLoading(true);

    try {
      const result = await fetchGoogleSheet(sheetUrl);

      if (!result.success) {
        setConnectionError(result.error || 'Failed to fetch sheet. Make sure it is publicly accessible.');
        setIsLoading(false);
        return;
      }

      if (result.data.length === 0) {
        setConnectionError('No data found in the sheet. Make sure it has headers in the first row and data below.');
        setIsLoading(false);
        return;
      }

      setSheetData(result.data);

      // Use smart column detection based on headers AND data content
      const smartMappings = smartDetectColumns(result.headers, result.data);
      const columnMaps: ColumnMapping[] = smartMappings.map(m => ({
        sourceColumn: m.sourceColumn,
        targetField: m.targetField,
        confidence: m.confidence,
        sample: m.sample,
      }));

      setColumnMappings(columnMaps);
      setIsConnected(true);
      setIsLoading(false);
      setWizardStep(1);
    } catch (err) {
      setConnectionError(`Failed to fetch sheet: ${err instanceof Error ? err.message : 'Unknown error'}. Try using "Smart Paste" instead — copy data from your sheet and paste it.`);
      setIsLoading(false);
    }
  };

  const scrapeHomesUrl = () => {
    setIsLoading(true);
    setTimeout(() => {
      const property = getMockScrapedProperty(homesUrl);
      setScrapedData([property]);
      setSelectedForImport(new Set([0]));
      setIsLoading(false);
      setWizardStep(1);
    }, 2000);
  };

  const scrapeGenericUrl = () => {
    setIsLoading(true);
    setTimeout(() => {
      const property = getMockScrapedProperty(genericUrl);
      setScrapedData([{ ...property, source: 'URL Import', sourceUrl: genericUrl }]);
      setSelectedForImport(new Set([0]));
      setIsLoading(false);
      setWizardStep(1);
    }, 2000);
  };

  const uploadPdf = () => {
    setIsLoading(true);
    setTimeout(() => {
      const extracted = getMockPdfExtraction();
      setScrapedData(extracted);
      setSelectedForImport(new Set(extracted.map((_, i) => i)));
      setIsLoading(false);
      setWizardStep(1);
    }, 2500);
  };

  // ─── Apply template ────────────────────────────────────

  const applyTemplate = (templateId: string) => {
    const t = importTemplates.find(tp => tp.id === templateId);
    if (!t) return;
    setSelectedTemplate(templateId);
    // Override column mappings with template mappings where they match
    setColumnMappings(prev => prev.map(cm => {
      const match = t.mappings.find(m => m.sourceColumn === cm.sourceColumn);
      return match ? { ...cm, targetField: match.targetField, confidence: match.confidence } : cm;
    }));
  };

  // ─── Update mapping ────────────────────────────────────

  const updateMapping = (index: number, targetField: string) => {
    setColumnMappings(prev => prev.map((m, i) => i === index ? { ...m, targetField, confidence: targetField === 'skip' ? 0 : Math.max(m.confidence, 80) } : m));
  };

  // ─── Import from sheet ─────────────────────────────────

  const importFromSheet = async () => {
    setIsLoading(true);
    setImportResult(null);
    
    try {
      // Map each row to a lead object
      const rows = sheetData.map(row => {
        const mapped: Record<string, string> = {};
        columnMappings.forEach(m => {
          if (m.targetField !== 'skip') {
            mapped[m.targetField] = row[m.sourceColumn] || '';
          }
        });
        
        // Build lead with proper field mapping
        const lead: any = {
          name: mapped.name || '',
          email: mapped.email || '',
          phone: mapped.phone || '',
          propertyAddress: mapped.propertyAddress || '',
          estimatedValue: parseFloat(mapped.estimatedValue?.replace(/[^0-9.-]/g, '') || '0') || 0,
          notes: mapped.notes || '',
          status: 'new',
        };
        
        // Add custom field values
        customFields.forEach(field => {
          if (mapped[field.field_key]) {
            lead[field.field_key] = mapped[field.field_key];
          }
        });
        
        return lead;
      }).filter(lead => lead.name || lead.propertyAddress); // Only keep leads with at least name or address

      if (rows.length === 0) {
        alert('❌ No valid leads found to import');
        setIsLoading(false);
        return;
      }

      alert(`📊 Starting import of ${rows.length} leads...`);

      let imported = 0;
      const errors: string[] = [];

      for (const lead of rows) {
        try {
          await addLead(lead);
          imported++;
        } catch (err: any) {
          errors.push(err.message);
          console.error('Failed to import lead:', err);
        }
      }

      const duplicates = rows.length - imported;

      setImportResult({
        total: rows.length,
        imported,
        skipped: 0,
        duplicates,
      });

      addImportHistory({
        source: 'google-sheets',
        sourceName: sheetUrl || 'Google Sheets Import',
        status: 'completed',
        totalRows: rows.length,
        importedCount: imported,
        skippedCount: 0,
        duplicateCount: duplicates,
        templateUsed: selectedTemplate ? importTemplates.find(t => t.id === selectedTemplate)?.name : undefined,
        errors,
      });

      if (errors.length === 0) {
        alert(`✅ Successfully imported ${imported} leads!`);
      } else {
        alert(`⚠️ Imported ${imported} leads, ${errors.length} errors. Check console.`);
      }

      setWizardStep(3);
    } catch (err: any) {
      alert(`❌ Import failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Import from scraped ───────────────────────────────

  const importFromScraped = () => {
    setIsLoading(true);
    setTimeout(() => {
      const rows = scrapedData
        .filter((_, i) => selectedForImport.has(i))
        .map(d => ({
          name: d.owner || 'Unknown Owner',
          email: '',
          phone: '',
          address: d.address || '',
          value: d.price || 0,
          propertyType: mapPropertyType(d.propertyType || 'single-family') as PropertyType,
          source: (selectedSource === 'homes-com' ? 'website' : 'other') as LeadSource,
          notes: `Imported from ${d.source}. ${d.sourceUrl ? `URL: ${d.sourceUrl}` : ''} ${d.beds ? `${d.beds}bd/${d.baths}ba` : ''} ${d.sqft ? `${d.sqft}sqft` : ''}`.trim(),
        }));

      const imported = importLeadsFromData(rows);

      setImportResult({
        total: rows.length,
        imported,
        skipped: scrapedData.length - rows.length,
        duplicates: rows.length - imported,
      });

      addImportHistory({
        source: selectedSource || 'url',
        sourceName: selectedSource === 'homes-com' ? (homesUrl || 'Homes.com Import')
          : selectedSource === 'pdf' ? 'PDF Upload'
          : (genericUrl || 'URL Import'),
        status: 'completed',
        totalRows: scrapedData.length,
        importedCount: imported,
        skippedCount: scrapedData.length - rows.length,
        duplicateCount: rows.length - imported,
        errors: [],
      });

      setIsLoading(false);
      setWizardStep(3);
    }, 1500);
  };

  // ─── Smart Paste handlers ─────────────────────────────

  const analyzePastedText = () => {
    if (!pastedText.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      const result = parsePastedData(pastedText);
      setParseResult(result);
      setEditedRows(result.rows.map(r => [...r]));

      // Auto-generate column mappings from detected types
      const mappings: ColumnMapping[] = result.columns.map(col => ({
        sourceColumn: col.name,
        targetField: DETECTED_TYPE_TO_TARGET[col.detectedType] || 'skip',
        confidence: col.confidence,
        sample: col.samples[0] || '',
      }));
      setPasteColumnMappings(mappings);
      setIsLoading(false);
      setWizardStep(1);
    }, 1200);
  };

  const updatePasteMapping = (index: number, targetField: string) => {
    setPasteColumnMappings(prev => prev.map((m, i) =>
      i === index ? { ...m, targetField, confidence: targetField === 'skip' ? 0 : Math.max(m.confidence, 80) } : m
    ));
  };

  const updateCellValue = (row: number, col: number, value: string) => {
    setEditedRows(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = value;
      return next;
    });
  };

  const importFromPaste = () => {
    if (!parseResult) return;
    setIsLoading(true);
    setTimeout(() => {
      const rows = editedRows.map(row => {
        const mapped: Record<string, string> = {};
        pasteColumnMappings.forEach((m, idx) => {
          if (m.targetField !== 'skip') {
            mapped[m.targetField] = row[idx] || '';
          }
        });
        return {
          name: mapped.name || '',
          email: mapped.email || '',
          phone: mapped.phone || '',
          address: mapped.propertyAddress || '',
          value: parseValue(mapped.estimatedValue || '0'),
          propertyType: mapPropertyType(mapped.propertyType || 'single-family') as PropertyType,
          source: 'other' as LeadSource,
          notes: mapped.notes || '',
        };
      }).filter(r => r.name.trim() || r.address.trim());

      const imported = importLeadsFromData(rows);
      const duplicates = rows.length - imported;

      setImportResult({
        total: editedRows.length,
        imported,
        skipped: editedRows.length - rows.length,
        duplicates,
      });

      addImportHistory({
        source: 'smart-paste',
        sourceName: `Smart Paste — ${parseResult.rowCount} rows`,
        status: 'completed',
        totalRows: editedRows.length,
        importedCount: imported,
        skippedCount: editedRows.length - rows.length,
        duplicateCount: duplicates,
        errors: [],
      });

      setIsLoading(false);
      setWizardStep(3);
    }, 1500);
  };

  // ─── Render ────────────────────────────────────────────

  if (activeView === 'wizard' && selectedSource) {
    return (
      <div className="space-y-6">
        {/* Wizard Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={resetWizard} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                {(() => { const C = SOURCE_CONFIG[selectedSource]; return <><C.icon size={22} className={C.color} /> {C.label} Import</>; })()}
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">{SOURCE_CONFIG[selectedSource].desc}</p>
            </div>
          </div>
          <button onClick={resetWizard} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {['Connect', selectedSource === 'google-sheets' ? 'Map Columns' : 'Review Data', 'Preview', 'Done'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-0.5 ${i <= wizardStep ? 'bg-brand-500' : 'bg-slate-700'}`} />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === wizardStep ? 'bg-brand-600 text-white' : i < wizardStep ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-800 text-slate-500'
              }`}>
                {i < wizardStep ? <Check size={12} /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{i + 1}</span>}
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Step 0: Connect / Enter URL */}
        {wizardStep === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            {selectedSource === 'google-sheets' && (
              <>
                <h2 className="text-lg font-semibold text-white">Import from Google Sheets</h2>
                {!isConnected ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                      <Shield size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-400">No API Key Required</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          We'll fetch your spreadsheet data directly. Just make sure the sheet is <strong className="text-emerald-300">shared as "Anyone with the link can view"</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Step-by-step instructions */}
                    <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">How to share your sheet:</p>
                      <ol className="space-y-2 text-xs text-slate-400">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                          Open your Google Sheet
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                          Click <strong className="text-white">Share</strong> (top right) → Under "General access", change to <strong className="text-white">"Anyone with the link"</strong> → Set to <strong className="text-white">"Viewer"</strong>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                          Copy the URL from your browser address bar and paste below
                        </li>
                      </ol>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">Google Sheets URL</label>
                      <input value={sheetUrl} onChange={(e) => { setSheetUrl(e.target.value); setConnectionError(null); }}
                        placeholder="https://docs.google.com/spreadsheets/d/1abc...xyz/edit"
                        className={inputClass} />
                      {sheetUrl && !isGoogleSheetsUrl(sheetUrl) && (
                        <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                          <AlertTriangle size={11} /> This doesn't look like a Google Sheets URL
                        </p>
                      )}
                    </div>

                    {connectionError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <div className="flex items-start gap-2">
                          <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-400">Connection Failed</p>
                            <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">{connectionError}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-red-500/20 flex items-center gap-2">
                          <p className="text-xs text-slate-500">Alternative:</p>
                          <button onClick={() => { setSelectedSource('smart-paste'); setConnectionError(null); }}
                            className="text-xs text-pink-400 hover:text-pink-300 font-medium flex items-center gap-1">
                            <ClipboardPaste size={11} /> Use Smart Paste instead — copy data from your sheet and paste it
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button onClick={connectGoogleSheets} disabled={isLoading || !sheetUrl.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors">
                        {isLoading ? <><Loader2 size={16} className="animate-spin" /> Fetching sheet data...</> : <><Download size={16} /> Fetch Sheet Data</>}
                      </button>
                      <span className="text-xs text-slate-500">or</span>
                      <button onClick={() => setSelectedSource('smart-paste')}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition-colors border border-slate-700">
                        <ClipboardPaste size={14} /> Smart Paste
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <CheckCircle2 size={20} className="text-emerald-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-400">Sheet Loaded Successfully!</p>
                        <p className="text-xs text-slate-400">Found <strong className="text-white">{sheetData.length} rows</strong> with <strong className="text-white">{Object.keys(sheetData[0] || {}).length} columns</strong></p>
                      </div>
                      <button onClick={() => setWizardStep(1)} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-xl font-medium">
                        Map Columns <ArrowRight size={14} />
                      </button>
                    </div>

                    {/* Quick data preview */}
                    <div className="bg-slate-800 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-300 mb-2">Quick Preview (first 3 rows):</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-700">
                              {Object.keys(sheetData[0] || {}).map(h => (
                                <th key={h} className="px-2 py-1.5 text-left text-slate-400 font-medium whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sheetData.slice(0, 3).map((row, i) => (
                              <tr key={i} className="border-b border-slate-700/50">
                                {Object.keys(sheetData[0] || {}).map(h => (
                                  <td key={h} className="px-2 py-1.5 text-slate-300 whitespace-nowrap max-w-[200px] truncate">{row[h] || '—'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedSource === 'homes-com' && (
              <>
                <h2 className="text-lg font-semibold text-white">Import from Homes.com</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Homes.com Listing URL</label>
                    <input value={homesUrl} onChange={(e) => setHomesUrl(e.target.value)}
                      placeholder="https://www.homes.com/listing/..."
                      className={inputClass} />
                  </div>
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <p className="text-xs text-slate-400"><span className="text-blue-400 font-medium">Smart Scraper</span> — We'll extract: address, price, beds/baths, sqft, property type, listing date, and owner info (when available).</p>
                  </div>
                  <button onClick={scrapeHomesUrl} disabled={isLoading || !homesUrl.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors">
                    {isLoading ? <><Loader2 size={16} className="animate-spin" /> Scraping...</> : <><Search size={16} /> Scrape Listing</>}
                  </button>
                </div>
              </>
            )}

            {selectedSource === 'url' && (
              <>
                <h2 className="text-lg font-semibold text-white">Import from Any URL</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Website URL</label>
                    <input value={genericUrl} onChange={(e) => setGenericUrl(e.target.value)}
                      placeholder="https://example.com/property/..."
                      className={inputClass} />
                  </div>
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                    <p className="text-xs text-slate-400"><span className="text-purple-400 font-medium">AI Detection</span> — We'll analyze the page and extract any property/owner data we can find, with confidence scores for each field.</p>
                  </div>
                  <button onClick={scrapeGenericUrl} disabled={isLoading || !genericUrl.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors">
                    {isLoading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Sparkles size={16} /> Analyze URL</>}
                  </button>
                </div>
              </>
            )}

            {selectedSource === 'pdf' && (
              <>
                <h2 className="text-lg font-semibold text-white">Import from PDF</h2>
                <div className="space-y-4">
                  <div
                    onClick={uploadPdf}
                    className="border-2 border-dashed border-slate-600 hover:border-amber-500/50 rounded-2xl p-10 text-center cursor-pointer transition-colors group"
                  >
                    {isLoading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={40} className="text-amber-400 animate-spin" />
                        <p className="text-sm text-amber-400 font-medium">Extracting text & analyzing document...</p>
                        <div className="flex gap-0.5">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload size={40} className="mx-auto mb-3 text-slate-500 group-hover:text-amber-400 transition-colors" />
                        <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                          Click to upload a PDF document
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Tax records, title reports, property lists, lead sheets
                        </p>
                        <div className="flex items-center justify-center gap-4 mt-4">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><FileText size={10} /> PDF</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><FileImage size={10} /> Images</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <p className="text-xs text-slate-400"><span className="text-amber-400 font-medium">OCR + AI</span> — We use OCR to extract text and AI to identify property/owner data with confidence scoring.</p>
                  </div>
                </div>
              </>
            )}

            {selectedSource === 'smart-paste' && (
              <>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles size={20} className="text-pink-400" />
                  Smart Paste — AI Auto-Detection
                </h2>
                <div className="space-y-4">
                  <div className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-xl">
                    <p className="text-xs text-slate-400">
                      <span className="text-pink-400 font-medium">Paste anything</span> — CSV data, tab-separated rows, plain text with addresses/names/phones, email threads, notes, or any unstructured data. Our AI will auto-detect delimiters, column types, and field mappings.
                    </p>
                  </div>

                  {/* Format hints */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { icon: TableProperties, label: 'CSV / TSV', desc: 'Comma or tab separated' },
                      { icon: Type, label: 'Plain Text', desc: 'Names, addresses, phones' },
                      { icon: AtSign, label: 'Email Data', desc: 'Contact info from emails' },
                      { icon: StickyNote, label: 'Notes', desc: 'Unstructured notes' },
                    ].map(hint => (
                      <div key={hint.label} className="bg-slate-800/50 rounded-xl p-3 flex items-start gap-2">
                        <hint.icon size={14} className="text-slate-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-medium text-slate-300">{hint.label}</p>
                          <p className="text-[10px] text-slate-500">{hint.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paste textarea */}
                  <div className="relative">
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      onPaste={(e) => {
                        // Allow natural paste behavior
                        const text = e.clipboardData.getData('text');
                        if (text) {
                          e.preventDefault();
                          setPastedText(text);
                        }
                      }}
                      placeholder={`Paste your data here...\n\nExamples:\nJohn Smith, 1420 Oak St Austin TX, (555) 234-5678, john@email.com, $385,000\nJane Doe, 780 Maple Ave Dallas TX, (555) 876-5432, jane@email.com, $620,000\n\nOr tab-separated:\nName\tAddress\tPhone\tEmail\tValue\nJohn Smith\t1420 Oak St\t(555) 234-5678\tjohn@email.com\t$385,000`}
                      className="w-full h-64 px-4 py-3 text-sm rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 font-mono resize-none"
                    />
                    {pastedText && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          {pastedText.split('\n').filter(l => l.trim()).length} lines · {pastedText.length} chars
                        </span>
                        <button
                          onClick={() => setPastedText('')}
                          className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick paste example buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Try example:</span>
                    <button
                      onClick={() => setPastedText(
                        'Owner Name,Property Address,Phone,Email,Est. Value,Property Type\n' +
                        'Thomas Baker,2450 Riverside Dr Austin TX,(512) 555-0101,tbaker@email.com,$340000,Single Family\n' +
                        'Angela Brooks,890 Summit Blvd Dallas TX,(214) 555-0202,abrooks@email.com,$525000,Multi-Family\n' +
                        'Carlos Mendez,1100 Pecan St San Antonio TX,(210) 555-0303,cmendez@email.com,$185000,Condo\n' +
                        'Rachel Kim,3200 Bay Area Blvd Houston TX,(713) 555-0404,rkim@email.com,$410000,Single Family\n' +
                        'Derek Washington,750 Legacy Dr Plano TX,(972) 555-0505,dwash@email.com,$680000,Single Family'
                      )}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-pink-400 hover:bg-pink-500/10 border border-slate-700 hover:border-pink-500/30 transition-all"
                    >
                      CSV with headers
                    </button>
                    <button
                      onClick={() => setPastedText(
                        'John Smith\t1420 Oak St, Austin, TX 78701\t(555) 234-5678\tjohn@email.com\t$385,000\n' +
                        'Jane Doe\t780 Maple Ave, Dallas, TX 75201\t(555) 876-5432\tjane@email.com\t$620,000\n' +
                        'Mike Ross\t2100 Elm Blvd, Houston, TX 77002\t(555) 345-6789\tmike@email.com\t$275,000\n' +
                        'Lisa Chen\t450 Pine St, San Antonio, TX 78201\t(555) 567-8901\tlisa@email.com\t$195,000'
                      )}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-pink-400 hover:bg-pink-500/10 border border-slate-700 hover:border-pink-500/30 transition-all"
                    >
                      Tab-separated
                    </button>
                    <button
                      onClick={() => setPastedText(
                        'Got a call from Marcus Johnson (555) 234-5678 about selling his property at 1420 Oak Street, Austin TX. He owes $210k on the mortgage and the place is worth about $385,000. Motivated seller, behind on payments.\n\n' +
                        'Diana Reeves (555) 876-5432 diana.r@email.com - owns duplex at 780 Maple Ave Dallas TX. Estimated value $620k. Relocating out of state. Referred by agent Mike Torres.\n\n' +
                        'Robert Tran at 2100 Elm Blvd Houston TX, phone (555) 345-6789 email r.tran@email.com. Estate sale, family wants quick close. House needs $20k repairs, worth $275,000.'
                      )}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-pink-400 hover:bg-pink-500/10 border border-slate-700 hover:border-pink-500/30 transition-all"
                    >
                      Unstructured text
                    </button>
                  </div>

                  <button
                    onClick={analyzePastedText}
                    disabled={isLoading || !pastedText.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                  >
                    {isLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Analyzing data...</>
                    ) : (
                      <><Sparkles size={16} /> Detect Fields & Parse</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 1: Column Mapping (Sheets) or Review Data (Scraped) */}
        {wizardStep === 1 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            {selectedSource === 'smart-paste' && parseResult ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-pink-400" />
                    AI Detection Results
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {parseResult.rowCount} rows · {parseResult.columns.length} columns · Delimiter: <code className="text-pink-400">{parseResult.delimiter === '\t' ? 'TAB' : parseResult.delimiter === ',' ? 'COMMA' : parseResult.delimiter === '|' ? 'PIPE' : parseResult.delimiter}</code>
                    </span>
                  </div>
                </div>

                {/* Detection summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{parseResult.rowCount}</p>
                    <p className="text-[10px] text-slate-400">Rows Detected</p>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-pink-400">{parseResult.columns.length}</p>
                    <p className="text-[10px] text-slate-400">Columns Found</p>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">
                      {pasteColumnMappings.filter(m => m.targetField !== 'skip').length}
                    </p>
                    <p className="text-[10px] text-slate-400">Auto-Mapped</p>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-amber-400">
                      {Math.round(pasteColumnMappings.reduce((s, m) => s + m.confidence, 0) / Math.max(pasteColumnMappings.length, 1))}%
                    </p>
                    <p className="text-[10px] text-slate-400">Avg Confidence</p>
                  </div>
                </div>

                {/* Column mapping */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Column Mapping</h3>
                  <div className="space-y-2">
                    {pasteColumnMappings.map((mapping, idx) => {
                      const col = parseResult.columns[idx];
                      const typeColor = DETECTED_TYPE_COLORS[col?.detectedType || 'text'];
                      return (
                        <div key={idx} className={`grid grid-cols-12 gap-3 px-3 py-3 rounded-xl border transition-colors ${
                          mapping.targetField === 'skip' ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-800/70 border-slate-700'
                        }`}>
                          <div className="col-span-1 flex items-center">
                            <GripVertical size={14} className="text-slate-600" />
                          </div>
                          <div className="col-span-3 flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">{mapping.sourceColumn}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${typeColor.bg} ${typeColor.text}`}>
                              {typeColor.label}
                            </span>
                          </div>
                          <div className="col-span-1 flex items-center justify-center">
                            <ArrowRight size={14} className={mapping.targetField === 'skip' ? 'text-slate-600' : 'text-pink-400'} />
                          </div>
                          <div className="col-span-3 flex items-center">
                            <div className="relative w-full">
                              <select
                                value={mapping.targetField}
                                onChange={(e) => updatePasteMapping(idx, e.target.value)}
                                className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                              >
                                {TARGET_FIELDS.map(f => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            </div>
                          </div>
                          <div className="col-span-1 flex items-center justify-center">
                            {mapping.targetField !== 'skip' && <ConfidenceBadge score={mapping.confidence} />}
                          </div>
                          <div className="col-span-3 flex items-center">
                            <span className="text-xs text-slate-400 truncate">{col?.samples[0] || '—'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Editable data preview */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    Data Preview
                    <span className="text-[10px] font-normal text-slate-500">(click cells to edit before import)</span>
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800">
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold w-10">#</th>
                          {pasteColumnMappings.map((m, idx) => {
                            const col = parseResult.columns[idx];
                            const typeColor = DETECTED_TYPE_COLORS[col?.detectedType || 'text'];
                            return (
                              <th key={idx} className="px-3 py-2 text-left whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-300 font-semibold">
                                    {TARGET_FIELDS.find(f => f.value === m.targetField)?.label || m.sourceColumn}
                                  </span>
                                  <span className={`text-[8px] px-1 py-0.5 rounded ${typeColor.bg} ${typeColor.text}`}>
                                    {typeColor.label}
                                  </span>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {editedRows.slice(0, 10).map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-t border-slate-800 hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-slate-500">{rowIdx + 1}</td>
                            {row.map((cell, colIdx) => (
                              <td key={colIdx} className="px-1 py-1">
                                {editingCell?.row === rowIdx && editingCell?.col === colIdx ? (
                                  <input
                                    autoFocus
                                    value={cell}
                                    onChange={(e) => updateCellValue(rowIdx, colIdx, e.target.value)}
                                    onBlur={() => setEditingCell(null)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell(null); }}
                                    className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-pink-500/50 text-white focus:outline-none"
                                  />
                                ) : (
                                  <button
                                    onClick={() => setEditingCell({ row: rowIdx, col: colIdx })}
                                    className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-slate-700/50 transition-colors ${
                                      pasteColumnMappings[colIdx]?.targetField === 'skip' ? 'text-slate-500' : 'text-slate-300'
                                    }`}
                                  >
                                    {cell || <span className="text-slate-600 italic">empty</span>}
                                  </button>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {editedRows.length > 10 && (
                    <p className="text-xs text-slate-500 mt-2">Showing first 10 of {editedRows.length} rows</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button onClick={() => setWizardStep(0)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setWizardStep(2)} className="flex items-center gap-1.5 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-sm rounded-xl font-medium transition-colors">
                      Continue to Preview <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            ) : selectedSource === 'google-sheets' ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Map Columns</h2>
                  <div className="flex items-center gap-2">
                    {importTemplates.filter(t => t.source === selectedSource).length > 0 && (
                      <div className="relative">
                        <select
                          value={selectedTemplate || ''}
                          onChange={(e) => e.target.value && applyTemplate(e.target.value)}
                          className="pl-3 pr-8 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        >
                          <option value="">Apply Template...</option>
                          {importTemplates.filter(t => t.source === selectedSource).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-400">
                  Match your spreadsheet columns to WholeScale lead fields. We auto-detected {columnMappings.filter(m => m.targetField !== 'skip').length} of {columnMappings.length} columns.
                </p>

                {/* Mapping table */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    <div className="col-span-1"></div>
                    <div className="col-span-3">Source Column</div>
                    <div className="col-span-1"></div>
                    <div className="col-span-3">Map To</div>
                    <div className="col-span-1">Confidence</div>
                    <div className="col-span-3">Sample Data</div>
                  </div>

                  {columnMappings.map((mapping, idx) => (
                    <div key={idx} className={`grid grid-cols-12 gap-3 px-3 py-3 rounded-xl border transition-colors ${
                      mapping.targetField === 'skip' ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-800/70 border-slate-700'
                    }`}>
                      <div className="col-span-1 flex items-center">
                        <GripVertical size={14} className="text-slate-600" />
                      </div>
                      <div className="col-span-3 flex items-center">
                        <span className="text-sm font-medium text-slate-200">{mapping.sourceColumn}</span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <ArrowRight size={14} className={mapping.targetField === 'skip' ? 'text-slate-600' : 'text-brand-400'} />
                      </div>
                      <div className="col-span-3 flex items-center">
                        <div className="relative w-full">
                          <select
                            value={mapping.targetField}
                            onChange={(e) => updateMapping(idx, e.target.value)}
                            className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                          >
                            {TARGET_FIELDS.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        {mapping.targetField !== 'skip' && <ConfidenceBadge score={mapping.confidence} />}
                      </div>
                      <div className="col-span-3 flex items-center">
                        <span className="text-xs text-slate-400 truncate">{mapping.sample}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Data preview */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Preview (first 5 rows)</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800">
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold">#</th>
                          {columnMappings.filter(m => m.targetField !== 'skip').map(m => (
                            <th key={m.sourceColumn} className="px-3 py-2 text-left text-slate-400 font-semibold whitespace-nowrap">
                              {TARGET_FIELDS.find(f => f.value === m.targetField)?.label || m.targetField}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheetData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                            {columnMappings.filter(m => m.targetField !== 'skip').map(m => (
                              <td key={m.sourceColumn} className="px-3 py-2 text-slate-300 whitespace-nowrap">
                                {row[m.sourceColumn] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{sheetData.length} total rows</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button onClick={() => setWizardStep(0)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setWizardStep(2)} className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-xl font-medium transition-colors">
                      Continue to Preview <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Review scraped data */
              <>
                <h2 className="text-lg font-semibold text-white">Review Extracted Data</h2>
                <p className="text-sm text-slate-400">
                  We found {scrapedData.length} {scrapedData.length === 1 ? 'property' : 'properties'}. Review the data and select which to import.
                </p>

                <div className="space-y-4">
                  {scrapedData.map((property, idx) => (
                    <div key={idx} className={`bg-slate-800 rounded-xl p-5 border transition-colors cursor-pointer ${
                      selectedForImport.has(idx) ? 'border-brand-500 ring-1 ring-brand-500/30' : 'border-slate-700 hover:border-slate-600'
                    }`} onClick={() => {
                      setSelectedForImport(prev => {
                        const next = new Set(prev);
                        next.has(idx) ? next.delete(idx) : next.add(idx);
                        return next;
                      });
                    }}>
                      <div className="flex items-start gap-4">
                        {/* Select checkbox */}
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          selectedForImport.has(idx) ? 'bg-brand-600 border-brand-500' : 'border-slate-600'
                        }`}>
                          {selectedForImport.has(idx) && <Check size={14} className="text-white" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Address + price */}
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <MapPin size={14} className="text-brand-400" />
                                {property.address || 'Unknown Address'}
                                <ConfidenceBadge score={property.confidence.address || 0} />
                              </h3>
                              {property.owner && (
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                  <User size={11} /> Owner: {property.owner}
                                  <ConfidenceBadge score={property.confidence.owner || 0} />
                                </p>
                              )}
                            </div>
                            {property.price && (
                              <div className="text-right shrink-0">
                                <p className="text-lg font-bold text-emerald-400">${property.price.toLocaleString()}</p>
                                <ConfidenceBadge score={property.confidence.price || 0} />
                              </div>
                            )}
                          </div>

                          {/* Property details */}
                          <div className="flex flex-wrap gap-3 mb-3">
                            {property.beds !== undefined && (
                              <span className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded-lg">{property.beds} beds</span>
                            )}
                            {property.baths !== undefined && (
                              <span className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded-lg">{property.baths} baths</span>
                            )}
                            {property.sqft && (
                              <span className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded-lg">{property.sqft.toLocaleString()} sqft</span>
                            )}
                            {property.propertyType && (
                              <span className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded-lg">{property.propertyType}</span>
                            )}
                            {property.listingDate && (
                              <span className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Clock size={10} /> Listed {property.listingDate}
                              </span>
                            )}
                          </div>

                          {/* Source + confidence */}
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Link2 size={10} /> Source: {property.source}
                            </span>
                            {property.images && property.images.length > 0 && (
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <FileImage size={10} /> {property.images.length} images
                              </span>
                            )}
                          </div>

                          {/* Raw metadata */}
                          {Object.keys(property.raw).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-700/50">
                              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Raw Metadata</p>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(property.raw).map(([k, v]) => (
                                  <span key={k} className="text-[10px] px-2 py-1 bg-slate-900/50 rounded text-slate-400">
                                    {k}: <span className="text-slate-300">{v}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button onClick={() => setWizardStep(0)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-400 hover:text-white">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{selectedForImport.size} of {scrapedData.length} selected</span>
                    <button onClick={() => setWizardStep(2)} disabled={selectedForImport.size === 0}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm rounded-xl font-medium">
                      Continue <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Final Preview + Duplicate Settings */}
        {wizardStep === 2 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white">Preview & Import Settings</h2>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {selectedSource === 'google-sheets' ? sheetData.length : selectedSource === 'smart-paste' ? editedRows.length : selectedForImport.size}
                </p>
                <p className="text-xs text-slate-400 mt-1">Total Records</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-brand-400">
                  {selectedSource === 'google-sheets'
                    ? columnMappings.filter(m => m.targetField !== 'skip').length
                    : selectedSource === 'smart-paste'
                    ? pasteColumnMappings.filter(m => m.targetField !== 'skip').length
                    : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Mapped Fields</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{duplicateSettings.enabled ? 'On' : 'Off'}</p>
                <p className="text-xs text-slate-400 mt-1">Duplicate Check</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{duplicateSettings.action}</p>
                <p className="text-xs text-slate-400 mt-1">Duplicate Action</p>
              </div>
            </div>

            {/* Duplicate detection settings */}
            <div className="bg-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield size={16} className="text-brand-400" />
                  Duplicate Detection
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={duplicateSettings.enabled}
                    onChange={() => updateDuplicateSettings({ enabled: !duplicateSettings.enabled })}
                    className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
                </label>
              </div>

              {duplicateSettings.enabled && (
                <>
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Match on fields:</p>
                    <div className="flex flex-wrap gap-2">
                      {(['name', 'email', 'phone', 'address'] as const).map(field => (
                        <button key={field} onClick={() => {
                          const current = duplicateSettings.matchFields;
                          const next = current.includes(field)
                            ? current.filter(f => f !== field)
                            : [...current, field];
                          updateDuplicateSettings({ matchFields: next });
                        }}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            duplicateSettings.matchFields.includes(field)
                              ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                              : 'bg-slate-700 border-slate-600 text-slate-400'
                          }`}>
                          {field.charAt(0).toUpperCase() + field.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-2">When duplicate found:</p>
                    <div className="flex gap-2">
                      {(['skip', 'merge', 'create-new'] as const).map(action => (
                        <button key={action} onClick={() => updateDuplicateSettings({ action })}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            duplicateSettings.action === action
                              ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                              : 'bg-slate-700 border-slate-600 text-slate-400'
                          }`}>
                          {action === 'skip' ? 'Skip Duplicate' : action === 'merge' ? 'Merge Data' : 'Create New'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Save mapping as template */}
            {(selectedSource === 'google-sheets' || selectedSource === 'smart-paste') && (
              <div className="bg-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Copy size={16} className="text-slate-400" />
                  Save Column Mapping as Template
                </h3>
                <div className="flex gap-2">
                  <input value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name (e.g., My CRM Export)"
                    className={`${inputClass} flex-1`} />
                  <button onClick={() => {
                    if (!templateName.trim()) return;
                    const mappingsToSave = selectedSource === 'smart-paste'
                      ? pasteColumnMappings.filter(m => m.targetField !== 'skip')
                      : columnMappings.filter(m => m.targetField !== 'skip');
                    addImportTemplate({
                      name: templateName.trim(),
                      source: selectedSource || 'google-sheets',
                      mappings: mappingsToSave,
                    });
                    setTemplateName('');
                  }} disabled={!templateName.trim()}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm rounded-xl font-medium">
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button onClick={() => setWizardStep(1)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-400 hover:text-white">
                <ArrowLeft size={14} /> Back
              </button>
              <button onClick={selectedSource === 'google-sheets' ? importFromSheet : selectedSource === 'smart-paste' ? importFromPaste : importFromScraped}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors">
                {isLoading ? <><Loader2 size={16} className="animate-spin" /> Importing...</>
                  : <><Download size={16} /> Import {selectedSource === 'google-sheets' ? sheetData.length : selectedSource === 'smart-paste' ? editedRows.length : selectedForImport.size} Leads</>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {wizardStep === 3 && importResult && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Import Complete!</h2>
              <p className="text-slate-400 text-sm mt-2">Your leads have been successfully imported into WholeScale OS.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{importResult.total}</p>
                <p className="text-xs text-slate-400">Total Rows</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                <p className="text-2xl font-bold text-emerald-400">{importResult.imported}</p>
                <p className="text-xs text-slate-400">Imported</p>
              </div>
              <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
                <p className="text-2xl font-bold text-amber-400">{importResult.duplicates}</p>
                <p className="text-xs text-slate-400">Duplicates</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-2xl font-bold text-slate-400">{importResult.skipped}</p>
                <p className="text-xs text-slate-400">Skipped</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4">
              <button onClick={() => window.location.href = '/leads'}
                className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors">
                <Users size={16} /> View Leads
              </button>
              <button onClick={resetWizard}
                className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition-colors">
                <Plus size={16} /> Import More
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Home View ──────────────────────────────────────────

  const filteredHistory = historyFilter === 'all'
    ? importHistory
    : importHistory.filter(h => h.source === historyFilter);

  return (
    <div className="space-y-6">
      {/* CUSTOM FIELDS SECTION - MOVED FROM LEADS PAGE */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-semibold text-white">Custom Import Fields</h2>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
              {customFields.length}
            </span>
          </div>
          {!showAddField && (
            <button 
              onClick={() => setShowAddField(true)} 
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg"
            >
              <Plus className="w-3 h-3" /> Add Field
            </button>
          )}
        </div>

        {showAddField && (
          <div className="mb-3 flex items-center gap-2">
            <input 
              value={newFieldName} 
              onChange={e => setNewFieldName(e.target.value)} 
              placeholder="Field name (e.g., Lot Size, ARV, Equity)" 
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm" 
              autoFocus 
            />
            <select 
              value={newFieldType} 
              onChange={e => setNewFieldType(e.target.value as any)} 
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
            </select>
            <button 
              onClick={async () => {
                if (!newFieldName.trim() || !teamId) return;
                
                const fieldKey = newFieldName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                const newField = {
                  id: uuidv4(),
                  name: newFieldName.trim(),
                  field_key: fieldKey,
                  field_type: newFieldType
                };
                
                try {
                  if (supabase) {
                    const { error } = await supabase
                      .from('custom_fields')
                      .insert([{ 
                        ...newField, 
                        team_id: teamId, 
                        display_order: customFields.length 
                      }]);
                    
                    if (error) {
                      alert(`❌ Failed to save: ${error.message}`);
                      return;
                    }
                  }
                  
                  setCustomFields(p => [...p, newField]);
                  setNewFieldName('');
                  setShowAddField(false);
                  setFieldSaveSuccess(true);
                  setTimeout(() => setFieldSaveSuccess(false), 3000);
                  
                } catch (err: any) {
                  alert(`❌ Error: ${err.message}`);
                }
              }} 
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { 
                setShowAddField(false); 
                setNewFieldName(''); 
              }} 
              className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {fieldSaveSuccess && (
          <div className="mb-3 p-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-xs flex items-center gap-1">
            <Check size={12} />
            Field saved to database!
          </div>
        )}

        {customFields.length === 0 ? (
          <p className="text-slate-400 text-sm">No custom fields yet. Add fields like &quot;Lot Size&quot;, &quot;ARV&quot;, or &quot;Equity&quot; to use in imports.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customFields.map(f => (
              <span 
                key={f.id} 
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-sm group"
              >
                <span className="text-white">{f.name}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  f.field_type === 'number' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {f.field_type}
                </span>
                <button 
                  onClick={async () => {
                    if (!confirm(`Delete field "${f.name}"?`)) return;
                    
                    try {
                      if (supabase) {
                        const { error } = await supabase
                          .from('custom_fields')
                          .delete()
                          .eq('id', f.id);
                        
                        if (error) {
                          alert(`❌ Failed to delete: ${error.message}`);
                          return;
                        }
                      }
                      
                      setCustomFields(p => p.filter(field => field.id !== f.id));
                      alert('✅ Field deleted');
                      
                    } catch (err: any) {
                      alert(`❌ Error: ${err.message}`);
                    }
                  }} 
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Import Tools</h1>
          <p className="text-slate-400 text-sm mt-1">
            Import leads from multiple sources — spreadsheets, listings, websites, and documents.
          </p>
        </div>
      </div>

      {/* Source cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Start New Import</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(['google-sheets', 'homes-com', 'url', 'pdf', 'smart-paste'] as ImportSource[]).map(source => {
            const config = SOURCE_CONFIG[source];
            return (
              <button
                key={source}
                onClick={() => { setSelectedSource(source); setActiveView('wizard'); setWizardStep(0); }}
                className={`text-left p-5 rounded-2xl border ${config.border} ${config.bg} hover:scale-[1.02] transition-all group`}
              >
                <config.icon size={28} className={`${config.color} mb-3`} />
                <h3 className="text-sm font-semibold text-white mb-1">{config.label}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{config.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-medium text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Start Import <ArrowRight size={12} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Import Templates */}
      {importTemplates.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Saved Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {importTemplates.map(t => {
              const config = SOURCE_CONFIG[t.source];
              return (
                <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                      <config.icon size={16} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">{t.name}</h3>
                      <p className="text-[10px] text-slate-500">{config.label} · {t.mappings.length} fields</p>
                    </div>
                    <button onClick={() => deleteImportTemplate(t.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.mappings.slice(0, 4).map(m => (
                      <span key={m.sourceColumn} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                        {m.sourceColumn} → {TARGET_FIELDS.find(f => f.value === m.targetField)?.label || m.targetField}
                      </span>
                    ))}
                    {t.mappings.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded">
                        +{t.mappings.length - 4} more
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => { setSelectedSource(t.source); setActiveView('wizard'); setWizardStep(0); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-600/20 text-brand-400 text-xs rounded-lg hover:bg-brand-600/30 font-medium transition-colors"
                    >
                      <RefreshCw size={10} /> Use Template
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Import History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Import History</h2>
          <div className="relative">
            <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value as ImportSource | 'all')}
              className="pl-7 pr-6 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-300 appearance-none focus:outline-none"
            >
              <option value="all">All Sources</option>
              {Object.entries(SOURCE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No import history yet</p>
            <p className="text-xs mt-1">Start an import above to see your history here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map(entry => {
              const config = SOURCE_CONFIG[entry.source];
              return (
                <div key={entry.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                      <config.icon size={18} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-white truncate">{entry.sourceName}</h3>
                        <StatusBadge status={entry.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                        {entry.templateUsed && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Copy size={9} /> {entry.templateUsed}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-sm font-semibold text-emerald-400">{entry.importedCount}</p>
                        <p className="text-[10px] text-slate-500">imported</p>
                      </div>
                      {entry.duplicateCount > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-amber-400">{entry.duplicateCount}</p>
                          <p className="text-[10px] text-slate-500">duplicates</p>
                        </div>
                      )}
                      {entry.skippedCount > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-slate-400">{entry.skippedCount}</p>
                          <p className="text-[10px] text-slate-500">skipped</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">{entry.totalRows}</p>
                        <p className="text-[10px] text-slate-500">total</p>
                      </div>
                    </div>
                  </div>
                  {entry.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <div className="flex flex-wrap gap-1.5">
                        {entry.errors.map((err, i) => (
                          <span key={i} className="text-[10px] px-2 py-1 bg-red-500/10 text-red-400 rounded-lg flex items-center gap-1">
                            <AlertTriangle size={9} /> {err}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Duplicate Detection Settings Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Shield size={16} className="text-brand-400" />
          Duplicate Detection Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-400 mb-2">Status</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={duplicateSettings.enabled}
                onChange={() => updateDuplicateSettings({ enabled: !duplicateSettings.enabled })}
                className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
              <span className="ml-2 text-sm text-slate-300">{duplicateSettings.enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-2">Match Fields</p>
            <div className="flex flex-wrap gap-1.5">
              {duplicateSettings.matchFields.map(f => (
                <span key={f} className="text-xs px-2 py-1 bg-brand-600/20 text-brand-400 rounded-lg capitalize">{f}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-2">Action</p>
            <p className="text-sm text-white capitalize">{duplicateSettings.action.replace('-', ' ')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}