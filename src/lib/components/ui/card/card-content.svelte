<script lang="ts" module>
	import type { HTMLDivAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	export type CardContentProps = WithElementRef<HTMLDivAttributes>;
</script>

<script lang="ts">
	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CardContentProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="card-content"
	class={cn("px-6 pb-6 md:px-8 md:pb-8", className)}
	{...restProps}
>
	{@render children?.()}
</div>
