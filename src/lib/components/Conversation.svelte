<script lang="ts">
	import { afterUpdate, onMount } from 'svelte';
	import {
		conversationsLastUpdated,
		currentConversationId,
		currentConversationMessageCount
	} from '../../stores/conversation.store';
	import ChatMessage from '$components/ChatMessage.svelte';
	import { db } from '$services/db.service';
	import { afterNavigate } from '$app/navigation';
	import type { DbMessage, HydratedConversation } from '../../types';

	export let conversationId = 0;
	export let responding = '';

	let messages: DbMessage[] = [];

	onMount(async () => {
		if (conversationId) {
			await switchConversation(conversationId);
		}
		currentConversationId.subscribe(async (currentId) => {
			conversationId = currentId;
			await switchConversation(conversationId);
		});
		conversationsLastUpdated.subscribe(async () => {
			await switchConversation(conversationId);
		});
	});

	afterUpdate(() => {
		if (conversationId === 0) {
			messages = [];
		}
	})

	afterNavigate(async ({ to }) => {
		const incomingId = Number(to?.params?.conversationId || 0);
		if (incomingId !== conversationId) {
			messages = [];
			switchConversation(incomingId);
		}
	});

	async function switchConversation(incomingId: number) {
		if (incomingId === 0) {
			messages = [];
			return;
		}
		const convo = (await db.getConversation(incomingId)) as HydratedConversation;
		messages = convo?.messages || [];
		currentConversationMessageCount.update(() => messages.length);
		conversationId = incomingId;
	}
</script>

<div id="conversation" class="block mx-auto max-w-3xl p-4">
	<div class="block w-full">
		{#each messages as msg}
			{@const { senderType, text, id } = msg}
			<ChatMessage {senderType} {text} {id} />
		{/each}
		{#if responding}
			<ChatMessage senderType="ai" text={responding} parse={false} />
		{/if}
	</div>
</div>
