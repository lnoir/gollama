import { SearchTemplate } from './search-template';

export class DuckDuckGoTemplate extends SearchTemplate {
  searchUrlTemplate = 'https://html.duckduckgo.com/html/?q={{searchTerm}}';
  searchResultSelector = '#links .links_main';
  searchResultLinkSelector = '.result__a';
  searchResultSnippetSelector = '.result__snippet';
  searchResultPeriodSelector = 'tf={{timeFrame}}';
  searchReferrer = 'https//html.duckduckgo.com/html/';

  public hrefAcceptable(anchor: HTMLAnchorElement): boolean {
    return !anchor.search.includes('ad_domain'); // skip ad links
  }
  
  public parseHref(anchor: HTMLAnchorElement) {
    let href = anchor.href;
    if (href.includes('duckduckgo.com')) {
      href = decodeURIComponent(anchor.search.split('&')[0].replace('?uddg=', ''));
    }
    return href;
  }
}