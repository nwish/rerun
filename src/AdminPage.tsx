import { useEffect, useState } from 'react'
import { api, type AdminUser, type Me, type UserBlastRadius } from './api'
import Avatar, { personName } from './Avatar'
import Modal from './Modal'

export default function AdminPage({ me }: { me: Me }) {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null)
  const [registrationSaving, setRegistrationSaving] = useState(false)
  const [settingError, setSettingError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [blast, setBlast] = useState<UserBlastRadius | null>(null)
  const [blastError, setBlastError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.users().then((r) => setUsers(r.users)).catch(() => setUsers([]))
    api.adminSettings().then((s) => setRegistrationOpen(s.registrationOpen)).catch(() => setSettingError('Could not load settings'))
  }, [])

  async function refresh() {
    const r = await api.users()
    setUsers(r.users)
  }

  async function setRegistration(next: boolean) {
    if (registrationOpen === null || registrationSaving) return
    setRegistrationSaving(true)
    setSettingError(null)
    try {
      const s = await api.setRegistrationOpen(next)
      setRegistrationOpen(s.registrationOpen)
    } catch (err) {
      setSettingError((err as Error).message)
    } finally {
      setRegistrationSaving(false)
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFeedback(null)
    try {
      const r = await api.invite(email)
      setFeedback(r.mail === 'sent' ? `Invited ${r.email}${r.resent ? ' (resent)' : ''}` : `User ${r.email} created — email was logged to the server (SMTP_HOST not set)`)
      setEmail('')
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function resend(target: string) {
    setResending(target)
    setError(null)
    setFeedback(null)
    try {
      const r = await api.invite(target)
      setFeedback(`Invite resent to ${r.email}`)
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setResending(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.deleteUser(deleteTarget.id)
      setDeleteTarget(null)
      setBlast(null)
      await refresh()
    } catch (err) {
      setDeleteError((err as Error).message)
      setDeleting(false)
    }
  }

  function closeDelete() {
    if (deleting) return
    setDeleteTarget(null)
    setBlast(null)
    setBlastError(null)
    setDeleteError(null)
  }

  function openDelete(user: AdminUser) {
    setDeleteTarget(user)
    setBlast(null)
    setBlastError(null)
    setDeleteError(null)
    api.userBlast(user.id).then(setBlast).catch((err) => setBlastError((err as Error).message))
  }

  const members = (users ?? []).filter((u) => u.activated)
  const pending = (users ?? []).filter((u) => !u.activated)

  return (
    <>
      <div className="status-readout">
        <div className="segment">
          <span className="value">{users?.length ?? '\u2014'}</span>
          <span className="label">Total users</span>
        </div>
        <div className="segment">
          <span className="value">{members.length}</span>
          <span className="label">Active</span>
        </div>
        <div className="segment">
          <span className="value">{pending.length}</span>
          <span className="label">Pending invites</span>
        </div>
      </div>

      <div className="panel-grid">
        <div className="admin-side">
          <section className="card">
            <h2>Invite a user</h2>
            <p className="muted">They get an email with a single-use link to set their own password.</p>
            <form onSubmit={invite} className="form">
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="teammate@example.com" />
              </label>
              {error && <p className="error">{error}</p>}
              {feedback && <p className="ok">{feedback}</p>}
              <button type="submit" disabled={busy}>{busy ? 'Inviting…' : 'Send invite'}</button>
            </form>
          </section>

          <section className="card">
            <h2>Registration</h2>
            <p className="muted">
              {registrationOpen === null
                ? 'Loading…'
                : registrationOpen
                  ? 'Open: anyone who can reach this page can create an account without an invitation. New accounts get the user role.'
                  : 'Closed: new people join only by invitation.'}
            </p>
            {settingError && <p className="error">{settingError}</p>}
            <label className="registration-toggle">
              <input
                type="checkbox"
                checked={registrationOpen ?? false}
                disabled={registrationOpen === null || registrationSaving}
                onChange={(e) => setRegistration(e.target.checked)}
              />
              <span className="registration-switch" aria-hidden="true" />
              <span>Open registration</span>
            </label>
          </section>
        </div>

        <section className="card">
          <h2>Users</h2>
          {users === null ? (
            <p className="muted">Loading…</p>
          ) : (
            <ul className="user-list">
              {members.map((u) => (
                <li key={u.email} className="user-row">
                  <Avatar person={u} />
                  <div className="user-meta">
                    <span className="user-email">{personName(u)}</span>
                    {u.name && <span className="user-submeta" title={u.email}>{u.email}</span>}
                    <span className="muted user-submeta">Joined {u.activated_at ? new Date(u.activated_at).toLocaleDateString() : u.created_at.slice(0, 10)}</span>
                  </div>
                  <span className={u.role === 'admin' ? 'badge badge-admin' : 'badge'}>{u.role}</span>
                  {u.id !== me.id && (
                    <div className="user-actions">
                      <button type="button" className="ghost danger" onClick={() => openDelete(u)}>
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {pending.map((u) => (
                <li key={u.email} className="user-row">
                  <Avatar person={u} className="pending" />
                  <div className="user-meta">
                    <span className="user-email">{u.email}</span>
                    <span className="muted">Invited {u.invited_at ? new Date(u.invited_at).toLocaleDateString() : u.created_at.slice(0, 10)}</span>
                  </div>
                  <span className="badge badge-pending">Pending</span>
                  <div className="user-actions">
                    <button type="button" className="ghost" onClick={() => resend(u.email)} disabled={resending === u.email}>
                      {resending === u.email ? 'Resending…' : 'Resend'}
                    </button>
                    <button type="button" className="ghost danger" onClick={() => openDelete(u)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {members.length + pending.length === 0 && <li className="muted">No users yet</li>}
            </ul>
          )}
        </section>
      </div>

      {deleteTarget && (
        <Modal title={`Delete ${personName(deleteTarget)}’s account?`} onClose={closeDelete}>
          <p className="muted">
            This permanently deletes the account
            {deleteTarget.activated ? '' : ', an invitation that was never accepted,'} and everything
            only this account could see. It can’t be undone.
          </p>
          {blast === null && !blastError && <p className="muted">Checking what belongs to this account…</p>}
          {blastError && (
            <p className="error" role="alert">
              {blastError}
            </p>
          )}
          {blast && (
            blastLines(blast.blast).length === 0 ? (
              <p className="muted">Nothing else belongs to this account.</p>
            ) : (
              <ul className="blast-list">
                {blastLines(blast.blast).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )
          )}
          {deleteError && (
            <p className="error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={closeDelete} disabled={deleting}>
              Cancel
            </button>
            <button type="button" className="ghost danger" onClick={confirmDelete} disabled={deleting || blast === null}>
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** One line per thing the cascade takes, so the admin sees the damage before confirming. */
function blastLines(blast: UserBlastRadius['blast']): string[] {
  const lines: string[] = []
  if (blast.lists) lines.push(`${count(blast.lists, 'checklist')}${blast.items ? `, with ${count(blast.items, 'item')}` : ''}`)
  if (blast.runs) lines.push(`${blast.runs} finished run ${blast.runs === 1 ? 'record' : 'records'}`)
  if (blast.unattributedRuns)
    lines.push(
      `${blast.unattributedRuns} run${blast.unattributedRuns === 1 ? '' : 's'} they finished on someone else’s list ${blast.unattributedRuns === 1 ? 'stays' : 'stay'}, without an author`
    )
  if (blast.sharePartners) lines.push(`their sharing with ${count(blast.sharePartners, 'person')}`)
  if (blast.sharesHeld) lines.push(`their access to ${count(blast.sharesHeld, 'list')} shared by other people`)
  if (blast.liveRuns) lines.push(`their place in ${count(blast.liveRuns, 'live run')}`)
  if (blast.personalChecks) lines.push('their checks on other people’s lists')
  if (blast.sessions) lines.push(`signed out of ${count(blast.sessions, 'device')}`)
  return lines
}
