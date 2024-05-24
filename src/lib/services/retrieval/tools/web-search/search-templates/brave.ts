import { SearchTemplate } from './search-template';

export class BraveTemplate extends SearchTemplate {
  searchUrlTemplate = 'https://search.brave.com/search?q={{searchTerm}}&source=desktop';
  searchResultSelector = '#results .snippet';
  searchResultLinkSelector = 'a';
  searchResultSnippetSelector = '.snippet-content';
  searchResultPeriodSelector = 'tf={{timeFrame}}';
  searchReferrer = 'https://search.brave.com/search';

  preprocess(dom: Document): void {
    const selectors = '#results .snippet.standalone, #discussions, #search-elsewhere';
    for(const el of dom.querySelectorAll(selectors)) {
      el.parentElement?.removeChild(el);
    }
  }
}