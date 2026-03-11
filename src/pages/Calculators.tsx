import React, { useState } from 'react';
import { 
  Home, TrendingUp, DollarSign, PieChart, 
  RefreshCw, Save, ChevronDown, ChevronUp, Download,
  Edit2, Trash2, Link2, X
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { CalculatorType, CalculatorScenario } from '../store/useStore';

export function Calculators() {
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
      maxOffer: maxOffer.toFixed(0),
      roi: roi.toFixed(1),
      arv: arv.toLocaleString(),
      repairs: repairs.toLocaleString(),
      profit: desiredProfit.toLocaleString(),
      totalCosts: (repairs + holdingCosts + closingCosts).toLocaleString(),
    };
  };

  const calculateFlip = () => {
    const { purchasePrice, renovationCosts, holdingCosts, closingCosts, arv, sellingCosts } = flipInputs;
    const totalInvestment = purchasePrice + renovationCosts + holdingCosts + closingCosts;
    const netProfit = arv - totalInvestment - sellingCosts;
    const roi = (netProfit / totalInvestment) * 100;
    const cashOnCash = (netProfit / (purchasePrice * 0.2)) * 100;
    
    return {
      netProfit: netProfit.toFixed(0),
      roi: roi.toFixed(1),
      cashOnCash: cashOnCash.toFixed(1),
      totalInvestment: totalInvestment.toLocaleString(),
      arv: arv.toLocaleString(),
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
      monthlyCashFlow: monthlyCashFlow.toFixed(0),
      annualCashFlow: annualCashFlow.toFixed(0),
      cashOnCashROI: cashOnCashROI.toFixed(1),
      capRate: capRate.toFixed(1),
      mortgagePayment: mortgagePayment.toFixed(0),
      downPayment: downPayment.toLocaleString(),
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
      cashOut: cashOut.toFixed(0),
      newLoanAmount: refiLoanAmount.toLocaleString(),
      newMortgagePayment: newMortgagePayment.toFixed(0),
      monthlyCashFlow: monthlyCashFlow.toFixed(0),
      cocROI: cocROI.toFixed(1),
      totalInvestment: totalInvestment.toLocaleString(),
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--t-text)' }}>Real Estate Calculators</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t-text-secondary)' }}>
          Analyze deals, project profits, and make data-driven decisions
        </p>
      </div>

      {/* Calculator Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'wholesale', label: 'Wholesale Deal', icon: TrendingUp, color: 'var(--t-primary)', bg: 'var(--t-primary-dim)' },
          { id: 'fixnflip', label: 'Fix & Flip', icon: Home, color: 'var(--t-success)', bg: 'rgba(16, 185, 129, 0.15)' },
          { id: 'rental', label: 'Rental Property', icon: DollarSign, color: 'var(--t-accent)', bg: 'rgba(139, 92, 246, 0.15)' },
          { id: 'brrrr', label: 'BRRRR Method', icon: RefreshCw, color: 'var(--t-warning)', bg: 'rgba(245, 158, 11, 0.15)' },
        ].map(calc => (
          <button
            key={calc.id}
            onClick={() => setActiveCalculator(calc.id as CalculatorType)}
            className={`p-4 rounded-xl border transition-all ${
              activeCalculator === calc.id 
                ? 'ring-2' 
                : 'hover:bg-opacity-80'
            }`}
            style={{
              backgroundColor: activeCalculator === calc.id ? calc.bg : 'var(--t-surface-hover)',
              color: activeCalculator === calc.id ? calc.color : 'var(--t-text-muted)',
              borderColor: activeCalculator === calc.id ? calc.color : 'var(--t-border)',
              '--tw-ring-color': activeCalculator === calc.id ? calc.color : 'transparent',
            } as React.CSSProperties}
          >
            <calc.icon size={24} style={{ color: activeCalculator === calc.id ? calc.color : 'var(--t-text-muted)' }} />
            <p className="text-sm font-medium mt-2">{calc.label}</p>
          </button>
        ))}
      </div>

      {/* Main Calculator Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderWidth: '1px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
              {activeCalculator === 'wholesale' && <><TrendingUp style={{ color: 'var(--t-primary)' }} /> Wholesale Deal Inputs</>}
              {activeCalculator === 'fixnflip' && <><Home style={{ color: 'var(--t-success)' }} /> Fix & Flip Inputs</>}
              {activeCalculator === 'rental' && <><DollarSign style={{ color: 'var(--t-accent)' }} /> Rental Property Inputs</>}
              {activeCalculator === 'brrrr' && <><RefreshCw style={{ color: 'var(--t-warning)' }} /> BRRRR Method Inputs</>}
            </h2>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="transition-colors"
              style={{ color: 'var(--t-text-secondary)' }}
            >
              {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {/* Wholesale Calculator Inputs */}
          {activeCalculator === 'wholesale' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>After Repair Value (ARV)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={wholesaleInputs.arv}
                    onChange={(e) => setWholesaleInputs({ ...wholesaleInputs, arv: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Repair Costs</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={wholesaleInputs.repairs}
                    onChange={(e) => setWholesaleInputs({ ...wholesaleInputs, repairs: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Desired Profit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={wholesaleInputs.desiredProfit}
                    onChange={(e) => setWholesaleInputs({ ...wholesaleInputs, desiredProfit: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              {showDetails && (
                <>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Holding Costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                      <input
                        type="number"
                        value={wholesaleInputs.holdingCosts}
                        onChange={(e) => setWholesaleInputs({ ...wholesaleInputs, holdingCosts: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Closing Costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                      <input
                        type="number"
                        value={wholesaleInputs.closingCosts}
                        onChange={(e) => setWholesaleInputs({ ...wholesaleInputs, closingCosts: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Fix & Flip Inputs */}
          {activeCalculator === 'fixnflip' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={flipInputs.purchasePrice}
                    onChange={(e) => setFlipInputs({ ...flipInputs, purchasePrice: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Renovation Costs</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={flipInputs.renovationCosts}
                    onChange={(e) => setFlipInputs({ ...flipInputs, renovationCosts: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>After Repair Value (ARV)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={flipInputs.arv}
                    onChange={(e) => setFlipInputs({ ...flipInputs, arv: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              {showDetails && (
                <>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Holding Costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                      <input
                        type="number"
                        value={flipInputs.holdingCosts}
                        onChange={(e) => setFlipInputs({ ...flipInputs, holdingCosts: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Closing Costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                      <input
                        type="number"
                        value={flipInputs.closingCosts}
                        onChange={(e) => setFlipInputs({ ...flipInputs, closingCosts: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Selling Costs (%)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>%</span>
                      <input
                        type="number"
                        value={(flipInputs.sellingCosts / flipInputs.arv * 100).toFixed(1)}
                        onChange={(e) => setFlipInputs({ ...flipInputs, sellingCosts: (Number(e.target.value) / 100) * flipInputs.arv })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Rental Property Inputs */}
          {activeCalculator === 'rental' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={rentalInputs.purchasePrice}
                    onChange={(e) => setRentalInputs({ ...rentalInputs, purchasePrice: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Down Payment (%)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>%</span>
                  <input
                    type="number"
                    value={rentalInputs.downPaymentPercent}
                    onChange={(e) => setRentalInputs({ ...rentalInputs, downPaymentPercent: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Interest Rate (%)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>%</span>
                  <input
                    type="number"
                    step="0.125"
                    value={rentalInputs.interestRate}
                    onChange={(e) => setRentalInputs({ ...rentalInputs, interestRate: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Monthly Rent</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={rentalInputs.monthlyRent}
                    onChange={(e) => setRentalInputs({ ...rentalInputs, monthlyRent: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              {showDetails && (
                <>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Annual Property Taxes</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                      <input
                        type="number"
                        value={rentalInputs.propertyTaxes}
                        onChange={(e) => setRentalInputs({ ...rentalInputs, propertyTaxes: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Annual Insurance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                      <input
                        type="number"
                        value={rentalInputs.insurance}
                        onChange={(e) => setRentalInputs({ ...rentalInputs, insurance: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Annual Maintenance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                      <input
                        type="number"
                        value={rentalInputs.maintenance}
                        onChange={(e) => setRentalInputs({ ...rentalInputs, maintenance: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Property Management (%)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>%</span>
                      <input
                        type="number"
                        value={rentalInputs.propertyManagement}
                        onChange={(e) => setRentalInputs({ ...rentalInputs, propertyManagement: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Vacancy Rate (%)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>%</span>
                      <input
                        type="number"
                        value={rentalInputs.vacancyRate}
                        onChange={(e) => setRentalInputs({ ...rentalInputs, vacancyRate: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* BRRRR Inputs */}
          {activeCalculator === 'brrrr' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={brrrrInputs.purchasePrice}
                    onChange={(e) => setBrrrrInputs({ ...brrrrInputs, purchasePrice: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Renovation Costs</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={brrrrInputs.renovationCosts}
                    onChange={(e) => setBrrrrInputs({ ...brrrrInputs, renovationCosts: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>After Repair Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={brrrrInputs.afterRepairValue}
                    onChange={(e) => setBrrrrInputs({ ...brrrrInputs, afterRepairValue: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Monthly Rent</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={brrrrInputs.monthlyRent}
                    onChange={(e) => setBrrrrInputs({ ...brrrrInputs, monthlyRent: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  />
                </div>
              </div>
              {showDetails && (
                <>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Holding Costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>$</span>
                      <input
                        type="number"
                        value={brrrrInputs.holdingCosts}
                        onChange={(e) => setBrrrrInputs({ ...brrrrInputs, holdingCosts: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Refi LTV (%)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>%</span>
                      <input
                        type="number"
                        value={brrrrInputs.refiLtv}
                        onChange={(e) => setBrrrrInputs({ ...brrrrInputs, refiLtv: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Refi Interest Rate (%)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-secondary)' }}>%</span>
                      <input
                        type="number"
                        step="0.125"
                        value={brrrrInputs.refiInterestRate}
                        onChange={(e) => setBrrrrInputs({ ...brrrrInputs, refiInterestRate: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderColor: 'var(--t-border)', borderWidth: '1px', borderTop: '1px solid' }}>
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-text)' }}
            >
              <Save size={16} />
              {editingScenario ? 'Update Scenario' : 'Save Scenario'}
            </button>
            <button
              onClick={() => {
                // Reset to defaults
                if (activeCalculator === 'wholesale') {
                  setWholesaleInputs({
                    arv: 250000,
                    repairs: 30000,
                    desiredProfit: 15000,
                    holdingCosts: 3000,
                    closingCosts: 5000,
                  });
                }
                if (activeCalculator === 'fixnflip') {
                  setFlipInputs({
                    purchasePrice: 200000,
                    renovationCosts: 40000,
                    holdingCosts: 8000,
                    closingCosts: 12000,
                    arv: 320000,
                    sellingCosts: 19200,
                  });
                }
                if (activeCalculator === 'rental') {
                  setRentalInputs({
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
                }
                if (activeCalculator === 'brrrr') {
                  setBrrrrInputs({
                    purchasePrice: 150000,
                    renovationCosts: 35000,
                    holdingCosts: 5000,
                    afterRepairValue: 250000,
                    refiLtv: 75,
                    refiInterestRate: 6.75,
                    monthlyRent: 2000,
                  });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--t-surface-hover)', color: 'var(--t-text)' }}
            >
              <RefreshCw size={16} />
              Reset
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderWidth: '1px' }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
            <PieChart style={{ color: 'var(--t-success)' }} />
            Results
          </h2>

          {activeCalculator === 'wholesale' && (
            <div className="space-y-6">
              <div className="rounded-xl p-6" style={{ background: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.1), var(--t-surface))', borderColor: 'var(--t-primary)', borderWidth: '1px' }}>
                <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>Maximum Offer Price</p>
                <p className="text-4xl font-bold mt-1" style={{ color: 'var(--t-text)' }}>${wholesaleResult.maxOffer}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--t-text-muted)' }}>Based on ARV - Repairs - Profit - Costs</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>ARV</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-text)' }}>${wholesaleResult.arv}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Repairs</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-text)' }}>${wholesaleResult.repairs}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Target Profit</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-text)' }}>${wholesaleResult.profit}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>ROI</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-success)' }}>{wholesaleResult.roi}%</p>
                </div>
              </div>
            </div>
          )}

          {activeCalculator === 'fixnflip' && (
            <div className="space-y-6">
              <div className="rounded-xl p-6" style={{ background: 'linear-gradient(to bottom right, rgba(16, 185, 129, 0.1), var(--t-surface))', borderColor: 'var(--t-success)', borderWidth: '1px' }}>
                <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>Net Profit</p>
                <p className="text-4xl font-bold mt-1" style={{ color: 'var(--t-text)' }}>${flipResult.netProfit}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--t-text-muted)' }}>ARV - Total Investment - Selling Costs</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Total Investment</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-text)' }}>${flipResult.totalInvestment}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>ARV</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-text)' }}>${flipResult.arv}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>ROI</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-success)' }}>{flipResult.roi}%</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Cash-on-Cash</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-warning)' }}>{flipResult.cashOnCash}%</p>
                </div>
              </div>
            </div>
          )}

          {activeCalculator === 'rental' && (
            <div className="space-y-6">
              <div className="rounded-xl p-6" style={{ background: 'linear-gradient(to bottom right, rgba(139, 92, 246, 0.1), var(--t-surface))', borderColor: 'var(--t-accent)', borderWidth: '1px' }}>
                <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>Monthly Cash Flow</p>
                <p className="text-4xl font-bold mt-1" style={{ color: 'var(--t-text)' }}>${rentalResult.monthlyCashFlow}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--t-text-muted)' }}>Rent - Mortgage - Expenses</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Annual Cash Flow</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-text)' }}>${rentalResult.annualCashFlow}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Mortgage Payment</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-text)' }}>${rentalResult.mortgagePayment}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>CoC ROI</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-success)' }}>{rentalResult.cashOnCashROI}%</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Cap Rate</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-warning)' }}>{rentalResult.capRate}%</p>
                </div>
              </div>
            </div>
          )}

          {activeCalculator === 'brrrr' && (
            <div className="space-y-6">
              <div className="rounded-xl p-6" style={{ background: 'linear-gradient(to bottom right, rgba(245, 158, 11, 0.1), var(--t-surface))', borderColor: 'var(--t-warning)', borderWidth: '1px' }}>
                <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>Cash-Out at Refi</p>
                <p className="text-4xl font-bold mt-1" style={{ color: 'var(--t-text)' }}>${brrrrResult.cashOut}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--t-text-muted)' }}>New Loan Amount - Total Investment</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>New Loan</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-text)' }}>${brrrrResult.newLoanAmount}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>New Mortgage</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-text)' }}>${brrrrResult.newMortgagePayment}/mo</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Monthly Cash Flow</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-success)' }}>${brrrrResult.monthlyCashFlow}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--t-surface-hover)' }}>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>CoC ROI</p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--t-warning)' }}>{brrrrResult.cocROI}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save/Edit Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 max-w-md w-full" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderWidth: '1px' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>
                {editingScenario ? 'Edit Scenario' : 'Save Scenario'}
              </h3>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setEditingScenario(null);
                  setScenarioName('');
                  setScenarioNotes('');
                  setSelectedLeadId('');
                }}
                style={{ color: 'var(--t-text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Scenario Name *</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g., Downtown Flip, Rental #1"
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Link to Lead (Optional)</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                >
                  <option value="">No lead linked</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} - {lead.propertyAddress}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-secondary)' }}>Notes</label>
                <textarea
                  value={scenarioNotes}
                  onChange={(e) => setScenarioNotes(e.target.value)}
                  placeholder="Add any notes about this scenario..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg resize-none"
                  style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', color: 'var(--t-text)' }}
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={editingScenario ? handleUpdateScenario : handleSaveScenario}
                  disabled={!scenarioName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-text)' }}
                >
                  {editingScenario ? 'Update' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setEditingScenario(null);
                    setScenarioName('');
                    setScenarioNotes('');
                    setSelectedLeadId('');
                  }}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: 'var(--t-surface-hover)', color: 'var(--t-text)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 max-w-md w-full" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderWidth: '1px' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--t-text)' }}>Delete Scenario</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--t-text-secondary)' }}>
              Are you sure you want to delete this scenario? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  deleteCalculatorScenario(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--t-error)', color: 'var(--t-text)' }}
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--t-surface-hover)', color: 'var(--t-text)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Scenarios */}
      {calculatorScenarios.length > 0 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderWidth: '1px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
              <Download style={{ color: 'var(--t-primary)' }} />
              Saved Scenarios ({calculatorScenarios.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {calculatorScenarios.map((scenario) => {
              const linkedLead = leads.find(l => l.id === scenario.leadId);
              return (
                <div key={scenario.id} className="rounded-xl p-4 transition-all group" style={{ backgroundColor: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', borderWidth: '1px', cursor: 'pointer' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}>
                        {scenario.type === 'wholesale' ? 'Wholesale' :
                         scenario.type === 'fixnflip' ? 'Fix & Flip' :
                         scenario.type === 'rental' ? 'Rental' : 'BRRRR'}
                      </span>
                      {linkedLead && (
                        <span className="ml-2 text-xs inline-flex items-center gap-1" style={{ color: 'var(--t-accent)' }}>
                          <Link2 size={10} />
                          {linkedLead.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditScenario(scenario)}
                        className="p-1 transition-colors"
                        style={{ color: 'var(--t-text-secondary)' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(scenario.id)}
                        className="p-1 transition-colors"
                        style={{ color: 'var(--t-text-secondary)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--t-text)' }}>{scenario.name}</p>
                  <p className="text-xs mb-2" style={{ color: 'var(--t-text-secondary)' }}>
                    {new Date(scenario.lastModified).toLocaleDateString()}
                  </p>
                  {scenario.type === 'wholesale' && (
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>Max Offer: ${scenario.results.maxOffer}</p>
                      <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>ARV: ${scenario.results.arv} | ROI: {scenario.results.roi}%</p>
                    </div>
                  )}
                  {scenario.type === 'fixnflip' && (
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>Profit: ${scenario.results.netProfit}</p>
                      <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>ROI: {scenario.results.roi}% | CoC: {scenario.results.cashOnCash}%</p>
                    </div>
                  )}
                  {scenario.type === 'rental' && (
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>Monthly: ${scenario.results.monthlyCashFlow}</p>
                      <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>CoC: {scenario.results.cashOnCashROI}% | Cap: {scenario.results.capRate}%</p>
                    </div>
                  )}
                  {scenario.type === 'brrrr' && (
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>Cash Out: ${scenario.results.cashOut}</p>
                      <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Monthly: ${scenario.results.monthlyCashFlow} | ROI: {scenario.results.cocROI}%</p>
                    </div>
                  )}
                  {scenario.notes && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--t-text-muted)' }}>{scenario.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
