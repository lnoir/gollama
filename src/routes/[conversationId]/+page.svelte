<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import Chat from '$components/Chat.svelte';
	import { currentConversationId } from '../../stores/conversation.store';

	let conversationId: number;

	afterNavigate(({ to }) => {
		conversationId = Number(to?.params?.conversationId);
		currentConversationId.update(() => conversationId);
	});
</script>

<Chat {conversationId} />
