<script lang="ts" module>
	import type { HTMLParagraphAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	export type CardDescriptionProps = WithElementRef<HTMLParagraphAttributes>;
</script>

<script lang="ts">
	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CardDescriptionProps = $props();
</script>

<p
	bind:this={ref}
	data-slot="card-description"
	class={cn("text-sm text-zinc-400", className)}
	{...restProps}
>
	{@render children?.()}
</p>
