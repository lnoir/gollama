import type { Tool } from '../tools/tool';
import { Processor, type ProcessParams } from './processor'

interface ToolPickerConstructorParams {
  tools: Tool[];
  getPromptResponse: (data: any) => Promise<any>;
}

export class ToolPicker extends Processor {

  systemPrompt = '';
  tools:Tool[] = [];

  constructor(params: ToolPickerConstructorParams) {
    super();
    const { tools, getPromptResponse } = params;
    this.tools = tools;
    this.getPromptResponse = getPromptResponse;
    this.systemPrompt = `
Your job is to evaluate the user-provided message and determine if you can answer the question directly. You must never actually answer the question or request.
If you have sufficient knowledge to provide an accurate response, return an unformatted, plain JSON object with a single property called  'tool' that contains an empty string ("chat-response").
If you require additional data to provide an accurate response, pick one of the tools in "gollama-tools" that most closely aligns with the user's query and will provide the most accurate response.

Return an unformatted, plain JSON object containing a single property, 'tool' that is populated with the exact name of the tool as defined in the JSON.
If there is no suitable tool, default to: {"tool":"chat-response"}

Bad output example — there is no suitable tool: {"tool": "No suitable tool found"}
Bad output example — there is no suitable tool in "gollama-tools": "No tool was found that can help answer your question"
Bad output example — searching the web is the appropriate action: "You can use the \"search\'" tool"
Bad output example — the 'web-search' tool is suitable because searching the web is the appropriate action: {"tool": "The \"search\'" tool would help in responding to this message"}
Bad output example — if 'web-search' tool is a good fit: {"tool": "search"}
Good output example — if there is no suitable tool in "gollama-tools": {"tool": "chat-response"}
Good output example — if a suitable tool called 'web-search' is among the "gollama-tools": {"tool": "web-search"}
Good output example — if a tool is in "gollama-tools" and its name is 'random' and it is a good fit: {"tool": "random"}
Good output example — if a tool is in "gollama-tools", and it is a good fit, and it has the name 'number-random': {"tool": "number-random"}

Available Tools:
{
  "gollama-tools": ${JSON.stringify(this.tools.map(t => ({name: t.name, description: t.description, useWhen: t.useWhen})), null, 2)}
}
If none of the above tools are suitable, 'tool' should default to 'chat-response'. Always pick a tool most specific to the user query.
ONLY ever return the tool JSON data; include no other output or commentary; do not answer the user query; only output the tool JSON data: {"tool":"tool-name"}.
Do not include tools not listed in the "gollama-tools" JSON.
You MUST ONLY ever respond in this format: {"tool":"tool-name"}
`;
  }

  async process(data: ProcessParams) {
    const promptParams = {
      ...data.originalData,
      stream: false,
      json: true
    };
    promptParams.options = {};
    promptParams.messages = [
      { role: 'system', content: this.systemPrompt },
      ...data.originalData.messages,
      { role: 'user', content: 'Return the tool to use to respond. Only output the unformatted JSON and nothing else.'}
    ];
    console.log('@ToolPicker', promptParams, this.tools);
    const result = await this.getPromptResponse(promptParams);
    console.log('@ToolPicker result...', result)
    return JSON.parse(result);
  }
}