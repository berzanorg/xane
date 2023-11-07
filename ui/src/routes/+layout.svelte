<script>
	import '../app.css'
	import Header from '$lib/components/Header.svelte'
	import Footer from '$lib/components/Footer.svelte'
	import Main from '$lib/components/Main.svelte'
</script>

<Header />
<Main>
	<slot />
</Main>
<Footer />
