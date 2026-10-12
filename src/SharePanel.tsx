import { useEffect, useId, useRef, useState } from 'react'
import { api, type Share } from './api'
import Avatar, { personName } from './Avatar'

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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const addErrorId = useId()
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
    const added = await run(() => api.putShare(target, checklistId), setAddError)
    if (added) setEmail('')
    // Back to the field either way: the Share button was disabled while busy, which dropped focus,
    // and the next step is another person (or fixing the email).
    emailRef.current?.focus()
  }

  async function remove(share: Share) {
    if (await run(() => api.deleteShare(share.id))) setRemoved(share)
  }

  // Re-grants the share.
  async function undoRemove() {
    if (!removed) return
    if (await run(() => api.putShare(removed.email, removed.checklistId))) setRemoved(null)
  }

  return (
    <div className="share-panel">
      {scoped.length === 0 ? (
        <p className="muted share-empty">Share this list to give someone full access — they can run it and change its items. Run it together from the list itself.</p>
      ) : (
        <ul className="share-list">
          {scoped.map((s) => (
            <li key={s.id} className="share-row">
              <Avatar person={s} className="sm" />
              <span className="share-email" title={s.email}>{s.name ? `${s.name} (${s.email})` : s.email}</span>
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
        <p className="muted share-form-note">A share gives full access to this list: they can run it and change its items. To run it together, use the list's Run together button.</p>
        <button type="submit" disabled={busy}>Share</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
