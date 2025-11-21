import { cn } from "@/lib/utils";
import * as React from "react";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, onCheckedChange, id, className, ...props }, ref) => {
    return (
      <div className={cn("relative inline-flex items-center", className)}>
        <input
          id={id}
          ref={ref}
          type="checkbox"
          className="sr-only peer"
          checked={!!checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer-focus:ring-2 peer-focus:ring-ring peer-checked:bg-primary transition-colors relative">
          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
        </div>
      </div>
    );
  }
);

Switch.displayName = "Switch";
