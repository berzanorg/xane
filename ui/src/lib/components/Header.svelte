<script>
	import { base } from '$app/paths';
	import ConnectButton from './ConnectButton.svelte';
</script>

<header
	class="sticky top-0 z-30 flex items-center justify-between px-4 border-b md:px-6 h-14 bg-neutral-900 border-neutral-700"
>
	<a href="{base}/" class="text-xl font-bold">Xane</a>
	<ConnectButton />
</header>
