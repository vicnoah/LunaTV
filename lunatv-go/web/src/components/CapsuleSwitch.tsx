interface Option<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface CapsuleSwitchProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export default function CapsuleSwitch<T extends string>({
  options,
  value,
  onChange,
  className,
}: CapsuleSwitchProps<T>) {
  return (
    <div className={`inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1 gap-1 ${className || ''}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            value === option.value
              ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          {option.icon && <span>{option.icon}</span>}
          {option.label}
        </button>
      ))}
    </div>
  )
}
