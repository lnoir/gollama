import type { PromptParams } from '../../../../../types';
import { Tool, type ToolConfigureParams } from '../tool'
import { getClient, ResponseType } from '@tauri-apps/api/http';
import type { SearchTemplate } from './search-templates/search-template';
import type { EvaluationResult } from '../../retriever';

interface WebSearchConfigureParams extends ToolConfigureParams {
  getPromptResponse: (data: PromptParams) => Promise<any>;
  notify: (data: any) => void;
  onSource: (data: any) => void
}

interface ResultLink {
  url: string;
  text: string;
  snippet: string;
}

interface WebSearchResult {
  links: ResultLink[],
  raw: string;
  body: string;
}

interface CheckedResult extends ResultLink, EvaluationResult {}

export abstract class AbstractWebSearch extends Tool {
  name = 'web-search';
  description = 'search the web for relevant data';
  useWhen = 'query specifically asks about real-time, current or future data';
  searchEngine = 'DuckDuckGo';
  notify = (data: any) => {} //no-op
  evaluate: any;
  abort: any;
  searchUrlTemplate = `https://html.duckduckgo.com/html/?q={{searchTerm}}`;//&df=d
  maxAttempts = 2;
  maxSources = 3;
  searchTemplate?: SearchTemplate;
  
  configure(data: WebSearchConfigureParams) {
    if (!data.getPromptResponse) throw new Error('WebSearch needs access to prompt LLM!');
    if (!data.originalData) throw new Error('WebSearch missing access to original prompt!')
    
    // Setup any necessary data here
    this.originalData = data.originalData;
    this.getPromptResponse = data.getPromptResponse;
    this.notify = data.notify || this.notify;
    this.evaluate = data.evaluate;
  }
  
