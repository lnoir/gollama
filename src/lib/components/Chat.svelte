<script lang="ts">
	import { ollamaService } from '$services/ollama.service';
	import { onMount, setContext } from 'svelte';
	import type { DbImageInsert, DbMessageInsert, ImageUpload, Model, SettingsMap } from '../../types';
	import {
	currentConversationId,
		type Message,
		type SenderType
	} from '../../stores/conversation.store';
	import { db } from '$services/db.service';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import Conversation from './Conversation.svelte';
	import { nanosecondsToSeconds, parseChatResponseStream, uint8ArrayToBase64 } from '$lib/helpers';
	import { availableModels, dbReady, pushMessage, selectedModel } from '../../stores/app.store';
	import ButtonScrollBottom from './Buttons/ButtonScrollBottom.svelte';
	import { search, RetrievalService } from '../services/retrieval.service';
	import { onNavigate } from '$app/navigation';
	import { get } from 'svelte/store';
	import CodeExecutionResult from './CodeExecutionResult.svelte';
	import ChatInput from './ChatInput.svelte';

	export let conversationId = 0;

	type ResponseStatus = 'idle' | 'waitingForInitial' | 'responding';

	let prompt = '';
	let models: Model[] = get(availableModels);
	let model = get(selectedModel);;
	let responding = '';
	let responseStatus: ResponseStatus = 'idle';
	let settings: SettingsMap;
	let context: number[] | undefined;
	let abortController: AbortController;
	let abortSignal: AbortSignal;
  let previousConversationId: number;
	let mainContainer: HTMLElement | null;
	let output: any;
	let processingResend = false;
	
	setContext('resendPrompt', resendPrompt);

	onMount(async () => {
		const dbReadyUnsub = dbReady.subscribe(async ready => {
			settings = (await db.getSettingsMap()) as SettingsMap;
			dbReadyUnsub();
		});
		currentConversationId.subscribe(async id => {
			if (id && previousConversationId === id) return;
			conversationId = id;
			if (!id) return;
			const conversation = await db.getConversation(id);
			if (!conversation) return;
		});
		mainContainer = document.getElementById('main');
		availableModels.subscribe(available => {
			models = available;
		});
	});

	onNavigate(async ({from, to}) => {
		if (to?.url.pathname === '/') {
			conversationId = 0;
		}
		else {
			settings = (await db.getSettingsMap()) as SettingsMap;
		}
	});

	function scrollToBottom(pad = 150) {
		mainContainer?.scrollTo({
			left: 0,
			top: mainContainer.scrollHeight,
			behavior: 'smooth'
		});
	}

	function updater(text: string) {
		responseStatus = 'responding';
		responding = text;
		if (!mainContainer) return;

		const pad = 100;
		const scrolled = mainContainer.getBoundingClientRect().bottom + mainContainer.scrollTop + pad;
		if (scrolled >= mainContainer.scrollHeight) {
			setTimeout(scrollToBottom);
		}
	}

	async function getConversationAndOptions() {
		const conversation = await db.getConversation(conversationId);
		const options: Record<string, any> = {
			...settings.options,
		};
		Object.keys(settings.options).forEach(k => {
			const cValue = conversation[k];
			if (
				cValue !== 'undefined' &&
				cValue !== undefined &&
				cValue !== null) {
					options[k] = cValue
				}
		});
		return {conversation, options};
	}

	function abort() {
		abortController.abort();
		responding = '';
		responseStatus = 'idle';
	}

	async function resendPrompt() {
		if (processingResend) return;

		pushMessage({message: 'Resending...'});
		processingResend = true;
		const defaultError = `Can't find message`;
		const { conversation, options } = await getConversationAndOptions();
		if (!conversation.messages) throw new Error(defaultError);

		const lastHumanMessageIndex = conversation.messages?.findLastIndex(m => m.senderType === 'human');
		if (!lastHumanMessageIndex) throw new Error(defaultError);

		const message = conversation.messages[lastHumanMessageIndex];
		const prompt = message.text;
		let images: string[] = [];
		if (message.images) {
			images = message.images.map(i => uint8ArrayToBase64(i.imageData))
		}

		await sendPrompt({conversation, options, prompt, images });
		processingResend = false;
	}

	async function sendPrompt({conversation, options, prompt, images}: any) {
		responseStatus = 'waitingForInitial';
		const messages = conversation?.messages.map((m: Message) => ({
			role: m.senderType === 'ai' ? 'assistant' : 'user',
			content: m.text
		}));

		if (images?.length) {
			messages[messages.length - 1].images = images;
		}

		const res = await ollamaService.sendPrompt(
			{ model, messages, options },
			{ signal: abortSignal }
		);
		if (!res) throw new Error('Failed to get response');

		const { text: reply, context: newContext, final } = await parseChatResponseStream(res, updater);
		responseStatus = 'idle';
		responding = '';
		context = newContext;
		
		if (!conversation?.title || conversation.title === 'New conversation') {
			generateTitle(prompt, reply);
		}

		await addMessage({
			conversationId: Number(conversationId),
			senderType: 'ai',
			text: reply,
			extra: final
		});
		return context;
	}

  async function prepareAndSendPrompt(
		{input, images, create}:
		{input: string, images?: ImageUpload[]; create: boolean}
	) {
		prompt = input;
		model = get(selectedModel);
    const modelInvalid = !isValidModelSelection(model);
    const promptEmpty = !prompt?.trim();
    if (modelInvalid || promptEmpty) {
      pushMessage({
        message: modelInvalid ? 'Select a model first' : 'Prompt cannot be empty',
        type: 'warn'
      });
      return;
    }

		responseStatus = 'waitingForInitial';
    abortController = new AbortController();
    abortSignal = abortController.signal;

    try {
      if (!conversationId) {
        conversationId = await db.addConversation({
					...(settings?.options || {}),
          title: 'New conversation',
          model,
          started: new Date().toISOString(),
        });
      }

			let insertedMessageId: number;
			if (create) {
				insertedMessageId = await addMessage({
					conversationId: Number(conversationId),
					senderType: 'human',
					text: prompt,
				});
				console.log({insertedMessageId});
				if (!insertedMessageId) throw new Error('Unable to store message');
				if (images?.length) {
					await addImages({
						messageId: insertedMessageId,
						images,
					});
				}
				setTimeout(() => {
					scrollToBottom(500);
				}, 10);
			}

			const { conversation, options } = await getConversationAndOptions();
						
			// Enhanced chat
			/*
			const cnvHandler = new ConversationHandler({model, params: options, updater});
			const reply = await cnvHandler.handlePrompt(messages);
			*/

			const base64Images = images?.map(image => image.base64.replace(/data\:image\/[a-z0-9]+;base64,/, ''))
			const newContext = await sendPrompt({conversation, options, prompt, images: base64Images});
      await db.updateConversationContext(conversationId, newContext);
			setTimeout(scrollToBottom, 250);
			prompt = '';
    } catch (err) {
      console.error('@err', err);
    }
  }

	async function onReceiveSendEvent(e: CustomEvent) {
		const data = { ...e.detail, create: true };
		await prepareAndSendPrompt(data);
	}

	async function generateTitle(originalPrompt: string, reply: string) {
		const exchange = `P1: ${originalPrompt}\n\nP2: ${reply}`;
		const prompt = `Write a concise title of no more than 7 words for the topic of the following text.
    Do not include any prefixes, suffixes, quotation marks or other special characters, just return the raw title.
    Here is the text:
    ${exchange}`;
		let text = '';
		const res = await ollamaService.sendPrompt({
			messages: [{
				role: 'user',
				content: prompt
			}],
			model,
			options: { top_k: 10, top_p: 0.20}
		});
		if (res) {
			const parsed = await parseChatResponseStream(res);
			({ text } = parsed);
			if (text) {
				await db.updateConversationTitle(conversationId, text);
			}
		}
		return text;
	}

	async function addMessage(
		{conversationId, senderType, text, extra}:
		{conversationId: number, senderType: SenderType, text: string, extra?: any}
	) {
		let {
			total_duration,
			load_duration,
			prompt_eval_count,
			prompt_eval_duration,
			eval_count,
			eval_duration
		} = (extra || {});
		const message = {
			conversationId,
			senderType,
			text,
			time: new Date().toISOString(),
			total_duration: nanosecondsToSeconds(total_duration) || null,
			load_duration: nanosecondsToSeconds(load_duration) || null,
			prompt_eval_count,
			prompt_eval_duration: nanosecondsToSeconds(prompt_eval_duration) || null,
			eval_count,
			eval_duration: nanosecondsToSeconds(eval_duration) || null,
			tokens_per_second: eval_count ? Number((eval_count / nanosecondsToSeconds(eval_duration)).toFixed(2)) : null
		} as DbMessageInsert;
		return await db.addMessage(message);
	}

	async function addImages(params: {images: ImageUpload[], messageId: number}) {
		const { images, messageId } = params;
		console.log(images);
		for (const image of images) {
			const data: DbImageInsert = {
				messageId,
				time: new Date().toISOString(),
				mimeType: image.file.type,
				imageData: new Uint8Array(image.raw),
			};
			await db.addImage(data);
		}
	}

	function isValidModelSelection(model: string) {
		if (!models?.length || !model?.trim()) return false;
		const found = models.find((m) => m.name === model);
		return !!found;
	}
</script>

<div class="block relative mx-auto max-w-3xl p-4 pt-0 pb-20">
	
	<Conversation {conversationId} {responding} />

	<CodeExecutionResult {output} />

	<div class="block invisible mx-auto mt-6" class:!visible={responseStatus !== 'idle'}>
		{#if responseStatus === 'waitingForInitial'}
		<ProgressRadial
			class="mx-auto !stroke-teal-600"
			width="w-10"
			stroke={60}
			meter="stroke-teal-600" />
		{/if}
	</div>

	<ButtonScrollBottom target="#conversation" root="#main" />
</div>

<ChatInput
	disabled={!$selectedModel || responseStatus !== 'idle'}
	{prompt}
	on:abort={abort}
	on:error={(e) => pushMessage({message: e.detail, level: 'danger'})}
	on:output={e => output = e.detail}
	on:send={onReceiveSendEvent}
/>
