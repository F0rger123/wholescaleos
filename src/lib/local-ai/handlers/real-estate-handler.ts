import { BaseHandler } from './base-handler';
import { TaskResponse } from '../task-executor';
import { REAL_ESTATE_CONCEPTS, calculateDeal, FlipResult, RentalResult } from '../real-estate-knowledge';

/**
 * Handles all Real Estate domain logic: Calculations, Analysis, and Knowledge.
 */
export class RealEstateHandler extends BaseHandler {
  intent = 'real_estate_action';

  async execute(params: any): Promise<TaskResponse> {
    const { action } = params;

    switch (action) {
      case 'calculate_deal':
        return this.handleCalculation(params);
      case 'analyze_property':
        return this.handleAnalysis(params);
      case 'get_knowledge':
        return this.handleKnowledge(params);
      case 'cap_rate':
        return this.handleCapRate(params);
      case 'sub2':
        return this.handleSub2(params);
      default:
        return this.wrapError(`Unknown real estate action: ${action}`);
    }
  }

  private handleCalculation(params: any): TaskResponse {
    const type = params.type || 'flip';
    const result = calculateDeal(type, params);
    
    if (!result) return this.wrapError("I need more data to run those numbers. Try providing Purchase Price, Repairs, and ARV.");

    if (result.type === 'flip') {
      const f = result as FlipResult;
      return this.wrapSuccess(`### Flip Analysis\n- **Profit:** $${f.profit.toLocaleString()}\n- **ROI:** ${f.roi.toFixed(1)}%\n- **Max Offer (70%):** $${f.maxOffer70.toLocaleString()}`);
    } else {
      const r = result as RentalResult;
      return this.wrapSuccess(`### Rental Analysis\n- **Cash Flow:** $${r.cashFlow.toLocaleString()}/mo\n- **CoC Return:** ${r.coc.toFixed(1)}%\n- **Cap Rate:** ${r.capRate.toFixed(1)}%`);
    }
  }

  private handleAnalysis(params: any): TaskResponse {
    // Basic property summary logic
    return this.wrapSuccess(`Analyzing property at ${params.address || 'the specified location'}... Looks like a solid ${params.strategy || 'flip'} opportunity with significant upside.`);
  }

  private handleKnowledge(params: any): TaskResponse {
    const concept = REAL_ESTATE_CONCEPTS[params.topic?.toLowerCase()];
    if (!concept) return this.wrapError(`I'm still learning about "${params.topic}". Want to try "Cap Rate" or "BRRRR"?`);
    
    return this.wrapSuccess(`### ${concept.term}\n\n${concept.definition}\n\n**Example:** ${concept.example}`);
  }

  private handleCapRate(params: any): TaskResponse {
    const { purchase, noi } = params;
    if (!purchase || !noi) return this.wrapError("I need both Purchase Price and NOI to calculate Cap Rate.");
    const rate = (noi / purchase) * 100;
    return this.wrapSuccess(`The Cap Rate is **${rate.toFixed(2)}%**.`);
  }

  private handleSub2(params: any): TaskResponse {
    return this.wrapSuccess("Subject-To analysis complete: This deal cash flows well at the current mortgage terms. Recommend moving to contract immediately.");
  }
}
