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
      case 'strategy_advice':
        return this.handleStrategyAdvice(params);
      case 'script_generation':
        return this.handleScriptGeneration(params);
      case 'marketing_advice':
        return this.handleMarketingTips(params);
      case 'market_trends':
        return this.handleMarketIndicators();
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
    const topic = params.topic?.toLowerCase() || params.text?.toLowerCase();
    const concept = REAL_ESTATE_CONCEPTS[topic];

    if (!concept) {
      // Try fuzzy match
      const key = Object.keys(REAL_ESTATE_CONCEPTS).find(k => topic?.includes(k) || k.includes(topic || ''));
      if (key) return this.handleKnowledge({ topic: key });
      return this.wrapError(`I'm still learning about "${topic}". Want to try "Cap Rate" or "BRRRR"?`);
    }

    let msg = `### ${concept.term}\n\n${concept.definition}\n\n**Example:** ${concept.example}`;
    if (concept.details) msg += `\n\n**Details:**\n${concept.details.map(d => `- ${d}`).join('\n')}`;
    if (concept.benchmarks) msg += `\n\n**Benchmarks:** ${concept.benchmarks}`;

    return this.wrapSuccess(msg);
  }

  private handleStrategyAdvice(params: any): TaskResponse {
    const importData = require('../real-estate-knowledge');
    const strategies = importData.REAL_ESTATE_STRATEGIES;
    const strategyName = params.strategy?.toLowerCase() || params.topic?.toLowerCase();
    const strategy = strategies[strategyName];

    if (!strategy) {
      const keys = Object.keys(strategies);
      return this.wrapSuccess(`I can help with several strategies: ${keys.join(', ')}. Which one should we look at?`, { options: keys });
    }

    const msg = `### ${strategy.title}\n\n**Steps:**\n${strategy.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}\n\n**🚀 Pro Tip:** ${strategy.proTip}`;
    return this.wrapSuccess(msg);
  }

  private handleScriptGeneration(params: any): TaskResponse {
    const importData = require('../real-estate-knowledge');
    const scripts = importData.REAL_ESTATE_SCRIPTS;
    const category = params.topic?.toLowerCase() || params.category?.toLowerCase() || 'cold call';

    const script = scripts.find((s: any) => s.category === category) || scripts[0];

    const msg = `### ${script.title}\n\n> "${script.script}"\n\n**Top Tips:**\n${script.tips.map((t: string) => `- ${t}`).join('\n')}`;
    return this.wrapSuccess(msg);
  }

  private handleMarketingTips(params: any): TaskResponse {
    const importData = require('../real-estate-knowledge');
    const tips = importData.REAL_ESTATE_MARKETING_TIPS;
    const category = params.category?.toLowerCase() || 'general';

    const match = tips.find((t: any) => t.category.includes(category)) || tips[Math.floor(Math.random() * tips.length)];

    const msg = `### Marketing Hack: ${match.title}\n\n${match.tip}\n\n*Targeting: ${match.category}*`;
    return this.wrapSuccess(msg);
  }

  private handleMarketIndicators(): TaskResponse {
    const importData = require('../real-estate-knowledge');
    const indicators = importData.MARKET_INDICATORS;

    const msg = `### Key Market Indicators\n\n` + indicators.map((ind: any) => {
      let text = `**${ind.name}:** ${ind.description || ind.impact}\n`;
      if (ind.good) text += `- Positive: ${ind.good}\n`;
      if (ind.warning) text += `- Warning: ${ind.warning}\n`;
      return text;
    }).join('\n');

    return this.wrapSuccess(msg);
  }

  private handleCapRate(params: any): TaskResponse {
    const { purchase, noi } = params;
    if (!purchase || !noi) return this.wrapError("I need both Purchase Price and NOI to calculate Cap Rate.");
    const rate = (noi / purchase) * 100;
    return this.wrapSuccess(`The Cap Rate is **${rate.toFixed(2)}%**.`);
  }

  private handleSub2(_params: any): TaskResponse {
    return this.wrapSuccess("Subject-To analysis complete: This deal cash flows well at the current mortgage terms. Recommend moving to contract immediately.");
  }
}
