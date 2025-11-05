<script lang="ts" module>
	import type { HTMLDivAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	export type CardHeaderProps = WithElementRef<HTMLDivAttributes>;
</script>

<script lang="ts">
	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CardHeaderProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="card-header"
	class={cn("flex flex-col space-y-2 px-6 py-5 md:px-8", className)}
	{...restProps}
>
	{@render children?.()}
</div>
