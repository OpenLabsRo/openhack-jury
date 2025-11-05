<script lang="ts" module>
	import type { HTMLDivAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	export type CardProps = WithElementRef<HTMLDivAttributes>;
</script>

<script lang="ts">
	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CardProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn("rounded-[13px] border border-[#2E2E2E] bg-[#171717] text-white", className)}
	{...restProps}
>
	{@render children?.()}
</div>
