<script lang="ts">
	import { onMount } from 'svelte';
	import IconCopy from 'virtual:icons/tabler/copy';

	type Position = 'top' | 'bottom';

	export let text: string;
	export let title: string = 'Copy this text';
	export let position: Position = 'top';
	let classes = position === 'top'
		? 'right-0 top-5'
		: 'right-10 bottom-5';

	onMount(() => {
		
	});

	function copyToClipboard() {
		navigator.clipboard.writeText(text);
	}
</script>

<button
	class="btn absolute z-20 {classes}"
	{title}
	on:click={copyToClipboard}>
	<IconCopy />
</button>
