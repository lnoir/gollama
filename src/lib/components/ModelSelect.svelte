

<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
  import IconRefresh from 'virtual:icons/tabler/refresh';
	import type { Model } from '../../types';
	import { selectedModel } from '../../stores/app.store';

  export let models: Model[] = [];
  export let model: string;

  const dispatch = createEventDispatcher();
  
  onMount(async () => {
    console.log({model, models});
    selectedModel.set(model);
    selectedModel.subscribe(selected => {
      model = selected;
      console.log('selected!', model);
    });
  });

  function handleChange() {
    dispatch('change', model);
    selectedModel.set(model);
  }
</script>

<div class="flex mx-auto max-w-lg">
  <button class="btn relative py-2 px-3" on:click={() => dispatch('refresh')} title="Refresh">
    <IconRefresh />
  </button>	
	<select
		class="select m-0 max-w-md mx-auto my-2 py-1.5 text-center cursor-pointer border-none dark:bg-slate-800 text-slate-300"
		placeholder="Select a model"
    size="1"
		bind:value={model}
		on:change={handleChange}>
		<option class="text-slate-300" value="">-- Select model --</option>
		{#each models as m}
			<option class="text-slate-300" value={m.name}>{m.name}</option>
		{/each}
	</select>
</div>