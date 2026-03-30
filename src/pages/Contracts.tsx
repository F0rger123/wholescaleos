import { useState, useRef, useEffect } from 'react';
import { useStore, Lead } from '../store/useStore';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import EmailComposeModal from '../components/EmailComposeModal';
import { 
  FileText, Download, Mail, Plus, Search, 
  ChevronDown, User, FileSignature, Loader2, Trash2,
  Bold, Italic, List, ListOrdered, Type, Edit3, Check
} from 'lucide-react';

interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  isCustom?: boolean;
}

const DISCLAIMER_HTML = `
  <div style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #ccc;">
    <p style="font-size: 9px; color: #888; line-height: 1.5; text-align: center; font-style: italic;">
      <strong>DISCLAIMER:</strong> This document is a template only. It does not constitute legal advice. 
      Consult with a qualified real estate attorney before using any contract. 
      Wholescale OS is not liable for any legal issues arising from use of these templates.
    </p>
  </div>
`;

const PREBUILT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'wholesale-purchase',
    name: 'Wholesale Purchase Agreement',
    category: 'Acquisitions',
    content: `
      <h1>PURCHASE AND SALE AGREEMENT</h1>
      <p style="text-align: center; margin-bottom: 2rem;">This Agreement is made and entered into on <strong>{{date}}</strong><br/>by and between the following parties:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #ddd;">
            <strong>SELLER:</strong><br/>
            Name: {{lead.name}}<br/>
            Email: {{lead.email}}<br/>
            Phone: {{lead.phone}}
          </td>
          <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #ddd;">
            <strong>BUYER:</strong><br/>
            Name: [Your Company Name]<br/>
            Email: [Your Email]<br/>
            Phone: [Your Phone]
          </td>
        </tr>
      </table>

      <h2>1. PROPERTY DESCRIPTION</h2>
      <p>The Seller agrees to sell and Buyer agrees to purchase the real property located at:<br/>
      <strong>{{lead.propertyAddress}}</strong><br/>
      together with all improvements, fixtures, and appurtenances thereon (the "Property"), more fully described in Exhibit A attached hereto and incorporated herein by reference.</p>
      
      <h2>2. PURCHASE PRICE AND TERMS</h2>
      <p>The total purchase price for the Property shall be <strong>\${{lead.offerAmount}}</strong> (the "Purchase Price"), payable at closing in cash or certified funds. The parties acknowledge that the estimated market value of the Property is approximately <strong>\${{lead.estimatedValue}}</strong>.</p>
      
      <h2>3. EARNEST MONEY DEPOSIT</h2>
      <p>Within three (3) business days following the Effective Date of this Agreement, Buyer shall deposit earnest money in the amount of <strong>$1,000.00</strong> ("Earnest Money") with the designated escrow agent or title company. Said Earnest Money shall be applied toward the Purchase Price at closing or refunded to Buyer in accordance with the terms of this Agreement.</p>
      
      <h2>4. CLOSING DATE</h2>
      <p>The closing of this transaction ("Closing") shall occur on or before <strong>thirty (30) calendar days</strong> from the Effective Date of this Agreement, or at such other time as the parties may mutually agree in writing. Time is of the essence with respect to the Closing Date.</p>
      
      <h2>5. FINANCING CONTINGENCY</h2>
      <p>This is a <strong>CASH PURCHASE</strong>. There is no financing contingency. Buyer represents that Buyer has sufficient funds available to complete the purchase and will provide proof of funds within five (5) business days of the Effective Date.</p>
      
      <h2>6. INSPECTION CONTINGENCY</h2>
      <p>Buyer shall have a period of <strong>ten (10) business days</strong> from the Effective Date (the "Inspection Period") to conduct, at Buyer's expense, any inspections, tests, surveys, or studies of the Property that Buyer deems necessary. If the results of such inspections are unsatisfactory to Buyer in Buyer's sole discretion, Buyer may terminate this Agreement by providing written notice to Seller prior to the expiration of the Inspection Period, and the Earnest Money shall be returned to Buyer.</p>
      
      <h2>7. TITLE AND SURVEY</h2>
      <p>Seller shall convey marketable and insurable fee simple title to the Property by general warranty deed, free and clear of all liens, encumbrances, easements, and restrictions except those acceptable to Buyer. Seller shall provide a preliminary title commitment within ten (10) days of the Effective Date. Buyer shall have five (5) business days following receipt of the title commitment to raise any objections. Any title defects not cured by Seller within ten (10) days of Buyer's objection shall entitle Buyer to terminate this Agreement and receive a full refund of the Earnest Money.</p>
      
      <h2>8. CLOSING COSTS</h2>
      <p>Closing costs shall be allocated as follows:</p>
      <ul style="margin-left: 20px;">
        <li><strong>Seller</strong> shall pay: Documentary stamps on the deed, Seller's share of prorated taxes and assessments, any outstanding liens or mortgages, and Seller's attorney fees.</li>
        <li><strong>Buyer</strong> shall pay: Recording fees for the deed, Buyer's title insurance policy, escrow fees, and Buyer's attorney fees.</li>
      </ul>
      
      <h2>9. PROPERTY CONDITION — "AS-IS"</h2>
      <p>Buyer is purchasing the Property in its present <strong>"AS-IS, WHERE-IS"</strong> condition with all faults, whether known or unknown. Seller makes no warranties or representations regarding the condition of the Property, including but not limited to structural integrity, mechanical systems, environmental conditions, roof, foundation, plumbing, electrical, HVAC, or compliance with building codes and zoning ordinances. Seller is not required to make any repairs or improvements.</p>
      
      <h2>10. RIGHT TO ASSIGN</h2>
      <p>Buyer may assign this Agreement, in whole or in part, to any entity or individual <strong>without Seller's prior consent</strong>. Upon assignment, the assignee shall assume all of Buyer's obligations hereunder and Buyer shall be released from further liability, provided the assignee performs all terms and conditions of this Agreement.</p>

      <h2>11. DEFAULT AND REMEDIES</h2>
      <p>If Buyer defaults under this Agreement, Seller's sole remedy shall be to retain the Earnest Money as liquidated damages. If Seller defaults, Buyer may (a) seek specific performance of this Agreement, (b) terminate this Agreement and receive a full refund of the Earnest Money, or (c) pursue any other remedy available at law or in equity.</p>

      <h2>12. ENTIRE AGREEMENT</h2>
      <p>This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, warranties, commitments, offers, and contracts, whether written or oral. This Agreement may not be modified or amended except by a written instrument signed by both parties. If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.</p>

      <h2>13. GOVERNING LAW</h2>
      <p>This Agreement shall be governed by and construed in accordance with the laws of the state in which the Property is located.</p>

      <h2>14. NOTICES</h2>
      <p>All notices required or permitted under this Agreement shall be in writing and shall be deemed delivered when personally delivered, sent by certified mail (return receipt requested), or sent by nationally recognized overnight courier to the addresses listed above.</p>

      <div style="margin-top: 60px;">
        <p><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Agreement as of the date first written above.</p>
      </div>

      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Seller Signature</strong></p>
          <p>Name: {{lead.name}}</p>
          <p>Date: ________________</p>
        </div>
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Buyer Signature</strong></p>
          <p>Name: [Your Name]</p>
          <p>Date: ________________</p>
        </div>
      </div>

      ${DISCLAIMER_HTML}
    `
  },
  {
    id: 'assignment-contract',
    name: 'Assignment of Contract',
    category: 'Dispositions',
    content: `
      <h1>ASSIGNMENT OF REAL ESTATE PURCHASE CONTRACT</h1>
      <p style="text-align: center; margin-bottom: 2rem;">This Assignment is entered into on <strong>{{date}}</strong>.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #ddd;">
            <strong>ASSIGNOR:</strong><br/>
            Name: [Your Company Name]<br/>
            (Original Buyer under the Purchase Agreement)
          </td>
          <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #ddd;">
            <strong>ASSIGNEE:</strong><br/>
            Name: ___________________________<br/>
            Address: ___________________________<br/>
            Phone: ___________________________
          </td>
        </tr>
      </table>

      <h2>RECITALS</h2>
      <p>WHEREAS, Assignor entered into a Purchase and Sale Agreement dated ________________ (the "Original Agreement") for the purchase of real property located at <strong>{{lead.propertyAddress}}</strong> (the "Property") from <strong>{{lead.name}}</strong> (the "Seller"); and</p>
      <p>WHEREAS, the Original Agreement permits assignment of Buyer's rights and obligations; and</p>
      <p>WHEREAS, Assignor desires to assign all rights, title, and interest in the Original Agreement to Assignee;</p>
      <p>NOW, THEREFORE, in consideration of the mutual promises herein and the Assignment Fee described below, the parties agree as follows:</p>

      <h2>1. ASSIGNMENT</h2>
      <p>Assignor hereby assigns, transfers, and conveys to Assignee all of Assignor's right, title, and interest in and to the Original Agreement, including all rights to purchase the Property on the terms and conditions set forth therein.</p>
      
      <h2>2. ASSIGNMENT FEE</h2>
      <p>In consideration for this Assignment, Assignee agrees to pay Assignor a non-refundable assignment fee of <strong>$__________</strong> (the "Assignment Fee"), payable as follows:</p>
      <ul style="margin-left: 20px;">
        <li><strong>$__________</strong> due upon execution of this Assignment as a non-refundable deposit.</li>
        <li>The balance of <strong>$__________</strong> due at Closing of the transaction.</li>
      </ul>

      <h2>3. ASSUMPTION OF OBLIGATIONS</h2>
      <p>Assignee hereby accepts and assumes all of Assignor's obligations, duties, and responsibilities under the Original Agreement, including but not limited to the obligation to close the purchase of the Property at the Purchase Price of <strong>\${{lead.offerAmount}}</strong> and in accordance with all terms and conditions of the Original Agreement.</p>

      <h2>4. ORIGINAL AGREEMENT TERMS</h2>
      <p>The Original Agreement, a copy of which is attached hereto as Exhibit A and incorporated herein by reference, shall remain in full force and effect. In the event of any conflict between this Assignment and the Original Agreement, the terms of the Original Agreement shall prevail.</p>

      <h2>5. REPRESENTATIONS AND WARRANTIES</h2>
      <p>Assignor represents and warrants that: (a) Assignor has full authority to assign the Original Agreement; (b) the Original Agreement is in full force and effect; (c) Assignor is not in default under the Original Agreement; and (d) there are no outstanding claims or disputes regarding the Original Agreement.</p>

      <h2>6. INDEMNIFICATION</h2>
      <p>Assignee shall indemnify and hold harmless Assignor from any and all claims, damages, losses, costs, and expenses arising from Assignee's failure to perform any obligations under the Original Agreement from and after the date of this Assignment.</p>

      <h2>7. CLOSING</h2>
      <p>Assignee shall close on the Property in accordance with the Closing Date specified in the Original Agreement. Failure to close shall constitute a default under both this Assignment and the Original Agreement.</p>

      <h2>8. ENTIRE AGREEMENT</h2>
      <p>This Assignment, together with the Original Agreement, constitutes the entire agreement between Assignor and Assignee with respect to the subject matter hereof. This Assignment may not be modified except by a written instrument signed by both Assignor and Assignee.</p>

      <div style="margin-top: 60px;">
        <p><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Assignment as of the date first written above.</p>
      </div>

      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Assignor Signature</strong></p>
          <p>Name: [Your Name]</p>
          <p>Date: ________________</p>
        </div>
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Assignee Signature</strong></p>
          <p>Name: ___________________________</p>
          <p>Date: ________________</p>
        </div>
      </div>

      ${DISCLAIMER_HTML}
    `
  },
  {
    id: 'fix-flip',
    name: 'Fix & Flip Joint Venture',
    category: 'Acquisitions',
    content: `
      <h1>FIX &amp; FLIP JOINT VENTURE AGREEMENT</h1>
      <p style="text-align: center; margin-bottom: 2rem;">Agreement effective as of <strong>{{date}}</strong></p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #ddd;">
            <strong>PARTY A (Capital Partner):</strong><br/>
            Name: [Your Company Name]<br/>
          </td>
          <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #ddd;">
            <strong>PARTY B (Property Owner):</strong><br/>
            Name: {{lead.name}}<br/>
            Email: {{lead.email}}<br/>
            Phone: {{lead.phone}}
          </td>
        </tr>
      </table>

      <h2>1. PURPOSE</h2>
      <p>The parties enter into this Joint Venture Agreement for the purpose of acquiring, renovating, and reselling the real property located at <strong>{{lead.propertyAddress}}</strong> (the "Property") for profit.</p>

      <h2>2. PROPERTY DETAILS</h2>
      <p>Estimated Market Value (as-is): <strong>\${{lead.estimatedValue}}</strong><br/>
      Agreed Purchase Price: <strong>\${{lead.offerAmount}}</strong><br/>
      Estimated After Repair Value (ARV): $__________<br/>
      Estimated Renovation Budget: $__________</p>

      <h2>3. CAPITAL CONTRIBUTIONS</h2>
      <p>Party A shall contribute: $__________ for acquisition and renovation costs.<br/>
      Party B shall contribute: the Property and/or project management services valued at $__________.</p>
      <p>All capital contributions shall be documented and verifiable through receipts, bank statements, or closing statements.</p>

      <h2>4. RESPONSIBILITIES</h2>
      <p><strong>Party A</strong> shall be responsible for: arranging financing, managing contractor payments, and overseeing the renovation budget.</p>
      <p><strong>Party B</strong> shall be responsible for: day-to-day project management, contractor coordination, obtaining permits, and managing the renovation timeline.</p>

      <h2>5. PROFIT DISTRIBUTION</h2>
      <p>Upon the sale of the Property, net profits (defined as sale price minus total costs including acquisition, renovation, holding costs, closing costs, and commissions) shall be distributed as follows:</p>
      <ul style="margin-left: 20px;">
        <li>Party A: __________% of net profits</li>
        <li>Party B: __________% of net profits</li>
      </ul>
      <p>Capital contributions shall be returned to each party before profit distribution.</p>

      <h2>6. TIMELINE</h2>
      <p>The parties agree to complete renovations within __________ days of acquisition and list the Property for sale within __________ days of renovation completion. If the Property is not sold within __________ days of listing, the parties shall meet to discuss a revised strategy.</p>

      <h2>7. BUDGET OVERRUNS</h2>
      <p>Any renovation costs exceeding the approved budget by more than 10% shall require written approval from both parties. Unauthorized expenditures shall be the sole responsibility of the party who authorized them.</p>

      <h2>8. DEFAULT AND DISPUTE RESOLUTION</h2>
      <p>In the event of a dispute, the parties agree to first attempt resolution through mediation before pursuing any legal action. The prevailing party in any legal proceeding shall be entitled to recover reasonable attorney's fees.</p>

      <h2>9. ENTIRE AGREEMENT</h2>
      <p>This Agreement constitutes the entire agreement between the parties. Modifications must be in writing and signed by both parties.</p>

      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Party A Signature</strong></p>
          <p>Date: ________________</p>
        </div>
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Party B Signature</strong></p>
          <p>Name: {{lead.name}}</p>
          <p>Date: ________________</p>
        </div>
      </div>

      ${DISCLAIMER_HTML}
    `
  },
  {
    id: 'seller-financing',
    name: 'Seller Financing Agreement',
    category: 'Creative Finance',
    content: `
      <h1>SELLER FINANCING ADDENDUM</h1>
      <p style="text-align: center; margin-bottom: 2rem;">Addendum to Purchase Agreement dated <strong>{{date}}</strong></p>

      <h2>PARTIES AND PROPERTY</h2>
      <p><strong>Seller/Lender:</strong> {{lead.name}}<br/>
      <strong>Buyer/Borrower:</strong> [Your Company Name]<br/>
      <strong>Property:</strong> {{lead.propertyAddress}}</p>

      <h2>1. PRINCIPAL AMOUNT AND TERMS</h2>
      <p>Seller agrees to finance the purchase of the Property under the following terms:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; width: 40%;"><strong>Purchase Price:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">\${{lead.offerAmount}}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Down Payment:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$__________</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Financed Amount:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$__________</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Interest Rate:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">__________% per annum</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Loan Term:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">__________ months</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Monthly Payment:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$__________</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Balloon Payment Due:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">[Date or N/A]</td></tr>
      </table>

      <h2>2. PROMISSORY NOTE</h2>
      <p>Buyer shall execute a Promissory Note in the amount of the financed balance, secured by a Deed of Trust or Mortgage on the Property. The promissory note shall contain the payment terms specified above.</p>

      <h2>3. SECURITY INSTRUMENT</h2>
      <p>This financing shall be secured by a first lien position Deed of Trust or Mortgage recorded against the Property. Buyer grants Seller a security interest in the Property until the loan is paid in full.</p>

      <h2>4. PAYMENT TERMS</h2>
      <p>Monthly payments are due on the 1st of each month, beginning __________. A late fee of __________% of the monthly payment or $__________ (whichever is greater) shall be assessed for payments received more than ten (10) days after the due date.</p>

      <h2>5. PREPAYMENT</h2>
      <p>Buyer may prepay the loan in whole or in part at any time without penalty.</p>

      <h2>6. INSURANCE AND TAXES</h2>
      <p>Buyer shall maintain hazard insurance on the Property with Seller named as loss payee. Buyer shall pay all property taxes when due and provide Seller with evidence of payment upon request.</p>

      <h2>7. DEFAULT</h2>
      <p>The following shall constitute events of default: (a) failure to make any payment within thirty (30) days of the due date; (b) failure to maintain insurance; (c) failure to pay property taxes; (d) transfer of the Property without Seller's consent. Upon default, Seller may declare the entire balance due and payable and exercise all remedies available under law.</p>

      <h2>8. DUE ON SALE CLAUSE</h2>
      <p>If Buyer sells, transfers, or conveys the Property without Seller's prior written consent, the entire unpaid balance shall become immediately due and payable.</p>

      <h2>9. ENTIRE AGREEMENT</h2>
      <p>This Addendum, together with the Purchase Agreement and Promissory Note, constitutes the entire agreement regarding the financing of this transaction.</p>

      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Seller/Lender Signature</strong></p>
          <p>Name: {{lead.name}}</p>
          <p>Date: ________________</p>
        </div>
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Buyer/Borrower Signature</strong></p>
          <p>Name: [Your Name]</p>
          <p>Date: ________________</p>
        </div>
      </div>

      ${DISCLAIMER_HTML}
    `
  },
  {
    id: 'standard-purchase',
    name: 'Standard Purchase Agreement',
    category: 'Acquisitions',
    content: `
      <h1>RESIDENTIAL PURCHASE AND SALE AGREEMENT</h1>
      <p style="text-align: center; margin-bottom: 2rem;">Effective Date: <strong>{{date}}</strong></p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #ddd;">
            <strong>SELLER:</strong><br/>
            Name: {{lead.name}}<br/>
            Email: {{lead.email}}<br/>
            Phone: {{lead.phone}}
          </td>
          <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #ddd;">
            <strong>BUYER:</strong><br/>
            Name: [Your Name]<br/>
            Email: [Your Email]<br/>
            Phone: [Your Phone]
          </td>
        </tr>
      </table>

      <h2>1. PROPERTY</h2>
      <p>Seller agrees to sell and Buyer agrees to purchase the following described real property:<br/>
      <strong>{{lead.propertyAddress}}</strong><br/>
      Including all improvements, fixtures, and appurtenances ("the Property").</p>

      <h2>2. PURCHASE PRICE</h2>
      <p>Purchase Price: <strong>\${{lead.offerAmount}}</strong><br/>
      Estimated Value: <strong>\${{lead.estimatedValue}}</strong></p>

      <h2>3. EARNEST MONEY</h2>
      <p>Buyer shall deposit $__________ as earnest money within three (3) business days of the Effective Date with the title company or escrow agent agreed upon by the parties.</p>

      <h2>4. FINANCING</h2>
      <p>This Agreement is contingent upon Buyer obtaining financing approval within __________ days. If Buyer is unable to obtain financing, Buyer may terminate this Agreement and receive a full refund of the Earnest Money.</p>

      <h2>5. CLOSING</h2>
      <p>Closing shall occur on or before __________ days from the Effective Date at a mutually agreed upon title company.</p>

      <h2>6. TITLE</h2>
      <p>Seller shall convey marketable title by warranty deed free of liens and encumbrances except those acceptable to Buyer and Buyer's lender.</p>

      <h2>7. INSPECTION</h2>
      <p>Buyer shall have __________ days from the Effective Date to conduct inspections. If deficiencies are found, Buyer may request repairs, negotiate a price reduction, or terminate this Agreement.</p>

      <h2>8. PROPERTY CONDITION</h2>
      <p>Seller represents that all major systems (HVAC, plumbing, electrical, roof, foundation) are in working condition as of the Effective Date unless otherwise disclosed. Seller shall provide all required disclosures as mandated by state law.</p>

      <h2>9. CLOSING COSTS</h2>
      <p>Each party shall be responsible for their customary closing costs unless otherwise agreed in writing. Real property taxes shall be prorated as of the Closing Date.</p>

      <h2>10. DEFAULT AND REMEDIES</h2>
      <p>If either party defaults, the non-defaulting party may pursue specific performance, terminate this Agreement, or seek any remedy available at law or in equity.</p>

      <h2>11. ENTIRE AGREEMENT</h2>
      <p>This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements. Amendments must be in writing signed by both parties.</p>

      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Seller Signature</strong></p>
          <p>Name: {{lead.name}}</p>
          <p>Date: ________________</p>
        </div>
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Buyer Signature</strong></p>
          <p>Name: [Your Name]</p>
          <p>Date: ________________</p>
        </div>
      </div>

      ${DISCLAIMER_HTML}
    `
  },
  {
    id: 'lease-agreement',
    name: 'Lease Agreement',
    category: 'Property Management',
    content: `
      <h1>RESIDENTIAL LEASE AGREEMENT</h1>
      <p style="text-align: center; margin-bottom: 2rem;">Effective Date: <strong>{{date}}</strong></p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #ddd;">
            <strong>LANDLORD:</strong><br/>
            Name: [Your Company Name]
          </td>
          <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #ddd;">
            <strong>TENANT:</strong><br/>
            Name: {{lead.name}}<br/>
            Email: {{lead.email}}<br/>
            Phone: {{lead.phone}}
          </td>
        </tr>
      </table>

      <h2>1. PREMISES</h2>
      <p>Landlord leases to Tenant the property located at:<br/><strong>{{lead.propertyAddress}}</strong> ("the Premises").</p>

      <h2>2. TERM</h2>
      <p>The lease term shall be __________ months, commencing on __________ and ending on __________.</p>

      <h2>3. RENT</h2>
      <p>Monthly rent: $__________, due on the 1st of each month. Late fee of $__________ applies after the 5th. Payment methods accepted: __________.</p>

      <h2>4. SECURITY DEPOSIT</h2>
      <p>Tenant shall deposit $__________ as a security deposit. The deposit will be returned within __________ days after lease termination, less any lawful deductions.</p>

      <h2>5. UTILITIES</h2>
      <p>Tenant is responsible for: __________. Landlord is responsible for: __________.</p>

      <h2>6. MAINTENANCE AND REPAIRS</h2>
      <p>Landlord shall maintain the structural integrity and major systems. Tenant shall maintain the Premises in clean, sanitary condition and report all needed repairs promptly. Tenant is responsible for damages caused by negligence or misuse.</p>

      <h2>7. RULES AND RESTRICTIONS</h2>
      <p>Pets: [Allowed / Not Allowed]. Smoking: [Allowed / Not Allowed]. Subletting: Not permitted without Landlord's written consent. Occupancy limited to __________ persons.</p>

      <h2>8. DEFAULT AND TERMINATION</h2>
      <p>Landlord may terminate this Lease upon __________ days written notice if Tenant fails to pay rent, violates lease terms, or causes damage to the Premises.</p>

      <h2>9. ENTIRE AGREEMENT</h2>
      <p>This Lease constitutes the entire agreement. Amendments must be in writing signed by both parties.</p>

      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Landlord Signature</strong></p>
          <p>Date: ________________</p>
        </div>
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Tenant Signature</strong></p>
          <p>Name: {{lead.name}}</p>
          <p>Date: ________________</p>
        </div>
      </div>

      ${DISCLAIMER_HTML}
    `
  },
  {
    id: 'option-contract',
    name: 'Option to Purchase',
    category: 'Creative Finance',
    content: `
      <h1>REAL ESTATE OPTION AGREEMENT</h1>
      <p style="text-align: center; margin-bottom: 2rem;">Effective Date: <strong>{{date}}</strong></p>

      <h2>PARTIES</h2>
      <p><strong>Optionor (Seller):</strong> {{lead.name}}<br/>
      <strong>Optionee (Buyer):</strong> [Your Company Name]</p>

      <h2>1. GRANT OF OPTION</h2>
      <p>In consideration of the Option Fee specified below, Optionor hereby grants to Optionee the exclusive right and option to purchase the property located at:<br/><strong>{{lead.propertyAddress}}</strong> (the "Property").</p>

      <h2>2. OPTION FEE</h2>
      <p>Optionee shall pay Optionor a non-refundable option fee of <strong>$__________</strong> upon execution of this Agreement. This fee shall be applied toward the Purchase Price if the option is exercised.</p>

      <h2>3. PURCHASE PRICE</h2>
      <p>If this option is exercised, the Purchase Price for the Property shall be <strong>\${{lead.offerAmount}}</strong>.</p>

      <h2>4. OPTION PERIOD</h2>
      <p>This option shall be valid for a period of __________ days from the Effective Date. Optionee must exercise the option by providing written notice to Optionor before the expiration of the Option Period.</p>

      <h2>5. EXERCISE OF OPTION</h2>
      <p>Optionee may exercise this option at any time during the Option Period by delivering written notice to Optionor. Upon exercise, the parties will proceed to close the transaction within __________ days.</p>

      <h2>6. PROPERTY MAINTENANCE</h2>
      <p>During the Option Period, Optionor agrees to maintain the Property in its current condition and not to enter into any other agreements for the sale or encumbrance of the Property.</p>

      <h2>7. EXTENSION</h2>
      <p>The Option Period may be extended by mutual written agreement and payment of an additional option fee to be negotiated by the parties.</p>

      <h2>8. DEFAULT</h2>
      <p>If Optionee fails to exercise the option within the Option Period, this Agreement shall terminate and the option fee shall be retained by Optionor as full consideration. If Optionor defaults, Optionee may seek specific performance or damages.</p>

      <h2>9. ENTIRE AGREEMENT</h2>
      <p>This Agreement constitutes the entire understanding between the parties. Amendments must be in writing signed by both parties.</p>

      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Optionor (Seller) Signature</strong></p>
          <p>Name: {{lead.name}}</p>
          <p>Date: ________________</p>
        </div>
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid black; height: 30px;"></div>
          <p style="margin-top: 5px;"><strong>Optionee (Buyer) Signature</strong></p>
          <p>Name: [Your Name]</p>
          <p>Date: ________________</p>
        </div>
      </div>

      ${DISCLAIMER_HTML}
    `
  }
];

