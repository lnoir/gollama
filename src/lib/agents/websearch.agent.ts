import { ollamaService } from '../services/ollama.service';
import { BaseAgent } from './base.agent';
import type { AgentConstructorParams, AgentResponse } from './types';
import { getClient, ResponseType } from '@tauri-apps/api/http';

type SearchParams = {
  term: string;
}

type VisitParams = {
  url: string;
  text?: string;
}

type CheckResultsParams = {
  data: string;
  [key: string]: any;
}

export class WebSearchAgent extends BaseAgent {

  constructor(data: AgentConstructorParams) {
    super(data);
    this.name = 'WebSearch';
  }

  async run() {
    this.notify({message: 'Running web search'});
    const { messages, getResultText } = this;
    const systemPrompt = `Your job is to extract and return the keywords that should be used to search the web in order to answer the user's query. Return a JSON object containing the keywords in the following format: {"keywords": "the search term"}\nReturn only the JSON. Include no other text or commentary.`
    const result = await ollamaService.sendPrompt({
      ...this.defaultPromptOptions,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages,
        {
          role: 'user',
          content: `Provide the search term I should use to find this information on the web. Return JSON in the format: {"keywords": "the search term"}\nReturn no other text or commentary.`
        }
      ],
    });
    try {
      console.log('@searchResults trying...')
      const output = JSON.parse(await getResultText(result));
      const data = await this.search({term: output.keywords});
      this.notify({message: 'Got search results'});
      console.log('@searchResults data:', data);
      
      if (!data.links?.length) {
        this.pushMessage({title: '', message: `Couldn't retrieve search results`, level: 'danger' });
        return {error: new Error('Unable to retrieve search results')}
      }

      return this.checkResults(data);
    }
    catch(err: any) {
      this.notify({message: `Failed to get results: ${err.message || err}`, level: 'danger'});
      console.error('@err', err);
      return {error: err};
    }
  }

  async search({ term }: SearchParams): Promise<any> {
    console.log('@search...', term);
    if (!term) return;
    const client = await getClient();
    const q = term?.replace(/\s+/g, '+')?.trim();
    /*
    const r1 = await client.get(`https://api.duckduckgo.com/?format=json&q=${term}`, {
      responseType: ResponseType.JSON,
      headers: {
        referer: 'https//duckduckgo.com/'
      }
    });*/
    const searchUrl = `https://html.duckduckgo.com/html/?q=${q}`;//&df=d`;
    const searchUrlMain = `https://duckduckgo.com/?q=${q}&df=d&ia=web`;
    
    const r2 = await client.get(searchUrl, {
      responseType: ResponseType.Text,
      headers: {
        referer: 'https//html.duckduckgo.com/html/',
        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`
      }
    });
    const parser = new DOMParser()
    const dom = parser.parseFromString(r2.data as string, 'text/html');
    const body = dom.querySelector('body')?.innerText;
    const links: Record<string, any> = [];
    console.log('@DOM')
    console.log(dom.querySelector('body')?.innerText);
    console.log('/@DOM');
    const raw = [...dom.querySelectorAll('#links .links_main')].map(a => {
      const anchor = a.querySelector('.result__a') as HTMLAnchorElement;
      if (!anchor.href.includes('ad_domain=')) { // skip ad links
        let href = anchor.href;
        if (href.includes('duckduckgo.com')) {
          href = decodeURIComponent(anchor.search.split('&')[0].replace('?uddg=', ''));
        }
        links.push({
          url: href,
          text: anchor.innerText
        });
        console.log(anchor.innerText, href);
      }
      return (a as HTMLElement).innerText.replace(/((\s){2,})+/g, '$2');
    }).join('\n').substring(0, 10000);

    // console.log(raw);
    return {links, raw, body};
  }

  async checkResults(results: CheckResultsParams): Promise<AgentResponse> {
    const maxAttempts = 3;
    let attempt = 0;
    let evaluated;
    let result: any;
    while (attempt <= maxAttempts) {
      if (results.links) {
        result = await this.visit(results.links[attempt]);
        //console.debug(`@checkResults ${results.links[attempt].url}`)
        //console.debug(`@checkResults`, result);
        evaluated = await this.evaluateRetrievedData(this.messages, result.data);
      }
      else {
        evaluated = await this.evaluateRetrievedData(this.messages, results.data);
      }
      
      console.debug(`@checkResults att ${attempt} evaluated:`, evaluated);
      if (evaluated.usable) break;
      
      attempt++;
    }

    this.notify({message: 'Handing over data...'});
    return result;
  }

  async visit({ url }: VisitParams): Promise<any> {
    console.log('@visit...', url);
    const urlPreviewLength = 24;
    let urlPreview = url.substring(0, urlPreviewLength);
    if (url.length > urlPreviewLength) {
      urlPreview += '...';
    }
    console.log({urlPreview})
    this.notify({message: `Visiting ${urlPreview}`});
    if (!url) return;
    const client = await getClient();
    const response = await client.get(url, {
      responseType: ResponseType.Text,
      headers: {
        referer: 'https//html.duckduckgo.com/html/',
        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`
      }
    });
    try {
      const parser = new DOMParser()
      const dom = parser.parseFromString(response.data as string, 'text/html');
      const body = dom.querySelector('body') as HTMLBodyElement;
      [...body.querySelectorAll('script, style, image, svg')].forEach(el => {
        el.parentNode?.removeChild(el);
      });
      
      const data = body.innerText.replace(/((\s){2,})+/g, '$2');
      console.log('body:', data);
      this.notify({message: `Got data from website`});
      return {data};
    }
    catch(err: any) {
      this.notify({message: `Failed visiting ${urlPreview}`, level: 'danger'});
      return {error: err.message}
    }
  }
}

