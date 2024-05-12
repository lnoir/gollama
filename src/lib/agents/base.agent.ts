import type { AgentConstructorParams, AgentInterface, AgentResponse, EvaluateRetrievedData, GetResultTextFn, PushMessageFn } from './types';
import type { AppLevelType, AppMessageOptions, PromptParamMessage, PromptParams } from '../../types';

export class BaseAgent implements AgentInterface {

  protected name: string = 'Agent';
  protected messages: PromptParamMessage[] = [];
  protected pushMessage: PushMessageFn;
  protected getResultText: GetResultTextFn;
  protected evaluateRetrievedData: EvaluateRetrievedData;
  protected defaultPromptOptions: PromptParams;

  public hasError = false;
  public error: any;

  constructor(data: AgentConstructorParams) {
    const { model, messages, pushMessage, getResultText, evaluateRetrievedData: evaluateRetreievedData } = data;
    this.messages = messages.slice(-1); // we only need the user prompt
    this.pushMessage = pushMessage;
    this.getResultText = getResultText;
    this.evaluateRetrievedData = evaluateRetreievedData;
    this.defaultPromptOptions = {
      model,
      format: 'json', 
      options: {
        temperature: 0.1
      },
      messages: []
    }
  }

  async run(): Promise<AgentResponse> {
    return {error: 'Not implemented'}
  }

  notify({message, level}: {message: string, level?: AppLevelType}) {
    const opts: AppMessageOptions = {
      title: `WebSearch`,
      message,
      level: level || 'info'
    }
    this.pushMessage(opts);
  }
}