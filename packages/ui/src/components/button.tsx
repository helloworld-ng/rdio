import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-4xl border border-transparent bg-clip-padding font-medium text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-transparent dark:hover:bg-input/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 dark:hover:bg-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
        "rdio-chrome":
          "border-[#cbd7da] bg-linear-to-b from-white to-[#edf4f6] text-[#5f6b70] hover:border-[#b6d9e4] hover:text-[#1598ca] focus-visible:border-[#b6d9e4] focus-visible:text-[#1598ca] focus-visible:ring-[#1598ca]/15",
        "rdio-destructive":
          "border-[#a73838] bg-linear-to-b from-[#e56d6d] to-[#c83f3f] text-white shadow-[inset_0_-1px_rgba(94,22,22,0.22)] hover:border-[#a73838] hover:from-[#e56d6d] hover:to-[#c83f3f] hover:text-white focus-visible:border-[#a73838] focus-visible:ring-[#d85a5a]/25",
        "rdio-primary":
          "border-[#1288b5] bg-linear-to-b from-[#2eb0d8] to-[#1598ca] text-white shadow-[inset_0_-1px_rgba(9,80,112,0.22)] hover:border-[#1288b5] hover:from-[#2eb0d8] hover:to-[#1598ca] hover:text-white focus-visible:border-[#1288b5] focus-visible:ring-[#1598ca]/25",
        "rdio-toggle":
          "border-[#d6e0e3] bg-linear-to-b from-white to-[#f3f7f7] text-[#8aa4ac] hover:border-[#c6d6db] hover:from-white hover:to-[#edf4f5] hover:text-[#30363a] focus-visible:border-[#a8d8e6] focus-visible:ring-[#1598ca]/15",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
