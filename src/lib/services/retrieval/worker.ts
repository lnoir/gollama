import { VoyVectorStore } from '@langchain/community/vectorstores/voy';
import { Voy as VoyClient } from 'voy-search';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { Document } from '@langchain/core/documents';
import { WebPDFLoader } from "langchain/document_loaders/web/pdf";
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { getLogger } from '../../helpers';
import { nanoid } from 'nanoid';

const log = getLogger('vdb-worker');

export enum WorkerMessageType {
  'init' = 'init',
  'status' = 'status',
  'query' = 'query',
  'embed' = 'embed',
  'result' = 'result',
  'log' = 'log'
}

export interface WorkerMessage {
  id?: string;
  type: keyof typeof WorkerMessageType;
  content: any;
  contentType?: 'text' | 'result' | 'doc';
}

const voyClient = new VoyClient();
const embeddings = new OllamaEmbeddings({
  model: 'mxbai-embed-large',
  maxConcurrency: 5
});
const store = new VoyVectorStore(voyClient, embeddings);
const initStore = async (data: any) => {
  self.postMessage({type: 'status', content: true});
}

const writeToStore = async (data: WorkerMessage) => {
  console.warn('WRITE_TO_STORE', data)
  const {content: docsToWrite, id}: {content: any[], id?: string} = data;
  log.debug(data);
  const time = new Date().toISOString();
  const docs = (Array.isArray(docsToWrite) ? docsToWrite : [docsToWrite])
    .map(r => new Document({
      pageContent: r.truncated,
      metadata: {
        url: r.url,
        snippet: r.snippet,
        linkText: r.text,
        term: r.term,
        time
      }
    })
  );
  const splitter = new RecursiveCharacterTextSplitter();
  const splitDocs = await splitter.splitDocuments(docs);
  
  await store.addDocuments(splitDocs);
  console.log('index size:', voyClient.size());

  const message: WorkerMessage = {
    id,
    type: WorkerMessageType.result,
    content: {success: true, index: voyClient.serialize()},
  };
  console.warn('>>> replying', message)
  self.postMessage(message);
  return voyClient.size();
}

const query = async (data: WorkerMessage) => {
  const {content: term, id} = data;
  console.log('@QUERY_START', {term})
  const query = await embeddings.embedQuery(term);
  const results = await store.similaritySearchVectorWithScore(query, 5);
  console.debug('@worker.query search:', term);
  console.debug('@worker.query result:', results);
  const message: WorkerMessage = {
    id,
    type: WorkerMessageType.result,
    content: results
  };
  self.postMessage(message);
  console.info('@query end', {results});
}


const embedPDF = async (pdfBlob: Blob) => {
  const pdfLoader = new WebPDFLoader(pdfBlob, { parsedItemSeparator: " " });
  const docs = await pdfLoader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  const splitDocs = await splitter.splitDocuments(docs);

  self.postMessage({
    type: "log",
    data: splitDocs,
  });

  await store.addDocuments(splitDocs);
};

self.addEventListener('message', (event: { data: WorkerMessage }) => {
  switch (event.data.type) {
    case 'query':
      query(event.data);
      break;
    case 'embed':
      // For now, just assume it's always search results.
      writeToStore(event.data);
      break;
    case 'init':
      initStore(event.data.content);
      break;
    default:
      log.warn(`No actions available to handle ${event.data.type}`);
  }
  
  self.postMessage({
    type: 'log',
    data: 'Message received.'
  });
});

self.onoffline = () => log.warn('@worker offline');
self.onerror = log.error;