<script>
	import '../app.css'
	import Header from '$lib/components/Header.svelte'
	import { onMount } from 'svelte'
	import { wallet } from '$lib/stores/wallet'
	import Footer from '$lib/components/Footer.svelte'
	import Main from '$lib/components/Main.svelte'

	onMount(wallet.connectIfAuthorized)
</script>

<Header />
<Main>
	<slot />
</Main>
<Footer />
