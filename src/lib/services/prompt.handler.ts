import type { PromptParams } from '../../types';

export interface PromptHandler {
  sendPrompt(data: PromptParams, requestOptions?: any): Promise<any>;
}