import type { PromptParamMessage, PromptParams } from '../../types';
import { getClient, ResponseType } from '@tauri-apps/api/http';
import { ollamaService } from './ollama.service';
import { parseChatResponseStream } from '../helpers';
import { WebSearchAgent } from '../agents/websearch.agent';
import type { AgentConstructorParams, AgentInterface, AgentResponse } from '../agents/types';
import { pushMessage } from '../../stores/app.store';

export async function search({ term }: { term: string}): Promise<any> {
  console.log('@search...', term);
  if (!term) return;
  const client = await getClient();
  const q = term?.replace(/\s+/g, '+')?.trim();
  const searchUrl = `https://html.duckduckgo.com/html/?q=${q}&df=d&ia=web`;
  const searchUrlMain = `https://duckduckgo.com/?q=${q}&df=d&ia=web`;
  
  const response = await client.get(searchUrl, {
    responseType: ResponseType.Text,
    headers: {
      referer: 'https//html.duckduckgo.com/html/',
      'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`
    }
  });
  const parser = new DOMParser()
  const dom = parser.parseFromString(response.data as string, 'text/html');
  const links: Record<string, any> = {};
  const raw = [...dom.querySelectorAll('#links .result')].map(a => {
    const anchor = a.querySelector('.result__a') as HTMLAnchorElement;
    links.push({
      url: anchor.href,
      text: anchor.innerText
    });
    return (a as HTMLElement).innerText.replace(/((\s){2,})+/g, '$2');
  }).join('');
  console.log(raw)
  return {links, raw};
}

function toolRequiredForResponse(messages: PromptParamMessage[]): any {
  const messageIndex = messages.findLastIndex((m: PromptParamMessage) => m.role === 'user');
  if (messageIndex < 0) throw new Error('No user message found');
  const content = messages[messageIndex].content;
  const matches = content.trim().match(/^\/([a-z]+)/i);
  //matches.
  return
}

const tools = [
  {
    name: 'websearch',
    description: 'finds information by querying DuckDuckGo and returns the top results',
    useWhen: ['request is for information beyond the scope of the training data','user wants more detailed research into a subject'],
  }
];
const toolsIndex: Record<string, number> = {};
tools.forEach((t, i) => toolsIndex[t.name] = i);

interface Agent {
  handlePrompt(prompt: string): Promise<string>;
}

type RetrievalServiceParams = {
  model: string;
  params: Partial<PromptParams>;
  updater?: (text: string) => void;
}

export class RetrievalService {
  private model: string = 'llama3:latest';
  private params: Partial<PromptParams>;
  private updater?: ((text: string) => void);
  private queryAttempts = 3;
  private timeoutSeconds = 30;

  constructor({model, params, updater}: RetrievalServiceParams) {
    this.model = model;
    this.params = params;
    this.updater = updater;
  }

  async handlePrompt(messages: PromptParamMessage[]): Promise<string> {
    let attempts = 0;
    let answered = false;
    let content = '';
    let start = Date.now();

    while (!answered && attempts < this.queryAttempts) {
      if (Date.now() - start >= this.timeoutSeconds * 1000) {
        throw new Error(`Timeout exceeded (${this.timeoutSeconds} seconds)`);
      }

      console.log(`:::::::::::: @attempt ${attempts + 1}:`, content);
      // Evaluate prompt to determine if tool is required
      const toolRequired = toolRequiredForResponse(messages);
      console.log(`@attempt ${attempts + 1}:`, {toolRequired});
      if (toolRequired) {
        // Select a tool and invoke it
        const toolResponse = await this.invokeTool(messages, toolRequired);
        // Enrich the original prompt with the tool response
        const enrichedMessages = await this.enrichPrompt(messages, toolResponse);
        console.log('@handlePrompt enrichedMessages', enrichedMessages)
        // Send the enriched prompt to the main agent for response generation
        content = await this.generateResponse(enrichedMessages, this.params, true);
      } else {
        // No tool required, send the original prompt as is
        content = await this.generateResponse(messages, this.params, true);
      }
      console.log(`@attempt ${attempts + 1} content:`, content);
      
      const analysis = await this.analyseExchange([...messages.slice(-1), {role: 'assistant', content}]);
      console.log(`@attempt ${attempts + 1}:`, {analysis});
      if (analysis.answered) break;
      
      attempts++;
    }

    console.log('returning content...');

    return content;
  }

