import { writable } from 'svelte/store';

export const authEmail = writable<string>('');
