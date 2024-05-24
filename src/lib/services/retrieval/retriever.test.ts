import type { PromptParams } from '../../../types';
import { Retriever } from './retriever';

const defaultPromptParams: PromptParams= {
  model: 'llama3:latest',
  messages: [
    {
      role: 'user',
      content: `What is 1 + 1?`
    },
  ]
};

describe('Retriever', () => {
  it('should send a prompt and return a response', async () => {
    const r = new Retriever({updater:  () => {}});
    const result = await r.sendPrompt({...defaultPromptParams});
    
    expect(result).toBeTruthy();
  });

  it('should send a prompt and return a response', async () => {
    const r = new Retriever({updater: () => {}});
    const prompt: PromptParams = {
      ...defaultPromptParams,
      messages: [{
        role: 'user',
        content: 'When is the next full solar eclipse'
      }]
    };
    const result = await r.sendPrompt(prompt);
    
    expect(result).toBeTruthy();
  });
});