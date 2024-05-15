<script lang="ts">
  type ExecutionResult = {
    result: any;
    logs: any[];
  }
  export let output: ExecutionResult | null = null;

</script>

{#if output}
	<div class="bg-gray-800 text-gray-200 p-4 mb-4 rounded-lg font-mono">
		{#if output?.logs.length > 0}
			<div class="mt-4">
				<div class="font-bold mb-2">Console Logs:</div>
				{#each output.logs as log}
					<pre class="my-1">{log}</pre>
				{/each}
			</div>
		{/if}
    <div class="font-bold mt-4 mb-2">Result:</div>
		<pre>{output.result}</pre>

    <div class="flex justify-end">
		  <button on:click={() => (output = null)}>Clear</button>
    </div>
	</div>
{/if}

