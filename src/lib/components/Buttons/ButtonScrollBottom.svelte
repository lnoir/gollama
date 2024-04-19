<script lang="ts">
  import IconArrowDown from 'virtual:icons/tabler/arrow-down';
  import { onMount, onDestroy } from 'svelte';

  export let target: string;
  export let root: string;

  let buttonVisible = false;
  let targetElement: Element | null;
  let rootElement: HTMLElement | null;

  onMount(() => {
    targetElement = document.querySelector(target);
    rootElement = document.querySelector(root) as HTMLElement;

    rootElement.addEventListener('scroll', checkScroll);
    checkScroll();

    return () => {
      if (rootElement) {
        rootElement.removeEventListener('scroll', checkScroll);
      }
    };
  });

  onDestroy(() => {
    rootElement?.removeEventListener('scroll', checkScroll);
  })

  function checkScroll() {
    if (targetElement && rootElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const rootRect = rootElement.getBoundingClientRect();

      // Check if the bottom of the target is above the bottom of the root
      buttonVisible = targetRect.bottom > rootRect.bottom;
    }
  }

  function scrollToTarget(): void {
    rootElement?.scrollTo({top: targetElement?.scrollHeight, behavior: 'smooth'});
  }
</script>

<button
  class="fixed left-1/2 bottom-24 z-50 p-2 m-2 border border-slate-400 bg-slate-700 rounded-full" on:click={scrollToTarget}
  class:hidden={!buttonVisible}>
  <IconArrowDown />
</button>
