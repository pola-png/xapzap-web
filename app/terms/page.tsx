import type { Metadata } from 'next'

import { LegalPage } from '../../components/LegalPage'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Read the XapZap Terms of Service for the website and app, including user obligations, moderation rules, content policies, account enforcement, and deletion behavior.',
}

const sections = [
  {
    title: 'Agreement to these terms',
    body:
      'These Terms of Service govern access to and use of XapZap through the website, mobile app, Flutter web build, and related services. By accessing public content, creating an account, posting, commenting, following, liking, reporting, blocking, or otherwise using XapZap, the user agrees to these terms.',
  },
  {
    title: 'Eligibility and account integrity',
    body:
      'Users must provide accurate information, maintain the security of their credentials, and use only accounts they are authorized to control. Users are responsible for activity that occurs through their account unless they promptly report unauthorized access. XapZap may restrict, suspend, or remove accounts that violate eligibility rules, misrepresent identity, or expose the platform to legal or security risk.',
  },
  {
    title: 'Acceptable use',
    body:
      'Users may not use XapZap for unlawful conduct, harassment, hate speech, threats, sexual exploitation, spam, scams, malware distribution, impersonation, coordinated manipulation, fraud, or other abusive behavior. Attempts to bypass platform restrictions, abuse platform features, scrape protected data, or interfere with normal service operation are also prohibited.',
  },
  {
    title: 'User-generated content',
    body:
      'Users are responsible for the text, profile information, and other materials they submit to XapZap. By posting content, users represent that they have the right to share it and that it does not violate law, infringe third-party rights, or breach these terms. Public content may be viewed, shared, or referenced by others according to product design and platform availability.',
  },
  {
    title: 'Moderation and enforcement',
    body:
      'XapZap may review, restrict, remove, downrank, block, suspend, or ban content and accounts that violate these terms, the Privacy Policy, platform rules, or applicable law. Enforcement may be based on user reports, automated detection, internal review, or a combination of those methods. We may act without prior notice when safety, legal exposure, abuse prevention, or service integrity requires it.',
  },
  {
    title: 'Deletion and residual records',
    body:
      'Users may permanently delete their account through the supported deletion flow. XapZap attempts to remove core account data immediately after a confirmed deletion succeeds. Any limited residual records retained for security, moderation, fraud prevention, legal compliance, or system propagation must be described accurately in policy text. XapZap should not publish a guaranteed 30-day auto-delete promise unless that retention cleanup is actually implemented and enforced in production.',
  },
  {
    title: 'Availability of the service',
    body:
      'XapZap may change, suspend, or discontinue features, ranking systems, posting capabilities, moderation systems, or access flows at any time. We do not guarantee uninterrupted availability, but aim to operate the platform responsibly and improve reliability over time.',
  },
  {
    title: 'Disclaimers and limitation of liability',
    body:
      'To the maximum extent permitted by law, XapZap is provided on an as available basis without guarantees of uninterrupted service, absolute security, or error-free operation. XapZap is not liable for indirect, incidental, special, consequential, or punitive damages arising from user-generated content, platform use, unavailable service, or third-party conduct, except where liability cannot be excluded under applicable law.',
  },
  {
    title: 'Changes to these terms',
    body:
      'We may revise these Terms of Service as the product, moderation systems, infrastructure, or legal requirements change. Updated terms may be published on the website, in the app, or both. Continued use of XapZap after the effective date of revised terms means the user accepts the updated terms to the extent allowed by law.',
  },
  {
    title: 'Contact',
    body:
      'For policy, moderation, or account questions, contact support@xapzap.com.',
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="XapZap Terms of Service"
      eyebrow="Legal"
      intro="This page contains the public terms that govern use of XapZap on the website and app. It is intended for user reference, platform compliance, and store review."
      sections={sections}
      currentPath="/terms"
    />
  )
}
