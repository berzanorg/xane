<script>
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import { onMount } from 'svelte';
	import { wallet } from '$lib/stores/wallet';

	onMount(wallet.connectIfAuthorized);
</script>

<Header />

<slot />
