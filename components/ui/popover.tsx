"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/lib/utils";

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverPortal({ ...props }: PopoverPrimitive.Portal.Props) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />;
}

function PopoverContent({
  className,
  children,
  ...props
}: PopoverPrimitive.Positioner.Props) {
  return (
    <PopoverPortal>
      <PopoverPrimitive.Positioner
        data-slot="popover-content"
        {...props}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-popup"
          className={cn(
            "w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5 outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPortal>
  );
}

export { Popover, PopoverContent, PopoverPortal, PopoverTrigger };

