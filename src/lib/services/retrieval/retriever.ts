import { pushMessage } from '../../../stores/app.store';
import type { AppLevelType, AppMessageOptions, PromptParams } from '../../../types';
import { getOllamaResult } from '../../helpers';
import type { PromptHandler } from '../prompt.handler';
import { Formatter } from './processors/formatter';
import type { Processor } from './processors/processor';
import { ToolHandler } from './processors/tool-handler';
import { ToolPicker } from './processors/tool-picker';
import { ChatResponse } from './tools/chat-response';
import { NewsSearch } from './tools/web-search/news-search';
import type { Tool } from './tools/tool';
import { WebSearch } from './tools/web-search/web-search';
import { progressNotifications, type ProgressMessage } from '../../../stores/conversation.store';

export interface EvaluationResult {
  usable: boolean;
  reason: string;
  summary: string;
}

interface RetrieverConstructor {
  updater?: any;
  toolName?: string;
}

export class Retriever implements PromptHandler {
  model = 'llama3:latest';
  tools: Map<string, Tool> = new Map();
  chain: Processor[] = [];
  nextIndex = 0;
  endIndex = 0;
  toolName?: string; // Force a particular tool
  originalData: PromptParams | undefined;
  startTime = 0;
  endTime = 0;
  updater: any;

  constructor({updater, toolName}: RetrieverConstructor) {
    this.updater = updater;
    this.toolName = toolName;
    console.log(this)
  }

  private prepareTools() {
    const chatResponse = new ChatResponse();
    const webSearch = new WebSearch();
    const newsSearch = new NewsSearch();
    this.tools.set(chatResponse.name, chatResponse);
    this.tools.set(webSearch.name, webSearch);
    this.tools.set(newsSearch.name, newsSearch);
  }

  private async getPromptResponse(data: PromptParams) {
    const body = {
      ...data,
      stream: data.stream || false,
      keep_alive: '2m',
    };
    console.log('Retriever.getChatResponse', body.stream, data);
    const res = await fetch('http://localhost:11434/api/chat', {
			method: 'POST',
			body: JSON.stringify(body),
		});
    if (!body.stream) {
      const response = JSON.parse(await res.text());
      if (response.error) throw new Error(response.error);
      const text = response?.message?.content;
      return text;
    }
    return await getOllamaResult(res.body, this.updater);
  }

  private makeChain(): void {
    // Create chain
    // Set start and end index based on chain length
    const tools = [...this.tools.values()];
    this.chain = [
      new ToolPicker({
        tools,
        getPromptResponse: this.getPromptResponse
      }),
      new ToolHandler({
        tools,
        getPromptResponse: this.getPromptResponse,
        updater: this.updater
      }),
      new Formatter({
        tools,
        getPromptResponse: this.getPromptResponse,
        updater: this.updater
      })
    ];
  }
  private async executeChain(data: PromptParams): Promise<any> {
    let results: any[] = [];

    if (this.toolName) {
      results.push({tool: this.toolName});
      ++this.nextIndex; // Skip straight to tool handler
    }

    while (this.nextIndex < this.chain.length) {
      console.log(`In chain: ${this.chain[this.nextIndex].constructor.name}`)
      const result = await this.chain[this.nextIndex].process({
        originalData: data,
        results,
        evaluate: this.evaluate.bind(this),
        notify: this.notify.bind(this),
      });
      if (result.break) {
        console.log('breaking chain', result);
        results.push(result.response);
        break;
      }

      console.log(`@nextData from ${this.chain[this.nextIndex].constructor.name}`, result);
      results.push(result);
      ++this.nextIndex;
    }
    console.log('@executeChain results:', results);
    return results;
  }

  async sendPrompt(data: PromptParams, requestOptions?: any): Promise<any> {
    this.startTime = Date.now();
    let result;
    try {
      console.log('@retriever.sendPrompt', data);
      this.prepareTools();
      this.makeChain();
      result = await this.executeChain(data);
      this.endTime = Date.now();
    }
    catch (err: any) {
      // @TODO: What are we returning again?
      return {error: err.message}
    }
    console.log('Duration: %ds', (this.endTime - this.startTime) / 1000);
    console.log('Results', result);
    return Promise.resolve(result.slice(-1)[0]);
  }

  async evaluate(params: any): Promise<EvaluationResult> {
    const { messages, data } = params;
    const systemPrompt = `
    Based on the conversation, does the data provided contain information to help answer the user's question?
    Provide a verdict of true or false, responding with a simple JSON object with the following format:
    {
      "usable": boolean,
      "reason": "a single sentence explaining why the this verdict was given",
      "summary":"No more than 3 sentences summarising the relevant data"
    }`;

    const result = await this.getPromptResponse({
      model: this.model,
      format: 'json',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages,
        {
          role: 'user',
          content: `
          Based on the conversation, does the data provided contain information to help answer the user message above?
    Provide a verdict of true or false, responding with a simple JSON object with the following format:
    {
      "usable": boolean,
      "reason": "a single sentence explaining why the this verdict was given",
      "summary":"key information to answer user, in no more than 42 words"
    }`
        },
        {
          role: 'user',
          content: `This is the data:\n${data}`
        } 
      ],
      options: {
        temperature: 0.1
      },
      stream: false,
    });
    console.log('@evaluate', result);
    return JSON.parse(result);
  }

  notify({title, source, message, level}: ProgressMessage) {
    console.log('@notify', level, message);
    progressNotifications.update(notifications => {
      const n = {
        id: Number((Math.random() * 100000).toFixed(5)),
        title,
        source,
        message,
        level: level || 'info',
        // Self-removing
        timeout: setTimeout(() =>{
          progressNotifications.update(notes => {
            const nIndex = notes.findIndex(note => note.id === n.id);
            return [...notes].splice(nIndex, 1);
          });
        }, 5000)
      };
      notifications.push(n);
      return notifications
    });
  }

  clearNotifications() {
    progressNotifications.set([]);
  }
}