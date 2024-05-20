<script lang="ts">
	import ChatMessageBubble from './ChatMessageBubble.svelte';
	import ButtonCopy from './Buttons/ButtonCopy.svelte';
	import ButtonDelete from './Buttons/ButtonDelete.svelte';
	import ButtonResend from './Buttons/ButtonResend.svelte';
	import { getContext } from 'svelte';
	import { get } from 'svelte/store';
	import { selectedModel } from '../../stores/app.store';
	import type { DbMessage } from '../../types';

	export let id = 0;
	export let senderType = '';
	export let text = '';
	export let parse = true;
	export let last = false;
	export let message: DbMessage | null =  null;
	export let onDelete = () => {
		console.log('@delete not implemented', id);
	};

	const resendPrompt: any = getContext('resendPrompt');
	const model = get(selectedModel);

	let classes: Record<string, string> = {
		human: 'bg-slate-900 border-b-slate-800',
		ai: 'bg-zinc-900 border-b-zinc-800'
	};
</script>

<div class="w-full mt-4 relative group" data-message-id={id}>
	<div class="relative">
		<ChatMessageBubble {senderType} {text} {parse}>
			<svelte:fragment slot="footer">
				<div class="flex justify-between px-2 rounded-b-md border-b border-b-1 {classes[senderType]}">
					<div class="stats p-2">
						{#if senderType === 'ai'}
						<span class="stat text-xs text-zinc-600">{message?.model || model || ''}</span>
						{#if message?.total_duration}
						<span class="stat text-xs text-zinc-600"> {message?.total_duration}s</span>
						<span class="stat text-xs text-zinc-600">{message?.tokens_per_second} t/s</span>
						{/if}
						{/if}
					</div>
					<div 
						class="actions">
						{#if senderType === 'human' && last}
						<ButtonResend classes="p-2" {text} on:click={resendPrompt} />
						{/if}
						<ButtonCopy title="Copy this message" position="bottom" classes="p-3" {text} />
						<ButtonDelete {id} on:delete={onDelete} classes="p-2" />
					</div>
				</div>
			</svelte:fragment>
		</ChatMessageBubble>
	</div>
</div>
