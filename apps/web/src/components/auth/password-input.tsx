import { Button } from "@rdio/ui/components/button";
import { Input } from "@rdio/ui/components/input";
import { Eye, EyeOff } from "lucide-react";
import {
  type InputHTMLAttributes,
  type Ref,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "ref" | "type"> {
  ref?: Ref<HTMLInputElement>;
}

export function PasswordInput({
  className,
  ref,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  function toggle() {
    setVisible((value) => !value);
    // Keep focus on input after toggling password visibility.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <span className="password-input-wrap">
      <Input
        {...props}
        className={["bg-white", className].filter(Boolean).join(" ")}
        ref={inputRef}
        type={visible ? "text" : "password"}
      />
      <Button
        aria-label={visible ? "Hide password" : "Show password"}
        className="password-toggle"
        onClick={toggle}
        size="icon"
        type="button"
        variant="rdio-toggle"
      >
        {visible ? (
          <EyeOff aria-hidden="true" size={16} strokeWidth={2} />
        ) : (
          <Eye aria-hidden="true" size={16} strokeWidth={2} />
        )}
      </Button>
    </span>
  );
}
