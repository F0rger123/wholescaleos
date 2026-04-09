import { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { 
  Home, TrendingUp, DollarSign, PieChart, 
  RefreshCw, Save, ChevronDown, ChevronUp, Download,
  Edit2, Trash2, Link2, X, Target, Bot
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { CalculatorType, CalculatorScenario } from '../store/useStore';

function StatCounter({ value, prefix = '', suffix = '', decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 800; // ms
    const startValue = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function (outQuart)
      const easedProgress = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (value - startValue) * easedProgress;
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString(undefined, { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      })}
      {suffix}
    </span>
  );
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export default function Calculators() {
  const { 
    calculatorScenarios, 
    addCalculatorScenario, 
    updateCalculatorScenario, 
    deleteCalculatorScenario,
    leads 
  } = useStore();
  
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('wholesale');
  const [showDetails, setShowDetails] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioNotes, setScenarioNotes] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingScenario, setEditingScenario] = useState<CalculatorScenario | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // State for each calculator
  const [wholesaleInputs, setWholesaleInputs] = useState({
    arv: 250000,
    repairs: 30000,
    desiredProfit: 15000,
    holdingCosts: 3000,
    closingCosts: 5000,
  });

  const [flipInputs, setFlipInputs] = useState({
    purchasePrice: 200000,
    renovationCosts: 40000,
    holdingCosts: 8000,
    closingCosts: 12000,
    arv: 320000,
    sellingCosts: 19200,
  });

  const [rentalInputs, setRentalInputs] = useState({
    purchasePrice: 250000,
    downPaymentPercent: 20,
    interestRate: 6.5,
    loanTerm: 30,
    monthlyRent: 2200,
    propertyTaxes: 3000,
    insurance: 1200,
    maintenance: 1500,
    propertyManagement: 8,
    vacancyRate: 5,
  });

  const [brrrrInputs, setBrrrrInputs] = useState({
    purchasePrice: 150000,
    renovationCosts: 35000,
    holdingCosts: 5000,
    afterRepairValue: 250000,
    refiLtv: 75,
    refiInterestRate: 6.75,
    monthlyRent: 2000,
  });

  // Calculations
  const calculateWholesale = () => {
    const { arv, repairs, desiredProfit, holdingCosts, closingCosts } = wholesaleInputs;
    const maxOffer = arv - repairs - desiredProfit - holdingCosts - closingCosts;
    const roi = (desiredProfit / (maxOffer + repairs + holdingCosts + closingCosts)) * 100;
    
    return {
      maxOfferValue: maxOffer,
      roiValue: roi,
      arvValue: arv,
      repairsValue: repairs,
      profitValue: desiredProfit,
      totalCostsValue: (repairs + holdingCosts + closingCosts),
    };
  };

  const calculateFlip = () => {
    const { purchasePrice, renovationCosts, holdingCosts, closingCosts, arv, sellingCosts } = flipInputs;
    const totalInvestment = purchasePrice + renovationCosts + holdingCosts + closingCosts;
    const netProfit = arv - totalInvestment - sellingCosts;
    const roi = (netProfit / totalInvestment) * 100;
    const cashOnCash = (netProfit / (purchasePrice * 0.2)) * 100;
    
    return {
      netProfitValue: netProfit,
      roiValue: roi,
      cashOnCashValue: cashOnCash,
      totalInvestmentValue: totalInvestment,
      arvValue: arv,
    };
  };

  const calculateRental = () => {
    const { purchasePrice, downPaymentPercent, interestRate, loanTerm, monthlyRent,
            propertyTaxes, insurance, maintenance, propertyManagement, vacancyRate } = rentalInputs;
    
    const downPayment = purchasePrice * (downPaymentPercent / 100);
    const loanAmount = purchasePrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    
    const mortgagePayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    const monthlyTaxes = propertyTaxes / 12;
    const monthlyInsurance = insurance / 12;
    const monthlyMaintenance = maintenance / 12;
    const monthlyManagement = monthlyRent * (propertyManagement / 100);
    const monthlyVacancy = monthlyRent * (vacancyRate / 100);
    
    const totalMonthlyExpenses = mortgagePayment + monthlyTaxes + monthlyInsurance + 
                                 monthlyMaintenance + monthlyManagement + monthlyVacancy;
    
    const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;
    const cashOnCashROI = (annualCashFlow / downPayment) * 100;
    const capRate = (annualCashFlow / purchasePrice) * 100;
    
    return {
      monthlyCashFlowValue: monthlyCashFlow,
      annualCashFlowValue: annualCashFlow,
      cashOnCashROIValue: cashOnCashROI,
      capRateValue: capRate,
      mortgagePaymentValue: mortgagePayment,
      downPaymentValue: downPayment,
    };
  };

  const calculateBrrrr = () => {
    const { purchasePrice, renovationCosts, holdingCosts, afterRepairValue,
            refiLtv, refiInterestRate, monthlyRent } = brrrrInputs;
    
    const totalInvestment = purchasePrice + renovationCosts + holdingCosts;
    const refiLoanAmount = afterRepairValue * (refiLtv / 100);
    const cashOut = refiLoanAmount - totalInvestment;
    
    const monthlyRate = refiInterestRate / 100 / 12;
    const numberOfPayments = 30 * 12;
    const newMortgagePayment = refiLoanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    const monthlyCashFlow = monthlyRent - newMortgagePayment;
    const annualCashFlow = monthlyCashFlow * 12;
    const cocROI = cashOut > 0 ? (annualCashFlow / cashOut) * 100 : 0;
    
    return {
      cashOutValue: cashOut,
      newLoanAmountValue: refiLoanAmount,
      newMortgagePaymentValue: newMortgagePayment,
      monthlyCashFlowValue: monthlyCashFlow,
      cocROIValue: cocROI,
      totalInvestmentValue: totalInvestment,
    };
  };

  const wholesaleResult = calculateWholesale();
  const flipResult = calculateFlip();
  const rentalResult = calculateRental();
  const brrrrResult = calculateBrrrr();

  const getCurrentInputs = () => {
    switch (activeCalculator) {
      case 'wholesale': return wholesaleInputs;
      case 'fixnflip': return flipInputs;
      case 'rental': return rentalInputs;
      case 'brrrr': return brrrrInputs;
    }
  };

  const getCurrentResults = () => {
    switch (activeCalculator) {
      case 'wholesale': return wholesaleResult;
      case 'fixnflip': return flipResult;
      case 'rental': return rentalResult;
      case 'brrrr': return brrrrResult;
    }
  };

  const handleSaveScenario = () => {
    if (!scenarioName.trim()) {
      alert('Please enter a name for this scenario');
      return;
    }

    addCalculatorScenario({
      name: scenarioName,
      type: activeCalculator,
      leadId: selectedLeadId || undefined,
      inputs: getCurrentInputs(),
      results: getCurrentResults() as Record<string, any>,
      notes: scenarioNotes,
    });

    setScenarioName('');
    setScenarioNotes('');
    setSelectedLeadId('');
    setShowSaveModal(false);
  };

  const handleEditScenario = (scenario: CalculatorScenario) => {
    setEditingScenario(scenario);
    setScenarioName(scenario.name);
    setScenarioNotes(scenario.notes || '');
    setSelectedLeadId(scenario.leadId || '');
    setActiveCalculator(scenario.type);
    
    // Load the inputs
    if (scenario.type === 'wholesale') setWholesaleInputs(scenario.inputs as any);
    if (scenario.type === 'fixnflip') setFlipInputs(scenario.inputs as any);
    if (scenario.type === 'rental') setRentalInputs(scenario.inputs as any);
    if (scenario.type === 'brrrr') setBrrrrInputs(scenario.inputs as any);
    
    setShowSaveModal(true);
  };

  const handleUpdateScenario = () => {
    if (!editingScenario || !scenarioName.trim()) return;
    
    updateCalculatorScenario(editingScenario.id, {
      name: scenarioName,
      leadId: selectedLeadId || undefined,
      inputs: getCurrentInputs(),
      results: getCurrentResults() as Record<string, any>,
      notes: scenarioNotes,
    });

    setEditingScenario(null);
    setScenarioName('');
    setScenarioNotes('');
    setSelectedLeadId('');
    setShowSaveModal(false);
  };

  return (
    <div className="crm-container crm-page-transition">
      <div className="space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-[var(--t-surface)] p-8 rounded-[2rem] border border-[var(--t-border)] shadow-xl relative overflow-hidden astral-glass">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--t-primary-dim)] to-transparent opacity-10 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-[var(--t-primary)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--t-primary-dim)] rotate-3">
              <PieChart size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white mb-1">Deal Calculator</h1>
              <p className="text-[var(--t-text-muted)] font-medium">Precision deal analysis for fix & flip, BRRRR, and traditional rentals.</p>
            </div>
          </div>
          <div className="flex gap-4 relative z-10">
            <button 
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary-dim)] hover:scale-105 active:scale-95 transition-all font-bold text-sm"
            >
              <Save size={18} />
              <span>{editingScenario ? 'Update' : 'Save'} Scenario</span>
            </button>
          </div>
        </div>

        {/* Calculator Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { id: 'wholesale', label: 'Wholesale Deal', icon: TrendingUp },
            { id: 'fixnflip', label: 'Fix & Flip', icon: Home },
            { id: 'rental', label: 'Rental Property', icon: DollarSign },
            { id: 'brrrr', label: 'BRRRR Method', icon: RefreshCw },
          ].map(calc => (
            <button
              key={calc.id}
              onClick={() => setActiveCalculator(calc.id as CalculatorType)}
              className={`p-6 rounded-[2rem] border transition-all relative overflow-hidden group ${
                activeCalculator === calc.id 
                ? 'bg-[var(--t-primary-dim)] border-[var(--t-primary)] shadow-lg shadow-[var(--t-primary-dim)]' 
                : 'bg-[var(--t-surface)] border-[var(--t-border)] hover:border-[var(--t-primary-dim)] astral-glass'
              }`}
            >
              {activeCalculator === calc.id && (
                <div className="absolute top-0 right-0 p-2 text-[var(--t-primary)] -rotate-12 translate-x-1 -translate-y-1">
                  <Target size={40} className="opacity-10" />
                </div>
              )}
              <calc.icon size={24} className={`mb-3 transition-colors ${activeCalculator === calc.id ? 'text-[var(--t-primary)]' : 'text-[var(--t-text-muted)] group-hover:text-[var(--t-primary)]'}`} />
              <p className={`text-xs font-black uppercase tracking-widest ${activeCalculator === calc.id ? 'text-white' : 'text-[var(--t-text-muted)] group-hover:text-white transition-colors'}`}>
                {calc.label}
              </p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Input Panel */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[var(--t-surface)] p-8 rounded-[2.5rem] border border-[var(--t-border)] shadow-xl astral-glass">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
                  <Edit2 size={20} className="text-[var(--t-primary)]" />
                  Deal Parameters
                </h2>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--t-surface-subtle)] border border-[var(--t-border)] hover:bg-[var(--t-surface-hover)] transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  {showDetails ? 'Simple View' : 'Advanced Detail'}
                  {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Wholesale Inputs */}
              {activeCalculator === 'wholesale' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'After Repair Value (ARV)', value: wholesaleInputs.arv, key: 'arv' },
                    { label: 'Repair Costs', value: wholesaleInputs.repairs, key: 'repairs' },
                    { label: 'Desired Profit', value: wholesaleInputs.desiredProfit, key: 'desiredProfit' },
                    { label: 'Holding Costs', value: wholesaleInputs.holdingCosts, key: 'holdingCosts' },
                    { label: 'Closing Costs', value: wholesaleInputs.closingCosts, key: 'closingCosts' }
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] pl-2">{field.label}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[var(--t-text-muted)]">$</span>
                        <input
                          type="number"
                          value={field.value}
                          onChange={(e) => setWholesaleInputs({ ...wholesaleInputs, [field.key]: Number(e.target.value) })}
                          className="w-full bg-[var(--t-background)] border border-[var(--t-border)] rounded-2xl py-4 pl-8 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-[var(--t-primary-dim)] outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Fix & Flip Inputs */}
              {activeCalculator === 'fixnflip' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'Purchase Price', value: flipInputs.purchasePrice, key: 'purchasePrice' },
                    { label: 'Renovation Costs', value: flipInputs.renovationCosts, key: 'renovationCosts' },
                    { label: 'After Repair Value', value: flipInputs.arv, key: 'arv' },
                    { label: 'Holding Costs', value: flipInputs.holdingCosts, key: 'holdingCosts', advanced: true },
                    { label: 'Closing Costs', value: flipInputs.closingCosts, key: 'closingCosts', advanced: true },
                  ].map((field) => (
                    (!field.advanced || showDetails) && (
                      <div key={field.key} className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] pl-2">{field.label}</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[var(--t-text-muted)]">$</span>
                          <input
                            type="number"
                            value={field.value}
                            onChange={(e) => setFlipInputs({ ...flipInputs, [field.key]: Number(e.target.value) })}
                            className="w-full bg-[var(--t-background)] border border-[var(--t-border)] rounded-2xl py-4 pl-8 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-[var(--t-primary-dim)] outline-none"
                          />
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Rental Property Inputs */}
              {activeCalculator === 'rental' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'Purchase Price', value: rentalInputs.purchasePrice, key: 'purchasePrice' },
                    { label: 'Monthly Rent', value: rentalInputs.monthlyRent, key: 'monthlyRent' },
                    { label: 'Interest Rate (%)', value: rentalInputs.interestRate, key: 'interestRate', unit: '%' },
                    { label: 'Down Payment (%)', value: rentalInputs.downPaymentPercent, key: 'downPaymentPercent', unit: '%' },
                    { label: 'Property Management (%)', value: rentalInputs.propertyManagement, key: 'propertyManagement', unit: '%', advanced: true },
                    { label: 'Vacancy Rate (%)', value: rentalInputs.vacancyRate, key: 'vacancyRate', unit: '%', advanced: true },
                  ].map((field) => (
                    (!field.advanced || showDetails) && (
                      <div key={field.key} className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] pl-2">{field.label}</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[var(--t-text-muted)]">{field.unit || '$'}</span>
                          <input
                            type="number"
                            value={field.value}
                            onChange={(e) => setRentalInputs({ ...rentalInputs, [field.key]: Number(e.target.value) })}
                            className="w-full bg-[var(--t-background)] border border-[var(--t-border)] rounded-2xl py-4 pl-8 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-[var(--t-primary-dim)] outline-none"
                          />
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* BRRRR Inputs */}
              {activeCalculator === 'brrrr' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'Purchase Price', value: brrrrInputs.purchasePrice, key: 'purchasePrice' },
                    { label: 'Renovation Costs', value: brrrrInputs.renovationCosts, key: 'renovationCosts' },
                    { label: 'After Repair Value', value: brrrrInputs.afterRepairValue, key: 'afterRepairValue' },
                    { label: 'Monthly Rent', value: brrrrInputs.monthlyRent, key: 'monthlyRent' },
                    { label: 'Refi LTV (%)', value: brrrrInputs.refiLtv, key: 'refiLtv', unit: '%', advanced: true },
                    { label: 'Refi Interest Rate (%)', value: brrrrInputs.refiInterestRate, key: 'refiInterestRate', unit: '%', advanced: true },
                  ].map((field) => (
                    (!field.advanced || showDetails) && (
                      <div key={field.key} className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] pl-2">{field.label}</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[var(--t-text-muted)]">{field.unit || '$'}</span>
                          <input
                            type="number"
                            value={field.value}
                            onChange={(e) => setBrrrrInputs({ ...brrrrInputs, [field.key]: Number(e.target.value) })}
                            className="w-full bg-[var(--t-background)] border border-[var(--t-border)] rounded-2xl py-4 pl-8 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-[var(--t-primary-dim)] outline-none"
                          />
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-8 border-t border-[var(--t-border)] mt-8">
                <button
                  onClick={() => {
                    // Reset to defaults...
                    if (activeCalculator === 'wholesale') setWholesaleInputs({ arv: 250000, repairs: 30000, desiredProfit: 15000, holdingCosts: 3000, closingCosts: 5000 });
                    if (activeCalculator === 'fixnflip') setFlipInputs({ purchasePrice: 200000, renovationCosts: 40000, holdingCosts: 8000, closingCosts: 12000, arv: 320000, sellingCosts: 19200 });
                    if (activeCalculator === 'rental') setRentalInputs({ purchasePrice: 250000, downPaymentPercent: 20, interestRate: 6.5, loanTerm: 30, monthlyRent: 2200, propertyTaxes: 3000, insurance: 1200, maintenance: 1500, propertyManagement: 8, vacancyRate: 5 });
                    if (activeCalculator === 'brrrr') setBrrrrInputs({ purchasePrice: 150000, renovationCosts: 35000, holdingCosts: 5000, afterRepairValue: 250000, refiLtv: 75, refiInterestRate: 6.75, monthlyRent: 2000 });
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--t-surface-subtle)] border border-[var(--t-border)] hover:bg-[var(--t-surface-hover)] transition-all text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] hover:text-white"
                >
                  <RefreshCw size={14} />
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Saved Scenarios Table */}
            {calculatorScenarios.length > 0 && (
              <div className="bg-[var(--t-surface)] p-8 rounded-[2.5rem] border border-[var(--t-border)] shadow-xl astral-glass">
                <h2 className="text-xl font-black italic text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                  <PieChart size={20} className="text-[var(--t-primary)]" />
                  Saved Calculations
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--t-border)]">
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Scenario</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Type</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                      {calculatorScenarios.map(sc => (
                        <tr key={sc.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="py-4">
                            <p className="text-sm font-black text-white">{sc.name}</p>
                            {sc.leadId && (
                              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-primary)] flex items-center gap-1">
                                <Link2 size={10} />
                                Linked to Lead
                              </p>
                            )}
                          </td>
                          <td className="py-4">
                            <span className="px-3 py-1 rounded-full bg-[var(--t-surface-subtle)] border border-[var(--t-border)] text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">
                              {sc.type}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleEditScenario(sc)}
                                className="p-2 rounded-lg hover:bg-[var(--t-primary-dim)] text-[var(--t-text-muted)] hover:text-[var(--t-primary)] transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => setShowDeleteConfirm(sc.id)}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--t-text-muted)] hover:text-red-400 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Result Panel */}
          <div className="lg:col-span-4 sticky top-28 space-y-8">
            <div className="bg-gradient-to-br from-[var(--t-primary)] to-[#6366f1] p-[1.5px] rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="bg-[var(--t-surface)] p-8 rounded-[2.5rem] relative overflow-hidden h-full">
                <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[var(--t-primary)] blur-[100px] opacity-20 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-xl bg-[var(--t-primary)] text-white shadow-lg">
                      <Target size={20} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--t-text-muted)]">Analysis Results</span>
                  </div>

                  {activeCalculator === 'wholesale' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Max Allowable Offer</p>
                        <p className="text-5xl font-black text-white tracking-tighter italic">
                          <StatCounter value={wholesaleResult.maxOfferValue} prefix="$" />
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-[var(--t-surface-subtle)] border border-[var(--t-border)]">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Target Profit</p>
                          <p className="text-lg font-bold text-[var(--t-success)]"><StatCounter value={wholesaleResult.profitValue} prefix="$" /></p>
                        </div>
                        <div className="p-4 rounded-2xl bg-[var(--t-surface-subtle)] border border-[var(--t-border)]">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">ROI</p>
                          <p className="text-lg font-bold text-white"><StatCounter value={wholesaleResult.roiValue} suffix="%" decimals={1} /></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeCalculator === 'fixnflip' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Projected Net Profit</p>
                        <p className="text-5xl font-black text-white tracking-tighter italic">
                          <StatCounter value={flipResult.netProfitValue} prefix="$" />
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-[var(--t-surface-subtle)] border border-[var(--t-border)]">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">ROI</p>
                          <p className="text-lg font-bold text-[var(--t-success)]"><StatCounter value={flipResult.roiValue} suffix="%" decimals={1} /></p>
                        </div>
                        <div className="p-4 rounded-2xl bg-[var(--t-surface-subtle)] border border-[var(--t-border)]">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Cash on Cash</p>
                          <p className="text-lg font-bold text-white"><StatCounter value={flipResult.cashOnCashValue} suffix="%" decimals={1} /></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeCalculator === 'rental' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Monthly Cash Flow</p>
                        <p className="text-5xl font-black text-white tracking-tighter italic">
                          <StatCounter value={rentalResult.monthlyCashFlowValue} prefix="$" />
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-[var(--t-surface-subtle)] border border-[var(--t-border)]">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Cap Rate</p>
                          <p className="text-lg font-bold text-[var(--t-warning)]"><StatCounter value={rentalResult.capRateValue} suffix="%" decimals={1} /></p>
                        </div>
                        <div className="p-4 rounded-2xl bg-[var(--t-surface-subtle)] border border-[var(--t-border)]">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">COC ROI</p>
                          <p className="text-lg font-bold text-white"><StatCounter value={rentalResult.cashOnCashROIValue} suffix="%" decimals={1} /></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeCalculator === 'brrrr' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Cash Out at Refi</p>
                        <p className="text-5xl font-black text-white tracking-tighter italic">
                          <StatCounter value={brrrrResult.cashOutValue} prefix="$" />
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-[var(--t-surface-subtle)] border border-[var(--t-border)]">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">New Mortgage</p>
                          <p className="text-lg font-bold text-white"><StatCounter value={brrrrResult.newMortgagePaymentValue} prefix="$" /></p>
                        </div>
                        <div className="p-4 rounded-2xl bg-[var(--t-surface-subtle)] border border(--t-border)]">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Monthly Flow</p>
                          <p className="text-lg font-bold text-[var(--t-success)]"><StatCounter value={brrrrResult.monthlyCashFlowValue} prefix="$" /></p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8," + "Metric,Value\n" + 
                        Object.entries(getCurrentResults() || {}).map(([k, v]) => `${k},${v}`).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `deal_analysis_${activeCalculator}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="w-full mt-10 py-5 rounded-[2rem] bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
                  >
                    <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                    Export Analysis
                  </button>
                </div>
              </div>
            </div>

            {/* Premium Note */}
            <div className="bg-[var(--t-surface)] p-6 rounded-3xl border border-[var(--t-border)] shadow-xl astral-glass relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--t-primary-dim)] to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="flex gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-[var(--t-primary-dim)] text-[var(--t-primary)] flex items-center justify-center animate-pulse">
                  <Bot size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">WholeScale AI Agent</p>
                  <p className="text-xs font-bold text-white italic leading-relaxed">
                    "This deal shows high probability for success in this market segment. Recommendation: Proceed with verification."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--t-background)]/80 backdrop-blur-xl" onClick={() => setShowSaveModal(false)} />
          <div className="bg-[var(--t-surface)] w-full max-w-lg rounded-[3.5rem] border border-[var(--t-border)] shadow-2xl relative z-10 overflow-hidden astral-glass p-10">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Archive Scenario</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text-muted)] mt-1">Preserve your calculation history</p>
              </div>
              <button 
                onClick={() => {
                  setShowSaveModal(false);
                  setEditingScenario(null);
                  setScenarioName('');
                  setScenarioNotes('');
                  setSelectedLeadId('');
                }}
                className="p-3 rounded-2xl hover:bg-white/5 text-[var(--t-text-muted)] hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] pl-2">Calculation Name</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g., Downtown Fix & Flip Strategy"
                  className="w-full bg-[var(--t-background)] border border-[var(--t-border)] rounded-3xl py-5 px-8 text-sm font-bold text-white focus:ring-2 focus:ring-[var(--t-primary-dim)] outline-none"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] pl-2">Connect to Lead</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-[var(--t-background)] border border-[var(--t-border)] rounded-3xl py-5 px-8 text-sm font-bold text-white focus:ring-2 focus:ring-[var(--t-primary-dim)] outline-none appearance-none cursor-pointer"
                >
                  <option value="">Detached Scenario</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name} - {lead.propertyAddress}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] pl-2">Strategic Notes</label>
                <textarea
                  value={scenarioNotes}
                  onChange={(e) => setScenarioNotes(e.target.value)}
                  placeholder="Add context about this calculation..."
                  rows={4}
                  className="w-full bg-[var(--t-background)] border border-[var(--t-border)] rounded-3xl py-5 px-8 text-sm font-bold text-white focus:ring-2 focus:ring-[var(--t-primary-dim)] outline-none resize-none"
                />
              </div>

              <button 
                onClick={editingScenario ? handleUpdateScenario : handleSaveScenario}
                disabled={!scenarioName.trim()}
                className="w-full py-6 rounded-[2.5rem] bg-[var(--t-primary)] text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-[var(--t-primary-dim)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {editingScenario ? 'Update Calculation' : 'Commit to Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowDeleteConfirm(null)} />
          <div className="bg-[var(--t-surface)] w-full max-w-sm rounded-[3rem] border border-[var(--t-border)] shadow-2xl relative z-10 p-10 text-center astral-glass">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-2">Delete Scenario?</h3>
            <p className="text-sm text-[var(--t-text-muted)] mb-8 font-medium">This record will be permanently purged from the aetheric mesh.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-4 rounded-2xl bg-[var(--t-surface-subtle)] text-[var(--t-text-muted)] font-black uppercase tracking-widest text-[10px] hover:bg-[var(--t-surface-hover)] transition-all"
              >
                No, Keep it
              </button>
              <button 
                onClick={() => {
                  if (showDeleteConfirm) {
                    deleteCalculatorScenario(showDeleteConfirm);
                    setShowDeleteConfirm(null);
                  }
                }}
                className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Yes, Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}