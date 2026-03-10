import { useState } from 'react';
import { 
  Home, TrendingUp, DollarSign, PieChart, 
  RefreshCw, Save, ChevronDown, ChevronUp, Download
} from 'lucide-react';

type CalculatorType = 'wholesale' | 'fixnflip' | 'rental' | 'brrrr';

export function Calculators() {
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('wholesale');
  const [showDetails, setShowDetails] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);

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
    sellingCosts: 19200, // 6% of ARV
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
    propertyManagement: 8, // percent
    vacancyRate: 5, // percent
  });

  const [brrrrInputs, setBrrrrInputs] = useState({
    purchasePrice: 150000,
    renovationCosts: 35000,
    holdingCosts: 5000,
    afterRepairValue: 250000,
    refiLtv: 75, // percent
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
    const cashOnCash = (netProfit / (purchasePrice * 0.2)) * 100; // Assuming 20% down
    
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
    
    // Monthly mortgage payment
    const mortgagePayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    // Monthly expenses
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
    
    // New mortgage payment after refi
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

  const saveScenario = () => {
    const scenario = {
      id: Date.now(),
      type: activeCalculator,
      date: new Date().toISOString(),
      inputs: activeCalculator === 'wholesale' ? wholesaleInputs :
              activeCalculator === 'fixnflip' ? flipInputs :
              activeCalculator === 'rental' ? rentalInputs :
              brrrrInputs,
      results: activeCalculator === 'wholesale' ? wholesaleResult :
               activeCalculator === 'fixnflip' ? flipResult :
               activeCalculator === 'rental' ? rentalResult :
               brrrrResult,
    };
    setSavedScenarios([scenario, ...savedScenarios.slice(0, 9)]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Real Estate Calculators</h1>
        <p className="text-slate-400 text-sm mt-1">
          Analyze deals, project profits, and make data-driven decisions
        </p>
      </div>

      {/* Calculator Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'wholesale', label: 'Wholesale Deal', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/15' },
          { id: 'fixnflip', label: 'Fix & Flip', icon: Home, color: 'text-green-400', bg: 'bg-green-500/15' },
          { id: 'rental', label: 'Rental Property', icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/15' },
          { id: 'brrrr', label: 'BRRRR Method', icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/15' },
        ].map(calc => (
          <button
            key={calc.id}
            onClick={() => setActiveCalculator(calc.id as CalculatorType)}
            className={`p-4 rounded-xl border transition-all ${
              activeCalculator === calc.id 
                ? `${calc.bg} ${calc.color} border-${calc.color.split('-')[1]}-500/50 ring-2 ring-${calc.color.split('-')[1]}-500/20` 
                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <calc.icon size={24} className={activeCalculator === calc.id ? calc.color : 'text-slate-400'} />
            <p className="text-sm font-medium mt-2">{calc.label}</p>
          </button>
        ))}
      </div>

      {/* Main Calculator Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {activeCalculator === 'wholesale' && <><TrendingUp className="text-blue-400" /> Wholesale Deal Inputs</>}
              {activeCalculator === 'fixnflip' && <><Home className="text-green-400" /> Fix & Flip Inputs</>}
              {activeCalculator === 'rental' && <><DollarSign className="text-purple-400" /> Rental Property Inputs</>}
              {activeCalculator === 'brrrr' && <><RefreshCw className="text-amber-400" /> BRRRR Method Inputs</>}
            </h2>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {/* Wholesale Calculator Inputs */}
          {activeCalculator === 'wholesale' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">After Repair Value (ARV)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={wholesaleInputs.arv}
                    onChange={(e) => setWholesaleInputs({ ...wholesaleInputs, arv: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Repair Costs</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={wholesaleInputs.repairs}
                    onChange={(e) => setWholesaleInputs({ ...wholesaleInputs, repairs: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Desired Profit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={wholesaleInputs.desiredProfit}
                    onChange={(e) => setWholesaleInputs({ ...wholesaleInputs, desiredProfit: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              {showDetails && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Holding Costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={wholesaleInputs.holdingCosts}
                        onChange={(e) => setWholesaleInputs({ ...wholesaleInputs, holdingCosts: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Closing Costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={wholesaleInputs.closingCosts}
                        onChange={(e) => setWholesaleInputs({ ...wholesaleInputs, closingCosts: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
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
                <label className="text-xs text-slate-400 mb-1.5 block">Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={flipInputs.purchasePrice}
                    onChange={(e) => setFlipInputs({ ...flipInputs, purchasePrice: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Renovation Costs</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={flipInputs.renovationCosts}
                    onChange={(e) => setFlipInputs({ ...flipInputs, renovationCosts: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">After Repair Value (ARV)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={flipInputs.arv}
                    onChange={(e) => setFlipInputs({ ...flipInputs, arv: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              {showDetails && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Holding Costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={flipInputs.holdingCosts}
                        onChange={(e) => setFlipInputs({ ...flipInputs, holdingCosts: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Closing Costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={flipInputs.closingCosts}
                        onChange={(e) => setFlipInputs({ ...flipInputs, closingCosts: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Selling Costs (%)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      <input
                        type="number"
                        value={(flipInputs.sellingCosts / flipInputs.arv * 100).toFixed(1)}
                        onChange={(e) => setFlipInputs({ ...flipInputs, sellingCosts: (Number(e.target.value) / 100) * flipInputs.arv })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
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
                <label className="text-xs text-slate-400 mb-1.5 block">Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={rentalInputs.purchasePrice}
                    onChange={(e) => setRentalInputs({ ...rentalInputs, purchasePrice: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Down Payment (%)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                  <input
                    type="number"
                    value={rentalInputs.downPaymentPercent}
                    onChange={(e) => setRentalInputs({ ...rentalInputs, downPaymentPercent: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Interest Rate (%)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                  <input
                    type="number"
                    step="0.125"
                    value={rentalInputs.interestRate}
                    onChange={(e) => setRentalInputs({ ...rentalInputs, interestRate: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Monthly Rent</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={rentalInputs.monthlyRent}
                    onChange={(e) => setRentalInputs({ ...rentalInputs, monthlyRent: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              {showDetails && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Annual Property Taxes</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={rentalInputs.propertyTaxes}
                        onChange={(e) => setRentalInputs({ ...rentalInputs, propertyTaxes: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Annual Insurance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={rentalInputs.insurance}
                        onChange={(e) => setRentalInputs({ ...rentalInputs, insurance: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Annual Maintenance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={rentalInputs.maintenance}
                        onChange={(e) => setRentalInputs({ ...rentalInputs, maintenance: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Property Management (%)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      <input
                        type="number"
                        value={rentalInputs.propertyManagement}
                        onChange={(e) => setRentalInputs({ ...rentalInputs, propertyManagement: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Vacancy Rate (%)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      <input
                        type="number"
                        value={rentalInputs.vacancyRate}
                        onChange={(e) => setRentalInputs({ ...rentalInputs, vacancyRate: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
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
                <label className="text-xs text-slate-400 mb-1.5 block">Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={brrrrInputs.purchasePrice}
                    onChange={(e) => setBrrrrInputs({ ...brrrrInputs, purchasePrice: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Renovation Costs</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={brrrrInputs.renovationCosts}
                    onChange={(e) => setBrrrrInputs({ ...brrrrInputs, renovationCosts: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">After Repair Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={brrrrInputs.afterRepairValue}
                    onChange={(e) => setBrrrrInputs({ ...brrrrInputs, afterRepairValue: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Monthly Rent</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={brrrrInputs.monthlyRent}
                    onChange={(e) => setBrrrrInputs({ ...brrrrInputs, monthlyRent: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              {showDetails && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Holding Costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={brrrrInputs.holdingCosts}
                        onChange={(e) => setBrrrrInputs({ ...brrrrInputs, holdingCosts: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Refi LTV (%)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      <input
                        type="number"
                        value={brrrrInputs.refiLtv}
                        onChange={(e) => setBrrrrInputs({ ...brrrrInputs, refiLtv: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Refi Interest Rate (%)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      <input
                        type="number"
                        step="0.125"
                        value={brrrrInputs.refiInterestRate}
                        onChange={(e) => setBrrrrInputs({ ...brrrrInputs, refiInterestRate: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={saveScenario}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Save size={16} />
              Save Scenario
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
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw size={16} />
              Reset
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="text-green-400" />
            Results
          </h2>

          {activeCalculator === 'wholesale' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 rounded-xl p-6 border border-blue-500/30">
                <p className="text-sm text-slate-400 mb-1">Maximum Offer Price</p>
                <p className="text-4xl font-bold text-white">${wholesaleResult.maxOffer}</p>
                <p className="text-xs text-slate-500 mt-2">Based on ARV - Repairs - Profit - Costs</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">ARV</p>
                  <p className="text-lg font-semibold text-white">${wholesaleResult.arv}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">Repairs</p>
                  <p className="text-lg font-semibold text-white">${wholesaleResult.repairs}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">Target Profit</p>
                  <p className="text-lg font-semibold text-white">${wholesaleResult.profit}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">ROI</p>
                  <p className="text-lg font-semibold text-green-400">{wholesaleResult.roi}%</p>
                </div>
              </div>
            </div>
          )}

          {activeCalculator === 'fixnflip' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-900/30 to-slate-900 rounded-xl p-6 border border-green-500/30">
                <p className="text-sm text-slate-400 mb-1">Net Profit</p>
                <p className="text-4xl font-bold text-white">${flipResult.netProfit}</p>
                <p className="text-xs text-slate-500 mt-2">ARV - Total Investment - Selling Costs</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">Total Investment</p>
                  <p className="text-lg font-semibold text-white">${flipResult.totalInvestment}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">ARV</p>
                  <p className="text-lg font-semibold text-white">${flipResult.arv}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">ROI</p>
                  <p className="text-lg font-semibold text-green-400">{flipResult.roi}%</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">Cash-on-Cash</p>
                  <p className="text-lg font-semibold text-amber-400">{flipResult.cashOnCash}%</p>
                </div>
              </div>
            </div>
          )}

          {activeCalculator === 'rental' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 rounded-xl p-6 border border-purple-500/30">
                <p className="text-sm text-slate-400 mb-1">Monthly Cash Flow</p>
                <p className="text-4xl font-bold text-white">${rentalResult.monthlyCashFlow}</p>
                <p className="text-xs text-slate-500 mt-2">Rent - Mortgage - Expenses</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">Annual Cash Flow</p>
                  <p className="text-lg font-semibold text-white">${rentalResult.annualCashFlow}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">Mortgage Payment</p>
                  <p className="text-lg font-semibold text-white">${rentalResult.mortgagePayment}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">CoC ROI</p>
                  <p className="text-lg font-semibold text-green-400">{rentalResult.cashOnCashROI}%</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">Cap Rate</p>
                  <p className="text-lg font-semibold text-amber-400">{rentalResult.capRate}%</p>
                </div>
              </div>
            </div>
          )}

          {activeCalculator === 'brrrr' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-amber-900/30 to-slate-900 rounded-xl p-6 border border-amber-500/30">
                <p className="text-sm text-slate-400 mb-1">Cash-Out at Refi</p>
                <p className="text-4xl font-bold text-white">${brrrrResult.cashOut}</p>
                <p className="text-xs text-slate-500 mt-2">New Loan Amount - Total Investment</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">New Loan</p>
                  <p className="text-lg font-semibold text-white">${brrrrResult.newLoanAmount}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">New Mortgage</p>
                  <p className="text-lg font-semibold text-white">${brrrrResult.newMortgagePayment}/mo</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">Monthly Cash Flow</p>
                  <p className="text-lg font-semibold text-green-400">${brrrrResult.monthlyCashFlow}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400">CoC ROI</p>
                  <p className="text-lg font-semibold text-amber-400">{brrrrResult.cocROI}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved Scenarios */}
      {savedScenarios.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Download className="text-blue-400" />
            Saved Scenarios
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedScenarios.map((scenario) => (
              <div key={scenario.id} className="bg-slate-800 rounded-xl p-4 hover:border-slate-600 border border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                    {scenario.type === 'wholesale' ? 'Wholesale' :
                     scenario.type === 'fixnflip' ? 'Fix & Flip' :
                     scenario.type === 'rental' ? 'Rental' : 'BRRRR'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(scenario.date).toLocaleDateString()}
                  </span>
                </div>
                {scenario.type === 'wholesale' && (
                  <div>
                    <p className="text-sm text-white font-medium">Max Offer: ${scenario.results.maxOffer}</p>
                    <p className="text-xs text-slate-400">ARV: ${scenario.results.arv} | ROI: {scenario.results.roi}%</p>
                  </div>
                )}
                {scenario.type === 'fixnflip' && (
                  <div>
                    <p className="text-sm text-white font-medium">Profit: ${scenario.results.netProfit}</p>
                    <p className="text-xs text-slate-400">ROI: {scenario.results.roi}% | CoC: {scenario.results.cashOnCash}%</p>
                  </div>
                )}
                {scenario.type === 'rental' && (
                  <div>
                    <p className="text-sm text-white font-medium">Monthly: ${scenario.results.monthlyCashFlow}</p>
                    <p className="text-xs text-slate-400">CoC: {scenario.results.cashOnCashROI}% | Cap: {scenario.results.capRate}%</p>
                  </div>
                )}
                {scenario.type === 'brrrr' && (
                  <div>
                    <p className="text-sm text-white font-medium">Cash Out: ${scenario.results.cashOut}</p>
                    <p className="text-xs text-slate-400">Monthly: ${scenario.results.monthlyCashFlow} | ROI: {scenario.results.cocROI}%</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}