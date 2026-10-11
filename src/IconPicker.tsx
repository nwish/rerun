import { useRef, useState, type ReactNode } from 'react'
import { CHECKLIST_ICON_NAMES, CHECKLIST_ICONS, checklistIcon, DEFAULT_CHECKLIST_ICON } from './icons'
import Modal from './Modal'

/** A tile that drops the icon entirely, for callers where "no icon" is a real choice. */
export type ClearChoice = { label: string; content: ReactNode }

/** Stands in for the default icon chip — e.g. the profile avatar itself is the trigger. */
export type PickerTrigger = { content: ReactNode; className: string; label: string }

/** The grid of icon choices; `clear` prepends the "no icon" option. */
function IconGrid({
  value,
  onChange,
  onClear,
  clear,
  groupLabel
}: {
  value: string | null
  onChange: (icon: string) => void
  onClear?: () => void
  clear?: ClearChoice
  groupLabel: string
}) {
  return (
    <div className="icon-picker" role="radiogroup" aria-label={groupLabel}>
      {clear && (
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          aria-label={clear.label}
          title={clear.label}
          className={`icon-swatch${value ? '' : ' active'}`}
          onClick={onClear}
        >
          {clear.content}
        </button>
      )}
      {CHECKLIST_ICON_NAMES.map((name) => {
        const Icon = CHECKLIST_ICONS[name]
        // With no icon chosen, the default only reads as selected when "no icon" isn't itself a choice.
        const active = value ? value === name : !clear && name === DEFAULT_CHECKLIST_ICON
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={name}
            title={name}
            className={`icon-swatch${active ? ' active' : ''}`}
            onClick={() => onChange(name)}
          >
            <Icon />
          </button>
        )
      })}
    </div>
  )
}

/** A compact trigger showing the current choice; click opens the full grid in a modal. */
export default function IconPicker({
  value,
  onChange,
  onClear,
  clear,
  title = 'Choose an icon',
  trigger
}: {
  value: string | null
  onChange: (icon: string) => void
  onClear?: () => void
  clear?: ClearChoice
  title?: string
  trigger?: PickerTrigger
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const Icon = checklistIcon(value)
  const label = trigger?.label ?? 'Choose icon'
  const triggerProps = {
    ref: triggerRef,
    type: 'button' as const,
    onClick: () => setOpen(true),
    'aria-haspopup': 'dialog' as const,
    'aria-expanded': open,
    'aria-label': label,
    title: label
  }

  return (
    <>
      {trigger ? (
        <button {...triggerProps} className={trigger.className}>
          {trigger.content}
        </button>
      ) : (
        <button {...triggerProps} className="icon-picker-trigger">
          <Icon />
        </button>
      )}
      {open && (
        <Modal title={title} onClose={() => setOpen(false)} returnFocus={triggerRef}>
          <IconGrid
            value={value}
            groupLabel={title}
            clear={clear}
            onClear={
              onClear
                ? () => {
                    onClear()
                    setOpen(false)
                  }
                : undefined
            }
            onChange={(icon) => {
              onChange(icon)
              setOpen(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
