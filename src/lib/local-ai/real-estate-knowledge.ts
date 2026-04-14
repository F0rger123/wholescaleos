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
  strategy?: string;
  whyMatters?: string;
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
  },
  'subject-to': {
    term: 'Subject-To ("Sub2")',
    definition: 'Buying a property "subject to" the existing financing. The buyer takes over the payments but the original loan stays in the seller\'s name.',
    example: 'Seller has a 3% interest rate loan. You pay them $10k for their equity and take over their $1,200/mo payment. You get a low-interest loan without qualifying at a bank.',
    details: [
      'Perfect for low-equity sellers with low interest rates.',
      'Requires a "Due on Sale" clause disclosure.',
      'Entry cost = Arrears + Equity Payment + Closing Costs.'
    ]
  },
  'seller finance': {
    term: 'Seller Financing / Owner Carryback',
    definition: 'The seller acts as the bank and provides a loan to the buyer for all or part of the purchase price.',
    example: 'You buy a $300k house. You give the seller $30k down. They carry a note for $270k at 5% interest for 10 years.',
    details: [
      'Can be structured with a "balloon payment" or fully amortized.',
      'Great for buyers who can\'t get traditional bank financing.',
      'Negotiable terms (No credit check, no appraisal required).'
    ]
  },
  'novation': {
    term: 'Novation Agreement',
    definition: 'A strategy where an investor finds a buyer at a higher price and replaces their contract with the seller for the new buyer, keeping the spread.',
    example: 'You contract a house for $200k. You find a retail buyer for $250k. You "novate" the contract, the retail buyer buys from the seller, and you keep $50k minus costs.',
    details: [
      'Allows you to sell to retail buyers (FHA/VA) while wholesaling.',
      'Requires the seller\'s cooperation to fix minor repairs.',
      'Higher profit potential than standard wholesaling.'
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

export interface Sub2Result {
  type: 'sub2';
  purchase: number;
  loanBalance: number;
  entryCost: number;
  cashFlow: number;
  coc: number;
  monthlyPITI: number;
  rent: number;
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
  },
  {
    category: 'buyer',
    title: 'Buyer Consultation Hook',
    script: "It's a tricky market, but there are actually 'hidden' properties not on the MLS right now. If I could show you a way to find homes before other buyers even know they're for sale, would you want to sit down for 15 minutes today to look at the list?",
    tips: ['Focus on exclusive access', 'Low-pressure call to action', 'Highlight off-market expertise']
  },
  {
    category: 'seller',
    title: 'Seller Lead Follow-up',
    script: "Hi [Name], I was just reviewing the market activity for [Neighborhood] and noticed two properties like yours just went under contract in less than 48 hours. The buyer demand is peaking right now. Have you considered whether this might be the right window to maximize your equity?",
    tips: ['Use recent data/urgency', 'Focus on equity maximization', 'Ask for a low-stakes valuation']
  },
  {
    category: 'cold call',
    title: 'Cold Calling Script (Introduction)',
    script: "Hi [Name], I'm [Your Name], an investor looking specifically for properties in [Neighborhood]. I'm not a big company—I'm just looking to pick up one more project this month. I know this is out of the blue, but have you ever considered an all-cash offer for your place at 123 Main St? No repairs, no commissions.",
    tips: ['Be transparent about being an investor', 'Focus on the "all-cash/no repairs" benefit', 'Keep the intro under 10 seconds']
  },
  {
    category: 'negotiation',
    title: 'Objection: "Your offer is too low"',
    script: "I completely understand. If I were in your shoes, I'd want the highest number possible too. The reason my number is at [Amount] is because I'm taking on all the risk of the repairs ($[Repairs]), the carrying costs, and the fact that I'm paying you cash in [Time]. If you list with an agent, you'll pay 6% in commission and likely wait 3-6 months. Which is more important to you right now—the absolute highest price or the certainty of a clean, fast exit?",
    tips: ['Validate their feeling', 'Itemize the value of convenience', 'Pivot to their core motivation']
  },
  {
    category: 'negotiation',
    title: 'Objection: "I\'ll think about it"',
    script: "That makes sense. It's a big decision. Usually when people say they need to think about it, it's either the price or the timeline. Which one of those is weighing on you the most? Or is there something about the process we haven't covered yet?",
    tips: ['Identify the "Real" objection', 'Don\'t push, just clarify', 'Offer to follow up with a specific data point']
  }
];

export const MARKET_INDICATORS = [
  {
    name: 'Absorption Rate',
    good: '> 20% (Seller\'s Market)',
    warning: '< 12% (Buyer\'s Market)',
    description: 'How fast inventory is moving.'
  },
  {
    name: 'Fed Funds Rate',
    impact: 'Directly affects mortgage rates and buyer purchasing power. High rates compress cap rates.',
    strategy: 'Focus on Creative Finance (Sub2) when traditional rates are high.'
  },
  {
    name: 'Inventory Levels',
    impact: 'Low inventory = High prices. High inventory = Negotiation leverage for investors.'
  }
];

export const REAL_ESTATE_MARKETING_TIPS = [
  {
    category: 'social media',
    title: 'Instagram/FB "Pattern Interrupt"',
    tip: "Instead of 'Just Listed' posts, post a 'Problem Solved' story. Show a photo of a messy house and then the 'Sold' sign. Explain HOW you solved the seller's specific headache (e.g., 'Closed in 10 days with a tenant inside')."
  },
  {
    category: 'direct mail',
    title: 'The "Lumpy Mail" Strategy',
    tip: "Send a standard envelope but include something small like a single key or a fake 'Notice of Interest'. It gets the envelope opened 80% more than a standard postcard. Use handwritten-style fonts for better response."
  },
  {
    category: 'cold calling',
    title: 'The 3-Touch System',
    tip: "Call, text, then email within 4 hours. The sequence is: Initial Call (no message) -> Text ('Just tried calling about 123 Main St, have a quick question') -> Email (Property value analysis). Speed to lead is everything."
  },
  {
    category: 'seo',
    title: 'Hyper-Local Niche Pages',
    tip: "Don't rank for 'Realtor in Miami'. Rank for '[Neighborhood Name] homes with pools' or 'How to sell a house with a tax lien in [City]'. Niche content converts at 4x the rate of generic real estate SEO."
  },
  {
    category: 'referrals',
    title: 'The "Partner-First" Method',
    tip: "Go to local Probate Attorneys or Divorce Lawyers. Don't ask for leads. Ask: 'What's the biggest headache you have when a client needs to liquidate a property fast?' Solve their problem first, and they will become a lead machine for you."
  }
];

export function calculateDeal(type: 'flip' | 'rental' | 'sub2', data: any): FlipResult | RentalResult | Sub2Result | null {
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
    } as RentalResult;
  }

  // New: Creative Finance (Subject-To) Analysis
  if (type as any === 'sub2') {
    const purchase = Number(data.purchase || 0);
    const loanBalance = Number(data.loanBalance || purchase * 0.8);
    const monthlyPITI = Number(data.monthlyPITI || 0);
    const rent = Number(data.rent || 0);
    const entryCost = Number(data.entryCost || 0);
    
    const cashFlow = rent - monthlyPITI - (rent * 0.15); // subtracting 15% for vacancy/maint
    const coc = (cashFlow * 12 / (entryCost || 1)) * 100;

    return {
      type: 'sub2' as any,
      purchase,
      loanBalance,
      entryCost,
      cashFlow,
      coc,
      monthlyPITI,
      rent
    } as any;
  }

  return null;
}
