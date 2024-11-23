import type { PromptParams } from '../../../../../types';
import { Tool, type ToolConfigureParams } from '../tool'
import { getClient, ResponseType } from '@tauri-apps/api/http';
import type { SearchTemplate } from './search-templates/search-template';
import type { EvaluationResult } from '../../retriever';
import type { WorkerService } from '../../../worker.service';
import { get } from 'svelte/store';
import { workerServiceInstance } from '../../../../../stores/app.store';
import { getLogger } from '../../../../helpers';
import { db } from '$services/db.service';
import type { WorkerMessage } from '../../worker';

const log = getLogger('WebSearch');

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
  term: string;
}

interface VisitResult extends ResultLink {
  data: string;
  truncated: string;
}

interface VisitError {
  error: string;
}

interface CheckedResult extends ResultLink, EvaluationResult {
  summary: string;
}

export abstract class AbstractWebSearch2 extends Tool {
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
  workerService?: WorkerService;
  model = 'llama3:latest';
  visited = new Set();
  
  public configure(data: WebSearchConfigureParams) {
    if (!data.getPromptResponse) throw new Error('WebSearch needs access to prompt LLM!');
    if (!data.originalData) throw new Error('WebSearch missing access to original prompt!')
    
    // Setup any necessary data here
    this.originalData = data.originalData;
    this.getPromptResponse = data.getPromptResponse;
    this.notify = data.notify || this.notify;
    this.evaluate = data.evaluate;
  }
  
