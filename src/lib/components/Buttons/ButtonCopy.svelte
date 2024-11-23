<script lang="ts">
	import { onMount } from 'svelte';
	import IconCopy from 'virtual:icons/tabler/copy';
	import { pushMessage } from '../../../stores/app.store';

	type Position = 'top' | 'bottom';

	export let text: string;
	export let title: string = 'Copy this text';
	/**
	 * @deprecated
	 */
	export let position: Position = 'top';
	export let classes = '';
	
	function copyToClipboard() {
		navigator.clipboard.writeText(text);
		pushMessage({message: 'Copied to clipboard'});
	}
</script>

<button
	class="btn {classes}"
	{title}
	on:click={copyToClipboard}>
	<IconCopy />
</button>
