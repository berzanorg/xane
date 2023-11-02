<script>
	import { onMount } from 'svelte';
	import Section from '$lib/components/Section.svelte';
	import { wallet } from '$lib/stores/wallet';

	onMount(async () => {
		//const { TokenX } = await import('../../../contracts/build/src/');
		//const zkAppAddress = '';
		//const zkApp = new TokenX(PublicKey.fromBase58(zkAppAddress))
	});
</script>

<svelte:head>
	<title>Xane - Decentralized Exchange</title>
</svelte:head>

<main class="flex flex-col">
	<Section>
		<h2 class="text-2xl font-bold">Network</h2>
		<p class="font-semibold text-amber-500">
			{$wallet.network ?? 'Auro Wallet is not connected'}
		</p>
	</Section>
	<Section>
		<h2 class="text-2xl font-bold">Address</h2>
		<p class="font-mono text-xs sm:text-base text-amber-500">
			{$wallet.address ?? 'Auro Wallet is not connected'}
		</p>
	</Section>
</main>
