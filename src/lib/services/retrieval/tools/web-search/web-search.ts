import { AbstractWebSearch } from './abstract-web-search';
import { AbstractWebSearch2 } from './abstract-web-search.2';
import { DuckDuckGoTemplate } from './search-templates/duckduckgo';


export class WebSearch extends AbstractWebSearch2 {
  name = 'web-search';
  description = 'search the web for relevant data';
  useWhen = 'user needs information or context about a topic';

  constructor() {
    super();
    this.searchTemplate = new DuckDuckGoTemplate();
  }
}