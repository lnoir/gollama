import { SearchTemplate } from './search-template';

export class DuckDuckGoTemplate extends SearchTemplate {
  searchUrlTemplate = 'https://html.duckduckgo.com/html/?q={{searchTerm}}';
  searchResultSelector = '#links .links_main';
  searchResultLinkSelector = '.result__a';
  searchResultSnippetSelector = '.result__snippet';
  searchResultPeriodSelector = 'tf={{timeFrame}}';
  searchReferrer = 'https//html.duckduckgo.com/html/';

  public parseAndFilterAnchor(anchor: HTMLAnchorElement): string {
    const href = super.parseAndFilterAnchor(anchor);
    return !anchor.search?.includes('ad_domain') ? href : ''; // skip ad links
  }
  
  public parseAnchor(anchor: HTMLAnchorElement) {
    super.parseAnchor(anchor);
    let href = super.parseAnchor(anchor);
    if (href.includes('duckduckgo.com')) {
      href = decodeURIComponent(anchor.search?.split('&')[0].replace('?uddg=', ''));
    }
    return href;
  }
}