'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Coins,
  TrendingUp,
  Scale,
  Building2,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import { LandingNav } from '@/components/landing/landing-nav';

/* ─── Design tokens ──────────────────────────────────────────── */
const C = {
  pageBg: '#000000',
  sectionAlt: '#000000',
  purple: '#7F77DD',
  purpleDeep: '#534AB7',
  teal: '#1D9E75',
  cardBg: '#0F0F0F',
  textPrimary: '#F1EFE8',
  textSecondary: '#B4B2A9',
  textCaption: '#888780',
  red: '#E24B4A',
  codeBg: '#1A1A1A',
};

const FONT = 'var(--font-space-mono), "Space Mono", monospace';

/* ─── Reusable button primitives ─────────────────────────────── */
const btnBase: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: '2px',
  textTransform: 'uppercase',
  padding: '14px 28px',
  borderRadius: 4,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  display: 'inline-block',
};

const outlineBtn: React.CSSProperties = {
  ...btnBase,
  background: 'transparent',
  border: `1.5px solid ${C.textPrimary}`,
  color: C.textPrimary,
};

const filledBtn: React.CSSProperties = {
  ...btnBase,
  background: C.textPrimary,
  border: `1.5px solid ${C.textPrimary}`,
  color: '#000000',
};

/* ─── Section primitives ─────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: 400,
        letterSpacing: '3px',
        textTransform: 'uppercase',
        color: C.teal,
        marginBottom: 16,
      }}
    >
      {children}
    </p>
  );
}

function SectionHeading({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2
      style={{
        fontFamily: FONT,
        fontSize: 36,
        fontWeight: 700,
        lineHeight: 1.2,
        color: C.textPrimary,
        textAlign: center ? 'center' : undefined,
      }}
    >
      {children}
    </h2>
  );
}

/* ─── 2. Hero ────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section
      className="relative w-full overflow-hidden text-center"
      style={{ background: C.pageBg, paddingTop: 140, paddingBottom: 120, paddingLeft: 24, paddingRight: 24 }}
    >
      {/* Background video — pointer-events off so it never blocks clicks */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.15, pointerEvents: 'none' }}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(0,0,0,0.5) 0%,
            rgba(0,0,0,0.65) 60%,
            rgba(0,0,0,1) 100%
          )`,
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1200px]">
        {/* Label */}
        <p
          style={{
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: C.teal,
            marginBottom: 32,
          }}
        >
          Privacy-First Compliance on Stellar
        </p>

        {/* Headline */}
        <h1
          style={{
            fontFamily: FONT,
            fontSize: 'clamp(36px, 5.5vw, 64px)',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            color: C.textPrimary,
            maxWidth: 860,
            margin: '0 auto 24px',
          }}
        >
          Prove Who You Are.{' '}
          <br className="hidden sm:block" />
          <span style={{ color: C.purple }}>Reveal Nothing Else.</span>
        </h1>

        {/* Sub text */}
        <p
          style={{
            fontFamily: FONT,
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.7,
            color: C.textSecondary,
            maxWidth: 560,
            margin: '0 auto 56px',
          }}
        >
          zkKYC lets you verify identity, residency, and accreditation on the
          Stellar blockchain — without exposing personal data.
        </p>

        {/* Three buttons — styles applied directly to the anchor/Link, no nested button */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-[72px]">
          {/* HOW IT WORKS */}
          <a
            href="#how-it-works"
            style={{ ...outlineBtn, textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(241,239,232,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            How It Works
          </a>

          {/* TRY DEMO — connect wallet then lands on dashboard */}
          <Link
            href="/connect"
            style={{ ...outlineBtn, textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(241,239,232,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Try Demo →
          </Link>

          {/* GET STARTED — connect wallet then lands on dashboard */}
          <Link
            href="/connect"
            style={{ ...filledBtn, textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Get Started ↓
          </Link>
        </div>

        {/* Stat bar */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-0">
          {[
            '100,000 Users Supported',
            '< 5s Proof Generation',
            '1 Verification. Every App.',
          ].map((stat, i) => (
            <div key={stat} className="flex items-center">
              {i > 0 && (
                <span
                  className="mx-8 hidden sm:block"
                  style={{ width: 1, height: 16, background: C.textCaption, opacity: 0.4 }}
                />
              )}
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 400,
                  color: C.textCaption,
                  letterSpacing: '0.5px',
                }}
              >
                {stat}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 3. How It Works ────────────────────────────────────────── */
const HOW_STEPS = [
  { num: '01', title: 'Complete KYC', desc: 'Verify once with a trusted provider like Sumsub or Veriff. Takes under 3 minutes.' },
  { num: '02', title: 'Receive Credential', desc: 'A signed credential is issued to your DID and stored securely on your device.' },
  { num: '03', title: 'Generate Proof', desc: 'Create a zero-knowledge proof that reveals only what a verifier needs to know.' },
  { num: '04', title: 'Access Any App', desc: 'Use your proof across DeFi, RWAs, lending platforms and more — forever.' },
];

function HowItWorksSection() {
  // Duplicate cards so the loop is seamless
  const repeated = [...HOW_STEPS, ...HOW_STEPS];

  return (
    <section
      id="how-it-works"
      style={{ background: C.sectionAlt, paddingTop: 100, paddingBottom: 100 }}
    >
      <style>{`
        @keyframes zkScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .zk-track {
          animation: zkScroll 18s linear infinite;
        }
        .zk-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Heading stays centred with padding */}
      <div className="mx-auto max-w-[1200px] px-6 mb-14 text-center">
        <SectionLabel>How It Works</SectionLabel>
        <SectionHeading center>One verification. Reuse it everywhere.</SectionHeading>
      </div>

      {/* Constrained + centered overflow container */}
      <div className="mx-auto max-w-[1200px] px-6" style={{ overflow: 'hidden' }}>
        <div
          className="zk-track"
          style={{
            display: 'flex',
            gap: 24,
            width: 'max-content',
          }}
        >
          {repeated.map(({ num, title, desc }, i) => (
            <div
              key={`${num}-${i}`}
              style={{
                width: 280,
                flexShrink: 0,
                background: C.cardBg,
                border: '1px solid rgba(83,74,183,0.30)',
                borderRadius: 12,
                padding: 28,
              }}
            >
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: C.purple,
                  marginBottom: 12,
                }}
              >
                {num}
              </p>
              <h3
                style={{
                  fontFamily: FONT,
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: C.textPrimary,
                  marginBottom: 10,
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: 1.6,
                  color: C.textSecondary,
                }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 4. What Gets Revealed ──────────────────────────────────── */
function RevealCard({
  label,
  labelColor,
  title,
  children,
}: {
  label: string;
  labelColor: string;
  title: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    /* Outer wrapper — 2px gap acts as the "border" */
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 13,
        padding: 2,
        overflow: 'hidden',
        cursor: 'default',
        background: hovered
          ? 'transparent'
          : 'linear-gradient(135deg, #555 0%, #aaa 30%, #fff 50%, #aaa 70%, #555 100%)',
      }}
    >
      {/* Spinning conic gradient — only when hovered */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            width: '200%',
            height: '200%',
            top: '-50%',
            left: '-50%',
            background:
              'conic-gradient(from 0deg, transparent 0%, #888 15%, #e8e8e8 30%, #ffffff 45%, #e8e8e8 60%, #888 75%, transparent 90%)',
            animation: 'zkBorderSpin 2s linear infinite',
          }}
        />
      )}

      {/* Card content — sits above the spinner */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: C.cardBg,
          borderRadius: 11,
          padding: 24,
        }}
      >
        <p
          style={{
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: labelColor,
            marginBottom: 16,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: FONT,
            fontSize: 16,
            fontWeight: 700,
            color: C.textPrimary,
            marginBottom: 16,
          }}
        >
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

