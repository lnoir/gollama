

type TimeFrame = 'year' | 'month' | 'week' | 'day';

interface GetSearchUrlParams {
  term: string;
  timeframe?: TimeFrame;
}

interface TimeFrameMap {
  year: string;
  month: string;
  week: string;
  day: string;
}

export abstract class SearchTemplate {
  searchUrlTemplate = '';
  searchResultSelector = '';
  searchResultLinkSelector = '';
  searchResultSnippetSelector = '';
  searchResultPeriodSelector = '';
  searchReferrer = '';
  searchTimeFrameMap: TimeFrameMap = {
    year: '', month: '', week: '', day: ''
  }

  public getSearchUrl({term, timeframe}: GetSearchUrlParams) {
    const q = term?.replace(/\s+/g, '+')?.trim();
    let url = this.searchUrlTemplate.replace(`{{searchTerm}}`, q);
    if (timeframe && this.searchTimeFrameMap[timeframe]) {
      // @TODO
    }
    return url;
  }

  public preprocess(dom: Document) {
    console.log('No preprocess defined');
  };

  public parseAndFilterAnchor(anchor: HTMLAnchorElement): string {
    const parsedHref = this.parseAnchor(anchor);
    const url = new URL(parsedHref);
    if (/\.([a-z]+){2,4}$/i.test(url.pathname)) return '';
    return parsedHref;
  }

  public parseAnchor(anchor: HTMLAnchorElement) {
    return anchor.href;
  }
}