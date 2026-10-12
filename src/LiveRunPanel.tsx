import { useEffect, useState } from 'react'
import { api, type LivePerson } from './api'
import Avatar, { personName } from './Avatar'

const STATE_LABEL = { none: 'Not on the roster', invited: 'On the roster — waiting to join', requested: 'Wants to run this with you', joined: 'In the run' } as const

/**
 * The owner picks who runs this list with them; the roster persists across runs, and a run ends when
 * the list is reset or the owner ends it. `refreshKey` changes when someone joins or leaves.
 */
export default function LiveRunPanel({ checklistId, refreshKey, onChanged }: { checklistId: number; refreshKey: number; onChanged: () => void }) {
  const [people, setPeople] = useState<LivePerson[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .liveRun(checklistId)
      .then((r) => setPeople(r.people))
      .catch((err) => setError((err as Error).message))
  }, [checklistId, refreshKey])

  async function apply(action: () => Promise<{ people: LivePerson[] }>) {
    setBusy(true)
    setError(null)
    try {
      setPeople((await action()).people)
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // The panel edits one declarative roster. Requests are answered with Accept/Decline instead.
  function toggle(person: LivePerson) {
    if (!people) return
    const roster = people
      .filter((p) => p.email === person.email ? p.state === 'none' : p.state === 'invited' || p.state === 'joined')
      .map((p) => p.email)
    apply(() => api.setLiveRun(checklistId, roster))
  }

  if (people === null) return error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>

  const anyone = people.some((p) => p.state !== 'none')

  return (
    <section className="live-panel" aria-label="Run together">
      <p className="muted live-panel-intro">
        Pick who runs this list with you. You all check the same items until you reset the list or end the run.
      </p>
      {people.length === 0 ? (
        <p className="muted">Nobody has this list yet. Use the share icon on the Checklists page to share it first.</p>
      ) : (
        <ul className="live-people">
          {people.map((p) => (
            <li key={p.email}>
              {p.state === 'requested' ? (
                <div className="live-person">
                  <Avatar person={p} className="sm" />
                  <span className="live-person-name" title={p.email}>{personName(p)}</span>
                  <span className="muted live-person-status">{STATE_LABEL.requested}</span>
                  <span className="live-person-actions">
                    <button type="button" disabled={busy} onClick={() => apply(() => api.respondLiveRequest(checklistId, p.email, true))}>
                      Accept
                    </button>
                    <button type="button" className="ghost" disabled={busy} onClick={() => apply(() => api.respondLiveRequest(checklistId, p.email, false))}>
                      Decline
                    </button>
                  </span>
                </div>
              ) : (
                <label className="live-person">
                  <input type="checkbox" checked={p.state !== 'none'} disabled={busy} onChange={() => toggle(p)} />
                  <Avatar person={p} className="sm" />
                  <span className="live-person-name" title={p.email}>{personName(p)}</span>
                  <span className="muted live-person-status">{STATE_LABEL[p.state]}</span>
                </label>
              )}
            </li>
          ))}
        </ul>
      )}
      {people.length > 0 && !anyone && <p className="muted">Nobody is on the roster yet.</p>}
      {anyone && (
        <button type="button" className="ghost live-end" disabled={busy} onClick={() => apply(() => api.endLiveRun(checklistId))}>
          End live run
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
