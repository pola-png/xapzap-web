import type { Metadata } from 'next'

import DeleteAccountCard from '../../components/DeleteAccountCard'
import { LegalPage } from '../../components/LegalPage'

export const metadata: Metadata = {
  title: 'Account Deletion',
  description:
    'Read how XapZap account deletion works, what data is removed, what may be retained, and how the supported deletion flow operates across the app and website.',
}

const sections = [
  {
    title: 'Purpose of this page',
    body:
      'This page explains how XapZap account deletion works across the website and app. It is intended for users, reviewers, and compliance teams who need a public description of the deletion process and data removal behavior.',
  },
  {
    title: 'How deletion works',
    body:
      'A signed-in user can permanently delete their account through the supported deletion flow. XapZap uses the same backend deletion function for account deletion so the web and app can follow the same server-side deletion path. Once confirmed, the service attempts to delete the profile, posts, comments, likes, follows, saves, blocks, reports, related account records, and active sessions immediately.',
  },
  {
    title: 'What may still remain temporarily',
    body:
      'Some limited residual technical, moderation, safety, or legal records may remain where necessary for system propagation, fraud prevention, security review, trust and safety history, dispute handling, or legal compliance. Any statement about a fixed automatic cleanup deadline must match the real production retention workflow. If XapZap wants to publish a 30-day cleanup promise, that rule should first be implemented and enforced operationally.',
  },
  {
    title: 'Effect on access and visibility',
    body:
      'After deletion completes, the deleted account should no longer be able to sign in through normal product flows and the deleted profile should no longer be available in the ordinary app experience. Removed posts and comments are expected to become unavailable through supported user-facing views, subject to lawful exceptions and system propagation timing.',
  },
  {
    title: 'Irreversibility',
    body:
      'Account deletion is intended to be permanent and should be treated as irreversible. Users should only proceed if they understand they may permanently lose access to their account, public history, and related data.',
  },
  {
    title: 'Questions about deletion',
    body:
      'For deletion, privacy, or moderation questions, contact support@xapzap.com.',
  },
]

export default function AccountDeletionPage() {
  return (
    <LegalPage
      title="XapZap Account Deletion"
      eyebrow="Legal"
      intro="This public page describes the XapZap account deletion process for the website and app. It can be used as the deletion policy URL for Play Console and user reference."
      sections={sections}
      currentPath="/account-deletion"
    >
      <DeleteAccountCard />
    </LegalPage>
  )
}
