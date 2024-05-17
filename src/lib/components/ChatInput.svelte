<script lang="ts">
	import { menuOpen, messageInputFocused, settingsOpen } from '../../stores/app.store';
	import { responseStatus } from '../../stores/conversation.store';
	import { createEventDispatcher } from 'svelte';
	import { runJsCodeInWorker } from '$lib/helpers';
	
	import IconMessage from 'virtual:icons/tabler/message';
	import IconX from 'virtual:icons/tabler/x';
	import IconCode from 'virtual:icons/tabler/code';
	
	export let disabled: boolean;
	
	const dispatch = createEventDispatcher();

	export let prompt = '';

	$: isCode = (
		prompt.trim().startsWith('@code') ||
		(prompt.startsWith('```') && prompt.endsWith('```'))
	);

	function abort() {
		dispatch('abort');
	}

	async function updateFocused(focused: boolean) {
		messageInputFocused.update(() => focused);
		if (focused) {
			menuOpen.update(_ => false);
			settingsOpen.update(_ => false);
		}
	}

	async function handleKeyUp(e: KeyboardEvent) {
		prompt = (e.target as HTMLTextAreaElement).value;
		if ((e.ctrlKey || e.metaKey) && e.code === 'Enter') {
			if (isCode) return runCode(prompt);
			// Offload to parent to handle send
			dispatch('send', prompt);
		}
		return true
	}

	async function runCode(text: string) {
		let code = text.trim().replace('@code', '').replace(/(```)/g, '');
		try {
			const output = await runJsCodeInWorker({
				code,
			});
			dispatch('output', output);
		}
		catch(err: any) {
			dispatch('error', err.message);
		}
	}
</script>

<div class="fixed left-0 bottom-0 w-full z-30">
	<div class="flex w-2/3 m-4 mx-auto max-w-3xl min-h-16 dark:bg-slate-900 rounded-md border border-slate-500">
		<textarea
			id="message-input"
			class="textarea min-h-16 rounded-none rounded-s-md border-none overflow-hidden w-full bg-transparent dark:bg-slate-900 px-4 py-2 max-h-48"
			placeholder="Type something..."
			autocapitalize="off"
			autocomplete="off"
			value={prompt}
			on:keyup={handleKeyUp}
			on:focus={() => updateFocused(true)}
			on:blur={() => updateFocused(false)}
			disabled={disabled}
		/>
			<div id="input-button-panel"
				class="flex p-2 bg-">
				{#if $responseStatus !== 'idle'}
				<button class="btn" on:click={abort} title="Cancel">
					<IconX />
				</button>
				{:else if isCode}
				<button class="btn" on:click={() => runCode(prompt)} title="Run">
					<IconCode />
				</button>	
				{:else}
				<button class="btn" on:click={() => dispatch('send', prompt)} title="Send">
					<IconMessage />
				</button>	
				{/if}
			</div>
	</div>
</div>