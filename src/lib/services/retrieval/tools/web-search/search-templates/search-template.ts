

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

  public hrefAcceptable(anchor: HTMLAnchorElement) {
    return true;
  }

  public parseHref(anchor: HTMLAnchorElement) {
    return anchor.href;
  }
}