  private async getSearchTerm() {
    const systemPrompt = `Your job is to extract and return the keywords that should be used to search the web in order to answer the user's query. Return a JSON object containing the keywords in the following format: {"keywords": "the search term"}\nReturn only the JSON. Include no other text or commentary.`
    const result = await this.getPromptResponse({
      model: 'llama3:latest', // @TODO: remove hard-coded model
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...this.originalData.messages,
        {
          role: 'user',
          content: `Provide the search term I should use to find this information on the web. Return JSON in the format: {"keywords": "the search term"}\nReturn no other text or commentary.`
        }
      ],
      options: {
        top_k: 10,
        top_p: 0.1
      },
      json: true,
      steram: false
    });
    return JSON.parse(result)?.keywords;
  }

  private async searchTheWeb(term: string): Promise<WebSearchResult> {
    console.log('@search...', term);
    if (!term) return {links: [], raw: '', body: ''};
    const client = await getClient();
    const searchUrl = this.searchTemplate!.getSearchUrl({term});
    console.log('@searching...', searchUrl);
    const req = await client.get(searchUrl, {
      responseType: ResponseType.Text,
      headers: {
        referer: this.searchTemplate?.searchReferrer,
        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    });
    const parser = new DOMParser();
    const dom = parser.parseFromString(req.data as string, 'text/html');
    this.searchTemplate!.preprocess(dom);
    const {
      searchResultSelector,
      searchResultLinkSelector,
      searchResultSnippetSelector
    } = this.searchTemplate!;
    const body = dom.querySelector('body')?.innerText || '';
    const links: ResultLink[] = [];
    const raw = [...dom.querySelectorAll(searchResultSelector)].map(a => {
      const anchor = a.querySelector(searchResultLinkSelector) as HTMLAnchorElement;
      const snippet = a.querySelector(searchResultSnippetSelector) as HTMLElement;
      if (this.searchTemplate!.hrefAcceptable(anchor)) {
        let href = this.searchTemplate!.parseHref(anchor);
        links.push({
          url: href,
          text: anchor.innerText,
          snippet: snippet.innerText
        });
      }
      return (a as HTMLElement).innerText.replace(/((\s){2,})+/g, '$2');
    }).join('\n').substring(0, 5000);
    this.notify({message: 'Got search results...'});

    return {links, raw, body}
  }

  async checkResults(results: WebSearchResult): Promise<CheckedResult[]> {
    let attempt = 0;
    let evaluated;
    const sources: any[] = [];
    const messages = this.originalData.messages;
    console.log('@checkResults', results);
    this.notify({message: 'Checking search results...'});

    attemptLoop:
    while (attempt < this.maxAttempts) {
      const link = results.links[attempt];
      const temp = await this.visit(link);
      this.notify(`Reading ${link.text}...`);
      evaluated = await this.evaluate({messages, data: temp.data});
      console.log(attempt, JSON.stringify({evaluated}));
      
      console.debug(`@checkResults att ${attempt} evaluated:`, evaluated);
      if (evaluated.usable) {
        sources.push({
          ...evaluated,
          ...link,
        });
        if (sources.length >= this.maxSources) break attemptLoop;
      }
      
      attempt++;
    }

    console.log('@checkResults returning sources:', sources);
    this.notify({message: 'WebSearch returning data...'});
    return sources;
  }

  async visit({ url }: ResultLink): Promise<any> {
    console.log('@visit...', url);
    const urlPreviewLength = 24;
    let urlPreview = url.substring(0, urlPreviewLength);
    if (url.length > urlPreviewLength) {
      urlPreview += '...';
    }
    this.notify({message: `Visiting ${urlPreview}`});
    console.log({urlPreview})
    //this.notify({message: `Visiting ${urlPreview}`});
    if (!url) return;
    const client = await getClient();
    const response = await client.get(url, {
      responseType: ResponseType.Text,
      headers: {
        referer: this.searchTemplate?.searchReferrer,
        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`
      }
    });

    //@TODO: Handle timeouts

    try {
      const parser = new DOMParser()
      const dom = parser.parseFromString(response.data as string, 'text/html');
      const body = dom.querySelector('body') as HTMLBodyElement;
      [...body.querySelectorAll('head, script, style, image, svg')].forEach(el => {
        el.parentNode?.removeChild(el);
      });
      
      const data = body.innerText.replace(/((\s){2,})+/g, '$2')
      console.log(`body (${urlPreview}):`, data.length);
      this.notify({message: `Got data from ${urlPreview}`});
      return {data: data.substring(0,2500)};
    }
    catch(err: any) {
      //this.notify({message: `Failed visiting ${urlPreview}`, level: 'danger'});
      return {error: err.message}
    }
  }

  async engage() {
    const searchTerm = await this.getSearchTerm();
    console.log('@WebSearch searchTerm:', searchTerm);
    const searchResults = await this.searchTheWeb(searchTerm);
    if (!searchResults.links?.length) throw new Error('No results found');
    console.log(searchResults);
    const data = await this.checkResults(searchResults);
    console.log('WebSearch data', data);
    return data;
  }

  disengage() {
    return ''
  }
/*
  // Alternate implementation with parallel websearches, but no real gain on 
  // speed due to being unable to handle more than one evaluation at a time.

  async checkResults(results: WebSearchResult): Promise<any> {
    const maxAttempts = 2;
    const maxSources = 2;
    let attempt = 0;
    let evaluated;
    const sources: any[] = [];
    const messages = this.originalData.messages;
    console.log('@checkResults', results);
    this.notify({message: 'Checking search results...'});
    let batchStart = 0;
    let batchSize = 2;

    attemptLoop:
    while (attempt < maxAttempts) {
      const batch = results.links
        .slice(batchStart, batchSize)
        .map(link => this.visitAndEvaluate({ messages, link, sources }));
      
      console.log('@sources.length before', sources.length)
      await Promise.allSettled(batch);
      console.log('@sources.length after', sources.length)
      console.log(sources);

      if (sources.length >= maxSources) break attemptLoop;
      
      attempt += batchSize;
      batchStart += batchSize;
    }

    console.log('@checkResults returning sources:', sources);
    this.notify({message: 'WebSearch returning data...'});
    return sources;
  }

  private async visitAndEvaluate({messages, link, sources}: {messages: any[], link: ResultLink, sources: any[]}) {
    let evaluated;
    const temp = await this.visit(link);
      //console.debug(`@checkResults ${results.links[attempt].url}`)
      //console.debug(`@checkResults`, result);
    evaluated = await this.evaluate({messages, data: temp.data});
    if (evaluated.usable) {
      sources.push({
        ...evaluated,
        ...link,
      });
    }
  }
*/
}