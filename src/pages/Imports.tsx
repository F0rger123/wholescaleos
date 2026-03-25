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
  'google-sheets': { label: 'Google Sheets', icon: FileSpreadsheet, color: 'text-[var(--t-success)]', bg: 'var(--t-success-dim)', border: 'var(--t-success)', desc: 'Import leads from a shared Google Sheet — no API key needed' },
  'homes-com': { label: 'Homes.com', icon: Home, color: 'text-[var(--t-info)]', bg: 'var(--t-info-dim)', border: 'var(--t-info)', desc: 'Scrape property data from Homes.com listings' },
  'url': { label: 'Any URL', icon: Globe, color: 'text-[var(--t-accent)]', bg: 'var(--t-surface-active)', border: 'var(--t-border)', desc: 'Smart-detect property data from any website' },
  'pdf': { label: 'PDF Upload', icon: FileText, color: 'text-[var(--t-warning)]', bg: 'var(--t-warning-dim)', border: 'var(--t-warning)', desc: 'Extract lead data from PDF documents' },
  'csv': { label: 'CSV Upload', icon: FileSpreadsheet, color: 'text-[var(--t-primary)]', bg: 'var(--t-surface-hover)', border: 'var(--t-border)', desc: 'Upload a CSV file' },
  'smart-paste': { label: 'Smart Paste', icon: ClipboardPaste, color: 'text-[var(--t-primary)]', bg: 'var(--t-secondary-dim)', border: 'var(--t-secondary)', desc: 'Paste any text — AI auto-detects fields' },
};

const BASE_TARGET_FIELDS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: 'name', label: 'Owner Name', icon: User },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'propertyAddress', label: 'Property Address', icon: MapPin },
  { value: 'estimatedValue', label: 'Estimated Value', icon: DollarSign },
  { value: 'propertyType', label: 'Property Type', icon: Home },
  { value: 'notes', label: 'Notes', icon: StickyNote },
  { value: 'skip', label: '— Skip Field —', icon: X },
];

const inputClass = 'w-full px-3 py-2.5 text-sm rounded-xl outline-none transition-all';
const inputStyles = { 
  background: 'var(--t-input-bg)', 
  borderColor: 'var(--t-border)', 
  color: 'var(--t-text)',
  '--tw-ring-color': 'var(--t-primary)'
} as React.CSSProperties & Record<string, string>;

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
  const color = score >= 90 ? 'text-[var(--t-success)] bg-[var(--t-success-dim)]' : score >= 70 ? 'text-[var(--t-warning)] bg-[var(--t-warning-dim)]' : 'text-[var(--t-error)] bg-[var(--t-error-dim)]';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>
      {score}%
    </span>
  );
}

