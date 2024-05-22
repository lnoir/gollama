<script lang="ts">
  import { onMount } from 'svelte';
  import Paginate from '$components/Paginate.svelte';
	import { db } from '../services/db.service';

  interface RowData {
    [key: string]: any;
  }

  let query: string = `select id, title, model, started, system_msg from conversations`;
  let columns: string[] = [];
  let results: RowData[] = [];
  let currentPage: number = 1;
  let totalPages: number = 1;
  const itemsPerPage: number = 10;

  const fetchData = async (page: number, query: string) => {
    results = await db.queryDatabase({ page, itemsPerPage, query });
    if (results.length > 0) {
      columns = Object.keys(results[0]);
    }
    totalPages = results.length ? Math.ceil(results.length / itemsPerPage) : 0;
  };

  const handlePageChange = (page: number) => {
    currentPage = page;
    fetchData(currentPage, query);
  };

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    currentPage = 1;
    fetchData(currentPage, query);
  };

  onMount(() => {
    fetchData(currentPage, query);
  });
</script>

<div class="block relative mx-auto p-4 pt-0 pb-20">
  <form class="block mb-4 max-w-2xl mx-auto sticky top-0 bg-slate-900" on:submit={handleSubmit}>
    <textarea
      rows="5"
      type="text"
      bind:value={query}
      placeholder="Enter your query"
      class="block rounded p-4 mr-2 text-white w-full"
    />
    <button type="submit" class="bg-blue-500 text-white rounded px-4 py-1">Search</button>
  </form>

  <table class="table min-w-full h-full">
    <thead>
      <tr>
        {#each columns as column}
          <th class="py-2">{column}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each results as result}
        <tr class="table-row">
          {#each columns as column}
            <td class="table-cell px-4 py-2">{result[column]}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>

  <!--
  <div class="flex justify-center mt-4">
    <Paginate {totalPages} {currentPage} onPageChange={handlePageChange} />
  </div>
  -->
</div>