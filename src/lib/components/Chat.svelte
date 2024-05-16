<script lang="ts">
	import { ollamaService } from '$services/ollama.service';
	import { onMount, setContext } from 'svelte';
	import type { Model, SettingsMap } from '../../types';
	import {
	currentConversationId,
		type Message,
		type SenderType
	} from '../../stores/conversation.store';
	import { db } from '$services/db.service';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import Conversation from './Conversation.svelte';
	import { parseChatResponseStream, runJsCodeInWorker } from '$lib/helpers';
	import { availableModels, dbReady, menuOpen, messageInputFocused, pushMessage, selectedModel, settingsOpen } from '../../stores/app.store';
	import { info } from 'tauri-plugin-log-api';
	import IconMessage from 'virtual:icons/tabler/message';
	import ButtonScrollBottom from './Buttons/ButtonScrollBottom.svelte';
	import IconX from 'virtual:icons/tabler/x';
	import IconCode from 'virtual:icons/tabler/code';
	import { search, RetrievalService } from '../services/retrieval.service';
	import { onNavigate } from '$app/navigation';
	import { get } from 'svelte/store';
	import CodeExecutionResult from './CodeExecutionResult.svelte';

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
	let isCode = false;
	let processingResend = false;
	
	setContext('resendPrompt', resendPrompt);

	$: isCode = (
		prompt.trim().startsWith('@code') ||
		(prompt.startsWith('```') && prompt.endsWith('```'))
	);

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
		console.log({from, to});
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
		const { conversation, options } = await getConversationAndOptions();
		await sendPrompt({conversation});
		processingResend = false;
	}

	async function sendPrompt({conversation, options, prompt}: any) {
		responseStatus = 'waitingForInitial';
		const messages = conversation?.messages.map((m: Message) => ({
				role: m.senderType === 'ai' ? 'assistant' : 'user',
				content: m.text
			}));
		const res = await ollamaService.sendPrompt(
			{ model, messages, options },
			{ signal: abortSignal }
		);
		if (!res) throw new Error('Failed to get response');

		const { text: reply, context: newContext } = await parseChatResponseStream(res, updater);
		responseStatus = 'idle';
		responding = '';
		context = newContext;
		
		if (!conversation?.title || conversation.title === 'New conversation') {
			generateTitle(prompt, reply);
		}

		await addMessage(Number(conversationId), 'ai', reply);
		return context;
	}

  async function prepareAndSendPrompt(create = true) {
		model = get(selectedModel);
    const modelInvalid = !isValidModelSelection(model);
    const promptEmpty = !prompt?.trim();
    if (modelInvalid || (!create && promptEmpty)) {
      pushMessage({
        title: 'hi!',
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

			if (create) {
				await addMessage(Number(conversationId), 'human', prompt);
				setTimeout(() => {
					scrollToBottom(500);
				}, 10);
			}

			const { conversation, options } = await getConversationAndOptions();

      prompt = '';
						
			// Enhanced chat
			/*
			const cnvHandler = new ConversationHandler({model, params: options, updater});
			const reply = await cnvHandler.handlePrompt(messages);
			*/

			const newContext = await sendPrompt({conversation, options, prompt});
      await db.updateConversationContext(conversationId, newContext);
			setTimeout(scrollToBottom, 250);
    } catch (err) {
      console.error('@err', err);
    }
  }

	async function handleKeyPress(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.code === 'Enter') {
			if (isCode) {
				runCode(prompt);
			}
			else {
      	prepareAndSendPrompt();
			}
		}
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

	async function addMessage(conversationId: number, senderType: SenderType, text: string) {
		const message = {
			conversationId,
			senderType,
			text,
			time: new Date().toISOString()
		};
		return await db.addMessage(message);
	}

	function isValidModelSelection(model: string) {
		if (!models?.length || !model?.trim()) return false;
		const found = models.find((m) => m.name === model);
		return !!found;
	}

	async function updateFocused(focused: boolean) {
		messageInputFocused.update(() => focused);
		if (focused) {
			menuOpen.update(_ => false);
			settingsOpen.update(_ => false);
		}
		info(`Message input focused: ${focused}`);
	}

	async function runCode(text: string) {
		let code = text.trim().replace('@code', '').replace(/(```)/g, '');
		console.log({code});
		try {
			output = await runJsCodeInWorker({
				code,
			});
			console.log('@out', output);
		}
		catch(err: any) {
			output = err.message;
		}
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

<div class="fixed left-0 bottom-0 w-full z-30">
	<div class="flex w-2/3 m-4 mx-auto max-w-3xl min-h-16 dark:bg-slate-900 rounded-md border border-slate-500">
		<textarea
			id="message-input"
			class="textarea min-h-16 rounded-none rounded-s-md border-none overflow-hidden w-full bg-transparent dark:bg-slate-900 px-4 py-2 max-h-48"
			placeholder="Type something..."
			autocapitalize="off"
			autocomplete="off"
			bind:value={prompt}
			on:keydown={handleKeyPress}
			on:focus={() => updateFocused(true)}
			on:blur={() => updateFocused(false)}
			disabled={!$selectedModel || responseStatus !== 'idle'} />
			<div id="input-button-panel"
				class="flex p-2 bg-">
				{#if responseStatus !== 'idle'}
				<button class="btn" on:click={abort} title="Cancel">
					<IconX />
				</button>
				{:else if isCode}
				<button class="btn" on:click={() => runCode(prompt)} title="Run">
					<IconCode />
				</button>	
				{:else}
				<button class="btn" on:click={() => prepareAndSendPrompt()} title="Send">
					<IconMessage />
				</button>	
				{/if}
			</div>
	</div>
</div>
