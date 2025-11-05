<script lang="ts" module>
	import type { HTMLHeadingAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	export type CardTitleProps = WithElementRef<HTMLHeadingAttributes>;
</script>

<script lang="ts">
	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CardTitleProps = $props();
</script>

<h3
	bind:this={ref}
	data-slot="card-title"
	class={cn("text-2xl font-semibold tracking-tight text-white", className)}
	{...restProps}
>
	{@render children?.()}
</h3>
