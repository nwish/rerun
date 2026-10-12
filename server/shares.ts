import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { db } from './db.js'
import { apiLimiter } from './limits.js'
import { notifyOwner } from './live.js'
import { requireAuth, type AuthedRequest } from './middleware.js'

type ShareRow = { id: number; email: string; name: string | null; avatar: string | null; checklist_id: number }

const statements = {
  listShares: db.prepare(
    `SELECT s.id, u.email, u.display_name AS name, u.avatar, s.checklist_id
       FROM checklist_shares s
       JOIN users u ON u.id = s.grantee_id
      WHERE s.owner_id = ?
      ORDER BY u.email, s.id`
  ),
  // Only fully activated accounts (password set) can receive shares.
  findActiveUser: db.prepare('SELECT id FROM users WHERE email = ? AND pass_hash IS NOT NULL'),
  findOwnedChecklist: db.prepare('SELECT id FROM checklists WHERE id = ? AND user_id = ?'),
  findShare: db.prepare(
    'SELECT id FROM checklist_shares WHERE owner_id = ? AND grantee_id = ? AND checklist_id = ?'
  ),
  insertShare: db.prepare('INSERT INTO checklist_shares (owner_id, grantee_id, checklist_id) VALUES (?, ?, ?)'),
  getShare: db.prepare(
    `SELECT s.id, u.email, u.display_name AS name, u.avatar, s.checklist_id
       FROM checklist_shares s JOIN users u ON u.id = s.grantee_id
      WHERE s.id = ?`
  ),
  deleteShare: db.prepare('DELETE FROM checklist_shares WHERE id = ? AND owner_id = ?'),
  shareGrantee: db.prepare('SELECT grantee_id FROM checklist_shares WHERE id = ? AND owner_id = ?'),
  // A revoked share ends the person's place in the owner's live runs.
  pruneMembers: db.prepare(
    `DELETE FROM live_run_members
      WHERE user_id = @g
        AND checklist_id IN (SELECT id FROM checklists WHERE user_id = @owner)`
  )
}

function serialize(row: ShareRow) {
  return { id: row.id, email: row.email, name: row.name, avatar: row.avatar, checklistId: row.checklist_id }
}

// Unknown vs. known emails produce different errors, so keep guessing slow.
const shareLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'too many attempts, slow down' }
})

export const sharesRouter = Router()
sharesRouter.use(apiLimiter, requireAuth)

/** Shares the current user has granted, one per (person, list). */
sharesRouter.get('/', (req, res) => {
  const me = (req as unknown as AuthedRequest).user
  res.json({ shares: (statements.listShares.all(me.id) as ShareRow[]).map(serialize) })
})

/** Shares one checklist with a person. Sharing someone who is already shared changes nothing. */
sharesRouter.put('/', shareLimiter, (req, res) => {
  const me = (req as unknown as AuthedRequest).user
  const raw = req.body
  const body: Record<string, unknown> = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email || email.length > 254) {
    res.status(400).json({ error: 'email is required' })
    return
  }

  if (typeof body.checklistId !== 'number' || !Number.isInteger(body.checklistId)) {
    res.status(400).json({ error: 'checklistId is required' })
    return
  }
  if (!statements.findOwnedChecklist.get(body.checklistId, me.id)) {
    res.status(404).json({ error: 'checklist not found' })
    return
  }
  const checklistId = body.checklistId

  const grantee = statements.findActiveUser.get(email) as { id: number } | undefined
  if (!grantee) {
    res.status(404).json({ error: 'no active user with that email' })
    return
  }
  if (grantee.id === me.id) {
    res.status(400).json({ error: "you can't share with yourself" })
    return
  }

  const existing = statements.findShare.get(me.id, grantee.id, checklistId) as { id: number } | undefined
  if (existing) {
    res.json(serialize(statements.getShare.get(existing.id) as ShareRow))
    return
  }
  const id = Number(statements.insertShare.run(me.id, grantee.id, checklistId).lastInsertRowid)
  res.status(201).json(serialize(statements.getShare.get(id) as ShareRow))
})

sharesRouter.delete('/:id', (req, res) => {
  const me = (req as unknown as AuthedRequest).user
  const share = statements.shareGrantee.get(Number(req.params.id), me.id) as { grantee_id: number } | undefined
  if (!share) {
    res.status(404).json({ error: 'share not found' })
    return
  }
  statements.deleteShare.run(Number(req.params.id), me.id)
  statements.pruneMembers.run({ g: share.grantee_id, owner: me.id })
  notifyOwner(me.id)
  res.json({ ok: true })
})
