import { useState, useRef, useEffect } from 'react';
import { 
  FileText, Mail, Plus, Search, 
  ChevronDown, User, FileSignature, Loader2, Shield,
  Check, Edit3, Send, X
} from 'lucide-react';
import { useStore, Lead } from '../store/useStore';
import { supabase } from '../lib/supabase';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import EmailComposeModal from '../components/EmailComposeModal';

interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  isCustom?: boolean;
  folder?: string;
  updatedAt?: string;
}

const DISCLAIMER_TEXT = `
DISCLAIMER: This document is a template only. It does not constitute legal advice. 
Consult with a qualified real estate attorney before using any contract. 
Wholescale OS is not liable for any legal issues arising from use of these templates.
`;

const PREBUILT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'wholesale-purchase',
    name: 'Wholesale Purchase Agreement',
    category: 'Acquisitions',
    content: `PURCHASE AND SALE AGREEMENT

This Agreement is made and entered into on {{date}}
by and between the following parties:

SELLER:
Name: {{lead.name}}
Email: {{lead.email}}
Phone: {{lead.phone}}

BUYER:
Name: [Your Company Name]
Email: [Your Email]
Phone: [Your Phone]

1. PROPERTY DESCRIPTION
The Seller agrees to sell and Buyer agrees to purchase the real property located at:
{{lead.propertyAddress}}
together with all improvements, fixtures, and appurtenances thereon (the "Property"), more fully described in Exhibit A attached hereto and incorporated herein by reference.

2. PURCHASE PRICE AND TERMS
The total purchase price for the Property shall be \${{lead.offerAmount}} (the "Purchase Price"), payable at closing in cash or certified funds. The parties acknowledge that the estimated market value of the Property is approximately \${{lead.estimatedValue}}.

3. EARNEST MONEY DEPOSIT
Within three (3) business days following the Effective Date of this Agreement, Buyer shall deposit earnest money in the amount of $1,000.00 ("Earnest Money") with the designated escrow agent or title company. Said Earnest Money shall be applied toward the Purchase Price at closing or refunded to Buyer in accordance with the terms of this Agreement.

4. CLOSING DATE
The closing of this transaction ("Closing") shall occur on or before thirty (30) calendar days from the Effective Date of this Agreement, or at such other time as the parties may mutually agree in writing. Time is of the essence with respect to the Closing Date.

5. FINANCING CONTINGENCY
This is a CASH PURCHASE. There is no financing contingency. Buyer represents that Buyer has sufficient funds available to complete the purchase and will provide proof of funds within five (5) business days of the Effective Date.

6. INSPECTION CONTINGENCY
Buyer shall have a period of ten (10) business days from the Effective Date (the "Inspection Period") to conduct, at Buyer's expense, any inspections, tests, surveys, or studies of the Property that Buyer deems necessary. If the results of such inspections are unsatisfactory to Buyer in Buyer's sole discretion, Buyer may terminate this Agreement by providing written notice to Seller prior to the expiration of the Inspection Period, and the Earnest Money shall be returned to Buyer.

7. TITLE AND SURVEY
Seller shall convey marketable and insurable fee simple title to the Property by general warranty deed, free and clear of all liens, encumbrances, easements, and restrictions except those acceptable to Buyer. Seller shall provide a preliminary title commitment within ten (10) days of the Effective Date. Buyer shall have five (5) business days following receipt of the title commitment to raise any objections. Any title defects not cured by Seller within ten (10) days of Buyer's objection shall entitle Buyer to terminate this Agreement and receive a full refund of the Earnest Money.

8. CLOSING COSTS
Closing costs shall be allocated as follows:
- Seller shall pay: Documentary stamps on the deed, Seller's share of prorated taxes and assessments, any outstanding liens or mortgages, and Seller's attorney fees.
- Buyer shall pay: Recording fees for the deed, Buyer's title insurance policy, escrow fees, and Buyer's attorney fees.

9. PROPERTY CONDITION — "AS-IS"
Buyer is purchasing the Property in its present "AS-IS, WHERE-IS" condition with all faults, whether known or unknown. Seller makes no warranties or representations regarding the condition of the Property, including but not limited to structural integrity, mechanical systems, environmental conditions, roof, foundation, plumbing, electrical, HVAC, or compliance with building codes and zoning ordinances. Seller is not required to make any repairs or improvements.

10. RIGHT TO ASSIGN
Buyer may assign this Agreement, in whole or in part, to any entity or individual without Seller's prior consent. Upon assignment, the assignee shall assume all of Buyer's obligations hereunder and Buyer shall be released from further liability, provided the assignee performs all terms and conditions of this Agreement.

11. DEFAULT AND REMEDIES
If Buyer defaults under this Agreement, Seller's sole remedy shall be to retain the Earnest Money as liquidated damages. If Seller defaults, Buyer may (a) seek specific performance of this Agreement, (b) terminate this Agreement and receive a full refund of the Earnest Money, or (c) pursue any other remedy available at law or in equity.

12. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, warranties, commitments, offers, and contracts, whether written or oral. This Agreement may not be modified or amended except by a written instrument signed by both parties. If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.

13. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the state in which the Property is located.

14. NOTICES
All notices required or permitted under this Agreement shall be in writing and shall be deemed delivered when personally delivered, sent by certified mail (return receipt requested), or sent by nationally recognized overnight courier to the addresses listed above.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

Seller Signature: ________________		Buyer Signature: ________________
Name: {{lead.name}}				Name: [Your Name]
Date: ________________			Date: ________________

${DISCLAIMER_TEXT}
    `
  },
  {
    id: 'assignment-contract',
    name: 'Assignment of Contract',
    category: 'Dispositions',
    content: `ASSIGNMENT OF REAL ESTATE PURCHASE CONTRACT

This Assignment is entered into on {{date}}.

ASSIGNOR:
Name: [Your Company Name]
(Original Buyer under the Purchase Agreement)

ASSIGNEE:
Name: ___________________________
Address: ___________________________
Phone: ___________________________

RECITALS
WHEREAS, Assignor entered into a Purchase and Sale Agreement dated ________________ (the "Original Agreement") for the purchase of real property located at {{lead.propertyAddress}} from {{lead.name}} (the "Seller"); and
WHEREAS, the Original Agreement permits assignment of Buyer's rights and obligations; and
WHEREAS, Assignor desires to assign all rights, title, and interest in the Original Agreement to Assignee;

NOW, THEREFORE, in consideration of the mutual promises herein and the Assignment Fee described below, the parties agree as follows:

1. ASSIGNMENT
Assignor hereby assigns, transfers, and conveys to Assignee all of Assignor's right, title, and interest in and to the Original Agreement, including all rights to purchase the Property on the terms and conditions set forth therein.

2. ASSIGNMENT FEE
In consideration for this Assignment, Assignee agrees to pay Assignor a non-refundable assignment fee of \$__________ (the "Assignment Fee"), payable as follows:
- \$__________ due upon execution of this Assignment as a non-refundable deposit.
- The balance of \$__________ due at Closing of the transaction.

3. ASSUMPTION OF OBLIGATIONS
Assignee hereby accepts and assumes all of Assignor's obligations, duties, and responsibilities under the Original Agreement, including but not limited to the obligation to close the purchase of the Property at the Purchase Price of \${{lead.offerAmount}} and in accordance with all terms and conditions of the Original Agreement.

4. ORIGINAL AGREEMENT TERMS
The Original Agreement, a copy of which is attached hereto as Exhibit A and incorporated herein by reference, shall remain in full force and effect. In the event of any conflict between this Assignment and the Original Agreement, the terms of the Original Agreement shall prevail.

5. REPRESENTATIONS AND WARRANTIES
Assignor represents and warrants that: (a) Assignor has full authority to assign the Original Agreement; (b) the Original Agreement is in full force and effect; (c) Assignor is not in default under the Original Agreement; and (d) there are no outstanding claims or disputes regarding the Original Agreement.

6. INDEMNIFICATION
Assignee shall indemnify and hold harmless Assignor from any and all claims, damages, losses, costs, and expenses arising from Assignee's failure to perform any obligations under the Original Agreement from and after the date of this Assignment.

7. CLOSING
Assignee shall close on the Property in accordance with the Closing Date specified in the Original Agreement. Failure to close shall constitute a default under both this Assignment and the Original Agreement.

8. ENTIRE AGREEMENT
This Assignment, together with the Original Agreement, constitutes the entire agreement between Assignor and Assignee with respect to the subject matter hereof. This Assignment may not be modified except by a written instrument signed by both Assignor and Assignee.

IN WITNESS WHEREOF, the parties have executed this Assignment as of the date first written above.

Assignor Signature: ________________		Assignee Signature: ________________
Name: [Your Name]					Name: ___________________________
Date: ________________				Date: ________________

${DISCLAIMER_TEXT}
    `
  },
  {
    id: 'fix-flip',
    name: 'Fix & Flip Joint Venture',
    category: 'Acquisitions',
    content: `FIX & FLIP JOINT VENTURE AGREEMENT

Agreement effective as of {{date}}

PARTY A (Capital Partner):
Name: [Your Company Name]

PARTY B (Property Owner):
Name: {{lead.name}}
Email: {{lead.email}}
Phone: {{lead.phone}}

1. PURPOSE
The parties enter into this Joint Venture Agreement for the purpose of acquiring, renovating, and reselling the real property located at {{lead.propertyAddress}} (the "Property") for profit.

2. PROPERTY DETAILS
Estimated Market Value (as-is): \${{lead.estimatedValue}}
Agreed Purchase Price: \${{lead.offerAmount}}
Estimated After Repair Value (ARV): $__________
Estimated Renovation Budget: $__________

3. CAPITAL CONTRIBUTIONS
Party A shall contribute: $__________ for acquisition and renovation costs.
Party B shall contribute: the Property and/or project management services valued at $__________.
All capital contributions shall be documented and verifiable through receipts, bank statements, or closing statements.

4. RESPONSIBILITIES
Party A shall be responsible for: arranging financing, managing contractor payments, and overseeing the renovation budget.
Party B shall be responsible for: day-to-day project management, contractor coordination, obtaining permits, and managing the renovation timeline.

5. PROFIT DISTRIBUTION
Upon the sale of the Property, net profits (defined as sale price minus total costs including acquisition, renovation, holding costs, closing costs, and commissions) shall be distributed as follows:
- Party A: __________% of net profits
- Party B: __________% of net profits
Capital contributions shall be returned to each party before profit distribution.

6. TIMELINE
The parties agree to complete renovations within __________ days of acquisition and list the Property for sale within __________ days of renovation completion. If the Property is not sold within __________ days of listing, the parties shall meet to discuss a revised strategy.

7. BUDGET OVERRUNS
Any renovation costs exceeding the approved budget by more than 10% shall require written approval from both parties. Unauthorized expenditures shall be the sole responsibility of the party who authorized them.

8. DEFAULT AND DISPUTE RESOLUTION
In the event of a dispute, the parties agree to first attempt resolution through mediation before pursuing any legal action. The prevailing party in any legal proceeding shall be entitled to recover reasonable attorney's fees.

9. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties. Modifications must be in writing and signed by both parties.

Party A Signature: ________________		Party B Signature: ________________
Date: ________________				Name: {{lead.name}}
						Date: ________________

${DISCLAIMER_TEXT}
    `
  },
  {
    id: 'seller-financing',
    name: 'Seller Financing Agreement',
    category: 'Creative Finance',
    content: `SELLER FINANCING ADDENDUM

Addendum to Purchase Agreement dated {{date}}

PARTIES AND PROPERTY
Seller/Lender: {{lead.name}}
Buyer/Borrower: [Your Company Name]
Property: {{lead.propertyAddress}}

1. PRINCIPAL AMOUNT AND TERMS
Seller agrees to finance the purchase of the Property under the following terms:
- Purchase Price: \${{lead.offerAmount}}
- Down Payment: $__________
- Financed Amount: $__________
- Interest Rate: __________% per annum
- Loan Term: __________ months
- Monthly Payment: $__________
- Balloon Payment Due: [Date or N/A]

2. PROMISSORY NOTE
Buyer shall execute a Promissory Note in the amount of the financed balance, secured by a Deed of Trust or Mortgage on the Property. The promissory note shall contain the payment terms specified above.

3. SECURITY INSTRUMENT
This financing shall be secured by a first lien position Deed of Trust or Mortgage recorded against the Property. Buyer grants Seller a security interest in the Property until the loan is paid in full.

4. PAYMENT TERMS
Monthly payments are due on the 1st of each month, beginning __________. A late fee of __________% of the monthly payment or $__________ (whichever is greater) shall be assessed for payments received more than ten (10) days after the due date.

5. PREPAYMENT
Buyer may prepay the loan in whole or in part at any time without penalty.

6. INSURANCE AND TAXES
Buyer shall maintain hazard insurance on the Property with Seller named as loss payee. Buyer shall pay all property taxes when due and provide Seller with evidence of payment upon request.

7. DEFAULT
The following shall constitute events of default: (a) failure to make any payment within thirty (30) days of the due date; (b) failure to maintain insurance; (c) failure to pay property taxes; (d) transfer of the Property without Seller's consent. Upon default, Seller may declare the entire balance due and payable and exercise all remedies available under law.

8. DUE ON SALE CLAUSE
If Buyer sells, transfers, or conveys the Property without Seller's prior written consent, the entire unpaid balance shall become immediately due and payable.

9. ENTIRE AGREEMENT
This Addendum, together with the Purchase Agreement and Promissory Note, constitutes the entire agreement regarding the financing of this transaction.

Seller Signature: ________________		Buyer Signature: ________________
Name: {{lead.name}}				Name: [Your Name]
Date: ________________			Date: ________________

${DISCLAIMER_TEXT}
    `
  },
  {
    id: 'standard-purchase',
    name: 'Standard Purchase Agreement',
    category: 'Acquisitions',
    content: `RESIDENTIAL PURCHASE AND SALE AGREEMENT

Effective Date: {{date}}

SELLER:
Name: {{lead.name}}
Email: {{lead.email}}
Phone: {{lead.phone}}

BUYER:
Name: [Your Name]
Email: [Your Email]
Phone: [Your Phone]

1. PROPERTY
Seller agrees to sell and Buyer agrees to purchase the following described real property:
{{lead.propertyAddress}}
Including all improvements, fixtures, and appurtenances ("the Property").

2. PURCHASE PRICE
Purchase Price: \${{lead.offerAmount}}
Estimated Value: \${{lead.estimatedValue}}

3. EARNEST MONEY
Buyer shall deposit $__________ as earnest money within three (3) business days of the Effective Date with the title company or escrow agent agreed upon by the parties.

4. FINANCING
This Agreement is contingent upon Buyer obtaining financing approval within __________ days. If Buyer is unable to obtain financing, Buyer may terminate this Agreement and receive a full refund of the Earnest Money.

5. CLOSING
Closing shall occur on or before __________ days from the Effective Date at a mutually agreed upon title company.

6. TITLE
Seller shall convey marketable title by warranty deed free of liens and encumbrances except those acceptable to Buyer and Buyer's lender.

7. INSPECTION
Buyer shall have __________ days from the Effective Date to conduct inspections. If deficiencies are found, Buyer may request repairs, negotiate a price reduction, or terminate this Agreement.

8. PROPERTY CONDITION
Seller represents that all major systems (HVAC, plumbing, electrical, roof, foundation) are in working condition as of the Effective Date unless otherwise disclosed. Seller shall provide all required disclosures as mandated by state law.

9. CLOSING COSTS
Each party shall be responsible for their customary closing costs unless otherwise agreed in writing. Real property taxes shall be prorated as of the Closing Date.

10. DEFAULT AND REMEDIES
If either party defaults, the non-defaulting party may pursue specific performance, terminate this Agreement, or seek any remedy available at law or in equity.

11. ENTIRE AGREEMENT
This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements. Amendments must be in writing signed by both parties.

Seller Signature: ________________		Buyer Signature: ________________
Name: {{lead.name}}				Name: [Your Name]
Date: ________________			Date: ________________

${DISCLAIMER_TEXT}
    `
  },
  {
    id: 'lease-agreement',
    name: 'Lease Agreement',
    category: 'Property Management',
    content: `RESIDENTIAL LEASE AGREEMENT

Effective Date: {{date}}

LANDLORD:
Name: [Your Company Name]

TENANT:
Name: {{lead.name}}
Email: {{lead.email}}
Phone: {{lead.phone}}

1. PREMISES
Landlord leases to Tenant the property located at:
{{lead.propertyAddress}} ("the Premises").

2. TERM
The lease term shall be __________ months, commencing on __________ and ending on __________.

3. RENT
Monthly rent: $__________, due on the 1st of each month. Late fee of $__________ applies after the 5th. Payment methods accepted: __________.

4. SECURITY DEPOSIT
Tenant shall deposit $__________ as a security deposit. The deposit will be returned within __________ days after lease termination, less any lawful deductions.

5. UTILITIES
Tenant is responsible for: __________. Landlord is responsible for: __________.

6. MAINTENANCE AND REPAIRS
Landlord shall maintain the structural integrity and major systems. Tenant shall maintain the Premises in clean, sanitary condition and report all needed repairs promptly. Tenant is responsible for damages caused by negligence or misuse.

7. RULES AND RESTRICTIONS
Pets: [Allowed / Not Allowed]. Smoking: [Allowed / Not Allowed]. Subletting: Not permitted without Landlord's written consent. Occupancy limited to __________ persons.

8. DEFAULT AND TERMINATION
Landlord may terminate this Lease upon __________ days written notice if Tenant fails to pay rent, violates lease terms, or causes damage to the Premises.

9. ENTIRE AGREEMENT
This Lease constitutes the entire agreement. Amendments must be in writing signed by both parties.

Landlord Signature: ________________		Tenant Signature: ________________
Date: ________________				Name: {{lead.name}}
						Date: ________________

${DISCLAIMER_TEXT}
    `
  },
  {
    id: 'option-contract',
    name: 'Option to Purchase',
    category: 'Creative Finance',
    content: `REAL ESTATE OPTION AGREEMENT

Effective Date: {{date}}

PARTIES
Optionor (Seller): {{lead.name}}
Optionee (Buyer): [Your Company Name]

1. GRANT OF OPTION
In consideration of the Option Fee specified below, Optionor hereby grants to Optionee the exclusive right and option to purchase the property located at:
{{lead.propertyAddress}} (the "Property").

2. OPTION FEE
Optionee shall pay Optionor a non-refundable option fee of $__________ upon execution of this Agreement. This fee shall be applied toward the Purchase Price if the option is exercised.

3. PURCHASE PRICE
If this option is exercised, the Purchase Price for the Property shall be \${{lead.offerAmount}}.

4. OPTION PERIOD
This option shall be valid for a period of __________ days from the Effective Date. Optionee must exercise the option by providing written notice to Optionor before the expiration of the Option Period.

5. EXERCISE OF OPTION
Optionee may exercise this option at any time during the Option Period by delivering written notice to Optionor. Upon exercise, the parties will proceed to close the transaction within __________ days.

6. PROPERTY MAINTENANCE
During the Option Period, Optionor agrees to maintain the Property in its current condition and not to enter into any other agreements for the sale or encumbrance of the Property.

7. EXTENSION
The Option Period may be extended by mutual written agreement and payment of an additional option fee to be negotiated by the parties.

8. DEFAULT
If Optionee fails to exercise the option within the Option Period, this Agreement shall terminate and the option fee shall be retained by Optionor as full consideration. If Optionor defaults, Optionee may seek specific performance or damages.

9. ENTIRE AGREEMENT
This Agreement constitutes the entire understanding between the parties. Amendments must be in writing signed by both parties.

Optionor (Seller) Signature: ________________		Optionee (Buyer) Signature: ________________
Name: {{lead.name}}					Name: [Your Name]
Date: ________________					Date: ________________

${DISCLAIMER_TEXT}
    `
  }
];

