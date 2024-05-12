import type { AppMessageOptions, ModelParams, PromptParamMessage, PromptParams } from '../../types';

export type PushMessageFn = (data: AppMessageOptions) => void
export type GetResultTextFn = (result: any) => Promise<string>
export type EvaluateRetrievedData = (messages: PromptParamMessage[], data: string) => Promise<any>

export interface AgentConstructorParams {
  messages: PromptParamMessage[],
  model: string,
  pushMessage: PushMessageFn,
  getResultText: GetResultTextFn,
  evaluateRetrievedData: EvaluateRetrievedData
}

export interface AgentInterface {
  hasError: boolean;
  error?: Error | undefined;

  run(): Promise<any>;
}

export type BaseAgentResponse = {
  [key: string]: any;
}

export type AgentResponse = BaseAgentResponse & (
  { 
    raw: string;
  } | {
    error: string;
  }
)

