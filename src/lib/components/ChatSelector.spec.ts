import ChatSelector from './ChatSelector.svelte';
import { render } from '@testing-library/svelte';
import { expect, describe, it } from 'vitest';

const props = {
	show: true
};

describe('ChatSelector', () => {
	it('is rendered', async () => {
		const component = render(ChatSelector, {
			props
		});
		component.debug();
		expect(component).toBeTruthy();
	});
});