export default function Contracts() {
  const { leads, currentUser } = useStore();
  
  const [activeTemplate, setActiveTemplate] = useState<ContractTemplate>(PREBUILT_TEMPLATES[0]);
  const [customTemplates, setCustomTemplates] = useState<ContractTemplate[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAttachment, setEmailAttachment] = useState<{
    filename: string;
    content: string;
    contentType: string;
  } | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSendingContract, setIsSendingContract] = useState(false);
  const [sendStep, setSendStep] = useState<'idle' | 'generating' | 'sending' | 'success'>('idle');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadCustomTemplates() {
      if (!supabase || !currentUser?.id) return;
      try {
        const { error } = await supabase.storage.from('contract_templates').list(currentUser.id, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });
        if (error) throw error;
        
        const templates: ContractTemplate[] = [];
        const foundFolders = new Set<string>(['Main']);

        const processFolder = async (path: string, currentFolder: string = 'Main') => {
          if (!supabase) return;
          const { data: files, error: listError } = await supabase.storage.from('contract_templates').list(path);
          if (listError) return;

          for (const file of files || []) {
            if (file.id === null || file.metadata === null) {
              foundFolders.add(file.name);
              await processFolder(`${path}/${file.name}`, file.name);
              continue;
            }

            if (!file.name.match(/\.(html|txt|pdf|docx)$/i)) continue;
            
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('contract_templates')
              .download(`${path}/${file.name}`);
              
            if (downloadError) continue;
            
            const text = await fileData.text();
            templates.push({
              id: `${path}/${file.name}`,
              name: file.name.replace(/\.(html|txt|pdf|docx)$/i, '').replace(/_/g, ' '),
              category: 'Custom',
              content: text,
              isCustom: true,
              folder: currentFolder,
              updatedAt: file.updated_at
            });
          }
        };

        await processFolder(currentUser.id);
        
        setCustomTemplates(templates);
        setFolders(Array.from(foundFolders));
      } catch (err) {
        console.error('Failed to load custom templates', err);
      }
    }
    loadCustomTemplates();
  }, [currentUser?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id || !supabase) return;
    
    setIsUploading(true);
    const uploadPath = currentUser.id + '/' + file.name;
    
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const supportedTypes = ['html', 'txt', 'pdf', 'docx'];
      if (!supportedTypes.includes(ext)) {
        throw new Error('Supported formats: .html, .txt, .pdf, .docx');
      }

      let content = '';
      const baseName = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');

      if (ext === 'html' || ext === 'txt') {
        content = await file.text();
      } else if (ext === 'pdf') {
        const arrayBuf = await file.arrayBuffer();
        let extractedText = '';
        
        // Step 1: Try text extraction with pdfjs-dist
        try {
          const pdfjs = await import('pdfjs-dist');
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
          
          const pdf = await pdfjs.getDocument({ data: arrayBuf }).promise;
          let fullText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            fullText += pageText + '\n\n';
          }

          extractedText = fullText
            .replace(/[^\x20-\x7E\n\r\t]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
        } catch (pdfErr) {
          console.error('[PDF] pdfjs-dist extraction failed:', pdfErr);
        }

        // Step 2: If text extraction yielded little or nothing, try OCR with Tesseract.js
        if (extractedText.length <= 10) {
          console.log('[PDF] Text extraction insufficient, attempting OCR...');
          try {
            console.log('[PDF] Initializing Tesseract worker...');
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('eng', 1, {
              logger: m => console.log('[OCR]', m.status, Math.round(m.progress * 100) + '%')
            });
            
            // Convert PDF pages to images using pdfjs-dist canvas rendering
            const pdfjs = await import('pdfjs-dist');
            pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
            const pdf = await pdfjs.getDocument({ data: arrayBuf }).promise;
            
            let ocrText = '';
            const maxPages = Math.min(pdf.numPages, 5); // Limit to 5 pages for performance
            
            for (let i = 1; i <= maxPages; i++) {
              console.log(`[PDF] Processing page ${i} for OCR...`);
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 2.0 });
              
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) continue;
              
              await page.render({ canvasContext: ctx, viewport, canvas: canvas }).promise;
              
              const { data: { text } } = await worker.recognize(canvas);
              ocrText += text + '\n\n';
              canvas.remove();
            }
            
            await worker.terminate();
            extractedText = ocrText.trim();
            if (extractedText.length > 10) {
              console.log('[PDF] OCR extraction succeeded, length:', extractedText.length);
            }
          } catch (ocrErr) {
            console.error('[PDF] OCR extraction failed:', ocrErr);
          }
        }

        // Step 3: Build content based on extraction result
        if (extractedText.length > 10) {
          content = `<h1>${baseName}</h1>\n<p style="font-style:italic;color:#666;">Imported from PDF — formatting preserved as possible.</p>\n<div style="white-space:pre-wrap;line-height:1.8;">${extractedText}</div>`;
        } else {
          // Fallback: allow manual text entry
          content = `<h1>${baseName}</h1>\n<p style="color:#e67e22;font-weight:bold;">PDF text extraction failed.</p>\n<p style="color:#666;">This PDF may be an image-only scan, password-protected, or use an unsupported format.</p>\n<p style="color:#666;margin-top:1rem;">Please paste your contract content below:</p>\n<div style="border:2px dashed #ccc;padding:2rem;margin-top:1rem;min-height:200px;border-radius:8px;">[Paste your contract content here]</div>`;
        }
      } else if (ext === 'docx') {
        const arrayBuf = await file.arrayBuffer();
        const raw = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(arrayBuf));
        const textParts = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        if (textParts && textParts.length > 0) {
          const paragraphs = textParts
            .map(m => m.replace(/<[^>]+>/g, ''))
            .join(' ');
          content = `<h1>${baseName}</h1>\n<p style="font-style:italic;color:#666;">Imported from DOCX — formatting may differ from original.</p>\n<div style="white-space:pre-wrap;line-height:1.8;">${paragraphs}</div>`;
        } else {
          content = `<h1>${baseName}</h1>\n<p style="color:#999;">DOCX text extraction was limited. Consider uploading as HTML or TXT for best results.</p>\n<p>[Paste your contract content here]</p>`;
        }
      }

      if (supabase) {
        await supabase.storage
          .from('contract_templates')
          .upload(uploadPath, file, { upsert: true });
      }

      const newTemplate: ContractTemplate = {
        id: uploadPath,
        name: baseName,
        category: 'Custom',
        content,
        isCustom: true,
        folder: 'Main',
        updatedAt: new Date().toISOString()
      };
      
      setCustomTemplates(prev => {
        const filtered = prev.filter(t => t.id !== newTemplate.id);
        return [...filtered, newTemplate];
      });
      setActiveTemplate(newTemplate);
      setEditedContent(content);
      setIsEditing(true);
      
    } catch (err: any) {
      console.error('Upload error', err);
      alert(err.message || 'Failed to upload custom template');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderTemplateContent = (template: string, lead?: Lead) => {
    if (!template) return '';
    let text = template;
    const now = format(new Date(), 'MMMM do, yyyy');
    
    text = text.replace(/{{date}}/g, now);
    
    if (lead) {
      text = text.replace(/{{lead.name}}/g, lead.name || '[Lead Name]');
      text = text.replace(/{{lead.email}}/g, lead.email || '[Lead Email]');
      text = text.replace(/{{lead.phone}}/g, lead.phone || '[Lead Phone]');
      text = text.replace(/{{lead.propertyAddress}}/g, lead.propertyAddress || '[Property Address]');
      text = text.replace(/{{lead.estimatedValue}}/g, lead.estimatedValue ? lead.estimatedValue.toLocaleString() : '0');
      text = text.replace(/{{lead.offerAmount}}/g, lead.offerAmount ? lead.offerAmount.toLocaleString() : '0');
    }

    return text;
  };



  const handleEmailLead = async () => {
    if (!previewRef.current) {
      console.error('[PDF] Preview ref is null for email');
      alert('No document to send. Please select a template first.');
      return;
    }
    
    if (!selectedLead && leads.length > 0) {
      const firstLead = leads[0];
      setSelectedLead(firstLead);
      setSelectedLeadId(firstLead.id);
    } else if (!selectedLead) {
      alert('You must have at least one lead to send a contract.');
      return;
    }
    
    setIsSendingContract(true);
    setSendStep('generating');
    
    try {
      const element = previewRef.current;
      
      // Inject safety styles for PDF generation
      const style = document.createElement('style');
      style.innerHTML = `
        .pdf-content, .doc-container, .contract-content { color: #1a1a1a !important; background: #ffffff !important; font-family: Arial, sans-serif !important; }
        * { border-color: #e5e7eb !important; color: #1a1a1a !important; background-image: none !important; }
      `;
      element.appendChild(style);

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
      };

      const pdfBase64 = await html2pdf().from(element).set(opt).outputPdf('datauristring');
      element.removeChild(style);

      if (!pdfBase64) throw new Error('PDF output returned empty data');
      
      setEmailAttachment({
        filename: `${activeTemplate.name.replace(/\s+/g, '_')}.pdf`,
        content: pdfBase64.split(',')[1],
        contentType: 'application/pdf'
      });
      
      setShowEmailModal(true);
      setIsSendingContract(false);
      setSendStep('idle');
    } catch (error: any) {
      console.error('[PDF] Email PDF Generation Error:', error);
      setIsSendingContract(false);
      setSendStep('idle');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
    } else {
      setEditedContent(activeTemplate.content);
      setIsEditing(true);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('contract-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const replacement = `{{${variable}}}`;
    
    setEditedContent(text.substring(0, start) + replacement + text.substring(end));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    setFolders(prev => [...new Set([...prev, newFolderName.trim()])]);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!supabase || !currentUser?.id) return;
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase.storage.from('contract_templates').remove([templateId]);
      if (error) throw error;

      setCustomTemplates(prev => prev.filter(t => t.id !== templateId));
      if (activeTemplate.id === templateId) {
        setActiveTemplate(PREBUILT_TEMPLATES[0]);
      }
    } catch (err) {
      console.error('Failed to delete template', err);
      alert('Failed to delete template');
    }
  };

  const handleMoveTemplate = async (templateId: string, destFolder: string) => {
    if (!supabase || !currentUser?.id) return;
    const template = customTemplates.find(t => t.id === templateId);
    if (!template) return;

    try {
      const fileName = templateId.split('/').pop();
      const newPath = `${currentUser.id}/${destFolder === 'Main' ? '' : destFolder + '/'}${fileName}`;
      
      const { error: copyError } = await supabase.storage.from('contract_templates').copy(templateId, newPath);
      if (copyError) throw copyError;

      const { error: removeError } = await supabase.storage.from('contract_templates').remove([templateId]);
      if (removeError) throw removeError;

      setCustomTemplates(prev => prev.map(t => t.id === templateId ? { ...t, id: newPath, folder: destFolder } : t));
      if (activeTemplate.id === templateId) {
        setActiveTemplate({ ...activeTemplate, id: newPath, folder: destFolder });
      }
    } catch (err) {
      console.error('Failed to move template', err);
      alert('Failed to move template');
    }
  };

  return (
    <div className="flex h-full bg-[var(--t-bg)]">
      <div className="w-80 flex flex-col border-r border-[var(--t-border)] bg-[var(--t-surface)] z-10">
        <div className="p-6 border-b border-[var(--t-border)]">
          <h2 className="text-xl font-bold text-[var(--t-text)] flex items-center gap-2">
            <FileSignature className="text-[var(--t-primary)]" />
            Contracts
          </h2>
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
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--t-text-muted)] mb-3 px-2 flex items-center gap-2">
                  <Shield size={10} className="text-[var(--t-primary)]" />
                  {category}
                </h3>
                <div className="space-y-1">
                  {temps.map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => setActiveTemplate(tmpl)}
                      className={`w-full flex items-start text-left p-3 rounded-xl transition-all group ${
                        activeTemplate.id === tmpl.id 
                          ? 'bg-[var(--t-primary-dim)] border border-[var(--t-primary)] shadow-[var(--t-glow-shadow)]' 
                          : 'hover:bg-[var(--t-surface-hover)] border border-transparent'
                      }`}
                    >
                      <FileText size={16} className={`mt-0.5 shrink-0 mr-3 ${activeTemplate.id === tmpl.id ? 'text-[var(--t-primary)]' : 'text-[var(--t-text-muted)]'}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${activeTemplate.id === tmpl.id ? 'text-[var(--t-primary-text)]' : 'text-[var(--t-text)]'}`}>
                          {tmpl.name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t border-[var(--t-border)]">
            <div className="flex items-center justify-between px-2 mb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--t-text-muted)]">Custom Templates</h3>
              <button 
                onClick={() => setIsCreatingFolder(true)}
                className="p-1 hover:bg-[var(--t-surface-hover)] rounded text-[var(--t-primary)]"
                title="New Folder"
              >
                <Plus size={14} />
              </button>
            </div>

            {isCreatingFolder && (
              <div className="px-2 mb-4">
                <div className="flex gap-2">
                  <input 
                    autoFocus
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--t-input-bg)] border border-[var(--t-border)] text-[var(--t-text)] outline-none focus:ring-1 focus:ring-[var(--t-primary)]"
                    placeholder="Folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <button onClick={handleCreateFolder} className="p-1 px-2 bg-[var(--t-primary)] text-white rounded-lg text-[10px] font-bold">Add</button>
                </div>
              </div>
            )}

            {folders.map(folder => {
              const folderTemplates = customTemplates.filter(t => t.folder === folder && t.name.toLowerCase().includes(searchQuery.toLowerCase()));
              return (
                <div key={folder} className="mb-4">
                  <div className="flex items-center gap-2 px-2 mb-2 text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-widest">
                    <span>📁 {folder}</span>
                  </div>
                  <div className="space-y-1">
                    {folderTemplates.map(tmpl => (
                      <div key={tmpl.id} className="relative group">
                        <button
                          onClick={() => setActiveTemplate(tmpl)}
                          className={`w-full flex items-start text-left p-3 rounded-xl transition-all ${
                            activeTemplate.id === tmpl.id 
                              ? 'bg-[var(--t-primary-dim)] border border-[var(--t-primary)]' 
                              : 'hover:bg-[var(--t-surface-hover)] border border-transparent'
                          }`}
                        >
                          <FileText size={16} className={`mt-0.5 shrink-0 mr-3 ${activeTemplate.id === tmpl.id ? 'text-[var(--t-primary)]' : 'text-[var(--t-text-muted)]'}`} />
                          <div className="flex-1 pr-12">
                            <p className="text-sm font-medium">{tmpl.name}</p>
                          </div>
                        </button>
                        
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <select 
                            onChange={(e) => handleMoveTemplate(tmpl.id, e.target.value)}
                            className="text-[9px] bg-white border border-gray-100 rounded px-1 py-0.5 outline-none hover:border-[var(--t-primary)]"
                            value={folder}
                            title="Move to Folder"
                          >
                            {folders.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <button 
                            onClick={() => handleDeleteTemplate(tmpl.id)}
                            className="p-1 text-red-400 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Plus size={12} className="rotate-45" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-[var(--t-border)]">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".html,.txt,.pdf,.docx"
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--t-border)] border-dashed hover:border-[var(--t-primary)] hover:bg-[var(--t-primary-dim)] hover:text-[var(--t-primary)] transition-colors text-sm text-[var(--t-text-muted)] disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {isUploading ? 'Uploading...' : 'Upload Custom Template'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[var(--t-surface-dim)]">
        <div className="border-b border-[var(--t-border)] bg-[var(--t-surface)] flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:px-6 gap-4 sticky top-0 z-20 shadow-sm backdrop-blur-md">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="w-full sm:w-auto">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--t-text-muted)] mb-1.5 block">Contract Subject</label>
              <div className="relative">
                <select
                  value={selectedLeadId}
                  onChange={(e) => {
                    setSelectedLeadId(e.target.value);
                    setSelectedLead(leads.find(l => l.id === e.target.value) || null);
                  }}
                  className="w-full sm:w-[280px] appearance-none pl-10 pr-10 py-2.5 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-border)] text-[var(--t-text)] focus:ring-2 focus:ring-[var(--t-primary)] outline-none transition-all shadow-sm"
                >
                  <option value="">-- View Blank Template --</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} {lead.propertyAddress ? `• ${lead.propertyAddress.split(',')[0]}` : ''}
                    </option>
                  ))}
                </select>
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)]" />
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)] pointer-events-none" />
              </div>
            </div>
            
            {isEditing && (
              <div className="flex items-center gap-2 border-r border-[var(--t-border)] pr-4">
                <span className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-widest mr-2">Insert:</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'Name', var: 'lead.name' },
                    { label: 'Address', var: 'lead.propertyAddress' },
                    { label: 'Offer', var: 'lead.offerAmount' },
                    { label: 'Date', var: 'date' }
                  ].map(v => (
                    <button
                      key={v.var}
                      onClick={() => insertVariable(v.var)}
                      className="px-2 py-1 rounded bg-[var(--t-surface-subtle)] hover:bg-[var(--t-primary-dim)] hover:text-[var(--t-primary)] text-[9px] font-bold border border-[var(--t-border)] transition-colors"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
            <button 
              onClick={handleToggleEdit}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isEditing 
                  ? 'bg-[var(--t-success)] hover:bg-[var(--t-success-hover)] text-white shadow-lg shadow-[var(--t-success-dim)]' 
                  : 'bg-[var(--t-surface-hover)] hover:bg-[var(--t-surface-hover)]/80 text-[var(--t-text)] border border-[var(--t-border)]'
              }`}
            >
              {isEditing ? (
                <><Check size={16} /> Save Template</>
              ) : (
                <><Edit3 size={16} /> Edit Text</>
              )}
            </button>
            <button 
              onClick={handleEmailLead}
              disabled={generatingPdf}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all bg-[var(--t-primary)] text-white hover:bg-[var(--t-primary-hover)] shadow-lg shadow-[var(--t-primary-dim)] disabled:opacity-70 disabled:cursor-wait ${generatingPdf ? 'animate-pulse' : ''}`}
            >
              {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {generatingPdf ? 'Preparing document...' : 'Send Contract'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-12 flex justify-center items-start pb-24" style={{ 
          backgroundImage: 'radial-gradient(circle at center, var(--t-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}>
          {isEditing ? (
            <div className="w-full max-w-4xl bg-white shadow-2xl rounded-2xl border border-[var(--t-border)] overflow-hidden flex flex-col min-h-[800px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Editing Template</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Plain text only. Use variables like {'{{lead.name}}'}</div>
              </div>
              <textarea
                id="contract-editor"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="flex-1 w-full p-12 text-base text-slate-800 bg-white border-none outline-none resize-none leading-relaxed font-mono whitespace-pre-wrap"
                placeholder="Paste your contract text here..."
              />
              <div className="p-4 bg-amber-50 border-t border-amber-100 flex items-center gap-3">
                <Plus size={14} className="text-amber-600" />
                <p className="text-[11px] text-amber-700">Changes will be saved as a custom template version.</p>
              </div>
            </div>
          ) : (
            <div 
              ref={previewRef}
              className="w-full max-w-[8.5in] shadow-2xl rounded-sm shrink-0 transition-all doc-container relative"
              style={{ 
                backgroundColor: '#ffffff',
                color: '#1f2937',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0,0,0,0.05)',
                padding: '0.75in',
                minHeight: '11in'
              }}
            >
              {generatingPdf && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-4">
                  <div className="p-4 bg-[var(--t-primary-dim)] rounded-full text-[var(--t-primary)] animate-pulse">
                    <Loader2 size={32} className="animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[var(--t-text)]">Generating Document</p>
                    <p className="text-sm text-[var(--t-text-muted)]">Preparing your PDF...</p>
                  </div>
                </div>
              )}
              <div 
                ref={documentRef}
                className="contract-content whitespace-pre-wrap"
                style={{
                  fontFamily: '"Times New Roman", Times, serif',
                  lineHeight: '1.6',
                  fontSize: '11pt',
                  wordBreak: 'break-word'
                }}
              >
                {renderTemplateContent(activeTemplate.content, selectedLead || undefined)}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .contract-content h1 { text-align: center; font-size: 16pt; margin-bottom: 1.5rem; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; }
        .contract-content h2 { font-size: 12pt; margin-top: 1.5rem; margin-bottom: 0.5rem; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        .contract-content p { margin-bottom: 0.75rem; text-align: justify; }
        .contract-content ul { margin-bottom: 0.75rem; padding-left: 20px; list-style-type: disc; }
        .contract-content ol { margin-bottom: 0.75rem; padding-left: 20px; list-style-type: decimal; }
        .contract-content li { margin-bottom: 0.25rem; }
        .contract-content table { margin-bottom: 1rem; width: 100%; border-collapse: collapse; }
        .contract-content td, .contract-content th { border: 1px solid #ddd; padding: 8px; }
      `}</style>

      {showEmailModal && (
        <EmailComposeModal 
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          lead={selectedLead || { name: '', email: '', id: '', propertyAddress: '' } as any}
          initialSubject={`Contract for ${selectedLead?.propertyAddress || selectedLead?.name || 'Your Property'}`}
          initialBody={`Hi ${selectedLead?.name || 'there'},\n\nPlease find the attached contract for the property at ${selectedLead?.propertyAddress || 'your property'}.\n\nReview it and let me know if you have any questions.\n\nBest regards,\n${currentUser?.name || 'The WholeScale Team'}`}
          attachment={emailAttachment}
          isAttachmentLoading={generatingPdf}
          onSuccess={() => {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
          }}
        />
      )}
      
      {isSendingContract && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-[40px] animate-in fade-in duration-300">
          <div className="w-full max-w-sm p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] shadow-2xl text-center space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-[var(--t-primary-dim)]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-[var(--t-primary)] border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-[var(--t-primary)]">
                {sendStep === 'generating' ? <FileText size={32} /> : <Send size={32} />}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--t-text)]">
                {sendStep === 'generating' ? 'Generating PDF...' : 'Sending Contract...'}
              </h3>
              <p className="text-sm text-[var(--t-text-muted)]">
                {sendStep === 'generating' ? 'Applying your template and preparing the document.' : `Sending to ${selectedLead?.email || 'the lead'}.`}
              </p>
            </div>

            <div className="pt-4">
              <div className="h-1.5 w-full bg-[var(--t-surface-dim)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--t-primary)] transition-all duration-1000"
                  style={{ width: sendStep === 'generating' ? '40%' : '80%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-8">
          <div className="absolute inset-0 backdrop-blur-[60px] bg-black/60 animate-in fade-in duration-500" />
          <div 
            className="relative bg-[var(--t-surface)] border border-[var(--t-success)]/30 p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center text-center animate-in zoom-in slide-in-from-bottom-20 duration-700 pointer-events-auto"
            style={{
              // @ts-expect-error custom prop
              '--tw-shadow-color': 'rgba(34, 197, 94, 0.1)'
            }}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSuccess(false);
              }}
              className="absolute top-8 right-8 p-3 rounded-full bg-white/5 border border-white/10 text-[var(--t-text-muted)] hover:text-white hover:bg-white/10 transition-all z-[60] shadow-xl active:scale-95"
              title="Close Success Message"
            >
              <X size={24} />
            </button>

            <div className="w-24 h-24 rounded-full bg-[var(--t-success-dim)] flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 rounded-full bg-[var(--t-success)]/20 animate-ping" />
                <Check size={48} className="text-[var(--t-success)] relative z-10" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Contract Delivered!</h2>
            <p className="text-[var(--t-text-muted)] max-w-sm font-medium">
              The contract has been securely delivered to <span className="text-[var(--t-text)] font-bold">{selectedLead?.email || 'the recipient'}</span>.
            </p>
            <div className="mt-8 pt-8 border-t border-[var(--t-border)] w-full">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-text-muted)] italic">Closing in 3 seconds...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
