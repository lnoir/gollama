<script lang="ts">
	import IconCopy from 'virtual:icons/tabler/copy';

	type Position = 'top' | 'bottom';

	export let text: string;
	export let title: string = 'Copy this text';
	export let position: Position = 'top';

	function copyToClipboard() {
		navigator.clipboard.writeText(text);
	}
</script>

<button
	class="btn absolute right-0"
	{title}
	class:top-5={position === 'top'}
	class:bottom-5={position !== 'top'}
	on:click={copyToClipboard}>
	<IconCopy />
</button>
