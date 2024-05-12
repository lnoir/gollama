<script lang="ts">
	import ChatMessageBubble from './ChatMessageBubble.svelte';
	import ButtonCopy from './Buttons/ButtonCopy.svelte';
	import ButtonDelete from './Buttons/ButtonDelete.svelte';

	export let id = 0;
	export let senderType = '';
	export let text = '';
	export let parse = true;
	export let onDelete = () => {
		console.log('@deleted', id);
	};
</script>

<div class="w-full mt-4 relative group" data-message-id={id}>
	<ButtonDelete {id} on:delete={onDelete} />
	<ButtonCopy title="Copy this message" position="bottom" {text} />
	<ChatMessageBubble {senderType} {text} {parse} />
</div>
