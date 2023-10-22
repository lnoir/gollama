<script lang="ts">
	import ChatMessageBubble from './ChatMessageBubble.svelte';
	import ButtonCopy from './Buttons/ButtonCopy.svelte';

	export let id = 0;
	export let senderType = '';
	export let text = '';
</script>

<div class="w-full mt-4 relative group" data-message-id={id}>
	<ButtonCopy title="Copy this message" position="bottom" {text} />
	<ChatMessageBubble {senderType} {text} />
</div>
