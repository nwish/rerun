import { db } from './db.js'

export type Access = 'owner' | 'edit'
/**
 * Whose checks a user sees and changes on a list: 'common' is the single run on the
 * list's items (the owner's, joined live by whoever the owner put in this run);
 * 'personal' is the user's own.
 */
export type Scope = 'common' | 'personal'

export const ACCESS_RANK: Record<Access, number> = { edit: 1, owner: 2 }

const statements = {
  owner: db.prepare('SELECT user_id FROM checklists WHERE id = ?'),
  // A share grants full access to one list; how someone takes part is decided by the live run.
  share: db.prepare('SELECT 1 FROM checklist_shares WHERE grantee_id = @me AND checklist_id = @id'),
  joined: db.prepare('SELECT 1 FROM live_run_members WHERE checklist_id = ? AND user_id = ? AND joined_at IS NOT NULL')
}

/** The user's access to a checklist and which checks they work on, or null when it isn't visible to them. */
export function resolveAccess(userId: number, checklistId: number): { access: Access; scope: Scope; ownerId: number } | null {
  const row = statements.owner.get(checklistId) as { user_id: number } | undefined
  if (!row) return null
  if (row.user_id === userId) return { access: 'owner', scope: 'common', ownerId: row.user_id }
  if (!statements.share.get({ me: userId, id: checklistId })) return null
  // Everyone the list is shared with can do everything to it; they work on their own checks
  // unless they are in the owner's current run.
  const inCommonRun = statements.joined.get(checklistId, userId) !== undefined
  return { access: 'edit', scope: inCommonRun ? 'common' : 'personal', ownerId: row.user_id }
}
