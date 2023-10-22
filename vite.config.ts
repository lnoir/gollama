import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
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
