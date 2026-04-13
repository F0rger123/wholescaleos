export { recognizeIntent, LOCAL_INTENTS, splitMultiIntent } from './intent-engine';
export type { ParsedIntent } from './intent-engine';
export { executeTask } from './task-executor';
export { TrainingManager } from './training-manager';
export type { LocalTrainingRule } from './training-manager';
export { generateResponse, generateUnknownResponse, generateErrorResponse, mergeResponses } from './response-generator';
export { getBotIdentity } from './personality-engine';
