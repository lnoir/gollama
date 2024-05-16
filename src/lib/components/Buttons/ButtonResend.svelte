<script lang="ts">
	import IconArrowBackUp from 'virtual:icons/tabler/arrow-back-up';
	import { createEventDispatcher } from 'svelte';

	type Position = 'top' | 'bottom';

	export let text: string;
	export let title: string = 'Resend this message';
	export let classes = '';

	const dispatch = createEventDispatcher();
</script>

<button
	class="btn {classes}"
	{title}
	on:click={() => dispatch('click')}>
	<IconArrowBackUp />
</button>
