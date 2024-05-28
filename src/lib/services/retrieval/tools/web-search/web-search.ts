import { AbstractWebSearch } from './abstract-web-search';
import { AbstractWebSearch2 } from './abstract-web-search.2';
import { DuckDuckGoTemplate } from './search-templates/duckduckgo';


export class WebSearch extends AbstractWebSearch {
  name = 'web-search';
  description = 'search the web for relevant data';
  useWhen = 'query specifically asks about real-time, current or future data, or a web search';

  constructor() {
    super();
    this.searchTemplate = new DuckDuckGoTemplate();
  }
}