export function hasVerifiedBadge(entity: any): boolean {
  const e: any = entity || {}
  const verificationStatus = String(e.verificationStatus || '').trim().toLowerCase()
  const approvalStatus = String(e.upgradeApprovalStatus || '').trim().toLowerCase()

  return (
    !!e.isVerified ||
    !!e.isVerifiedCreator ||
    verificationStatus === 'verified' ||
    verificationStatus === 'creator' ||
    approvalStatus === 'approved'
  )
}

