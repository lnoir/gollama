import type { PromptParams } from '../../../../types';

export interface ProcessParams {
  originalData: PromptParams;
  results: any[];
  [key: string]: any;
}

export abstract class Processor {
  originalData: any;
  getPromptResponse: any;
  updater: any;

  abstract process(data: any): any;
} 