// ─── Import Status Badge ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; icon: React.ElementType }> = {
    completed: { color: 'text-[var(--t-success)] bg-[var(--t-success-dim)]', icon: CheckCircle2 },
    failed: { color: 'text-[var(--t-error)] bg-[var(--t-error-dim)]', icon: XCircle },
    importing: { color: 'text-[var(--t-info)] bg-[var(--t-info)]/15', icon: Loader2 },
    pending: { color: 'text-[var(--t-warning)] bg-[var(--t-warning-dim)]', icon: Clock },
    mapping: { color: 'text-[var(--t-accent)] bg-[var(--t-accent-dim)]', icon: Settings },
    reviewing: { color: 'text-[var(--t-primary)] bg-[var(--t-accent-dim)]', icon: Eye },
  };
  const c = configs[status] || configs.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.color}`}>
      <c.icon size={11} className={status === 'importing' ? 'animate-spin' : ''} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Type Guards ────────────────────────────────────────────────────────────

function isSheetRow(row: any): row is Record<string, string> {
  return typeof row === 'object' && !Array.isArray(row);
}

function isPasteRow(row: any): row is string[] {
  return Array.isArray(row);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Imports() {
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

  // Preview selection state
  const [previewSelectedLeads, setPreviewSelectedLeads] = useState<Set<number>>(new Set());
  const [selectAllPreview, setSelectAllPreview] = useState(true);

  // History filter
  const [historyFilter, setHistoryFilter] = useState<ImportSource | 'all'>('all');

  // Connection error message
  const [connectionError, setConnectionError] = useState<string | null>(null);

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
    setPreviewSelectedLeads(new Set());
    setSelectAllPreview(true);
    setActiveView('home');
  }, []);

  // ─── Connect / Fetch data ──────────────────────────────

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
      
      // Initialize preview selection with all leads
      const allSelected = new Set<number>();
      for (let i = 0; i < result.data.length; i++) allSelected.add(i);
      setPreviewSelectedLeads(allSelected);
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

  // ─── Import from sheet with selection ─────────────────────────────────

  const importFromSheet = async (selectedLeads?: Set<number>) => {
    setIsLoading(true);
    setImportResult(null);
    
    try {
      // Use selected leads if provided, otherwise use all
      const leadsToUse = selectedLeads || previewSelectedLeads;
      const rowsToImport = sheetData.filter((_, idx) => leadsToUse.has(idx));
      
      // Map each row to a lead object
      const rows = rowsToImport.map(row => {
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
        total: rowsToImport.length,
        imported,
        skipped: rowsToImport.length - rows.length,
        duplicates,
      });

      addImportHistory({
        source: 'google-sheets',
        sourceName: sheetUrl || 'Google Sheets Import',
        status: 'completed',
        totalRows: rowsToImport.length,
        importedCount: imported,
        skippedCount: rowsToImport.length - rows.length,
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

  // ─── Import from scraped with selection ───────────────────────────────

  const importFromScraped = (selectedLeads?: Set<number>) => {
    setIsLoading(true);
    setTimeout(() => {
      const leadsToUse = selectedLeads || selectedForImport;
      const rows = scrapedData
        .filter((_, i) => leadsToUse.has(i))
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
        total: scrapedData.length,
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

  // ─── Smart Paste handlers ─────────────────────────────────────────────

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
      
      // Initialize preview selection with all rows
      const allSelected = new Set<number>();
      for (let i = 0; i < result.rows.length; i++) allSelected.add(i);
      setPreviewSelectedLeads(allSelected);
      
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

  const importFromPaste = (selectedLeads?: Set<number>) => {
    if (!parseResult) return;
    setIsLoading(true);
    
    // Debug logging
    console.log('🚀 Starting import from paste...');
    console.log('Selected leads:', selectedLeads || previewSelectedLeads);
    console.log('Edited rows:', editedRows);
    console.log('Column mappings:', pasteColumnMappings);
    
    setTimeout(() => {
      try {
        const leadsToUse = selectedLeads || previewSelectedLeads;
        console.log('Leads to use:', leadsToUse);
        
        const rows = editedRows
          .filter((_, idx) => leadsToUse.has(idx))
          .map(row => {
            const mapped: Record<string, string> = {};
            pasteColumnMappings.forEach((m, idx) => {
              if (m.targetField !== 'skip') {
                mapped[m.targetField] = row[idx] || '';
              }
            });
            
            const lead = {
              name: mapped.name || '',
              email: mapped.email || '',
              phone: mapped.phone || '',
              address: mapped.propertyAddress || '',
              value: parseValue(mapped.estimatedValue || '0'),
              propertyType: mapPropertyType(mapped.propertyType || 'single-family') as PropertyType,
              source: 'other' as LeadSource,
              notes: mapped.notes || '',
            };
            
            console.log('Mapped lead:', lead);
            return lead;
          }).filter(r => {
            const valid = r.name.trim() || r.address.trim();
            if (!valid) console.log('Filtering out invalid lead:', r);
            return valid;
          });

        console.log(`✅ Found ${rows.length} valid leads to import`);

        if (rows.length === 0) {
          alert('No valid leads found to import');
          setIsLoading(false);
          return;
        }

        const imported = importLeadsFromData(rows);
        console.log(`📊 importLeadsFromData returned: ${imported} imported`);
        
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

        console.log('🎉 Import complete!');
        setIsLoading(false);
        setWizardStep(3);
      } catch (error) {
        console.error('❌ Error during import:', error);
        alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    }, 1500);
  };

  // ─── Helper function to check if a row has valid data ─────────────────

  const isRowValid = (row: Record<string, string> | string[]): boolean => {
    if (selectedSource === 'google-sheets' && isSheetRow(row)) {
      const nameCol = columnMappings.find(m => m.targetField === 'name')?.sourceColumn;
      const addressCol = columnMappings.find(m => m.targetField === 'propertyAddress')?.sourceColumn;
      return !!((nameCol && row[nameCol]) || (addressCol && row[addressCol]));
    } else if (selectedSource === 'smart-paste' && isPasteRow(row)) {
      const nameColIdx = pasteColumnMappings.findIndex(m => m.targetField === 'name');
      const addressColIdx = pasteColumnMappings.findIndex(m => m.targetField === 'propertyAddress');
      return !!((nameColIdx >= 0 && row[nameColIdx]) || (addressColIdx >= 0 && row[addressColIdx]));
    }
    return false;
  };

  // ─── Render ───────────────────────────────────────────────────────────

  if (activeView === 'wizard' && selectedSource) {
    return (
      <div className="space-y-6">
        {/* Wizard Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={resetWizard} className="p-2 rounded-xl transition-colors"
              style={{ background: 'transparent', color: 'var(--t-text-muted)' }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                {(() => { const C = SOURCE_CONFIG[selectedSource]; return <><C.icon size={22} className={C.color} /> {C.label} Import</>; })()}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--t-text-muted)' }}>{SOURCE_CONFIG[selectedSource].desc}</p>
            </div>
          </div>
          <button onClick={resetWizard} className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {['Connect', selectedSource === 'google-sheets' ? 'Map Columns' : 'Review Data', 'Preview & Select', 'Done'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-0.5" style={{ background: i <= wizardStep ? 'var(--t-primary)' : 'var(--t-border)' }} />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === wizardStep ? 'text-white' : i < wizardStep ? '' : 'text-[var(--t-text-muted)]'
              }`}
              style={{ 
                background: i === wizardStep ? 'var(--t-primary)' : i < wizardStep ? 'var(--t-primary-dim)' : 'var(--t-surface)',
                color: i < wizardStep ? 'var(--t-primary)' : ''
              }}>
                {i < wizardStep ? <Check size={12} /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{i + 1}</span>}
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Step 0: Connect / Enter URL */}
        {wizardStep === 0 && (
          <div className="border rounded-2xl p-6 space-y-6"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            {selectedSource === 'google-sheets' && (
              <>
                <h2 className="text-lg font-semibold text-white">Import from Google Sheets</h2>
                {!isConnected ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-xl flex items-start gap-3"
                      style={{ background: 'var(--t-success-dim)', borderColor: 'var(--t-success)' }}
                    >
                      <Shield size={18} className="text-[var(--t-success)] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[var(--t-success)]">No API Key Required</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>
                          We'll fetch your spreadsheet data directly. Just make sure the sheet is <strong className="text-[var(--t-success)]/90">shared as "Anyone with the link can view"</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Step-by-step instructions */}
                    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--t-background)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>How to share your sheet:</p>
                      <ol className="space-y-2 text-xs" style={{ color: 'var(--t-text-muted)' }}>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-[var(--t-success)] text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                          Open your Google Sheet
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-[var(--t-success)] text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                          Click <strong className="text-white">Share</strong> (top right) → Under "General access", change to <strong className="text-white">"Anyone with the link"</strong> → Set to <strong className="text-white">"Viewer"</strong>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-[var(--t-success)] text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                          Copy the URL from your browser address bar and paste below
                        </li>
                      </ol>
                    </div>

                    <div>
                      <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-muted)' }}>Google Sheets URL</label>
                      <input value={sheetUrl} onChange={(e) => { setSheetUrl(e.target.value); setConnectionError(null); }}
                        placeholder="https://docs.google.com/spreadsheets/d/1abc...xyz/edit"
                        className={inputClass}
                        style={inputStyles}
                      />
                      {sheetUrl && !isGoogleSheetsUrl(sheetUrl) && (
                        <p className="text-xs text-[var(--t-warning)] mt-1.5 flex items-center gap-1">
                          <AlertTriangle size={11} /> This doesn't look like a Google Sheets URL
                        </p>
                      )}
                    </div>

                    {connectionError && (
                      <div className="p-4 bg-[var(--t-error)]/10 border border-[var(--t-error)]/30 rounded-xl">
                        <div className="flex items-start gap-2">
                          <XCircle size={16} className="text-[var(--t-error)] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-[var(--t-error)]">Connection Failed</p>
                            <p className="text-xs text-[var(--t-text-muted)] mt-1 whitespace-pre-line">{connectionError}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[var(--t-error)]/20 flex items-center gap-2">
                          <p className="text-xs text-[var(--t-text-muted)]">Alternative:</p>
                          <button onClick={() => { setSelectedSource('smart-paste'); setConnectionError(null); }}
                            className="text-xs text-[var(--t-primary)] hover:text-[var(--t-primary)]/80 font-medium flex items-center gap-1">
                            <ClipboardPaste size={11} /> Use Smart Paste instead — copy data from your sheet and paste it
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button onClick={connectGoogleSheets} disabled={isLoading || !sheetUrl.trim()}
                        className="flex items-center gap-2 px-6 py-3 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                        style={{ background: 'var(--t-primary)' }}
                      >
                        {isLoading ? <><Loader2 size={16} className="animate-spin" /> Fetching sheet data...</> : <><Download size={16} /> Fetch Sheet Data</>}
                      </button>
                      <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>or</span>
                      <button onClick={() => setSelectedSource('smart-paste')}
                        className="flex items-center gap-2 px-4 py-3 text-sm rounded-xl transition-colors border"
                        style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
                      >
                        <ClipboardPaste size={14} /> Smart Paste
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 border rounded-xl"
                      style={{ background: 'var(--t-success-dim)', borderColor: 'var(--t-success)' }}
                    >
                      <CheckCircle2 size={20} className="text-[var(--t-success)]" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--t-success)]">Sheet Loaded Successfully!</p>
                        <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Found <strong className="text-white">{sheetData.length} rows</strong> with <strong className="text-white">{Object.keys(sheetData[0] || {}).length} columns</strong></p>
                      </div>
                      <button onClick={() => setWizardStep(1)} className="flex items-center gap-1.5 px-4 py-2 text-white text-sm rounded-xl font-medium"
                        style={{ background: 'var(--t-primary)' }}
                      >
                        Map Columns <ArrowRight size={14} />
                      </button>
                    </div>

                    {/* Quick data preview */}
                    <div className="rounded-xl p-4" style={{ background: 'var(--t-background)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--t-text-muted)' }}>Quick Preview (first 3 rows):</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--t-border)' }}>
                              {Object.keys(sheetData[0] || {}).map(h => (
                                <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap" style={{ color: 'var(--t-text-muted)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sheetData.slice(0, 3).map((row, i) => (
                              <tr key={i} className="border-b" style={{ borderColor: 'var(--t-border-subtle)' }}>
                                {Object.keys(sheetData[0] || {}).map(h => (
                                  <td key={h} className="px-2 py-1.5 whitespace-nowrap max-w-[200px] truncate" style={{ color: 'var(--t-text)' }}>{row[h] || '—'}</td>
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
                    <label className="text-xs text-[var(--t-text-muted)] mb-1.5 block">Homes.com Listing URL</label>
                    <input value={homesUrl} onChange={(e) => setHomesUrl(e.target.value)}
                      placeholder="https://www.homes.com/listing/..."
                      className={inputClass} />
                  </div>
                  <div className="border rounded-xl p-3"
                    style={{ background: 'var(--t-info-dim)', borderColor: 'var(--t-info)' }}
                  >
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}><span className="font-medium" style={{ color: 'var(--t-info)' }}>Smart Scraper</span> — We'll extract: address, price, beds/baths, sqft, property type, listing date, and owner info (when available).</p>
                  </div>
                  <button onClick={scrapeHomesUrl} disabled={isLoading || !homesUrl.trim()}
                    className="flex items-center gap-2 px-6 py-3 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                    style={{ background: 'var(--t-primary)' }}
                  >
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
                    <label className="text-xs text-[var(--t-text-muted)] mb-1.5 block">Website URL</label>
                    <input value={genericUrl} onChange={(e) => setGenericUrl(e.target.value)}
                      placeholder="https://example.com/property/..."
                      className={inputClass} />
                  </div>
                  <div className="p-3 border rounded-xl"
                    style={{ background: 'var(--t-primary-dim)', borderColor: 'var(--t-primary-dim)' }}
                  >
                    <p className="text-xs text-[var(--t-text-muted)]"><span className="font-medium" style={{ color: 'var(--t-primary)' }}>AI Detection</span> — We'll analyze the page and extract any property/owner data we can find, with confidence scores for each field.</p>
                  </div>
                  <button onClick={scrapeGenericUrl} disabled={isLoading || !genericUrl.trim()}
                    className="flex items-center gap-2 px-6 py-3 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
                    style={{ background: 'var(--t-primary)' }}
                  >
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
                    className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors group"
                    style={{ borderColor: 'var(--t-border)', background: 'var(--t-background)' }}
                  >
                    {isLoading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--t-primary)' }} />
                        <p className="text-sm font-medium" style={{ color: 'var(--t-primary)' }}>Extracting text & analyzing document...</p>
                        <div className="flex gap-0.5">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--t-warning)] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload size={40} className="mx-auto mb-3 transition-colors" style={{ color: 'var(--t-text-muted)' }} />
                        <p className="text-sm font-medium transition-colors" style={{ color: 'var(--t-text)' }}>
                          Click to upload a PDF document
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>
                          Tax records, title reports, property lists, lead sheets
                        </p>
                        <div className="flex items-center justify-center gap-4 mt-4">
                          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--t-text-muted)' }}><FileText size={10} /> PDF</span>
                          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--t-text-muted)' }}><FileImage size={10} /> Images</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="p-3 border rounded-xl" style={{ background: 'var(--t-warning-dim)', borderColor: 'var(--t-warning)' }}>
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}><span className="text-[var(--t-warning)] font-medium">OCR + AI</span> — We use OCR to extract text and AI to identify property/owner data with confidence scoring.</p>
                  </div>
                </div>
              </>
            )}

            {selectedSource === 'smart-paste' && (
              <>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles size={20} style={{ color: 'var(--t-primary)' }} />
                  Smart Paste — AI Auto-Detection
                </h2>
                <div className="space-y-4">
                  <div className="p-3 border rounded-xl"
                    style={{ background: 'var(--t-primary-dim)', borderColor: 'var(--t-primary-dim)' }}
                  >
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                      <span className="font-medium" style={{ color: 'var(--t-primary)' }}>Paste anything</span> — CSV data, tab-separated rows, plain text with addresses/names/phones, email threads, notes, or any unstructured data. Our AI will auto-detect delimiters, column types, and field mappings.
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
                      <div key={hint.label} className="rounded-xl p-3 flex items-start gap-2"
                        style={{ background: 'var(--t-surface-hover)' }}
                      >
                        <hint.icon size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--t-text-muted)' }} />
                        <div>
                          <p className="text-[11px] font-medium" style={{ color: 'var(--t-text)' }}>{hint.label}</p>
                          <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>{hint.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paste textarea */}
                  <div className="relative">
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      onPaste={() => {
                        // ... (keep logic same)
                      }}
                      placeholder={`Paste your data here...\n\nExamples:\nJohn Smith, 1420 Oak St Austin TX, (555) 234-5678, john@email.com, $385,000\nJane Doe, 780 Maple Ave Dallas TX, (555) 876-5432, jane@email.com, $620,000\n\nOr tab-separated:\nName\tAddress\tPhone\tEmail\tValue\nJohn Smith\t1420 Oak St\t(555) 234-5678\tjohn@email.com\t$385,000`}
                      className="w-full h-64 px-4 py-3 text-sm rounded-2xl outline-none font-mono resize-none transition-all border"
                      style={{ 
                        background: 'var(--t-input-bg)',
                        color: 'var(--t-text)',
                        // @ts-expect-error custom prop
                        '--tw-ring-color': 'var(--t-primary)',
                        borderColor: pastedText ? 'var(--t-primary)' : 'var(--t-border)'
                      }}
                    />
                    {pastedText && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <span className="text-[10px] text-[var(--t-text-muted)]">
                          {pastedText.split('\n').filter(l => l.trim()).length} lines · {pastedText.length} chars
                        </span>
                        <button
                          onClick={() => setPastedText('')}
                          className="p-1 text-[var(--t-text-muted)] hover:text-[var(--t-text-muted)] transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick paste example buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-[var(--t-text-muted)] uppercase tracking-wider font-semibold">Try example:</span>
                    <button
                      onClick={() => setPastedText(
                        'Owner Name,Property Address,Phone,Email,Est. Value,Property Type\n' +
                        'Thomas Baker,2450 Riverside Dr Austin TX,(512) 555-0101,tbaker@email.com,$340000,Single Family\n' +
                        'Angela Brooks,890 Summit Blvd Dallas TX,(214) 555-0202,abrooks@email.com,$525000,Multi-Family\n' +
                        'Carlos Mendez,1100 Pecan St San Antonio TX,(210) 555-0303,cmendez@email.com,$185000,Condo\n' +
                        'Rachel Kim,3200 Bay Area Blvd Houston TX,(713) 555-0404,rkim@email.com,$410000,Single Family\n' +
                        'Derek Washington,750 Legacy Dr Plano TX,(972) 555-0505,dwash@email.com,$680000,Single Family'
                      )}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--t-surface)] text-[var(--t-text-muted)] hover:text-[var(--t-primary)] hover:bg-[var(--t-primary)]/10 border border-[var(--t-border)] hover:border-[var(--t-primary)]/30 transition-all"
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
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--t-surface)] text-[var(--t-text-muted)] hover:text-[var(--t-primary)] hover:bg-[var(--t-primary)]/10 border border-[var(--t-border)] hover:border-[var(--t-primary)]/30 transition-all"
                    >
                      Tab-separated
                    </button>
                    <button
                      onClick={() => setPastedText(
                        'Got a call from Marcus Johnson (555) 234-5678 about selling his property at 1420 Oak Street, Austin TX. He owes $210k on the mortgage and the place is worth about $385,000. Motivated seller, behind on payments.\n\n' +
                        'Diana Reeves (555) 876-5432 diana.r@email.com - owns duplex at 780 Maple Ave Dallas TX. Estimated value $620k. Relocating out of state. Referred by agent Mike Torres.\n\n' +
                        'Robert Tran at 2100 Elm Blvd Houston TX, phone (555) 345-6789 email r.tran@email.com. Estate sale, family wants quick close. House needs $20k repairs, worth $275,000.'
                      )}
                      className="text-[11px] px-2.5 py-1 rounded-lg transition-all border"
                      style={{ background: 'var(--t-surface)', color: 'var(--t-text-muted)', borderColor: 'var(--t-border)' }}
                    >
                      Unstructured text
                    </button>
                  </div>

                  <button
                    onClick={analyzePastedText}
                    disabled={isLoading || !pastedText.trim()}
                    className="flex items-center gap-2 px-6 py-3 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
                    style={{ background: 'var(--t-primary)' }}
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
          <div className="border rounded-2xl p-6 space-y-6"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            {selectedSource === 'smart-paste' && parseResult ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles size={18} style={{ color: 'var(--t-primary)' }} />
                    AI Detection Results
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--t-text-muted)]">
                      {parseResult.rowCount} rows · {parseResult.columns.length} columns · Delimiter: <code style={{ color: 'var(--t-primary)' }}>{parseResult.delimiter === '\t' ? 'TAB' : parseResult.delimiter === ',' ? 'COMMA' : parseResult.delimiter === '|' ? 'PIPE' : parseResult.delimiter}</code>
                    </span>
                  </div>
                </div>

                {/* Detection summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl p-3 text-center" style={{ background: 'var(--t-background)' }}>
                    <p className="text-xl font-bold text-white">{parseResult.rowCount}</p>
                    <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>Rows Detected</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'var(--t-background)' }}>
                    <p className="text-xl font-bold text-[var(--t-primary)]">{parseResult.columns.length}</p>
                    <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>Columns Found</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'var(--t-background)' }}>
                    <p className="text-xl font-bold text-[var(--t-success)]">
                      {pasteColumnMappings.filter(m => m.targetField !== 'skip').length}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>Auto-Mapped</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'var(--t-background)' }}>
                    <p className="text-xl font-bold text-[var(--t-warning)]">
                      {Math.round(pasteColumnMappings.reduce((s, m) => s + m.confidence, 0) / Math.max(pasteColumnMappings.length, 1))}%
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>Avg Confidence</p>
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
                        <div key={idx} className="grid grid-cols-12 gap-3 px-3 py-3 rounded-xl border transition-colors"
                          style={{ background: 'var(--t-surface-hover)', borderColor: mapping.targetField === 'skip' ? 'transparent' : 'var(--t-border)' }}
                        >
                          <div className="col-span-1 flex items-center">
                            <GripVertical size={14} style={{ color: 'var(--t-text-muted)' }} />
                          </div>
                          <div className="col-span-3 flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>{mapping.sourceColumn}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${typeColor.bg} ${typeColor.text}`}>
                              {typeColor.label}
                            </span>
                          </div>
                          <div className="col-span-1 flex items-center justify-center">
                            <ArrowRight size={14} style={{ color: mapping.targetField === 'skip' ? 'var(--t-text-muted)' : 'var(--t-primary)' }} />
                          </div>
                          <div className="col-span-3 flex items-center">
                            <div className="relative w-full">
                              <select
                                value={mapping.targetField}
                                onChange={(e) => updatePasteMapping(idx, e.target.value)}
                                className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border appearance-none focus:outline-none"
                                style={{
                                  background: 'var(--t-input-bg)',
                                  borderColor: 'var(--t-border)',
                                  color: 'var(--t-text)',
                                  // @ts-expect-error custom prop
                                  '--tw-ring-color': 'var(--t-primary)'
                                }}
                              >
                                {/* Standard Fields */}
                                <optgroup label="Standard Fields">
                                  {BASE_TARGET_FIELDS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </optgroup>
                                
                                {/* Custom Fields */}
                                {customFields.length > 0 && (
                                  <optgroup label="Custom Fields">
                                    {customFields.map(field => (
                                      <option key={field.field_key} value={field.field_key}>
                                        {field.name} ({field.field_type})
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--t-text-muted)' }} />
                            </div>
                          </div>
                          <div className="col-span-1 flex items-center justify-center">
                            {mapping.targetField !== 'skip' && <ConfidenceBadge score={mapping.confidence} />}
                          </div>
                          <div className="col-span-3 flex items-center">
                            <span className="text-xs truncate" style={{ color: 'var(--t-text-muted)' }}>{col?.samples[0] || '—'}</span>
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
                    <span className="text-[10px] font-normal text-[var(--t-text-muted)]">(click cells to edit before import)</span>
                  </h3>
                  <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--t-border)' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'var(--t-surface-hover)' }}>
                          <th className="px-3 py-2 text-left font-semibold w-10" style={{ color: 'var(--t-text-muted)' }}>#</th>
                          {pasteColumnMappings.map((mapping, idx) => {
                            const columnData = parseResult?.columns[idx];
                            const typeColor = DETECTED_TYPE_COLORS[columnData?.detectedType || 'text'];
                            return (
                              <th key={idx} className="px-3 py-2 text-left whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold" style={{ color: 'var(--t-text)' }}>
                                    {BASE_TARGET_FIELDS.find(f => f.value === mapping.targetField)?.label || 
                                     customFields.find(f => f.field_key === mapping.targetField)?.name || 
                                     mapping.sourceColumn}
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
                          <tr key={rowIdx} className="border-t hover:bg-[var(--t-surface)]/50" style={{ borderColor: 'var(--t-border-subtle)' }}>
                            <td className="px-3 py-2" style={{ color: 'var(--t-text-muted)' }}>{rowIdx + 1}</td>
                            {row.map((cell, colIdx) => (
                              <td className="px-1 py-1">
                                {editingCell?.row === rowIdx && editingCell?.col === colIdx ? (
                                  <input
                                    autoFocus
                                    value={cell}
                                    onChange={(e) => updateCellValue(rowIdx, colIdx, e.target.value)}
                                    onBlur={() => setEditingCell(null)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell(null); }}
                                    className="w-full px-2 py-1 text-xs rounded border text-white focus:outline-none"
                                    style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-primary)' }}
                                  />
                                ) : (
                                  <button
                                    onClick={() => setEditingCell({ row: rowIdx, col: colIdx })}
                                    className="w-full text-left px-2 py-1 text-xs rounded transition-colors"
                                    style={{ color: pasteColumnMappings[colIdx]?.targetField === 'skip' ? 'var(--t-text-muted)' : 'var(--t-text)' }}
                                  >
                                    {cell || <span style={{ color: 'var(--t-text-muted)', fontStyle: 'italic' }}>empty</span>}
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
                    <p className="text-xs text-[var(--t-text-muted)] mt-2">Showing first 10 of {editedRows.length} rows</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--t-border)]">
                  <button onClick={() => setWizardStep(0)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-[var(--t-text-muted)] hover:text-white transition-colors">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      // Initialize preview selection with all rows when moving to step 2
                      const allSelected = new Set<number>();
                      for (let i = 0; i < editedRows.length; i++) allSelected.add(i);
                      setPreviewSelectedLeads(allSelected);
                      setSelectAllPreview(true);
                      setWizardStep(2);
                    }} className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--t-primary)] hover:bg-[var(--t-primary)] text-white text-sm rounded-xl font-medium transition-colors">
                      Continue to Preview & Select <ArrowRight size={14} />
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
                          className="pl-3 pr-8 py-2 text-xs rounded-xl bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text-muted)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50"
                        >
                          <option value="">Apply Template...</option>
                          {importTemplates.filter(t => t.source === selectedSource).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)] pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-[var(--t-text-muted)]">
                  Match your spreadsheet columns to WholeScale lead fields. We auto-detected {columnMappings.filter(m => m.targetField !== 'skip').length} of {columnMappings.length} columns.
                </p>

                {/* Mapping table */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--t-text-muted)] font-semibold">
                    <div className="col-span-1"></div>
                    <div className="col-span-3">Source Column</div>
                    <div className="col-span-1"></div>
                    <div className="col-span-3">Map To</div>
                    <div className="col-span-1">Confidence</div>
                    <div className="col-span-3">Sample Data</div>
                  </div>

                  {columnMappings.map((mapping, idx) => (
                    <div key={idx} className={`grid grid-cols-12 gap-3 px-3 py-3 rounded-xl border transition-colors ${
                      mapping.targetField === 'skip' ? 'bg-[var(--t-surface)]/30 border-[var(--t-border)]' : 'bg-[var(--t-surface)]/70 border-[var(--t-border)]'
                    }`}>
                      <div className="col-span-1 flex items-center">
                        <GripVertical size={14} className="text-[var(--t-text-muted)]" />
                      </div>
                      <div className="col-span-3 flex items-center">
                        <span className="text-sm font-medium text-[var(--t-text)]">{mapping.sourceColumn}</span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <ArrowRight size={14} className={mapping.targetField === 'skip' ? 'text-[var(--t-text-muted)]' : 'text-[var(--t-primary)]'} />
                      </div>
                      <div className="col-span-3 flex items-center">
                        <div className="relative w-full">
                          <select
                            value={mapping.targetField}
                            onChange={(e) => updateMapping(idx, e.target.value)}
                            className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-[var(--t-text)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50"
                          >
                            {/* Standard Fields */}
                            <optgroup label="Standard Fields">
                              {BASE_TARGET_FIELDS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </optgroup>
                            
                            {/* Custom Fields */}
                            {customFields.length > 0 && (
                              <optgroup label="Custom Fields">
                                {customFields.map(field => (
                                  <option key={field.field_key} value={field.field_key}>
                                    {field.name} ({field.field_type})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)] pointer-events-none" />
                        </div>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        {mapping.targetField !== 'skip' && <ConfidenceBadge score={mapping.confidence} />}
                      </div>
                      <div className="col-span-3 flex items-center">
                        <span className="text-xs text-[var(--t-text-muted)] truncate">{mapping.sample}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Data preview */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Preview (first 5 rows)</h3>
                  <div className="overflow-x-auto rounded-xl border border-[var(--t-border)]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[var(--t-surface)]">
                          <th className="px-3 py-2 text-left text-[var(--t-text-muted)] font-semibold">#</th>
                          {columnMappings.filter(m => m.targetField !== 'skip').map(mapping => (
                            <th key={mapping.sourceColumn} className="px-3 py-2 text-left text-[var(--t-text-muted)] font-semibold whitespace-nowrap">
                              {BASE_TARGET_FIELDS.find(f => f.value === mapping.targetField)?.label || 
                               customFields.find(f => f.field_key === mapping.targetField)?.name || 
                               mapping.targetField}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheetData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-[var(--t-border)] hover:bg-[var(--t-surface)]/50">
                            <td className="px-3 py-2 text-[var(--t-text-muted)]">{i + 1}</td>
                            {columnMappings.filter(m => m.targetField !== 'skip').map(mapping => (
                              <td key={mapping.sourceColumn} className="px-3 py-2 text-[var(--t-text-muted)] whitespace-nowrap">
                                {row[mapping.sourceColumn] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-[var(--t-text-muted)] mt-2">{sheetData.length} total rows</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--t-border)]">
                  <button onClick={() => setWizardStep(0)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-[var(--t-text-muted)] hover:text-white transition-colors">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      // Initialize preview selection with all rows when moving to step 2
                      const allSelected = new Set<number>();
                      for (let i = 0; i < sheetData.length; i++) allSelected.add(i);
                      setPreviewSelectedLeads(allSelected);
                      setSelectAllPreview(true);
                      setWizardStep(2);
                    }} className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--t-primary)] hover:bg-[var(--t-primary)] text-white text-sm rounded-xl font-medium transition-colors">
                      Continue to Preview & Select <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Review scraped data */
              <>
                <h2 className="text-lg font-semibold text-white">Review Extracted Data</h2>
                <p className="text-sm text-[var(--t-text-muted)]">
                  We found {scrapedData.length} {scrapedData.length === 1 ? 'property' : 'properties'}. Review the data and select which to import.
                </p>

                <div className="space-y-4">
                  {scrapedData.map((property, idx) => (
                    <div key={idx} className={`bg-[var(--t-surface)] rounded-xl p-5 border transition-colors cursor-pointer ${
                      selectedForImport.has(idx) ? 'border-[var(--t-primary)] ring-1 ring-[var(--t-primary)]/30' : 'border-[var(--t-border)] hover:border-[var(--t-border)]'
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
                          selectedForImport.has(idx) ? 'bg-[var(--t-primary)] border-[var(--t-primary)]' : 'border-[var(--t-border)]'
                        }`}>
                          {selectedForImport.has(idx) && <Check size={14} className="text-white" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Address + price */}
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <MapPin size={14} className="text-[var(--t-primary)]" />
                                {property.address || 'Unknown Address'}
                                <ConfidenceBadge score={property.confidence.address || 0} />
                              </h3>
                              {property.owner && (
                                <p className="text-xs text-[var(--t-text-muted)] mt-1 flex items-center gap-1">
                                  <User size={11} /> Owner: {property.owner}
                                  <ConfidenceBadge score={property.confidence.owner || 0} />
                                </p>
                              )}
                            </div>
                            {property.price && (
                              <div className="text-right shrink-0">
                                <p className="text-lg font-bold text-[var(--t-success)]">${property.price.toLocaleString()}</p>
                                <ConfidenceBadge score={property.confidence.price || 0} />
                              </div>
                            )}
                          </div>

                          {/* Property details */}
                          <div className="flex flex-wrap gap-3 mb-3">
                            {property.beds !== undefined && (
                              <span className="text-xs text-[var(--t-text-muted)] bg-[var(--t-surface-subtle)]/50 px-2 py-1 rounded-lg">{property.beds} beds</span>
                            )}
                            {property.baths !== undefined && (
                              <span className="text-xs text-[var(--t-text-muted)] bg-[var(--t-surface-subtle)]/50 px-2 py-1 rounded-lg">{property.baths} baths</span>
                            )}
                            {property.sqft && (
                              <span className="text-xs text-[var(--t-text-muted)] bg-[var(--t-surface-subtle)]/50 px-2 py-1 rounded-lg">{property.sqft.toLocaleString()} sqft</span>
                            )}
                            {property.propertyType && (
                              <span className="text-xs text-[var(--t-text-muted)] bg-[var(--t-surface-subtle)]/50 px-2 py-1 rounded-lg">{property.propertyType}</span>
                            )}
                            {property.listingDate && (
                              <span className="text-xs text-[var(--t-text-muted)] bg-[var(--t-surface-subtle)]/50 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Clock size={10} /> Listed {property.listingDate}
                              </span>
                            )}
                          </div>

                          {/* Source + confidence */}
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-[var(--t-text-muted)] flex items-center gap-1">
                              <Link2 size={10} /> Source: {property.source}
                            </span>
                            {property.images && property.images.length > 0 && (
                              <span className="text-[10px] text-[var(--t-text-muted)] flex items-center gap-1">
                                <FileImage size={10} /> {property.images.length} images
                              </span>
                            )}
                          </div>

                          {/* Raw metadata */}
                          {Object.keys(property.raw).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[var(--t-border)]/50">
                              <p className="text-[10px] uppercase tracking-wider text-[var(--t-text-muted)] font-semibold mb-1.5">Raw Metadata</p>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(property.raw).map(([k, v]) => (
                                  <span key={k} className="text-[10px] px-2 py-1 bg-[var(--t-surface-dim)]/50 rounded text-[var(--t-text-muted)]">
                                    {k}: <span className="text-[var(--t-text-muted)]">{v}</span>
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

                <div className="flex items-center justify-between pt-4 border-t border-[var(--t-border)]">
                  <button onClick={() => setWizardStep(0)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-[var(--t-text-muted)] hover:text-white">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--t-text-muted)]">{selectedForImport.size} of {scrapedData.length} selected</span>
                    <button onClick={() => setWizardStep(2)} disabled={selectedForImport.size === 0}
                      className="flex items-center gap-1.5 px-5 py-2.5 disabled:opacity-50 text-white text-sm rounded-xl font-medium transition-all"
                      style={{ background: 'var(--t-primary)' }}
                    >
                      Continue <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Preview & Select Leads */}
        {wizardStep === 2 && (
          <div className="border rounded-2xl p-6 space-y-6"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Preview & Select Leads to Import</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (selectAllPreview) {
                      // Unselect all
                      setPreviewSelectedLeads(new Set());
                      setSelectAllPreview(false);
                    } else {
                      // Select all valid leads (with name or address)
                      const allValid = new Set<number>();
                      const total = selectedSource === 'google-sheets' ? sheetData.length : editedRows.length;
                      const data = selectedSource === 'google-sheets' ? sheetData : editedRows;
                      
                      for (let i = 0; i < total; i++) {
                        if (isRowValid(data[i])) {
                          allValid.add(i);
                        }
                      }
                      
                      setPreviewSelectedLeads(allValid);
                      setSelectAllPreview(true);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--t-surface)] hover:bg-[var(--t-surface-subtle)] text-[var(--t-text-muted)] rounded-lg transition-colors"
                >
                  {selectAllPreview ? <X size={12} /> : <Check size={12} />}
                  {selectAllPreview ? 'Unselect All' : 'Select All Valid'}
                </button>
                <span className="text-sm" style={{ color: 'var(--t-text-muted)' }}>
                  {previewSelectedLeads.size} of {selectedSource === 'google-sheets' ? sheetData.length : editedRows.length} selected
                </span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--t-background)' }}>
                <p className="text-2xl font-bold text-white">
                  {selectedSource === 'google-sheets' ? sheetData.length : editedRows.length}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>Total Records</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--t-background)' }}>
                <p className="text-2xl font-bold text-[var(--t-primary)]">
                  {selectedSource === 'google-sheets'
                    ? columnMappings.filter(m => m.targetField !== 'skip').length
                    : pasteColumnMappings.filter(m => m.targetField !== 'skip').length}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>Mapped Fields</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--t-background)' }}>
                <p className="text-2xl font-bold text-[var(--t-success)]">{previewSelectedLeads.size}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>Selected</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--t-background)' }}>
                <p className="text-2xl font-bold text-[var(--t-warning)]">{duplicateSettings.enabled ? 'On' : 'Off'}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>Duplicate Check</p>
              </div>
            </div>

            {/* Preview Table with Checkboxes */}
            <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--t-border)' }}>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ background: 'var(--t-surface-hover)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={selectAllPreview && previewSelectedLeads.size === (selectedSource === 'google-sheets' ? sheetData.length : editedRows.length)}
                          ref={input => {
                            if (input) {
                              input.indeterminate = previewSelectedLeads.size > 0 && previewSelectedLeads.size < (selectedSource === 'google-sheets' ? sheetData.length : editedRows.length);
                            }
                          }}
                          onChange={() => {
                            if (previewSelectedLeads.size === (selectedSource === 'google-sheets' ? sheetData.length : editedRows.length)) {
                              // Unselect all
                              setPreviewSelectedLeads(new Set());
                              setSelectAllPreview(false);
                            } else {
                              // Select all
                              const all = new Set<number>();
                              const total = selectedSource === 'google-sheets' ? sheetData.length : editedRows.length;
                              for (let i = 0; i < total; i++) all.add(i);
                              setPreviewSelectedLeads(all);
                              setSelectAllPreview(true);
                            }
                          }}
                          className="w-4 h-4 rounded border-[var(--t-border)] bg-[var(--t-surface-subtle)] text-[var(--t-primary)] focus:ring-[var(--t-primary)]"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--t-text-muted)] uppercase">#</th>
                      {selectedSource === 'google-sheets' 
                        ? columnMappings.filter(m => m.targetField !== 'skip').map(mapping => (
                            <th key={mapping.sourceColumn} className="px-4 py-3 text-left text-xs font-medium text-[var(--t-text-muted)] uppercase whitespace-nowrap">
                              {BASE_TARGET_FIELDS.find(f => f.value === mapping.targetField)?.label || 
                               customFields.find(f => f.field_key === mapping.targetField)?.name || 
                               mapping.targetField}
                            </th>
                          ))
                        : pasteColumnMappings.filter(m => m.targetField !== 'skip').map((mapping, idx) => {
                            return (
                              <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-[var(--t-text-muted)] uppercase whitespace-nowrap">
                                {BASE_TARGET_FIELDS.find(f => f.value === mapping.targetField)?.label || 
                                 customFields.find(f => f.field_key === mapping.targetField)?.name || 
                                 mapping.sourceColumn}
                              </th>
                            );
                          })
                      }
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--t-border-subtle)' }}>
                    {(selectedSource === 'google-sheets' ? sheetData : editedRows).map((row, rowIdx) => {
                      const isValid = isRowValid(row);

                      return (
                        <tr 
                          key={rowIdx} 
                          className={`transition-colors ${
                            !isValid ? 'opacity-50' : ''
                          }`}
                          style={{ 
                            background: previewSelectedLeads.has(rowIdx) ? 'var(--t-primary-dim)' : 'transparent',
                            backgroundColor: !isValid ? 'var(--t-danger-dim)' : ''
                          }}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={previewSelectedLeads.has(rowIdx)}
                              onChange={(e) => {
                                const newSelected = new Set(previewSelectedLeads);
                                if (e.target.checked) {
                                  newSelected.add(rowIdx);
                                } else {
                                  newSelected.delete(rowIdx);
                                }
                                setPreviewSelectedLeads(newSelected);
                                setSelectAllPreview(newSelected.size === (selectedSource === 'google-sheets' ? sheetData.length : editedRows.length));
                              }}
                              disabled={!isValid}
                              className="w-4 h-4 rounded border text-[color:var(--t-primary)] focus:ring-[color:var(--t-primary)] disabled:opacity-30"
                              style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--t-text-muted)' }}>{rowIdx + 1}</td>
                          {selectedSource === 'google-sheets' && isSheetRow(row)
                            ? columnMappings.filter(m => m.targetField !== 'skip').map(mapping => (
                                <td key={mapping.sourceColumn} className="px-4 py-3 text-sm text-[var(--t-text-muted)] whitespace-nowrap">
                                  {row[mapping.sourceColumn] || <span className="text-[var(--t-text-muted)] italic">—</span>}
                                </td>
                              ))
                            : isPasteRow(row) && pasteColumnMappings
                               .filter(m => m.targetField !== 'skip')
                                .map((mapping, index) => {
                                   // Find the original column index for this mapping
                                   const originalColIndex = parseResult?.columns.findIndex(col => col.name === mapping.sourceColumn);
                                     return (
                                     <td key={index} className="px-4 py-3 text-sm text-[var(--t-text-muted)] whitespace-nowrap">
                                       {originalColIndex !== undefined && originalColIndex !== -1 ? row[originalColIndex] : <span className="text-[var(--t-text-muted)] italic">—</span>}
                                          </td>
                                    );
                                  })
                          }
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 text-xs border-t flex items-center justify-between"
                 style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)', borderColor: 'var(--t-border)' }}
               >
                 <span>
                   {previewSelectedLeads.size === 0 ? (
                     <span className="text-[var(--t-warning)] flex items-center gap-1">
                       <AlertTriangle size={12} /> No leads selected — nothing will be imported
                     </span>
                   ) : (
                     <span>{previewSelectedLeads.size} leads selected for import</span>
                   )}
                 </span>
                 <span style={{ color: 'var(--t-text-muted)', opacity: 0.6 }}>
                   {selectedSource === 'google-sheets' 
                     ? sheetData.length - previewSelectedLeads.size 
                     : editedRows.length - previewSelectedLeads.size} unselected
                 </span>
               </div>
            </div>

            {/* Duplicate detection settings */}
            <div className="border rounded-xl p-5 space-y-4" style={{ background: 'var(--t-background)', borderColor: 'var(--t-border)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield size={16} style={{ color: 'var(--t-primary)' }} />
                  Duplicate Detection
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={duplicateSettings.enabled}
                    onChange={() => updateDuplicateSettings({ enabled: !duplicateSettings.enabled })}
                    className="sr-only peer" />
                  <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={{ background: 'var(--t-border)' }}
                    // @ts-expect-error custom prop
                    css={duplicateSettings.enabled ? { background: 'var(--t-primary)' } : {}}
                  />
                </label>
              </div>

              {duplicateSettings.enabled && (
                <>
                  <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--t-text-muted)' }}>Match on fields:</p>
                    <div className="flex flex-wrap gap-2">
                      {(['name', 'email', 'phone', 'address'] as const).map(field => (
                        <button key={field} onClick={() => {
                          const current = duplicateSettings.matchFields;
                          const next = current.includes(field)
                            ? current.filter(f => f !== field)
                            : [...current, field];
                          updateDuplicateSettings({ matchFields: next });
                        }}
                          className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                          style={{ 
                            background: duplicateSettings.matchFields.includes(field) ? 'var(--t-primary-dim)' : 'var(--t-surface)',
                            borderColor: duplicateSettings.matchFields.includes(field) ? 'var(--t-primary)' : 'var(--t-border)',
                            color: duplicateSettings.matchFields.includes(field) ? 'var(--t-primary)' : 'var(--t-text-muted)'
                          }}
                        >
                          {field.charAt(0).toUpperCase() + field.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--t-text-muted)' }}>When duplicate found:</p>
                    <div className="flex gap-2">
                      {(['skip', 'merge', 'create-new'] as const).map(action => (
                        <button key={action} onClick={() => updateDuplicateSettings({ action })}
                          className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                          style={{ 
                            background: duplicateSettings.action === action ? 'var(--t-primary-dim)' : 'var(--t-surface)',
                            borderColor: duplicateSettings.action === action ? 'var(--t-primary)' : 'var(--t-border)',
                            color: duplicateSettings.action === action ? 'var(--t-primary)' : 'var(--t-text-muted)'
                          }}
                        >
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
              <div className="border rounded-xl p-5 space-y-3" style={{ background: 'var(--t-background)', borderColor: 'var(--t-border)' }}>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Copy size={16} style={{ color: 'var(--t-text-muted)' }} />
                  Save Column Mapping as Template
                </h3>
                <div className="flex gap-2">
                  <input value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name (e.g., My CRM Export)"
                    className="flex-1 px-3 py-2 text-sm rounded-xl outline-none transition-all border"
                    style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
                  />
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
                    className="px-4 py-2 bg-[var(--t-primary)] hover:bg-[var(--t-primary)] disabled:opacity-50 text-white text-sm rounded-xl font-medium">
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--t-border)]">
              <button onClick={() => setWizardStep(1)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-[var(--t-text-muted)] hover:text-white">
                <ArrowLeft size={14} /> Back
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--t-text-muted)]">
                  Importing <span className="text-white font-semibold">{previewSelectedLeads.size}</span> of <span className="text-white">{selectedSource === 'google-sheets' ? sheetData.length : editedRows.length}</span> leads
                </span>
                <button 
                  onClick={() => {
                    if (previewSelectedLeads.size === 0) {
                      alert('Please select at least one lead to import');
                      return;
                    }
                    if (selectedSource === 'google-sheets') {
                      importFromSheet(previewSelectedLeads);
                    } else if (selectedSource === 'smart-paste') {
                      importFromPaste(previewSelectedLeads);
                    } else {
                      importFromScraped(selectedForImport);
                    }
                  }}
                  disabled={isLoading || previewSelectedLeads.size === 0}
                  className="flex items-center gap-2 px-6 py-3 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
                  style={{ background: 'var(--t-primary)' }}
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Importing...</>
                  ) : (
                    <><Download size={16} /> Import Selected ({previewSelectedLeads.size})</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {wizardStep === 3 && importResult && (
          <div className="border rounded-2xl p-8 text-center space-y-6"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'var(--t-success-dim)' }}
            >
              <CheckCircle2 size={40} className="text-[var(--t-success)]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Import Complete!</h2>
              <p className="text-[var(--t-text-muted)] text-sm mt-2">Your leads have been successfully imported into WholeScale OS.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
              <div className="bg-[var(--t-surface)] rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{importResult.total}</p>
                <p className="text-xs text-[var(--t-text-muted)]">Total Rows</p>
              </div>
              <div className="bg-[var(--t-success-dim)] rounded-xl p-4 border border-[var(--t-success)]/30">
                <p className="text-2xl font-bold text-[var(--t-success)]">{importResult.imported}</p>
                <p className="text-xs text-[var(--t-text-muted)]">Imported</p>
              </div>
              <div className="bg-[var(--t-warning-dim)] rounded-xl p-4 border border-[var(--t-warning)]/30">
                <p className="text-2xl font-bold text-[var(--t-warning)]">{importResult.duplicates}</p>
                <p className="text-xs text-[var(--t-text-muted)]">Duplicates</p>
              </div>
              <div className="bg-[var(--t-surface)] rounded-xl p-4">
                <p className="text-2xl font-bold text-[var(--t-text-muted)]">{importResult.skipped}</p>
                <p className="text-xs text-[var(--t-text-muted)]">Skipped</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4">
              <button onClick={() => window.location.href = '/leads'}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--t-primary)] hover:bg-[var(--t-primary)] text-white font-medium rounded-xl transition-colors">
                <Users size={16} /> View Leads
              </button>
              <button onClick={resetWizard}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--t-surface-subtle)] hover:bg-[var(--t-surface)] text-[var(--t-text-muted)] font-medium rounded-xl transition-colors">
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
      {/* CUSTOM FIELDS SECTION */}
      <div className="mb-6 p-4 border rounded-xl"
        style={{ 
          background: 'linear-gradient(to right, var(--t-primary-dim), var(--t-surface))', 
          borderColor: 'var(--t-primary-dim)' 
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
            <h2 className="text-base font-semibold text-white">Custom Import Fields</h2>
            <span className="px-2 py-0.5 text-xs rounded-full"
              style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}
            >
              {customFields.length}
            </span>
          </div>
          {!showAddField && (
            <button 
              onClick={() => setShowAddField(true)} 
              className="flex items-center gap-1 px-3 py-1.5 text-white text-sm rounded-lg transition-all"
              style={{ background: 'var(--t-primary)' }}
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
              className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none" 
              style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
              autoFocus 
            />
            <select 
              value={newFieldType} 
              onChange={e => setNewFieldType(e.target.value as any)} 
              className="px-3 py-2 border rounded-lg text-sm appearance-none outline-none"
              style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
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
              className="p-2 bg-[var(--t-success)] text-white rounded-lg hover:bg-[var(--t-success)]/80"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { 
                setShowAddField(false); 
                setNewFieldName(''); 
              }} 
              className="p-2 text-white rounded-lg transition-colors"
              style={{ background: 'var(--t-surface-hover)', border: '1px solid var(--t-border)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {fieldSaveSuccess && (
          <div className="mb-3 p-2 bg-[var(--t-success)]/20 border border-[var(--t-success)]/30 rounded-lg text-[var(--t-success)]/80 text-xs flex items-center gap-1">
            <Check size={12} />
            Field saved to database!
          </div>
        )}

        {customFields.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>No custom fields yet. Add fields like "Lot Size", "ARV", or "Equity" to use in imports.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customFields.map(f => (
              <span 
                key={f.id} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm group"
                style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
              >
                <span style={{ color: 'var(--t-text)' }}>{f.name}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  f.field_type === 'number' 
                    ? 'bg-[var(--t-success)]/20 text-[var(--t-success)]' 
                    : 'bg-[var(--t-primary)]/20 text-[var(--t-primary)]'
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
                  className="opacity-0 group-hover:opacity-100 text-[var(--t-text-muted)] hover:text-[var(--t-error)] transition-all"
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
          <p className="text-sm mt-1" style={{ color: 'var(--t-text-muted)' }}>
            Import leads from multiple sources — spreadsheets, listings, websites, and documents.
          </p>
        </div>
      </div>

      {/* Source cards */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--t-text-muted)' }}>Start New Import</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(['google-sheets', 'homes-com', 'url', 'pdf', 'smart-paste'] as ImportSource[]).map(source => {
            const config = SOURCE_CONFIG[source];
            return (
              <button
                key={source}
                onClick={() => { setSelectedSource(source); setActiveView('wizard'); setWizardStep(0); }}
                className={`text-left p-5 rounded-2xl border transition-all group ${config.border} ${config.bg}`}
              >
                <config.icon size={28} className={`${config.color} mb-3`} />
                <h3 className="text-sm font-semibold text-white mb-1">{config.label}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>{config.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--t-primary)' }}
                >
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
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--t-text-muted)' }}>Saved Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {importTemplates.map(t => {
              const config = SOURCE_CONFIG[t.source];
              return (
                <div key={t.id} className="border rounded-xl p-4 transition-colors"
                  style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                      <config.icon size={16} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">{t.name}</h3>
                      <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>{config.label} · {t.mappings.length} fields</p>
                    </div>
                    <button onClick={() => deleteImportTemplate(t.id)}
                      className="p-1 text-[var(--t-text-muted)] hover:text-[var(--t-error)] transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.mappings.slice(0, 4).map(m => (
                      <span key={m.sourceColumn} className="text-[10px] px-1.5 py-0.5 bg-[var(--t-surface)] text-[var(--t-text-muted)] rounded">
                        {m.sourceColumn} → {BASE_TARGET_FIELDS.find(f => f.value === m.targetField)?.label || 
                          customFields.find(f => f.field_key === m.targetField)?.name || 
                          m.targetField}
                      </span>
                    ))}
                    {t.mappings.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[var(--t-surface)] text-[var(--t-text-muted)] rounded">
                        +{t.mappings.length - 4} more
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => { setSelectedSource(t.source); setActiveView('wizard'); setWizardStep(0); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[var(--t-primary)]/20 text-[var(--t-primary)] text-xs rounded-lg hover:bg-[var(--t-primary)]/30 font-medium transition-colors"
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
          <h2 className="text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>Import History</h2>
          <div className="relative">
            <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)]" />
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value as ImportSource | 'all')}
              className="pl-7 pr-6 py-1.5 text-xs rounded-lg border appearance-none outline-none"
              style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
            >
              <option value="all">All Sources</option>
              {Object.entries(SOURCE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)] pointer-events-none" />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 border rounded-2xl"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
          >
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No import history yet</p>
            <p className="text-xs mt-1">Start an import above to see your history here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map(entry => {
              const config = SOURCE_CONFIG[entry.source];
              return (
                <div key={entry.id} className="border rounded-xl p-4 transition-colors"
                  style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                      <config.icon size={18} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-white truncate">{entry.sourceName}</h3>
                        <StatusBadge status={entry.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--t-text-muted)' }}>
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
                        <p className="text-sm font-semibold text-[var(--t-success)]">{entry.importedCount}</p>
                        <p className="text-[10px] text-[var(--t-text-muted)]">imported</p>
                      </div>
                      {entry.duplicateCount > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-[var(--t-warning)]">{entry.duplicateCount}</p>
                          <p className="text-[10px] text-[var(--t-text-muted)]">duplicates</p>
                        </div>
                      )}
                      {entry.skippedCount > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-[var(--t-text-muted)]">{entry.skippedCount}</p>
                          <p className="text-[10px] text-[var(--t-text-muted)]">skipped</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>{entry.totalRows}</p>
                        <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>total</p>
                      </div>
                    </div>
                  </div>
                  {entry.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--t-border)]">
                      <div className="flex flex-wrap gap-1.5">
                        {entry.errors.map((err, i) => (
                          <span key={i} className="text-[10px] px-2 py-1 bg-[var(--t-primary)]/10 text-[var(--t-primary)] rounded-lg flex items-center gap-1">
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

      {/* Duplicate Detection Settings Card (Bottom) */}
      <div className="border rounded-2xl p-6" style={{ background: 'var(--t-background)', borderColor: 'var(--t-border)' }}>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Shield size={16} style={{ color: 'var(--t-primary)' }} />
          Duplicate Detection Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--t-text-muted)' }}>Status</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={duplicateSettings.enabled}
                onChange={() => updateDuplicateSettings({ enabled: !duplicateSettings.enabled })}
                className="sr-only peer" />
              <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{ background: 'var(--t-surface-hover)' }}
                // @ts-expect-error custom prop
                css={duplicateSettings.enabled ? { background: 'var(--t-primary)' } : {}}
              />
              <span className="ml-2 text-sm" style={{ color: 'var(--t-text)' }}>{duplicateSettings.enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--t-text-muted)' }}>Match Fields</p>
            <div className="flex flex-wrap gap-1.5">
              {duplicateSettings.matchFields.map(f => (
                <span key={f} className="text-xs px-2 py-1 rounded-lg capitalize"
                  style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}
                >{f}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--t-text-muted)' }}>Action</p>
            <p className="text-sm text-white capitalize">{duplicateSettings.action.replace('-', ' ')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}