function WhatGetsRevealedSection() {
  return (
    <section
      style={{ background: C.pageBg, paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}
    >
      <style>{`
        @keyframes zkBorderSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div className="mx-auto max-w-[1200px]">
        <div className="mb-14 text-center">
          <SectionHeading center>Your data stays yours.</SectionHeading>
          <p
            style={{
              fontFamily: FONT,
              fontSize: 16,
              fontWeight: 400,
              lineHeight: 1.6,
              color: C.textSecondary,
              marginTop: 16,
            }}
          >
            Zero-knowledge proofs share only the minimum required claim — nothing more.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <RevealCard
            label="✓ Revealed"
            labelColor={C.teal}
            title="What Apps See"
          >
            <pre
              style={{
                background: C.codeBg,
                borderRadius: 8,
                padding: 16,
                fontFamily: "'Fira Code', 'Courier New', monospace",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              <code>
                <span style={{ color: '#546E7A' }}>{'//'} Verified claims only</span>
                {'\n'}
                <span style={{ color: '#89DDFF' }}>isAdult</span>
                <span style={{ color: '#B4B2A9' }}>:      </span>
                <span style={{ color: '#C3E88D' }}>true</span>
                {'\n'}
                <span style={{ color: '#89DDFF' }}>isUSResident</span>
                <span style={{ color: '#B4B2A9' }}>: </span>
                <span style={{ color: '#C3E88D' }}>true</span>
                {'\n'}
                <span style={{ color: '#89DDFF' }}>isAccredited</span>
                <span style={{ color: '#B4B2A9' }}>: </span>
                <span style={{ color: '#C3E88D' }}>true</span>
                {'\n'}
                <span style={{ color: '#89DDFF' }}>proofValid</span>
                <span style={{ color: '#B4B2A9' }}>:   </span>
                <span style={{ color: '#C3E88D' }}>true</span>
              </code>
            </pre>
          </RevealCard>

          <RevealCard
            label="✗ Never Revealed"
            labelColor={C.red}
            title="What Stays Hidden"
          >
            <pre
              style={{
                background: C.codeBg,
                borderRadius: 8,
                padding: 16,
                fontFamily: "'Fira Code', 'Courier New', monospace",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              <code>
                <span style={{ color: '#546E7A' }}>{'//'} Your personal data</span>
                {'\n'}
                <span style={{ color: '#B4B2A9' }}>fullName</span>
                <span style={{ color: '#B4B2A9' }}>:        </span>
                <span style={{ color: '#534AB7' }}>████████████</span>
                {'\n'}
                <span style={{ color: '#B4B2A9' }}>passportNumber</span>
                <span style={{ color: '#B4B2A9' }}>: </span>
                <span style={{ color: '#534AB7' }}>████████████</span>
                {'\n'}
                <span style={{ color: '#B4B2A9' }}>address</span>
                <span style={{ color: '#B4B2A9' }}>:         </span>
                <span style={{ color: '#534AB7' }}>████████████</span>
                {'\n'}
                <span style={{ color: '#B4B2A9' }}>dateOfBirth</span>
                <span style={{ color: '#B4B2A9' }}>:     </span>
                <span style={{ color: '#534AB7' }}>████████████</span>
              </code>
            </pre>
          </RevealCard>
        </div>
      </div>
    </section>
  );
}

/* ─── 5. Use Cases ───────────────────────────────────────────── */
const USE_CASES = [
  { icon: Layers,    title: 'DeFi Protocols',              desc: 'Enable compliant liquidity pools, trading, and yield products with permissioned access.' },
  { icon: Building2, title: 'Tokenized Real World Assets', desc: 'Gate access to tokenized securities and real estate with regulatory-grade checks.' },
  { icon: TrendingUp,title: 'Lending Platforms',           desc: 'Verify borrower identity and accreditation without storing sensitive KYC documents.' },
  { icon: Coins,     title: 'Stablecoin Platforms',        desc: 'Meet sanctions screening and AML requirements with privacy-preserving proofs.' },
  { icon: Scale,     title: 'DAO Governance',              desc: 'Prevent Sybil attacks and enforce one-person-one-vote with anonymous proofs.' },
  { icon: Globe,     title: 'Institutional Finance',       desc: 'On-board institutional investors with full compliance — zero raw data exposure.' },
];

function UseCasesSection() {
  return (
    <section
      id="use-cases"
      style={{ background: C.sectionAlt, paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-14 text-center">
          <SectionHeading center>Built for every corner of Stellar</SectionHeading>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                background: C.cardBg,
                border: '1px solid rgba(83,74,183,0.30)',
                borderRadius: 12,
                padding: 24,
              }}
            >
              <Icon className="mb-4 h-6 w-6" style={{ color: C.purple }} />
              <h3
                style={{
                  fontFamily: FONT,
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: C.textPrimary,
                  marginBottom: 10,
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: 1.6,
                  color: C.textSecondary,
                }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 6. For Developers ──────────────────────────────────────── */
const CODE_SNIPPET = [
  { type: 'keyword', text: 'import' },
  { type: 'text',    text: ' { STPrivy } ' },
  { type: 'keyword', text: 'from' },
  { type: 'string',  text: " '@stprivy/sdk'" },
  { type: 'text',    text: ';\n\n' },
  { type: 'keyword', text: 'const' },
  { type: 'fn',      text: ' client' },
  { type: 'text',    text: ' = ' },
  { type: 'keyword', text: 'new' },
  { type: 'fn',      text: ' STPrivy' },
  { type: 'text',    text: '({\n  ' },
  { type: 'prop',    text: 'network' },
  { type: 'text',    text: ': ' },
  { type: 'string',  text: "'stellar:mainnet'" },
  { type: 'text',    text: ',\n});\n\n' },
  { type: 'comment', text: '// Request a zero-knowledge age proof\n' },
  { type: 'keyword', text: 'const' },
  { type: 'fn',      text: ' proof' },
  { type: 'text',    text: ' = ' },
  { type: 'keyword', text: 'await' },
  { type: 'fn',      text: ' client.requestProof' },
  { type: 'text',    text: '({\n  ' },
  { type: 'prop',    text: 'circuit' },
  { type: 'text',    text: ': ' },
  { type: 'string',  text: "'age-proof'" },
  { type: 'text',    text: ',\n  ' },
  { type: 'prop',    text: 'minAge' },
  { type: 'text',    text: ': ' },
  { type: 'number',  text: '18' },
  { type: 'text',    text: ',\n});\n\n' },
  { type: 'comment', text: '// Verify — raw data never exposed\n' },
  { type: 'keyword', text: 'const' },
  { type: 'fn',      text: ' result' },
  { type: 'text',    text: ' = ' },
  { type: 'keyword', text: 'await' },
  { type: 'fn',      text: ' client.verify' },
  { type: 'text',    text: '(proof.id);\n' },
  { type: 'comment', text: '// → { verified: true, isAdult: true }\n' },
];

const TOKEN_COLORS: Record<string, string> = {
  keyword: '#C792EA', string: '#C3E88D', comment: '#546E7A',
  fn: '#82AAFF', prop: '#89DDFF', number: '#F78C6C', text: '#B4B2A9',
};

function ForDevelopersSection() {
  return (
    <section
      id="for-developers"
      style={{ background: C.pageBg, paddingTop: 100, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}
    >
      <div className="mx-auto grid max-w-[1200px] items-center gap-16 lg:grid-cols-2">
        {/* Left copy */}
        <div>
          <SectionLabel>For Developers</SectionLabel>
          <SectionHeading>Integrate compliance in minutes.</SectionHeading>
          <p
            style={{
              fontFamily: FONT,
              fontSize: 16,
              fontWeight: 400,
              lineHeight: 1.6,
              color: C.textSecondary,
              margin: '16px 0 32px',
            }}
          >
            Our TypeScript SDK and React components plug into any Stellar app.
            Request proofs, verify credentials, and stay compliant — without
            handling personal data.
          </p>
          <Link href="/docs">
            <button
              style={outlineBtn}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(241,239,232,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              View SDK Docs
            </button>
          </Link>
        </div>

        {/* Code block */}
        <div
          style={{
            background: C.codeBg,
            border: '1px solid rgba(83,74,183,0.30)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* Window chrome */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 20px',
              borderBottom: '1px solid rgba(83,74,183,0.20)',
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
            <span
              style={{
                marginLeft: 12,
                fontFamily: "'Fira Code', monospace",
                fontSize: 12,
                color: C.textCaption,
              }}
            >
              stprivy-sdk.ts
            </span>
          </div>
          <pre
            style={{
              padding: 24,
              fontFamily: "'Fira Code', 'Courier New', monospace",
              fontSize: 13,
              lineHeight: 1.8,
              overflowX: 'auto',
              background: 'transparent',
            }}
          >
            <code>
              {CODE_SNIPPET.map((token, i) => (
                <span key={i} style={{ color: TOKEN_COLORS[token.type] }}>
                  {token.text}
                </span>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}

/* ─── 7. Trusted Issuers ─────────────────────────────────────── */
const ISSUERS = [
  { name: 'Sumsub',  letter: 'S', color: '#2D9CDB' },
  { name: 'Veriff',  letter: 'V', color: '#3B82F6' },
  { name: 'Persona', letter: 'P', color: '#8B5CF6' },
];

function TrustedIssuersSection() {
  return (
    <section
      id="issuers"
      style={{ background: C.sectionAlt, paddingTop: 80, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }}
    >
      <div className="mx-auto max-w-[1200px]">
        <h3
          style={{
            fontFamily: FONT,
            fontSize: 24,
            fontWeight: 700,
            color: C.textPrimary,
            marginBottom: 48,
            letterSpacing: '-0.5px',
          }}
        >
          Trusted by leading KYC providers
        </h3>

        <div className="flex flex-wrap items-center justify-center gap-12">
          {ISSUERS.map(({ name, letter, color }) => (
            <div
              key={name}
              className="flex items-center gap-3 opacity-35 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
              style={{ cursor: 'default' }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT,
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {letter}
              </div>
              <span style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.textPrimary }}>
                {name}
              </span>
            </div>
          ))}
        </div>

        <p
          style={{
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 400,
            color: C.textSecondary,
            marginTop: 48,
          }}
        >
          Want to become an issuer?{' '}
          <a href="mailto:issuers@zkkyc.io" style={{ color: C.purple, textDecoration: 'underline' }}>
            Apply here
          </a>
        </p>
      </div>
    </section>
  );
}

/* ─── 8. CTA ─────────────────────────────────────────────────── */
function CTASection() {
  return (
    <section
      style={{ background: C.pageBg, paddingTop: 80, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}
    >
      <div className="mx-auto max-w-[1200px]">
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            borderRadius: 16,
            padding: '80px 40px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #26215C 0%, #000000 100%)',
          }}
        >
          <h2
            style={{
              fontFamily: FONT,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              lineHeight: 1.2,
              color: C.textPrimary,
              marginBottom: 16,
              letterSpacing: '-0.5px',
            }}
          >
            Start building privacy-first compliance.
          </h2>
          <p
            style={{
              fontFamily: FONT,
              fontSize: 16,
              fontWeight: 400,
              lineHeight: 1.6,
              color: C.textSecondary,
              marginBottom: 40,
            }}
          >
            Join the zkKYC ecosystem on Stellar today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/kyc/start">
              <button style={filledBtn}>Get Verified</button>
            </Link>
            <Link href="/docs">
              <button
                style={outlineBtn}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(241,239,232,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                Build with zkKYC
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 9. Footer ──────────────────────────────────────────────── */
const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [{ label: 'How It Works', href: '#how-it-works' }, { label: 'Docs', href: '/docs' }, { label: 'SDK', href: '/docs#sdk' }],
  },
  {
    heading: 'Ecosystem',
    links: [{ label: 'Stellar', href: 'https://stellar.org' }, { label: 'Soroban', href: 'https://soroban.stellar.org' }, { label: 'Issuers', href: '#issuers' }],
  },
  {
    heading: 'Company',
    links: [{ label: 'About', href: '#' }, { label: 'GitHub', href: '#' }, { label: 'Twitter', href: '#' }],
  },
];

function Footer() {
  return (
    <footer
      style={{
        background: C.pageBg,
        borderTop: '1px solid rgba(83,74,183,0.20)',
        paddingTop: 60,
        paddingBottom: 60,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo column */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" style={{ color: C.purple }} />
              <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: '#fff' }}>
                zkKYC
              </span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 400, lineHeight: 1.7, color: C.textSecondary }}>
              Privacy-preserving identity verification built on Stellar and Soroban smart contracts.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map(({ heading, links }) => (
            <div key={heading}>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: C.textPrimary,
                  marginBottom: 20,
                }}
              >
                {heading}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      style={{ fontFamily: FONT, fontSize: 14, fontWeight: 400, color: C.textSecondary, textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = C.purple)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = C.textSecondary)}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(83,74,183,0.15)', paddingTop: 24 }}>
          <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 400, color: C.textCaption, textAlign: 'center' }}>
            © 2025 zkKYC. Built on Stellar.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ background: C.pageBg, minHeight: '100vh', fontFamily: FONT }}>
      <LandingNav />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <WhatGetsRevealedSection />
        <UseCasesSection />
        <ForDevelopersSection />
        <TrustedIssuersSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
