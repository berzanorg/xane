<script>
	import ConnectButton from './ConnectButton.svelte'
	import Nav from './Nav.svelte'
</script>

<header class="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-black lg:px-6">
	<div class="flex w-40">
		<a href="/" class="text-2xl font-bold">Xane</a>
	</div>
	<div class="hidden lg:block">
		<Nav />
	</div>
	<div class="flex justify-end w-40">
		<ConnectButton />
	</div>
</header>
