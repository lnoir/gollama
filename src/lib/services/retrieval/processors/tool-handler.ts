import type { Tool } from '../tools/tool';
import { Processor } from './processor'

interface ToolHandlerConstructorParams {
  tools: Tool[];
  getPromptResponse: (data: any) => Promise<any>;
  updater?: (data: any) => void;
}

export class ToolHandler extends Processor {
  tool?: Tool;
  tools: Tool[];

  constructor(params: ToolHandlerConstructorParams) {
    super();
    const { tools, getPromptResponse, updater } = params;
    this.tools = tools;
    this.updater = updater;
    this.getPromptResponse = getPromptResponse;
  }

  async process(data: any) {
    console.log('@ToolHandler', data);
    this.originalData = data.originalData;
    const toolData = data.results.slice(-1)[0];
    console.log('@ToolHandler toolData', toolData);
    console.log(this.tools, toolData);
    this.tool = this.tools.find(t => t.name === toolData.tool);
    console.log('@ToolHandler tool', this.tool);
    if (!this.tool) throw new Error(`Unable to find '${toolData.tool}' tool to answer query`);

    // Ensure the tool has all it needs
    this.tool?.configure({
      ...data,
      getPromptResponse: this.getPromptResponse,
      updater: this.updater
    });
    const result = await this.tool?.engage();
    
    return result;
  }
}