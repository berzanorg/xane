<script lang="ts">
	import { wallet } from '$lib/stores/wallet';
	import { onMount } from 'svelte';

	onMount(wallet.connectIfAuthorized);
</script>

<button
	on:click={wallet.connect}
	disabled={$wallet.isConnected}
	class="h-8 px-4 font-bold duration-200 rounded-full bg-amber-600 hover:bg-amber-500 active:bg-amber-500 hover:scale-95 active:scale-90 disabled:cursor-not-allowed disabled:hover:bg-amber-600 disabled:hover:scale-100"
>
	{#if $wallet.isConnected}
		Connected
	{:else}
		Connect
	{/if}
</button>
