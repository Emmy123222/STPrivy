import { Book, Terminal, ShieldCheck, FileCode, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SECTIONS = [
  {
    icon: ShieldCheck,
    title: 'How It Works',
    content: [
      { heading: 'Privacy-preserving KYC', body: 'STPrivy lets you prove compliance requirements without exposing personal data. You complete KYC once with an approved provider, receive a verifiable credential anchored on Stellar, then generate zero-knowledge proofs to satisfy compliance checks.' },
      { heading: 'Zero-knowledge proofs', body: 'Proofs are generated from Noir circuits compiled with Barretenberg. A proof cryptographically asserts a claim (e.g. "age ≥ 18") without revealing the underlying data.' },
      { heading: 'Decentralised identity', body: 'Each user controls a W3C DID anchored to their Stellar public key. Credentials are issued to your DID and you can present them to any verifier.' },
    ],
  },
  {
    icon: Terminal,
    title: 'API Reference',
    content: [
      { heading: 'Authentication', body: 'GET /api/v1/auth/challenge?address=G… — request a nonce\nPOST /api/v1/auth/login — submit address + nonce + wallet signature → JWT' },
      { heading: 'DID', body: 'POST /api/v1/did/create — create DID for authenticated user\nGET /api/v1/did/:address — resolve DID document (public)' },
      { heading: 'Credentials', body: 'POST /api/v1/credentials/issue — issue credential (ISSUER/ADMIN)\nGET /api/v1/credentials — list own credentials\nPATCH /api/v1/credentials/:id/revoke — revoke credential' },
      { heading: 'Proofs', body: 'POST /api/v1/proofs/generate — generate ZK proof\nPOST /api/v1/proofs/:id/verify — verify proof\nGET /api/v1/proofs — list own proofs' },
    ],
  },
  {
    icon: FileCode,
    title: 'SDK',
    content: [
      { heading: 'TypeScript SDK (Phase 6)', body: 'A typed client SDK that wraps the REST API will be available in Phase 6.\n\nnpm install @stprivy/sdk' },
      { heading: 'React SDK', body: 'Provides hooks: useSTPrivy(), useCredentials(), useProofs() — pre-wired with authentication and TanStack Query.' },
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Book className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Documentation</h1>
            <p className="text-muted-foreground">Developer and user guide for STPrivy</p>
          </div>
          <Badge variant="warning" className="ml-auto">Alpha</Badge>
        </div>
      </div>

      <div className="space-y-8">
        {SECTIONS.map(({ icon: Icon, title, content }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {content.map(({ heading, body }) => (
                <div key={heading}>
                  <h3 className="mb-1 font-semibold text-sm">{heading}</h3>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
                    {body}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 rounded-md border p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Full API docs, smart contract ABIs, and circuit documentation will be published at launch.
        </p>
      </div>
    </main>
  );
}
