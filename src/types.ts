export type AppModalType = 'component' | 'confirm' | 'prompt' | 'alert';
export type AppLevelType = 'info' | 'warn' | 'danger';

export interface AppModalOptions {
	title?: string;
	component?: string;
	message?: string;
	level?: AppLevelType;
	response?: (result: boolean) => void;
	_id?: string;
};

export interface AppDialogOptions extends AppModalOptions {
	type: AppModalType;
	body?: string;
};

export interface AppMessageOptions extends AppModalOptions {
	type?: AppLevelType;
	message: string;
};

export interface GenericQueueFn<T> {
	(data: T): void;
}

export interface PromptParamMessage {
	role: 'system' | 'assistant'| 'user';
	content: string;
	images?: string[];
}

export interface AdapterInterface {
  addConversation(data: DbConversation): Promise<DbConversation>;
	getConversation(id: number): Promise<HydratedConversation | undefined>;
	updateConversation(id: number, data: DataObject): Promise<void>;
	updateConversationTitle(id: number, title: string): Promise<void>;
	updateConversationContext(id: number, context: number[]): Promise<void>;
	getConversations(): Promise<DbConversation[]>;
	addMessage(data: DbMessage): Promise<number>;
	deleteConversation(id: number): Promise<void>;
	putSetting(name: string, value: string): Promise<void>;
	getSettings(): Promise<DbSetting[]>;
}

export interface DbConversation {
	id?: number;
	title?: string;
	model: string;
	started: string;
	context?: number[] | undefined;
	system?: string;
	top_k?: number | undefined;
	top_p?: number | undefined;
	seed?: number | undefined;
	num_ctx?: number | undefined;
}

export interface DbMessage extends ResponseStats {
	id?: number;
	conversationId: number;
	senderType: string;
	text: string;
	time: string;
	tokens_per_second: number;
}

export interface HydratedMessage extends DbMessage {
	images?: DbImage[];
}

export interface DbMessageInsert extends Partial<DbMessage> {}

export interface DbSetting {
	id?: number;
	name: string;
	value: string | number;
	defaultVal?: string;
}

export interface DbImage {
  id: number;
  messageId: number;
  imageData: Uint8Array;
  mimeType: string;
  time: string;
}

export interface DbImageInsert extends Omit<DbImage,'id'> {}

export interface ImageUpload {
	base64: string;
	file: File;
	raw: ArrayBuffer;
}

export interface HydratedConversation extends DbConversation {
	messages?: HydratedMessage[];
	[key: string]: any;
};

export interface PromptParams {
	prompt?: string;
	model: string;
	stream?: boolean;
	format?: 'json'; // only accepted value at the moment
	messages: PromptParamMessage[];
	images?: string[];
	context?: number[];
	options?: ModelOptions;
};

export interface Model {
	name: string;
	digest: string;
	modified_at: string;
	size: number;
};

export interface Conversation {
	id: string;
	name?: string;
	model: string;
	messages: DbMessage[];
};

export interface UIConvo extends DbConversation {
	edit?: boolean;
	showMenu?: Boolean;
}

export interface PromptSettings {
	defaultModel?: string;
	stream?: boolean;
	options?: ModelParams;
};

export interface ModelParams {
	top_k: number;
	top_p: number;
	seed: number;
	num_ctx: number;
	temperature: number;
};

export interface ModelOptions extends Partial<ModelParams> {}

export interface ResponseStats {
	total_duration: number;
	load_duration: number;
	prompt_eval_count: number;
	prompt_eval_duration: number;
	eval_count: number;
	eval_duration: number;
}

interface FinalChatResponse extends ResponseStats {
	model: string;
	created_at: Date;
	response: string;
	done: boolean;
	context: number[];
}

export interface ParsedPromptResponse {
	text: string;
	context: number[];
	final?: FinalChatResponse;
};

export interface SettingsMap {
	ollama_host?: string;
	default_model?: string;
	options: ModelOptions;
	template?: string;
	stream?: boolean;
	[key: string]: DbValue | object;
};

/*{
	top_k?: number;
	top_p?: number;
	seed?: number;
	num_ctx?: number;
};*/

export type DbValue = number | number[] | string | boolean | undefined | null;

export interface DataObject {
	[key: string]: DbValue;
};

export type ResponseStatus = 'idle' | 'waitingForInitial' | 'responding';