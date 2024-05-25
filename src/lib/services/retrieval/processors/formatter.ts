import { progressNotifications } from '../../../../stores/conversation.store';
import type { PromptParamMessage } from '../../../../types';
import type { Tool } from '../tools/tool';
import { Processor, type ProcessParams } from './processor'

interface FormatterParams {
  tools: Tool[];
  getPromptResponse: (data: any) => Promise<any>;
  updater: (data: any) => Promise<any>;
}

export class Formatter extends Processor {
  tool?: Tool;
  tools: Tool[];

  constructor(params: FormatterParams) {
    super();
    const { tools, getPromptResponse, updater } = params;
    this.tools = tools;
    this.getPromptResponse = getPromptResponse;
    this.updater = updater;
  }

  private enrichPrompt(params: {
    messages: PromptParamMessage[],
    data: any[]
  }): PromptParamMessage[] {
    // Use the tool response to enrich the original prompt
    // Return the enriched prompt
    const { messages, data } = params;
    const updatedMessages = [...messages];
    const lastUserMessageIndex = messages.findLastIndex(m => m.role === 'user');
    const lastUserMessageText = updatedMessages[lastUserMessageIndex].content;
    const updatedContent = 
`${lastUserMessageText}
Potentially relevant data:\n
Actual date and time right now: ${new Date().toString()}
Retrieved sources: [
  ${data.slice(-1).map(d => JSON.stringify(d)).join('\n')}
]
Cite ALL relevant sources, including formatted links. Do not cite sources not present in the data. If there are no sources, do not cite any.`;
    console.log('@updatedContent', updatedContent);
    updatedMessages[lastUserMessageIndex].content = updatedContent;
    return updatedMessages;
  }

  async process(params: ProcessParams) {
    progressNotifications.set([]);
    this.originalData = params.originalData;
    const { messages } = params.originalData;
    const data =  params.results;
    const enriched = this.enrichPrompt({ messages, data });
    const result = await this.getPromptResponse({
      ...this.originalData,
      messages: enriched,
      options: {
        num_ctx: 7168,
        temperature: 0.1,
        top_k: 10,
        top_p: 0.2,
        max_tokens: 4096
      },
      stream: true,
      format: undefined // Don't force JSON
    }, this.updater);
    return result;
  }
}