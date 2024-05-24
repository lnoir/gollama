import { AbstractWebSearch } from './abstract-web-search';
import { BraveTemplate } from './search-templates/brave';
import { DuckDuckGoTemplate } from './search-templates/duckduckgo';


export class NewsSearch extends AbstractWebSearch {
  name = 'news-search';
  description = 'search the web for the latest news';
  useWhen = 'query specifically asks about real-time, current or latest news';
  maxSources = 5;
  maxAttempts = 5;
  searchUrlTemplate = 'https://html.duckduckgo.com/html/?q={{searchTerm}}&df=d';

  constructor() {
    super();
    this.searchTemplate = new DuckDuckGoTemplate();
  }
}