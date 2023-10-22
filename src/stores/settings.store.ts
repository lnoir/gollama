import { writable, type Writable } from 'svelte/store';

const defaultHost = 'http://localhost:11434';

export const ollamaHost: Writable<string> = writable(defaultHost);