  private async analyseExchange(messages: PromptParamMessage[]) {
    pushMessage({message: 'Sanity check...', title: ''})
    console.debug('Beginning self critique...');
    const systemPrompt = `
    Evaluate the response of the assistant; determine if the response adequately answers the user's question.
    Provide a verdict of true or false, responding with a simple JSON object with the following format:
    {"answered": boolean, "reason": "a single sentence explaining why the this verdict was given"}    
    `;
    const result =  await ollamaService.sendPrompt({
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
          Did the assistant's response adequately answer or address the user's question?
          Provide a verdict of true or false, responding with a simple JSON object with the following format:
    {"answered": boolean, "reason": "a single sentence explaining why the this verdict was given"}
          Do not include any other commentary or output, just return the JSON.`
        }
      ],
      options: {
        temperature: 0.1
      },
    });
    console.debug('Finishing self critique...');
    try {
      const json = await this.getResultText(result);
      console.log('@analyseExchange', {json});
      return JSON.parse(json);
    }
    catch(err: any) {
      console.error('@analyseExchange err:', err);
      return {error: err.message};
    } 
  }

  private async evaluateRetrievedData(messages: PromptParamMessage[], data: string) {
    pushMessage({
      title:'',
      message: 'Evaluating data...'
    });
    console.debug('@evaluateRetrievedData started...');
    const systemPrompt = `
    Based on the conversation, does the data provided contain information to help answer the user's question?
    Provide a verdict of true or false, responding with a simple JSON object with the following format:
    {"usable": boolean, "reason": "a single sentence explaining why the this verdict was given"}    
    `;
    const result = await ollamaService.sendPrompt({
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
          Based on the conversation, does the data provided contain information to help answer the question above?
    Provide a verdict of true or false, responding with a simple JSON object with the following format:
    {"usable": boolean, "reason": "a single sentence explaining why the this verdict was given"}`
        },
        {
          role: 'user',
          content: `This is the data:\n${data}`
        } 
      ],
      options: {
        temperature: 0.1
      },
    });
    console.debug('@evaluateRetrievedData finishing...');
    try {
      const json = await this.getResultText(result);
      console.log('@evaluateRetrievedData', {json});
      return JSON.parse(json);
    }
    catch(err: any) {
      console.error('@evaluateRetrievedData err:', err);
      return {error: err.message};
    } 
  }

  private async invokeTool(messages: PromptParamMessage[], toolRequired: string): Promise<AgentResponse> {
    console.log('@invokeTool', toolRequired);
    const tools: Record<string, any> = {
      'websearch': WebSearchAgent
    }
    // Select and invoke a tool based on the prompt's requirements
    if (!tools[toolRequired]) throw new Error(`Invalid tool selection: ${toolRequired}`);
    const params: AgentConstructorParams = {
      model: this.model,
      messages,
      pushMessage,
      getResultText: this.getResultText.bind(this),
      evaluateRetrievedData: this.evaluateRetrievedData.bind(this)
    };
    const tool: AgentInterface = new tools[toolRequired](params);
    const toolResponse = await tool.run();
    if (tool.error) {
      throw tool.error;
    }

    // Return the tool response
    console.log('@invokeTool response', toolResponse);
    return toolResponse
  }

  private async enrichPrompt(messages: PromptParamMessage[], toolResponse: AgentResponse): Promise<PromptParamMessage[]> {
    pushMessage({
      title: '',
      message: 'Getting answer from data...'
    });
    console.debug('@enrichPrompt', {messages, toolResponse});
    // Use the tool response to enrich the original prompt
    // Return the enriched prompt
    const updatedMessages = [...messages];
    const lastUserMessageIndex = messages.findLastIndex(m => m.role === 'user');
    const lastUserMessageText = updatedMessages[lastUserMessageIndex].content;
    const updatedContent = 
`${lastUserMessageText}
Potentially relevant data:
Current date and time: ${new Date().toString()}
Retrieved data: ${toolResponse.data}`;
    
    updatedMessages[lastUserMessageIndex].content = updatedContent;
    return updatedMessages;
  }

  private async generateResponse(messages: PromptParamMessage[], params?: Partial<PromptParams>, useUpdater?: boolean): Promise<string> {
    pushMessage({title:'', message: 'Answering based on data...'});
    // Generate a response to the prompt using the main agent's logic
    // Return the response
    const result =  await ollamaService.sendPrompt({
      ...(params || {}),
      model: this.model,
      messages,
    });
    return this.getResultText(result, useUpdater);
  }

  private async getResultText(result: any, useUpdater = false) {
    if (!result) throw new Error('Result is empty!');
    const updater = useUpdater && this.updater ? this.updater : undefined;
    const parsed = await parseChatResponseStream(result, updater);
    console.log({parsed});
    const { text } = parsed;
    console.log({text, parsed});
    return text;
  }
}

//export { ConversationHandler };