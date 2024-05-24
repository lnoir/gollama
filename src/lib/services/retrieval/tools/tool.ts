import type { PromptParams } from '../../../../types';

export interface ToolConfigureParams {
  originalData: PromptParams;
  results: any[];
  getPromptResponse?: (data: PromptParams) => Promise<any>;
  updater?: (data: any) => void;
  [key: string]: any;
}

export abstract class Tool {
  name: string = '';
  description: string = '';
  useWhen: string = '';
  data: any;
  originalData: any;
  getPromptResponse: any;
  
  abstract configure(data: ToolConfigureParams): void;
  
  abstract engage(): any;
  
  abstract disengage(): any;
  
  export() {
    return {...this}
  }
}