/**
 * Real Estate Knowledge Base for OS Bot
 * Contains terminology, formulas, script templates, and benchmarks.
 */

export interface RealEstateConcept {
  term: string;
  definition: string;
  example: string;
  details?: string[];
  benchmarks?: string;
}

export interface ScriptTemplate {
  category: string;
  title: string;
  script: string;
  tips: string[];
}

export const REAL_ESTATE_CONCEPTS: Record<string, RealEstateConcept> = {
  'cap rate': {
    term: 'Capitalization Rate (Cap Rate)',
    definition: 'The ratio of a property\'s net operating income (NOI) to its current market value or purchase price.',
    example: 'A property bought for $1,000,000 that generates $80,000 in annual NOI has an 8% cap rate ($80,000 / $1,000,000).',
    details: [
      'NOI = Gross Income - Operating Expenses',
      'Lower cap rates (4-6%) often indicate lower risk and higher stability.',
      'Higher cap rates (8%+) often indicate higher risk or value-add opportunities.'
    ],
    benchmarks: '4-6% for low-risk A-class, 7-9% for solid B/C class, 10%+ for opportunistic/high-risk.'
  },
  'cash on cash': {
    term: 'Cash-on-Cash Return (CoC)',
    definition: 'The ratio of annual pre-tax cash flow to the total amount of cash invested.',
    example: 'If you invest $50,000 (down payment + repairs) and get back $5,000 in cash flow after all expenses and debt service, your CoC is 10%.',
    details: [
      'Cash Flow = NOI - Debt Service',
      'Measures the actual return on the literal cash you spent.'
    ]
  },
  'brrrr': {
    term: 'BRRRR Method',
    definition: 'Buy, Rehab, Rent, Refinance, Repeat. A strategy to build a portfolio with little capital left in the deal.',
    example: 'Buy a distressed house for $100k, spend $50k on rehab (Total $150k). After rehab it appraises for $200k. Refinance at 75% LTV ($150k) to get all your initial capital back.',
    details: [
      'Key is high "forced equity" during the rehab phase.',
      'Refinance usually happens after a "seasoning period" (often 6 months).'
    ]
  },
  '70% rule': {
    term: 'The 70% Rule',
    definition: 'A guideline for house flippers: never pay more than 70% of the After Repair Value (ARV) minus repair costs.',
    example: 'ARV is $300k, repairs are $50k. Max Offer = ($300,000 * 0.70) - $50,000 = $160,000.',
    details: [
      'The 30% margin covers profit, closing costs, and holding costs.',
      'In hot markets, some investors use 75% or 80%, but it increases risk.'
    ]
  },
  'dscr': {
    term: 'Debt Service Coverage Ratio (DSCR)',
    definition: 'A measurement of a property\'s ability to cover its mortgage payments from its income.',
    example: 'If NOI is $1,250/mo and mortgage is $1,000/mo, DSCR is 1.25.',
    details: [
      'Lenders often require a DSCR of 1.20 to 1.25 for commercial loans.',
      'DSCR < 1.0 means the property is "bleeding" (negative cash flow).'
    ]
  },
  'wholesaling': {
    term: 'Wholesaling',
    definition: 'Finding deeply discounted properties and "assigning" the contract to an end buyer for a fee.',
    example: 'You get a house under contract for $150k. You find a cash buyer for $160k. You assign the contract and keep the $10k difference.',
    details: [
      'Legal via "Assignment of Contract" or "Double Closing".',
      'Requires strong marketing and negotiation skills.'
    ]
  },
  '1031 exchange': {
    term: '1031 Exchange',
    definition: 'A tax-advantaged strategy to defer capital gains taxes by "swapping" one investment property for another of equal or greater value.',
    example: 'Sell a rental for $500k profit, but instead of paying taxes, you use all proceeds to buy a $1M apartment complex through an intermediary.',
    details: [
      'Must identify replacement property within 45 days.',
      'Must close on new property within 180 days.',
      'Properties must be "like-kind" (investment/business use).'
    ]
  },
  'cma': {
    term: 'CMA (Comparative Market Analysis)',
    definition: 'An estimate of a home\'s value used to help sellers set listing prices and help buyers make competitive offers.',
    example: 'Looking at 3 similar homes that sold within 0.5 miles in the last 6 months to price a new listing.',
    details: [
      'Uses Recently Sold, Pending, and Active listings.',
      'Adjusts value based on features (e.g., +$10k for a pool).',
      'Different from an appraisal (done by agents, not licensed appraisers).'
    ]
  },
  'absorption rate': {
    term: 'Absorption Rate',
    definition: 'The rate at which available homes are sold in a specific real estate market during a given time period.',
    example: 'If 100 homes are available and 20 sell per month, the absorption rate is 20%.',
    details: [
      'Calculated as (Number of Sales / Number of Listings).',
      'Over 20% = Seller\'s Market.',
      'Under 15% = Buyer\'s Market.'
    ]
  },
  'dom': {
    term: 'DOM (Days on Market)',
    definition: 'The number of days from when a property is listed until it goes under contract.',
    example: 'High DOM usually indicates the property is overpriced or has underlying issues.',
    details: [
      'CDOM (Cumulative Days on Market) tracks across multiple listings.',
      'Market average DOM helps gauge buyer demand.'
    ]
  }
};

