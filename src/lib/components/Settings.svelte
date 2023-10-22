<script lang="ts">
	import { ollamaService } from '$services/ollama.service';
	import { onMount } from 'svelte';
	import type { Model, SettingsMap } from '../../types';
	import { db } from '$services/db.service';
	import { RangeSlider } from '@skeletonlabs/skeleton';

	let models: Model[] = [];
	let formValues: SettingsMap = {
		ollama_host: '',
		default_model: '',
		options: {
			top_k: 40,
			top_p: 0.9,
			seed: 0,
			num_ctx: 4096
		},
		template: '',
		stream: true
	};

	onMount(async () => {
		models = await ollamaService.getModels();
		formValues = formValues;
		await refreshSettings();
	});

	async function refreshSettings() {
		const settings = await db.getSettings();
		settings.forEach((setting) => setFormValue(setting.name, setting.value));
		formValues = formValues;
	}

	function handleSubmit() {
		// Does nothing. All items are saved as they're changed.
	}

	async function updateSetting(e: Event) {
		const el = e.target as HTMLInputElement;
		if (!el) return;
		const optionName = el.dataset['name'] || el.id;
		const optionValue = getFormValue(optionName);
		await db.putSetting(optionName, optionValue);
	}

	function getFormValue(name: string) {
		if (!name) throw new Error('Invalid form value');

		// eslint-disable  @typescript-eslint/no-explicit-any
		return name.split('.').reduce((prev: any, curr: string) => {
			const o = prev || formValues;
			return o[curr];
		}, null);
	}

	function setFormValue(name: string, value: number | string) {
		if (!name) throw new Error(`Invalid setting: "${name}"`);
		const levels = name.split('.');
		// eslint-disable  @typescript-eslint/no-explicit-any
		return levels.reduce((prev: any, curr: string, i: number) => {
			const o = prev || formValues;
			if (i === levels.length - 1) {
				// We've reached the end, set the value
				o[curr] = value;
			}
			return o[curr];
		}, null);
	}
</script>

<div class="p-4 bg-slate-900 rounded-md">
	<form on:submit={handleSubmit}>
		<div class="my-4">
			<label for="ollama_host" class="block text-sm">Ollama Host</label>
			<div class="flex justify-between mt-1">
				<input
					type="text"
					id="ollama_host"
					class="input p-2 w-full border rounded-md"
					placeholder="http://localhost:11434"
					bind:value={formValues.ollama_host}
					on:change={updateSetting} />
			</div>
		</div>
		<div class="mb-4">
			<label for="default_model" class="block text-sm font-medium text-gray-300"
				>Default Model</label>
			<select
				id="default_model"
				class="select mt-1"
				placeholder="Choose a model..."
				bind:value={formValues.default_model}
				on:change={updateSetting}>
				<option value="" />
				{#each models as model}
					<option value={model.name}>{model.name}</option>
				{/each}
			</select>
		</div>

		<!-- Don't need these for now
    <div class="mt-4">
      <label for="template" class="block text-sm mb-1 font-medium text-gray-300">Template</label>
      <input id="template" bind:value={formValues.template} class="mt-1 p-2 w-full border rounded-md" />
    </div>

    <div class="mt-4">
      <label for="stream" class="text-sm font-medium text-gray-300 cursor-pointer">
        <span class="inline-block mb-1 mr-2">Stream</span>
        <input type="checkbox" id="stream" class="relative top-0.5 w-4 h-4"
          bind:checked={formValues.stream}
          on:change={updateSetting}
        />
      </label>
    </div>
    -->

		<!-- Options -->
		<div class="my-4">
			<span class="block text-md font-medium text-gray-300">Options</span>

			<div class="mt-1">
				<label for="options.top_k" class="block text-sm">Top K</label>
				<div class="flex justify-between">
					<div class="flex flex-col justify-center">
						<RangeSlider
							name="range-slider"
							class="dark:accent-cyan-500"
							min={1}
							max={40}
							step={1}
							accent="dark:accent-cyan-600"
							data-name="options.top_k"
							bind:value={formValues.options.top_k}
							on:change={updateSetting} />
					</div>
					<input
						type="number"
						id="options.top_k"
						class="input p-2 w-20 border rounded-md"
						bind:value={formValues.options.top_k}
						on:change={updateSetting} />
				</div>
			</div>

			<div class="mt-4">
				<label for="options.top_p" class="block text-sm">Top P</label>
				<div class="flex justify-between">
					<div class="flex flex-col justify-center">
						<RangeSlider
							name="range-slider"
							class="dark:accent-cyan-500"
							min={0.1}
							max={2}
							step={0.1}
							accent="dark:accent-cyan-600"
							data-name="options.top_p"
							bind:value={formValues.options.top_p}
							on:change={updateSetting} />
					</div>
					<input
						type="number"
						step="0.1"
						id="options.top_p"
						class="input p-2 w-20 border rounded-md mt-1"
						bind:value={formValues.options.top_p}
						on:change={updateSetting} />
				</div>
			</div>

			<div class="mt-4">
				<label for="options.seed" class="block text-sm">Seed</label>
				<input
					type="number"
					id="options.seed"
					class="p-2 w-full border rounded-md mt-1"
					bind:value={formValues.options.seed}
					on:change={updateSetting} />
			</div>

			<div class="mt-4 mb-8">
				<label for="options.num_ctx" class="block text-sm">Num Ctx</label>
				<div class="flex justify-between">
					<div class="flex flex-col justify-center">
						<RangeSlider
							name="range-slider"
							class="dark:accent-cyan-500"
							min={1024}
							max={4096}
							step={1024}
							accent="dark:accent-cyan-600"
							data-name="options.num_ctx"
							bind:value={formValues.options.num_ctx}
							on:change={updateSetting} />
					</div>
					<input
						type="number"
						id="options.num_ctx"
						class="p-2 w-20 border rounded-md mt-1"
						bind:value={formValues.options.num_ctx}
						on:change={updateSetting} />
				</div>
			</div>
		</div>
	</form>
</div>
