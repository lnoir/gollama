<script lang="ts">
  export let totalPages: number;
  export let currentPage: number;
  export let onPageChange: (page: number) => void;
  const maxPageDisplay = 5;

  const handleClick = (page: number) => {
    if (page !== currentPage && page > 0 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    let pages = [];
    const halfMax = Math.floor(maxPageDisplay / 2);
    let startPage = Math.max(1, currentPage - halfMax);
    let endPage = Math.min(totalPages, currentPage + halfMax);

    if (endPage - startPage < maxPageDisplay - 1) {
      if (currentPage <= halfMax) {
        endPage = Math.min(totalPages, startPage + maxPageDisplay - 1);
      } else if (currentPage > totalPages - halfMax) {
        startPage = Math.max(1, endPage - maxPageDisplay + 1);
      }
    }

    if (startPage > 1) pages.push(1);
    if (startPage > 2) pages.push("...");

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages - 1) pages.push("...");
    if (endPage < totalPages) pages.push(totalPages);

    return pages;
  };
</script>

<ul class="flex list-none p-0">
  <li class={`mx-1 px-3 py-2 border ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <button on:click={() => handleClick(currentPage - 1)}>Previous</button></li>
  {#each getPageNumbers() as page}
    {#if page === "..."}
      <li class="mx-1 px-3 py-2 border">...</li>
    {:else}
      <li class={`mx-1 px-3 py-2 border ${currentPage === page ? 'bg-blue-500 text-white' : 'cursor-pointer'}`}>
        <button on:click={() => handleClick(Number(page))}>{page}</button>
      </li>
    {/if}
  {/each}
  <li class={`mx-1 px-3 py-2 border ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <button on:click={() => handleClick(currentPage + 1)}>Next</button>
  </li>
</ul>
