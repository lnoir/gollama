import { writable } from 'svelte/store';
import { getLogger } from '../helpers';
import { WorkerMessageType, type WorkerMessage } from './retrieval/worker';
import { nanoid } from 'nanoid';

type ResultHandler = (data:any) => void

const log = getLogger('workerService');
let service: WorkerService;

export class WorkerService {

  id = nanoid(10);
  private w?: Worker;
  ready = writable(false);
  handlers: Map<string, ResultHandler> = new Map();

  constructor() {
    console.warn('@WorkerService.id', this.id);
    this.init();
  }

  async init() {
    await this.setUpWorker();
    /*await this.embed([
      {
        data: `Clowns look happy but are often sad.`,
        snippet: `Information about clowns`,
        text: `Learn about clowns`,
        url: `https://clown.town`
      }
    ], (result: any) => {
      console.debug('@Got result', result);
    });*/
    log.info('o O 0 Worker initialised.');
  }

  async setUpWorker() {
		const worker = new Worker(new URL('./retrieval/worker', import.meta.url), {type: 'module'});
    setTimeout(() => {
      this.w = worker;
      this.w.addEventListener('message', this.messageHandler.bind(this));
      this.w.onmessage = this.messageHandler.bind(this);
      this.w.onerror = console.error;
      this.w.onmessageerror = console.error;
      this.w.postMessage({type: WorkerMessageType.init});
    }, 500);
	}

  getNewId() {
    return nanoid(10);
  }

  messageHandler(event: MessageEvent<WorkerMessage>) {
    switch (event.data.type) {
      case WorkerMessageType.status:
        this.handleStatusChange(event.data.content);
        break;
      case WorkerMessageType.log:
        log.info(event.data);
        break;
      case WorkerMessageType.result:
        this.returnResult(event.data);
        break;
    }
  }

  async handleStatusChange(status: boolean) {
    this.ready.set(status);
  }

  async embed(content: any) {
    console.warn("@EMBED", content)
    try {
      return await this.afterReady({type:'embed', content});
    }
    catch(err) {
      log.error(err);
    }
  }

  async query(content: string) {
    console.warn('@QUERY', content);
    try {
      return await this.afterReady({type:'query', content});
    }
    catch(err) {
      log.error(err);
    }
  }

  returnResult(data: WorkerMessage) {
    if (data.id && this.handlers.has(data.id)) {
      const handler = this.handlers.get(data.id);
      if (!handler) return;
      handler(data);
      this.handlers.delete(data.id);
    }
  }

  afterReady(message: WorkerMessage) {
    return new Promise((resolve, reject) => {
      let active = false;
      this.ready.subscribe(ready => {
        log.info({ready, active, ...message});
        if (!ready || active) return;
        active = true;
        try {
          const id = this.getNewId();
          const onMessage = (event: MessageEvent<WorkerMessage>) => {
            if (event.data.id === id) {
              active = false;
              resolve(event.data);
              this.w?.removeEventListener('message', onMessage);
            }
          };
          this.w?.addEventListener('message', onMessage);
          this.w!.postMessage({...message, id});

          setTimeout(() => {
            if (!active) return;
            reject(new Error('Worker response timeout (5000ms)'));
            this.w!.removeEventListener('message', onMessage);
          }, 30000);
        }
        catch(err) {
          console.error(err);
          reject(err);
        }
      });
    });
  }
}

service = new WorkerService();

export const workerService = service;