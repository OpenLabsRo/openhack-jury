<script lang="ts" module>
	import type { HTMLDivAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	export type CardFooterProps = WithElementRef<HTMLDivAttributes>;
</script>

<script lang="ts">
	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CardFooterProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="card-footer"
	class={cn("flex items-center px-6 pb-6 pt-4 md:px-8 md:pb-8", className)}
	{...restProps}
>
	{@render children?.()}
</div>
