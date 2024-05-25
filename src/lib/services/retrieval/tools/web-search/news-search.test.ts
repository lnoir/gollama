import type { PromptParams } from '../../../../../types';
import { NewsSearch } from './news-search';


const defaultPromptParams: PromptParams = {
  model: 'llama3:latest',
  messages: [
    {
      role: 'user',
      content: `What is 1 + 1?`
    },
  ]
}

describe('News Search', () => {
  it ('Should correctly filter unwanted URLs', () => {
    const ns = new NewsSearch();
    const dom = new Document();
    const anchor = dom.createElement('a');
    anchor.href = 'https://www.somefake.site/wp-content/uploads/2024/05/Some-Fake.pdf';
    const parsed = ns.searchTemplate?.parseAndFilterAnchor(anchor);
    expect(parsed).toEqual('');
  });
});