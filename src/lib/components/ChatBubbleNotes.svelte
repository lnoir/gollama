<script>
  export let text;
  export let title = 'Click to expand';
  export let open = false;

  function toggle() {
    open = !open;
  }
</script>

<style>
  .accordion {
    border-radius: 5px;
    margin-bottom: 10px;
  }

  .header {
    padding: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .content {
    transition: max-height 0.3s ease-out;
    max-height: 0;
  }

  .content.open {
    max-height: none;
  }
</style>

<div class="accordion w-full">
  <button
    class="header text-gray-400"
    on:click={toggle}
  >
    {title}
  </button>
  <div
    class="content overflow-y-auto {open ? 'open' : ''}"
    style="max-height: {open ? '500px' : '0'};"
  >
    <pre class="p-4 whitespace-pre-wrap">{text}</pre>
  </div>
</div>