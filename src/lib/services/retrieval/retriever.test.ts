import type { PromptParams } from '../../../types';
import { getOllamaResult } from '../../helpers';
import { Retriever } from './retriever';
import { Document } from '@langchain/core/documents';

const defaultPromptParams: PromptParams= {
  model: 'llama3:latest',
  messages: [
    {
      role: 'user',
      content: `What is 1 + 1?`
    },
  ]
};

const setUpWorker = async () => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url));
  worker.addEventListener('message', event => {
    console.log('@main', event);
  });
  return worker;
}

async function getPromptResponse(data: PromptParams, updater?: any) {
  const body = {
    ...data,
    stream: data.stream || false,
    keep_alive: '2m',
  };
  console.log('getPromptResponse', body.stream, data);
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
  return await getOllamaResult(res.body, updater);
}

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

  describe('Storage', () => {
    it('should store to and retrieve from the vector DB', async () => {
      /*const webSearch = new WebSearch();
      webSearch.configure({
        getPromptResponse,
        notify: () => {},
        onSource: () => {},
        results: [],
        originalData: {
          model: 'phi-3:latest',
          messages: [{
            role: 'user',
            content: 'When is the next full solar eclipse'
          }],
        }
      })*/

      // Get the search results
      
      const searchResults = [
        {
          data: `Clowns look happy but are often sad.`,
          snippet: `Information about clowns`,
          text: `Learn about clowns`,
          url: `https://clown.town`
        }
      ];
      const docs = searchResults.map(r => new Document({
        pageContent: r.data,
        metadata: {
          url: r.url
        }
      }));

      /*
      const added = await store.addDocuments(splitDocs);
      console.log(JSON.stringify(added, null, 2));
      const query = await embeddings.embedQuery('emotional range of clowns');
      const resultsWithScore = await store.similaritySearchVectorWithScore(query, 1);
      console.log(JSON.stringify(resultsWithScore, null, 2));
      expect(resultsWithScore).toBeTruthy();
      */
    });
  });
});