export const REAL_ESTATE_STRATEGIES: Record<string, { title: string; steps: string[]; proTip: string }> = {
  'wholesaling': {
    title: 'Wholesale Mastery Strategy',
    steps: [
      'Find deeply discounted properties (off-market).',
      'Get property under contract with a "Subject to" or "Assignability" clause.',
      'Build a Cash Buyers list in that specific zip code.',
      'Assign the contract for an Assignment Fee ($5k - $25k).',
      'Close at title company with "Double Close" or "Assignment".'
    ],
    proTip: 'Focus on "Motivated Sellers" (Probate, Tax Lien, Pre-Foreclosure) rather than price alone.'
  },
  'brrrr': {
    title: 'BRRRR Method (Buy, Rehab, Rent, Refinance, Repeat)',
    steps: [
      'Buy a distressed property at a discount (cash or hard money).',
      'Rehab the property to force appreciation.',
      'Rent the property to high-quality tenants.',
      'Refinance into a long-term conventional loan based on new ARV.',
      'Repeat by pulling out your initial capital tax-free.'
    ],
    proTip: 'The "70% Rule" is your best friend here. If ARV is $100k, your Buy + Rehab cost should be < $70k.'
  },
  'flipping': {
    title: 'Fix & Flip Profit Strategy',
    steps: [
      'Find a property requiring cosmetic or structural repair.',
      'Accurately estimate repair costs (add 15% buffer).',
      'Execute high-ROI renovations (Kitchen, Baths, Flooring).',
      'List and sell on the MLS to retail buyers.'
    ],
    proTip: 'Kitchens and Master Baths sell houses. Don\'t over-improve for the neighborhood.'
  }
};

export const REAL_ESTATE_PRO_TIPS = [
  "When negotiating, the first person to speak loses. Let the seller name their price first.",
  "Always check the 'Absorption Rate' in a neighborhood. If it's over 20%, houses are selling fast.",
  "A 'Double Close' is safer than an assignment for large fees to avoid buyer friction.",
  "Look for properties with 'Functional Obsolescence' (e.g., 2 bed / 1 bath) that can be easily converted.",
  "Always add a 'Subject to Inspection' and 'Subject to Partner Approval' contingency for safety."
];

export interface FlipResult {
  type: 'flip';
  arv: number;
  purchase: number;
  repairs: number;
  totalCost: number;
  profit: number;
  roi: number;
  maxOffer70: number;
  isGood70: boolean;
}

export interface RentalResult {
  type: 'rental';
  purchase: number;
  downPayment: number;
  monthlyRent: number;
  monthlyExpenses: number;
  cashFlow: number;
  coc: number;
  capRate: number;
  monthlyMortgage: number;
}