  private async getSearchTerms(): Promise<string[]> {
    const systemPrompt = 
`Your job is to translate the user query into keyword search terms that will provide a complete answer for the user.
Include precisely ONE keyword term for each piece of information required to answer the user.
Return a JSON object containing the keywords in the following format: {"keywords": ["search term one", "term two", "a third keyword term"]}
If only one term is necessary, return an array containing one term. Return as few keywords as possible, but do not use single-word keywords.
Ensure each term is specific to the query. Use at least two words in each term to ensure specificity. Return no more than three keyword terms.
Return only the JSON. Include no other text or commentary.`;
    const result = await this.getPromptResponse({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...this.originalData.messages,
        {
          role: 'user',
          content: `Provide the search term I should use to find this information on the web. Return JSON in the format: {"keywords": ["search term", "..."]}\nReturn no other text or commentary.`
        }
      ],
      options: {
        top_k: 10,
        top_p: 0.1,
        temperature: 0.2
      },
      json: true,
      steram: false
    });
    return JSON.parse(result)?.keywords;
  }

  private async searchTheWeb(term: string): Promise<WebSearchResult> {
    console.log('@search...', term);
    if (!term) return {links: [], raw: '', body: '', term};
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
    const body = dom.querySelector('body')?.innerText || '';
    const { links, raw } = this.getLinksFromDocument(dom);
    this.notify({message: 'Got search results...'});

    return {links, raw, body, term}
  }

  private getLinksFromDocument(dom: Document): {raw: string, links: any[]} {
    const links: ResultLink[] = [];
    const {
      searchResultSelector,
      searchResultLinkSelector,
      searchResultSnippetSelector
    } = this.searchTemplate!;
    const domains = new Set();
    const raw = [...dom.querySelectorAll(searchResultSelector)].map(a => {
      const anchor = a.querySelector(searchResultLinkSelector) as HTMLAnchorElement;
      const snippet = a.querySelector(searchResultSnippetSelector) as HTMLElement;
      const href = this.searchTemplate!.parseAndFilterAnchor(anchor);
      // Only want one result per domain for greater variety of sources
      if (href?.length) {
        const url = new URL(href);
        if (!domains.has(url.hostname)) {
          domains.add(url.hostname);
          links.push({
            url: href,
            text: anchor.innerText,
            snippet: snippet.innerText
          });
        }
      }
      return (a as HTMLElement).innerText.replace(/((\s){2,})+/g, '$2');
    }).join('\n');
    return {raw, links};
  }

  private async gatherResults(results: WebSearchResult): Promise<CheckedResult[]> {
    const sources: any[] = [];
    const { links, term } = results;
    const maxResults = 5;
    let batchStart = 0;
    let batchSize = 3;
    const workerService = get(workerServiceInstance);
    this.notify({message: 'Visiting links...'});

    while (maxResults > sources.length && links.length - 1 > batchStart) {
      const visited = await Promise.allSettled<Promise<VisitResult | VisitError>>(
        links.slice(batchStart, batchSize).map(link => this.visit(link))
      );

      for (const visit of visited) {
        if (visit.status === 'rejected') continue;
        if (visit.hasOwnProperty('error')) {
          console.error('@error', visit);
          continue;
        }
        const link = visit.value as VisitResult;
        console.log('@link (%d chars)', link.data.length, link);
        if (link.data.length < 100) continue; // Not enough content
        try {
          this.notify({message: `Reading ${link.text}...`});
          const evaluation = await this.evaluate({
            data: link.data, messages: this.originalData.messages
          });
          console.warn('@EVALUATION', evaluation)
          log.warn(evaluation);
          if (evaluation.usable) {
            this.notify({message: `Adding source: ${link.text}`});
            sources.push({...link, summary: evaluation.summary});
          }
        }
        catch(err) {
          console.error(err);
        }
      }
      batchStart += batchSize;
      console.warn({batchStart, results});
    }
    try {
      console.warn('@PRE sources', sources);
      await db.addWebResults(sources.map(s => ({id: s.url, content: s.data})));
      const embedResult = await workerService.embed(sources);
      console.warn("@EMBED_RESULT", embedResult);
    }
    catch(err) {
      console.error('Unable to embed:' , sources, err);
    }
    return sources;
  }

  private async query(terms: string[]) {
    console.log('@QUERYING...', terms)
    const workerService = get(workerServiceInstance);
    let allResults: Map<string, any> = new Map();
    try {
      for (const term of terms) {
        const workerResults = await workerService.query(term) as WorkerMessage;
        console.log('@workerResults', workerResults)
        /*const ids = workerResults.content.map((r: any) => r[0].metadata.url);
        console.log('@workerResults ids', ids);
        const dbResults = await db.getWebResults(ids);
        console.warn('@DB_RESULTS', dbResults);
        allResults = allResults.concat(dbResults);
        */
       
        workerResults.content.forEach((r:any) => {
          if (allResults.has(r[0].metadata.url)) return;
          allResults.set(r[0].metadata.url, {
            content: r[0].pageContent,
            ...r[0].metadata
          });
        });
      }
    }
    catch(err) {
      throw err;
    }
    log.warn([...allResults.values()]);
    return [...allResults.values()];
  }

  private async visit(resultItem: ResultLink): Promise<VisitResult | VisitError> {
    const { url } = resultItem;
    if (this.visited.has(url)) return {error: 'Already visited'};
    this.visited.add(url);
    const urlPreviewLength = 24;
    let urlPreview = url.substring(0, urlPreviewLength);
    
    if (url.length > urlPreviewLength) {
      urlPreview += '...';
    }
    
    if (!url) return {error: 'Unable to visit: no URL found'};

    this.notify({message: `Visiting ${urlPreview}`});
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
      const body = (
        dom.querySelector('main') ||
        dom.querySelector('#main') ||
        dom.querySelector('#content') ||
        dom.querySelector('body')
      ) as HTMLBodyElement;
      [...body.querySelectorAll('head, script, style, image, svg')].forEach(el => {
        el.parentNode?.removeChild(el);
      });
      
      const data = body.innerText.replace(/((\s){2,})+/g, '$2');
      this.notify({message: `Got data from ${urlPreview}`});
      return {...resultItem, data: data, truncated: data.substring(0,2500)};
    }
    catch(err: any) {
      //this.notify({message: `Failed visiting ${urlPreview}`, level: 'danger'});
      return {error: err.message}
    }
  }

  public async engage() {
    const searchTerms = await this.getSearchTerms();
    console.log('@WebSearch searchTerm:', searchTerms);
    const searches = searchTerms.map(term => this.searchTheWeb(term));
    const searchResults = await Promise.allSettled(searches);
    console.log("@searchResults", searchResults)
    await Promise.allSettled(
      searchResults
        .filter(r => r.status !== 'rejected')
        .map(r => this.gatherResults((r as any).value))
    );
    const queryResults = await this.query(searchTerms);
    console.warn("::: ??? ::: RESULTS", queryResults);
    return queryResults; //this.extractFinalData(queryResults as any);
  }

  disengage() {
    return ''
  }
}