<script>
	import '../app.css'
	import Header from '$lib/components/Header.svelte'
	import { onMount } from 'svelte'
	import { wallet } from '$lib/stores/wallet'
	import { Mina } from 'o1js'

	// Set active instance to Berkeley network.
	Mina.setActiveInstance(Mina.Network('https://proxy.berkeley.minaexplorer.com'))

	onMount(wallet.connectIfAuthorized)
</script>

<Header />

<slot />
