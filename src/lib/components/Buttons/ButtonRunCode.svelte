<script lang="ts">
  	import IconPrompt from 'virtual:icons/tabler/prompt';

    export let onClick: any;
    export let code: string = '';

    async function handleClick() {
      if (onClick) onClick(code);
    }
</script>

<button class="btn absolute z-20" on:click={handleClick}>
  <IconPrompt />
</button>