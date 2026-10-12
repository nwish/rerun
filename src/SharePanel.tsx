import { useEffect, useId, useRef, useState } from 'react'
import { api, type Share, type SharePermission, type ShareMode } from './api'
import Avatar, { personName } from './Avatar'

const ACCESS_LABEL: Record<SharePermission, string> = { view: 'View items', edit: 'Edit items' }
const MODE_LABEL: Record<ShareMode, string> = { shared: 'Shared', collaborative: 'Collaborative' }

// What each choice means, shown under the dropdown and as a tooltip on an existing share's dropdown.
const ACCESS_HINT: Record<SharePermission, string> = {
  view: 'Can check items and reset the list.',
  edit: 'Can also add, change and remove items.'
}
const MODE_HINT: Record<ShareMode, string> = {
  shared: 'Runs it on their own, with their own checks and history.',
  collaborative: 'Works in your live run with you.'
}

/**
 * Manages shares for one checklist. `shares` is the owner's full share list;
 * this filters to shares on this list.
 */
export default function SharePanel({
  checklistId,
  shares,
  onChanged
}: {
  checklistId: number
  shares: Share[]
  onChanged: () => void
}) {
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<SharePermission>('view')
  const [mode, setMode] = useState<ShareMode>('shared')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const addErrorId = useId()
  const hintId = useId()
  const suggestId = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  // The most recently removed share, kept briefly so it can be undone.
  const [removed, setRemoved] = useState<Share | null>(null)

  useEffect(() => {
    if (!removed) return
    const timer = setTimeout(() => setRemoved(null), 8000)
    return () => clearTimeout(timer)
  }, [removed])

  const scoped = shares.filter((s) => s.checklistId === checklistId)
  // Suggest people already shared with on other lists who aren't on this one yet.
  // Only people the owner has already shared with, so this can't be used to probe which emails have accounts.
  const suggestions = Array.from(new Map(shares.filter((s) => !scoped.some((p) => p.email === s.email)).map((s) => [s.email, s])).values())

  // Failures of the add form show under the email field (setAddError); other actions use the panel-level error.
  async function run(action: () => Promise<unknown>, setFailure: (message: string | null) => void = setError) {
    setBusy(true)
    setFailure(null)
    try {
      await action()
      onChanged()
      return true
    } catch (err) {
      setFailure((err as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const target = email.trim()
    if (!target) return
    const added = await run(() => api.putShare(target, permission, mode, checklistId), setAddError)
    if (added) setEmail('')
    // Back to the field either way: the Share button was disabled while busy, which dropped focus,
    // and the next step is another person (or fixing the email).
    emailRef.current?.focus()
  }

  async function remove(share: Share) {
    if (await run(() => api.deleteShare(share.id))) setRemoved(share)
  }

  // Re-grants the share exactly as it was (same person, access, mode and scope).
  async function undoRemove() {
    if (!removed) return
    if (await run(() => api.putShare(removed.email, removed.permission, removed.mode, removed.checklistId))) setRemoved(null)
  }

  return (
    <div className="share-panel">
      {scoped.length === 0 ? (
        <p className="muted share-empty">Not shared with anyone.</p>
      ) : (
        <ul className="share-list">
          {scoped.map((s) => (
            <li key={s.id} className="share-row">
              <Avatar person={s} className="sm" />
              <span className="share-email" title={s.email}>{s.name ? `${s.name} (${s.email})` : s.email}</span>
              <div className="share-access">
                <select
                  value={s.permission}
                  disabled={busy}
                  onChange={(e) => run(() => api.putShare(s.email, e.target.value as SharePermission, s.mode, checklistId))}
                  aria-label={`Item access for ${s.email}`}
                  title={ACCESS_HINT[s.permission]}
                >
                  <option value="view">View items</option>
                  <option value="edit">Edit items</option>
                </select>
                <select
                  value={s.mode}
                  disabled={busy}
                  onChange={(e) => run(() => api.putShare(s.email, s.permission, e.target.value as ShareMode, checklistId))}
                  aria-label={`Run mode for ${s.email}`}
                  title={MODE_HINT[s.mode]}
                >
                  <option value="shared">Shared</option>
                  <option value="collaborative">Collaborative</option>
                </select>
              </div>
              <button type="button" className="ghost" disabled={busy} onClick={() => remove(s)} aria-label={`Stop sharing with ${s.email}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {removed && (
        <p className="share-undo" role="status">
          <span>Stopped sharing with {personName(removed)}.</span>
          <button type="button" className="link" disabled={busy} onClick={undoRemove}>
            Undo
          </button>
        </p>
      )}

      <form onSubmit={add} className="share-form">
        <input
          ref={emailRef}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setAddError(null)
          }}
          placeholder="Email of an existing user"
          maxLength={254}
          required
          aria-label="Email to share with"
          aria-invalid={addError !== null}
          aria-describedby={addError ? addErrorId : undefined}
          list={suggestId}
        />
        <datalist id={suggestId}>
          {suggestions.map((s) => (
            <option key={s.email} value={s.email} label={s.name ?? undefined} />
          ))}
        </datalist>
        {addError && (
          <p id={addErrorId} className="error share-form-error" role="alert">
            {addError}
          </p>
        )}
        <div className="share-field">
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as SharePermission)}
            aria-label="Item access"
            aria-describedby={`${hintId}-access`}
          >
            <option value="view">View items</option>
            <option value="edit">Edit items</option>
          </select>
          <span id={`${hintId}-access`} className="muted share-hint">{ACCESS_HINT[permission]}</span>
        </div>
        <div className="share-field">
          <select value={mode} onChange={(e) => setMode(e.target.value as ShareMode)} aria-label="Run mode" aria-describedby={`${hintId}-mode`}>
            <option value="shared">Shared</option>
            <option value="collaborative">Collaborative</option>
          </select>
          <span id={`${hintId}-mode`} className="muted share-hint">{MODE_HINT[mode]}</span>
        </div>
        <button type="submit" disabled={busy}>Share</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
