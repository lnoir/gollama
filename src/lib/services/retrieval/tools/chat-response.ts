import { Tool, type ToolConfigureParams } from './tool'

export class ChatResponse extends Tool {
  name = 'chat-response';
  description = 'normal chat response';
  useWhen = 'you have the ability to answer correctly without any further external data';
  updater: any;

  configure(data: ToolConfigureParams) {
    // Setup any necessary data here
    this.getPromptResponse = data.getPromptResponse;
    this.originalData = data.originalData;
    this.updater = data.updater;
  }
  
  async engage() {
    const data = this.originalData;
    data.stream = true;
    data.format = undefined;
    data.keep_alive = '5m';
    console.log(this.originalData);
    const response = await this.getPromptResponse(data, this.updater);
    console.log('@ChatResponse', response);
    return {break: true, response};
  }

  disengage() {
    return ''
  }
}