export default function Contracts() {
  const { leads, currentUser } = useStore();
  
  const [activeTemplate, setActiveTemplate] = useState<ContractTemplate>(PREBUILT_TEMPLATES[0]);
  const [customTemplates, setCustomTemplates] = useState<ContractTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  // Fetch custom templates on mount
  useEffect(() => {
    async function loadCustomTemplates() {
      if (!supabase || !currentUser?.id) return;
      try {
        const { data, error } = await supabase.storage.from('contract_templates').list(currentUser.id + '/');
        if (error) throw error;
        
        const templates: ContractTemplate[] = [];
        for (const file of data || []) {
          if (!file.name.match(/\.(html|txt|pdf|docx)$/i)) continue;
          
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('contract_templates')
            .download(currentUser.id + '/' + file.name);
            
          if (downloadError) continue;
          
          const text = await fileData.text();
          templates.push({
            id: file.name,
            name: file.name.replace('.html', '').replace('.txt', '').replace(/_/g, ' '),
            category: 'Custom',
            content: text,
            isCustom: true
          });
        }
        setCustomTemplates(templates);
      } catch (err) {
        console.error('Failed to load custom templates', err);
      }
    }
    loadCustomTemplates();
  }, [currentUser?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;
    
    setIsUploading(true);
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
        try {
          const arrayBuf = await file.arrayBuffer();
          // Import pdfjs dynamically to avoid issues with SSR or heavy bundle size on initial load
          const pdfjs = await import('pdfjs-dist');
          // Set worker URL for pdfjs-dist
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

          // Clean extracted text
          const cleanedText = fullText
            .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable characters
            .replace(/\s+/g, ' ')               // Normalize spaces
            .replace(/\n\s*\n/g, '\n\n')        // Normalize paragraph breaks
            .trim();

          if (cleanedText.length > 10) {
            content = `<h1>${baseName}</h1>\n<p style="font-style:italic;color:#666;">Imported from PDF — formatting preserved as possible.</p>\n<div style="white-space:pre-wrap;line-height:1.8;">${cleanedText}</div>`;
          } else {
            throw new Error('Could not extract meaningful text from PDF.');
          }
        } catch (pdfErr) {
          console.error('PDF JS extraction failed', pdfErr);
          content = `<h1>${baseName}</h1>\n<p style="color:#999;">Advanced extraction failed. This PDF may be an image-only scan.</p>\n<p>[Paste your contract content here]</p>`;
        }
      } else if (ext === 'docx') {
        // Extract text from DOCX (zip of XML) — use the raw XML content
        const arrayBuf = await file.arrayBuffer();
        const raw = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(arrayBuf));
        // DOCX stores content in XML tags <w:t>
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

      // Upload to Supabase storage if available
      if (supabase) {
        const uploadPath = currentUser.id + '/' + file.name;
        await supabase.storage
          .from('contract_templates')
          .upload(uploadPath, file, { upsert: true });
      }

      const newTemplate: ContractTemplate = {
        id: file.name,
        name: baseName,
        category: 'Custom',
        content,
        isCustom: true
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
    if (!activeTemplate.content) return;
    setIsExporting(true);
    
    try {
      const htmlContent = renderTemplateContent(activeTemplate.content, selectedLead);
      const fileName = `${activeTemplate.name.replace(/\s+/g, '_')}_${selectedLead?.name.replace(/\s+/g, '_') || 'Draft'}.pdf`;

      // Build a complete self-contained HTML document string for html2pdf
      const fullHtml = `
        <div style="width:100%;background:#fff;color:#000;font-family:'Times New Roman',Times,serif;line-height:1.6;font-size:11pt;padding:0;margin:0;">
          <style>
            * { color: #000 !important; }
            h1 { text-align:center; font-size:16pt; margin-bottom:24px; text-transform:uppercase; font-weight:bold; letter-spacing:1px; }
            h2 { font-size:12pt; margin-top:20px; margin-bottom:8px; text-transform:uppercase; font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:4px; page-break-after:avoid; }
            p { margin-bottom:10px; text-align:justify; font-size:11pt; }
            ul { margin-bottom:10px; padding-left:20px; }
            li { margin-bottom:4px; font-size:11pt; }
            table { width:100%; border-collapse:collapse; page-break-inside:avoid; margin-bottom:12px; }
            td, th { padding:6px 10px; border:1px solid #ddd; font-size:10pt; }
            strong { font-weight:bold; }
          </style>
          ${htmlContent}
        </div>
      `;

      const opt = {
        margin:       [0.5, 0.6, 0.7, 0.6] as [number, number, number, number],
        filename:     fileName,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true,
          backgroundColor: '#ffffff',
        },
        jsPDF:        { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      await html2pdf().set(opt).from(fullHtml).save();
      
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Check console.');
    } finally {
      setIsExporting(false);
    }
  };


  const [emailAttachment, setEmailAttachment] = useState<{filename: string, content: string, contentType: string} | undefined>();

  const handleEmailLead = async () => {
    if (!selectedLead || !selectedLead.email) {
      alert('Please select a lead with a valid email address.');
      return;
    }

    setIsExporting(true);
    try {
      const htmlContent = renderTemplateContent(activeTemplate.content, selectedLead);
      const fileName = `${activeTemplate.name.replace(/\s+/g, '_')}_${selectedLead.name.replace(/\s+/g, '_')}.pdf`;

      // Build HTML document string
      const fullHtml = `
        <div style="width:100%;background:#fff;color:#000;font-family:'Times New Roman',Times,serif;line-height:1.6;font-size:11pt;padding:0.75in;margin:0;">
          ${htmlContent}
        </div>
      `;

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      };
      
      // Get PDF as base64 string
      const pdfDataUri = await html2pdf().set(opt).from(fullHtml).output('datauristring');
      // Strip prefix: data:application/pdf;filename=...;base64,
      const base64Content = pdfDataUri.split(',')[1];

      setEmailAttachment({
        filename: fileName,
        content: base64Content,
        contentType: 'application/pdf'
      });
      setShowEmailModal(true);
    } catch (err) {
      console.error('Failed to prepare email attachment', err);
      alert('Failed to generate contract for email.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      // Save changes
      const updatedTemplate = { ...activeTemplate, content: editedContent };
      if (activeTemplate.isCustom) {
        setCustomTemplates(prev => prev.map(t => t.id === activeTemplate.id ? updatedTemplate : t));
      }
      setActiveTemplate(updatedTemplate);
      setIsEditing(false);
    } else {
      setEditedContent(activeTemplate.content);
      setIsEditing(true);
    }
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('contract-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;
    
    setEditedContent(text.substring(0, start) + replacement + text.substring(end));
    
    // Set focus back and adjust selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
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
          {['Acquisitions', 'Dispositions', 'Creative Finance', 'Property Management', 'Custom'].map(category => {
            const allTemplates = [...PREBUILT_TEMPLATES, ...customTemplates];
            const temps = allTemplates.filter(t => t.category === category && t.name.toLowerCase().includes(searchQuery.toLowerCase()));
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
                        {tmpl.isCustom && <span className="text-[9px] bg-[var(--t-surface-subtle)] px-2 py-0.5 rounded-full mt-1 inline-block">Custom</span>}
                      </div>
                      
                      {tmpl.isCustom && (
                        <div
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm('Delete this template?')) return;
                            if (!supabase) return;
                            try {
                              const { error } = await supabase.storage
                                .from('contract_templates')
                                .remove([`${currentUser?.id}/${tmpl.id}`]);
                              if (error) throw error;
                              setCustomTemplates((prev: ContractTemplate[]) => prev.filter((t: ContractTemplate) => t.id !== tmpl.id));
                              if (activeTemplate.id === tmpl.id) setActiveTemplate(PREBUILT_TEMPLATES[0]);
                            } catch (err) {
                              console.error('Delete error', err);
                              alert('Failed to delete template');
                            }
                          }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-400 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
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

      {/* Main Content - Editor/Preview */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--t-surface-dim)]">
        {/* Toolbar */}
        <div className="border-b border-[var(--t-border)] bg-[var(--t-surface)] flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:px-6 gap-4 sticky top-0 z-20 shadow-sm backdrop-blur-md">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="w-full sm:w-auto">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--t-text-muted)] mb-1.5 block">Contract Subject</label>
              <div className="relative">
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
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
              <div className="flex items-center gap-1 bg-[var(--t-surface-dim)] p-1 rounded-lg border border-[var(--t-border)] shadow-sm">
                <button onClick={() => insertText('<strong>', '</strong>')} className="p-2 hover:bg-[var(--t-surface-hover)] rounded text-[var(--t-text)]" title="Bold"><Bold size={16} /></button>
                <button onClick={() => insertText('<em>', '</em>')} className="p-2 hover:bg-[var(--t-surface-hover)] rounded text-[var(--t-text)]" title="Italic"><Italic size={16} /></button>
                <div className="w-px h-6 bg-[var(--t-border)] mx-1" />
                <button onClick={() => insertText('<ul>\n  <li>', '</li>\n</ul>')} className="p-2 hover:bg-[var(--t-surface-hover)] rounded text-[var(--t-text)]" title="List"><List size={16} /></button>
                <button onClick={() => insertText('<ol>\n  <li>', '</li>\n</ol>')} className="p-2 hover:bg-[var(--t-surface-hover)] rounded text-[var(--t-text)]" title="Ordered List"><ListOrdered size={16} /></button>
                <div className="w-px h-6 bg-[var(--t-border)] mx-1" />
                <button onClick={() => insertText('<h2>', '</h2>')} className="p-2 hover:bg-[var(--t-surface-hover)] rounded text-[var(--t-text)]" title="Heading"><Type size={16} /></button>
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors border border-[var(--t-border)] hover:bg-[var(--t-surface-hover)] hover:border-[var(--t-primary)]/30 text-[var(--t-text)] shadow-sm"
              title="Email Document"
            >
              <Mail size={16} className="text-[var(--t-primary)]" /> Email
            </button>
            <button 
              onClick={generatePDF}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all bg-[var(--t-primary)] text-white hover:bg-[var(--t-primary-hover)] shadow-lg shadow-[var(--t-primary-dim)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Document Viewer / Editor */}
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
                <div className="text-[10px] text-slate-400 font-medium">Use HTML or variables like {'{{lead.name}}'}</div>
              </div>
              <textarea
                id="contract-editor"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="flex-1 w-full p-12 font-mono text-sm text-slate-800 bg-white border-none outline-none resize-none leading-relaxed"
                placeholder="Paste your contract text here..."
              />
              <div className="p-4 bg-amber-50 border-t border-amber-100 flex items-center gap-3">
                <Plus size={14} className="text-amber-600" />
                <p className="text-[11px] text-amber-700">Changes will be saved as a custom template version.</p>
              </div>
            </div>
          ) : (
            <div 
              className="w-full max-w-[8.5in] bg-white shadow-2xl rounded-sm shrink-0 text-gray-800 transition-all doc-container"
              style={{ 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0,0,0,0.05)',
                padding: '0.75in',
              }}
            >
              <div 
                ref={documentRef}
                className="prose prose-sm max-w-none contract-content"
                style={{
                  fontFamily: '"Times New Roman", Times, serif',
                  lineHeight: '1.6',
                  fontSize: '11pt',
                }}
                dangerouslySetInnerHTML={{ 
                  __html: renderTemplateContent(activeTemplate.content, selectedLead) 
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Global styles for the injected HTML content */}
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

      {selectedLead && (
        <EmailComposeModal 
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          lead={selectedLead}
          initialSubject={`Contract for ${selectedLead.propertyAddress || selectedLead.name}`}
          initialBody={`Hi ${selectedLead.name || 'there'},\n\nPlease find the attached contract for the property at ${selectedLead.propertyAddress || 'your property'}.\n\nReview it and let me know if you have any questions.\n\nBest regards,\n${currentUser?.name || 'The WholeScale Team'}`}
          attachment={emailAttachment}
        />
      )}
    </div>
  );
}
