<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";

	export const alertVariants = tv({
		base: "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
		variants: {
			variant: {
				default: "bg-card text-card-foreground text-left",
				destructive:
					"text-destructive bg-card text-left *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current",
			},
			size: {
				default: "px-4 py-3",
				compact: "px-3 py-2 text-xs",
				tight: "px-2 py-1 text-xs",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type AlertSize = VariantProps<typeof alertVariants>["size"];
	export type AlertVariant = VariantProps<typeof alertVariants>["variant"];
</script>

<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		variant = "default",
		size = "default",
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariant;
		size?: AlertSize;
	} = $props();
</script>

<style>
	div {
		padding: 12px;
		padding-left: 10px;
		box-sizing: border-box;
		text-align: left;
	}
</style>

<div
	bind:this={ref}
	data-slot="alert"
	class={cn(alertVariants({ variant, size }), className)}
	{...restProps}
	role="alert"
>
	{@render children?.()}
</div>
