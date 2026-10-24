import { cn } from "./lib/cn";

export interface SegmentedOption<TValue extends string> {
  readonly label: string;
  readonly value: TValue;
}

export interface SegmentedControlProps<TValue extends string> {
  readonly className?: string;
  readonly label: string;
  readonly onChange: (value: TValue) => void;
  readonly options: readonly SegmentedOption<TValue>[];
  readonly value: TValue;
}

export const SegmentedControl = <TValue extends string>({
  className,
  label,
  onChange,
  options,
  value
}: SegmentedControlProps<TValue>) => {
  return (
    <div aria-label={label} className={cn("al-segmented", className)} role="radiogroup">
      {options.map((option) => (
        <button
          aria-checked={option.value === value}
          className="al-segmented__item"
          key={option.value}
          onClick={() => {
            onChange(option.value);
          }}
          role="radio"
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
