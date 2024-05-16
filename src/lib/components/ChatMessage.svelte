<script lang="ts">
	import ChatMessageBubble from './ChatMessageBubble.svelte';
	import ButtonCopy from './Buttons/ButtonCopy.svelte';
	import ButtonDelete from './Buttons/ButtonDelete.svelte';
	import ButtonResend from './Buttons/ButtonResend.svelte';
	import { getContext } from 'svelte';

	export let id = 0;
	export let senderType = '';
	export let text = '';
	export let parse = true;
	export let last = false;
	export let onDelete = () => {
		console.log('@delete', id);
	};

	const resendPrompt: any = getContext('resendPrompt');

	let classes: Record<string, string> = {
		human: 'bg-slate-900 border-b-slate-800',
		ai: 'bg-zinc-900 border-b-zinc-800'
	};
</script>

<div class="w-full mt-4 relative group" data-message-id={id}>
	<div class="relative">
		<ChatMessageBubble {senderType} {text} {parse}>
			<svelte:fragment slot="footer">
				<div 
					class="actions flex px-2 rounded-b-md border-b border-b-1 justify-end {classes[senderType]}">
					{#if senderType === 'human' && last}
					<ButtonResend classes="p-2" {text} on:click={resendPrompt} />
					{/if}
					<ButtonCopy title="Copy this message" position="bottom" classes="p-3" {text} />
					<ButtonDelete {id} on:delete={onDelete} classes="p-2" />
				</div>
			</svelte:fragment>
		</ChatMessageBubble>
	</div>
</div>