export const REAL_ESTATE_SCRIPTS: ScriptTemplate[] = [
  {
    category: 'expired',
    title: 'Expired Listing Script',
    script: "Hi [Name], this is [Agent] with WholeScale Realty. I saw your home recently came off the market and I wanted to reach out personally. I know this can be frustrating. I actually previewed your home when it was active and noticed a few things that might have held it back. Would you be open to a quick 5-minute conversation about what happened and whether it makes sense to try a different approach?",
    tips: ['Listen more than you talk', 'Ask what feedback they received', 'Have comps ready' ]
  },
  {
    category: 'fsbo',
    title: 'FSBO (For Sale By Owner) Script',
    script: "Hi [Name], I'm [Agent] from WholeScale. I'm not calling to list your home—I saw the photos online and it looks great. I focus on this neighborhood and wanted to see if you're offering a commission to an agent who brings a qualified buyer? Also, if I can't bring a buyer, what's your backup plan if the home doesn't sell in the next 30 days?",
    tips: ['Focus on helping, not listing', 'Verify if they work with buyers\' agents', 'Position yourself as an expert resource']
  },
  {
    category: 'soi',
    title: 'Sphere of Influence (SOI) Catch-up',
    script: "Hey [Name]! It's [Your Name]. Long time no talk! I was just thinking about you because I saw a house down the street from yours sell for a crazy price recently. How's the family? Also, random question, have you guys ever thought about what your place would be worth in this market, even just for curiosity's sake? I'm doing some market reports for friends this week and happy to run one for you.",
    tips: ['Keep it low pressure', 'Focus on the relationship first', 'Provide value first (market report)']
  },
  {
    category: 'objection',
    title: 'Objection: "I have an agent"',
    script: "That's great! Having representation is smart. Is that a formal listing agreement or just someone you've talked to? The reason I ask is that my strategy for this specific area has been getting homes sold for 3-5% above the average right now. If your agent hasn't mentioned [Market Trend], would you be open to a second opinion?",
    tips: ['Be respectful but curious', 'Highlight your local expertise', 'Don\'t badmouth the other agent']
  }
];

export function calculateDeal(type: 'flip' | 'rental', data: any): FlipResult | RentalResult | null {
  if (type === 'flip') {
    const arv = Number(data.arv || 0);
    const purchase = Number(data.purchase || 0);
    const repairs = Number(data.repairs || 0);
    const closing = arv * 0.08; // Estimated sell-side costs
    const holding = purchase * 0.05; // Estimated holding costs
    const totalCost = purchase + repairs + holding;
    const profit = arv - totalCost - closing;
    const roi = (profit / (purchase + repairs || 1)) * 100;
    const maxOffer70 = (arv * 0.7) - repairs;

    return {
      type: 'flip',
      arv,
      purchase,
      repairs,
      totalCost,
      profit,
      roi,
      maxOffer70,
      isGood70: purchase <= maxOffer70
    };
  }

  if (type === 'rental') {
    const purchase = Number(data.purchase || 0);
    const downPayment = Number(data.downPayment || purchase * 0.2);
    const monthlyRent = Number(data.rent || 0);
    const vacancy = monthlyRent * 0.05;
    const taxes = (purchase * 0.012) / 12;
    const insurance = 100;
    const management = monthlyRent * 0.10;
    const maintenance = monthlyRent * 0.05;
    
    // Simple mortgage estimate (calc is for 7% interest, 30yr)
    const loanAmount = purchase - downPayment;
    const monthlyMortgage = (loanAmount * 0.00665) / (1 - Math.pow(1 + 0.00665, -360));
    
    const monthlyExpenses = taxes + insurance + management + maintenance + monthlyMortgage + vacancy;
    const cashFlow = monthlyRent - monthlyExpenses;
    const annualCashFlow = cashFlow * 12;
    const coc = (annualCashFlow / (downPayment || 1)) * 100;
    const capRate = purchase > 0 ? ((monthlyRent - (taxes + insurance + management + maintenance + vacancy)) * 12) / purchase * 100 : 0;

    return {
      type: 'rental',
      purchase,
      downPayment,
      monthlyRent,
      monthlyExpenses,
      cashFlow,
      coc,
      capRate,
      monthlyMortgage
    };
  }

  return null;
}
