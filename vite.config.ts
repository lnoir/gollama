import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
	plugins: [
		wasm(),
		topLevelAwait(),
		sveltekit(),
		Icons({
			compiler: 'svelte'
		})
	],
	test: {
		globals: true,
		includeSource: ['src/**/*.{ts,svelte'],
		environment: 'jsdom'
	}
});
