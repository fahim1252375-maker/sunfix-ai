import React, { Suspense, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Box, CheckCircle2, FileText, ShieldAlert, Wrench } from 'lucide-react';
import { EditorialHeadline } from '../components/EditorialHeadline';
import { AccountDialog } from '../components/AccountDialog';
import { HybridAISection } from '../components/HybridAISection';
import { LifecycleStageVisual } from '../components/LifecycleStageVisuals';
import { SolarTwinSvg2D } from '../components/SolarTwinSvg2D';
import { useSunFix } from '../context/SunFixContext';
import { DEMO_ASSETS, DEMO_FAULT_SCENARIOS, LIFECYCLE_STAGES } from '../data/demoData';
import { TOKENS } from '../theme/tokens';
import { getAppCheckStatus, isFirebaseConfigured } from '../services/firebase';
import { SAFETY_HAZARD_CHECKS } from '../utils/diagnosticsLogic';

const SolarDigitalTwin3D = React.lazy(() =>
  import('../components/SolarDigitalTwin3D').then((m) => ({ default: m.SolarDigitalTwin3D })),
);

export const WelcomeView: React.FC = () => {
  const {
    navigate,
    user,
    authError,
    assets,
    selectedTwinComponentId,
    setSelectedTwinComponentId,
    activeFaultScenario,
    applyFaultScenario,
    twinRecoveryPulse,
    twinHourDecimal,
    setTwinHourDecimal,
  } = useSunFix();

  const reducedMotion = useReducedMotion();
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountDialogMode, setAccountDialogMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const openAccountDialog = (mode: 'sign-in' | 'sign-up') => {
    setAccountDialogMode(mode);
    setAccountDialogOpen(true);
  };

  // Keep the public preview functional without showing an account-setup interstitial.
  const primaryAsset = assets[0] || DEMO_ASSETS[0];
  const firebaseConfigured = isFirebaseConfigured();
  const appCheckStatus = getAppCheckStatus();

  const onboardingSteps = [
    {
      index: '01',
      title: 'Inspect the 48 kWp Digital Twin',
      body: 'Start at the Mesa Ridge rooftop topology. Rotate the 120-module array, adjust simulated solar hours from 06:00 to 18:00, explode the hybrid inverter, and select a faulted subsystem.',
      route: 'digital-twin' as const,
      cta: 'Open 3D Digital Twin',
    },
    {
      index: '02',
      title: 'Screen Safety & Run Hybrid AI',
      body: 'Every intake passes the deterministic 9-point Safety Hazard Gate first. When Firebase AI Logic and App Check are configured, successful model responses report LOCAL or CLOUD; otherwise the app clearly reports an offline fallback or an unavailable service.',
      route: 'diagnostics' as const,
      cta: 'Launch Diagnostic Wizard',
    },
    {
      index: '03',
      title: 'Execute Repairs & Export FieldProof',
      body: 'Convert verified findings into safety-gated work orders persisted offline in IndexedDB, log before/after FieldProof records, and print audit-ready Service Reports.',
      route: 'reports' as const,
      cta: 'Explore Service Reports',
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col editorial-vignette"
      style={{ backgroundColor: TOKENS.ink, color: TOKENS.bone }}
    >
      {/* Sticky 3-Zone Editorial Top Bar */}
      <header
        className="sticky top-0 z-40 border-b px-4 sm:px-8 py-4"
        style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}
      >
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-6">
          <a
            href="#top"
            className="font-display text-lg sm:text-xl tracking-tight whitespace-nowrap shrink-0"
            style={{ color: TOKENS.bone }}
          >
            SunFix <em className="italic" style={{ color: TOKENS.brass }}>Field</em>
          </a>

          <nav
            className="hidden md:flex items-center gap-7 text-xs sm:text-sm"
            style={{ color: TOKENS.sage }}
            aria-label="Landing navigation"
          >
            <a href="#lifecycle" className="hover:underline whitespace-nowrap">
              Lifecycle
            </a>
            <a href="#twin-showcase" className="hover:underline whitespace-nowrap">
              Twin
            </a>
            <a href="#hybrid-ai" className="hover:underline whitespace-nowrap">
              Hybrid AI
            </a>
            <a href="#safety-gate" className="hover:underline whitespace-nowrap">
              Safety
            </a>
            <a href="#onboarding" className="hover:underline whitespace-nowrap">
              Field Guide
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => user ? navigate('dashboard') : openAccountDialog('sign-in')}
              className="inline-flex px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap"
              style={{
                backgroundColor: TOKENS.moss,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.bone,
              }}
            >
              {user ? user.displayName?.split(' ')[0] || 'Account' : 'Sign in'}
            </button>

            {!user ? (
              <button
                type="button"
                onClick={() => openAccountDialog('sign-up')}
                className="px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
              >
                Create account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('dashboard')}
                className="px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
              >
                Open Workspace
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 pb-16 sm:pt-20 sm:pb-20 space-y-12">
          <div
            role="status"
            aria-label="Platform services and account readiness"
            className="rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-5 text-xs"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong }}
          >
            <span className="font-mono-tech font-semibold tracking-wider whitespace-nowrap" style={{ color: TOKENS.brass }}>
              PLATFORM STATUS
            </span>
            <p className="leading-relaxed" style={{ color: TOKENS.sage }}>
              {!firebaseConfigured
                ? 'Account access is being connected. The rooftop model and example records on this page are provided for preview.'
                : appCheckStatus.state === 'active_enterprise'
                  ? 'The account provider is configured and app security checks are active. The rooftop model and example records shown here are illustrative.'
                  : 'Account sign-in is configured. Cloud sync and AI services are awaiting security verification; the rooftop model and example records shown here are illustrative.'}
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 space-y-6">
              <div className="font-mono-tech text-xs uppercase tracking-widest" style={{ color: TOKENS.brass }}>
                Solar Field Operations · Hybrid AI & Digital Twin
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-[4.25rem] leading-[1.03]" style={{ color: TOKENS.bone }}>
                <EditorialHeadline text="Powering smarter *solar* maintenance." />
              </h1>
              <p className="text-base sm:text-lg max-w-2xl leading-relaxed" style={{ color: TOKENS.sage }}>
                Explore an interactive commercial rooftop model in 3D, screen hazards before work begins, and inspect source-aware AI routing. Cloud sync and live AI services become available after account and security checks pass.
              </p>

              {authError && (
                <div
                  className="p-3 rounded-lg border text-xs"
                  style={{
                    backgroundColor: TOKENS.moss,
                    borderColor: TOKENS.terracotta,
                    color: TOKENS.terracotta,
                  }}
                >
                  {authError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('dashboard')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                  style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
                >
                  Explore Workspace
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('digital-twin')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: TOKENS.moss,
                    borderColor: TOKENS.hairlineStrong,
                    color: TOKENS.bone,
                  }}
                >
                  <Box className="w-4 h-4" style={{ color: TOKENS.brass }} />
                  Open Full 3D Twin
                </button>
              </div>
            </div>

            <div
              className="lg:col-span-4 border-l pl-6 space-y-3 text-xs hidden lg:block"
              style={{ borderColor: TOKENS.hairlineStrong }}
            >
              <div className="font-mono-tech uppercase" style={{ color: TOKENS.brass }}>
                Sample Site Preview
              </div>
              <div className="font-display text-lg" style={{ color: TOKENS.bone }}>
                {primaryAsset.name.replace(/\s*\[DEMO\]/i, '')}
              </div>
              <p className="leading-relaxed" style={{ color: TOKENS.sage }}>
                Example diagnostic scenario: {activeFaultScenario.description}
              </p>
              <div className="font-mono-tech text-[11px]" style={{ color: TOKENS.mint }}>
                {firebaseConfigured ? 'Google account connection available · Cloud services awaiting security verification' : 'Account connection pending'}
              </div>
            </div>
          </div>

          {/* Embedded Live Mesa Ridge 48 kWp 3D Twin Preview */}
          <div className="h-[460px] sm:h-[520px] w-full">
            <Suspense
              fallback={
                <SolarTwinSvg2D
                  components={primaryAsset.components}
                  selectedComponentId={selectedTwinComponentId}
                  onSelectComponent={setSelectedTwinComponentId}
                  recoveryPulse={twinRecoveryPulse}
                  capacityKw={primaryAsset.capacityKw}
                  hourDecimal={twinHourDecimal}
                  onChangeHourDecimal={setTwinHourDecimal}
                  activeScenario={activeFaultScenario}
                  scenarioOptions={DEMO_FAULT_SCENARIOS}
                  activeScenarioId={activeFaultScenario.id}
                  onChangeScenario={applyFaultScenario}
                />
              }
            >
              <SolarDigitalTwin3D
                components={primaryAsset.components}
                selectedComponentId={selectedTwinComponentId}
                onSelectComponent={setSelectedTwinComponentId}
                recoveryPulse={twinRecoveryPulse}
                scenarioOptions={DEMO_FAULT_SCENARIOS}
                activeScenarioId={activeFaultScenario.id}
                onChangeScenario={applyFaultScenario}
                capacityKw={primaryAsset.capacityKw}
                hourDecimal={twinHourDecimal}
                onChangeHourDecimal={setTwinHourDecimal}
              />
            </Suspense>
          </div>
        </section>

        {/* Proof Strip — clearly identified illustrative model specifications */}
        <section className="border-y" style={{ borderColor: TOKENS.hairline, backgroundColor: TOKENS.moss }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                value: '48 kWp',
                tag: 'INTERACTIVE TWIN MODEL',
                label: '120 instanced PV modules across 6 strings',
              },
              {
                value: '3 Modes',
                tag: 'SOURCE-AWARE ROUTING',
                label: 'On-device and cloud AI when available; offline fallback is clearly identified',
              },
              {
                value: '9 Checks',
                tag: 'DETERMINISTIC GATE',
                label: 'Zero-bypass Stop-Work electrical safety hold',
              },
              {
                value: 'Offline',
                tag: 'BROWSER-LOCAL WORKSPACE',
                label: 'IndexedDB persistence; Firestore sync when configured',
              },
            ].map((stat) => (
              <div key={stat.tag} className="space-y-1">
                <div className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: TOKENS.brass }}>
                  {stat.tag}
                </div>
                <div className="font-display text-2xl sm:text-3xl tabular-nums" style={{ color: TOKENS.bone }}>
                  {stat.value}
                </div>
                <div className="text-xs leading-snug" style={{ color: TOKENS.sage }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 01 · End-to-End Field Service Lifecycle (6 Clickable Animated Case-Study Stages) */}
        <section id="lifecycle" className="py-16 sm:py-24 max-w-[1200px] mx-auto px-4 sm:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-8 space-y-3">
              <div className="font-mono-tech text-xs uppercase tracking-widest" style={{ color: TOKENS.brass }}>
                01 · End-to-End Field Service Lifecycle
              </div>
              <h2 className="text-3xl sm:text-5xl leading-[1.08]" style={{ color: TOKENS.bone }}>
                <EditorialHeadline text="Six structured stages from *rooftop* to handoff." />
              </h2>
            </div>
            <p className="lg:col-span-4 text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
              Select any lifecycle stage below to inspect its exact engineering inputs, safety guardrails, and interactive preview—or jump straight into the tool.
            </p>
          </div>

          <div className="divide-y border-t border-b" style={{ borderColor: TOKENS.hairline }}>
            {LIFECYCLE_STAGES.map((stage, idx) => (
              <motion.article
                key={stage.slug}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.2) }}
                className="py-8 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                style={{ borderColor: TOKENS.hairline }}
              >
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex items-center gap-3 text-xs font-mono-tech">
                    <span style={{ color: TOKENS.brass }}>{stage.indexLabel}</span>
                    <span style={{ color: TOKENS.hairlineStrong }}>·</span>
                    <span className="uppercase tracking-wider" style={{ color: TOKENS.sage }}>
                      {stage.shortTitle}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl leading-tight" style={{ color: TOKENS.bone }}>
                    <EditorialHeadline text={stage.headline} />
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
                    {stage.summary}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('lifecycle', { lifecycleSlug: stage.slug })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
                    >
                      Explore Stage Page
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(stage.targetRoute)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium"
                      style={{
                        backgroundColor: TOKENS.moss,
                        borderColor: TOKENS.hairlineStrong,
                        color: TOKENS.bone,
                      }}
                    >
                      {stage.ctaLabel}
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => navigate('lifecycle', { lifecycleSlug: stage.slug })}
                  className="lg:col-span-6 cursor-pointer transition-transform hover:-translate-y-0.5"
                >
                  <LifecycleStageVisual slug={stage.slug} />
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* 02 · Mesa Ridge 48 kWp Digital Twin Showcase */}
        <section
          id="twin-showcase"
          className="py-16 sm:py-24 border-t"
          style={{ borderColor: TOKENS.hairline, backgroundColor: TOKENS.moss }}
        >
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-5">
              <div className="font-mono-tech text-xs uppercase tracking-widest" style={{ color: TOKENS.brass }}>
                02 · Mesa Ridge 48 kWp Architecture
              </div>
              <h2 className="text-3xl sm:text-4xl leading-[1.08]" style={{ color: TOKENS.bone }}>
                <EditorialHeadline text="Built to the *metre*, synchronized to faults." />
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
                The Mesa Ridge 3D twin models a 34 × 22 m commercial deck at 1 unit = 1 metre scale. Instanced PV cells shift brightness dynamically with simulated solar hours while inverter or grid faults halt downstream AC particle paths immediately.
              </p>
              <button
                type="button"
                onClick={() => navigate('digital-twin')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
              >
                Inspect Twin & Diurnal Curve
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {[
                {
                  code: 'ARRAY · 120×400 Wp',
                  title: '6 Strings × 20 Modules (Instanced)',
                  desc: '3 tilted south-facing rows with walkway gaps and String 4 localized impairment highlighting.',
                },
                {
                  code: 'INVERTER · 40 kW AC',
                  title: 'Exploded Mechanical Layers',
                  desc: 'Inspect Mounting Backplate, Heatsink Fins, Power Core, and reactive fault LCD display.',
                },
                {
                  code: 'STORAGE · 60 kWh · MODEL SPECIFICATION',
                  title: 'LFP Rack & Combiner Raceway',
                  desc: '2 string combiners feeding a rooftop DC trunk alongside VoltVault LFP storage.',
                },
                {
                  code: 'GRID & LOAD',
                  title: 'Utility Pole, Transformer & HVAC',
                  desc: 'AC disconnect feeds an off-roof utility pole and rooftop HVAC load unit.',
                },
              ].map((spec) => (
                <div
                  key={spec.code}
                  className="rounded-xl border p-5 space-y-2"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}
                >
                  <div className="font-mono-tech text-[11px]" style={{ color: TOKENS.brass }}>
                    {spec.code}
                  </div>
                  <div className="font-display text-lg" style={{ color: TOKENS.bone }}>
                    {spec.title}
                  </div>
                  <p className="leading-relaxed" style={{ color: TOKENS.sage }}>
                    {spec.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03 · Honest Hybrid Inference Architecture (5.1 - 5.10) */}
        <HybridAISection />

        {/* 04 · Mandatory Safety Hazard Gate */}
        <section
          id="safety-gate"
          className="py-16 sm:py-24 border-t"
          style={{ borderColor: TOKENS.hairline, backgroundColor: TOKENS.moss }}
        >
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6 space-y-4">
              <div className="font-mono-tech text-xs uppercase tracking-widest" style={{ color: TOKENS.terracotta }}>
                04 · Deterministic Electrical Safety Gate
              </div>
              <h2 className="text-3xl sm:text-4xl leading-[1.08]" style={{ color: TOKENS.bone }}>
                <EditorialHeadline text="Zero *bypass* around live-site hazards." accentColor={TOKENS.terracotta} />
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
                Before generative diagnosis or repair task generation proceeds, <span className="font-mono-tech" style={{ color: TOKENS.bone }}>evaluateSafetyGate()</span> runs deterministically in TypeScript. Flagging any burning odor, visible arcing, bare conductors, or flood water triggers an immediate Stop-Work Hold and locks repair completion.
              </p>
              <button
                type="button"
                onClick={() => navigate('diagnostics')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-semibold"
                style={{
                  backgroundColor: TOKENS.ink,
                  borderColor: TOKENS.terracotta,
                  color: TOKENS.terracotta,
                }}
              >
                <ShieldAlert className="w-4 h-4" />
                Test Safety Gate in Intake Wizard
              </button>
            </div>

            <div className="lg:col-span-6 space-y-2">
              {SAFETY_HAZARD_CHECKS.slice(0, 5).map((chk) => (
                <div
                  key={chk.id}
                  className="rounded-lg border px-4 py-3 flex items-center justify-between gap-4 text-xs"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairline }}
                >
                  <div>
                    <div className="font-medium" style={{ color: TOKENS.bone }}>
                      {chk.label}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: TOKENS.sage }}>
                      {chk.description}
                    </div>
                  </div>
                  <span
                    className="font-mono-tech text-[10px] uppercase shrink-0"
                    style={{ color: chk.criticalEmergency ? TOKENS.terracotta : TOKENS.amberWarn }}
                  >
                    {chk.criticalEmergency ? 'STOP-WORK' : 'HOLD'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 05 · FieldProof & Audit-Ready Service Reports */}
        <section className="py-16 sm:py-24 border-t" style={{ borderColor: TOKENS.hairline }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="font-mono-tech text-xs uppercase tracking-widest" style={{ color: TOKENS.brass }}>
                05 · FieldProof & Service Reports
              </div>
              <h2 className="text-3xl sm:text-4xl leading-[1.08]" style={{ color: TOKENS.bone }}>
                <EditorialHeadline text="Document every *repair* with explicit provenance." />
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: TOKENS.sage }}>
                FieldProof records the origin of every photograph and meter reading (original field capture, example evidence, or explanatory text) before compiling print-ready Service Reports and transparent energy gap calculations.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('fieldproof')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium"
                  style={{
                    backgroundColor: TOKENS.moss,
                    borderColor: TOKENS.hairlineStrong,
                    color: TOKENS.bone,
                  }}
                >
                  <Wrench className="w-3.5 h-3.5" style={{ color: TOKENS.brass }} />
                  Open FieldProof Log
                </button>
                <button
                  type="button"
                  onClick={() => navigate('reports')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium"
                  style={{
                    backgroundColor: TOKENS.moss,
                    borderColor: TOKENS.hairlineStrong,
                    color: TOKENS.bone,
                  }}
                >
                  <FileText className="w-3.5 h-3.5" style={{ color: TOKENS.mint }} />
                  Preview Service Reports
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <LifecycleStageVisual slug="fieldproof" interactive />
            </div>
          </div>
        </section>

        {/* 06 · Interactive 3-Step Field Guide Onboarding */}
        <section
          id="onboarding"
          className="py-16 sm:py-24 border-t"
          style={{ borderColor: TOKENS.hairline, backgroundColor: TOKENS.moss }}
        >
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 space-y-10">
            <div className="space-y-3 max-w-2xl">
              <div className="font-mono-tech text-xs uppercase tracking-widest" style={{ color: TOKENS.brass }}>
                06 · Quick Field Guide
              </div>
              <h2 className="text-3xl sm:text-4xl leading-[1.08]" style={{ color: TOKENS.bone }}>
                <EditorialHeadline text="Ready on site in *three* steps." />
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-2">
                {onboardingSteps.map((step, i) => {
                  const active = onboardingStep === i;
                  return (
                    <button
                      key={step.index}
                      type="button"
                      onClick={() => setOnboardingStep(i)}
                      className="w-full text-left rounded-xl border p-4 transition-colors flex items-center justify-between gap-3"
                      style={{
                        backgroundColor: active ? TOKENS.mossRaised : TOKENS.ink,
                        borderColor: active ? TOKENS.brass : TOKENS.hairline,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono-tech text-xs" style={{ color: TOKENS.brass }}>
                          {step.index}
                        </span>
                        <span className="text-sm font-medium" style={{ color: TOKENS.bone }}>
                          {step.title}
                        </span>
                      </div>
                      {active && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: TOKENS.mint }} />}
                    </button>
                  );
                })}
              </div>

              <div
                className="lg:col-span-7 rounded-xl border p-6 sm:p-8 space-y-5"
                style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong }}
              >
                <div className="font-mono-tech text-xs uppercase" style={{ color: TOKENS.brass }}>
                  Step {onboardingSteps[onboardingStep].index}
                </div>
                <h3 className="font-display text-2xl" style={{ color: TOKENS.bone }}>
                  {onboardingSteps[onboardingStep].title}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: TOKENS.sage }}>
                  {onboardingSteps[onboardingStep].body}
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(onboardingSteps[onboardingStep].route)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
                  >
                    {onboardingSteps[onboardingStep].cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('dashboard')}
                    className="px-4 py-2.5 rounded-lg border text-xs font-medium"
                    style={{
                      backgroundColor: TOKENS.moss,
                      borderColor: TOKENS.hairlineStrong,
                      color: TOKENS.bone,
                    }}
                  >
                    Open Command Center
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal --moss-deep Footer */}
      <footer
        className="border-t py-10 px-4 sm:px-8"
        style={{ backgroundColor: TOKENS.mossDeep, borderColor: TOKENS.hairline }}
      >
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs" style={{ color: TOKENS.sage }}>
          <div className="space-y-1">
            <div className="font-display text-base" style={{ color: TOKENS.bone }}>
              SunFix <em className="italic" style={{ color: TOKENS.brass }}>Field</em>
            </div>
            <div>
              Apache-2.0 Open Source · #BuildHybridAI · Example site and irradiance values are illustrative, not live telemetry.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-mono-tech">
            <button type="button" onClick={() => navigate('dashboard')} className="hover:underline">
              Workspace
            </button>
            <button type="button" onClick={() => navigate('digital-twin')} className="hover:underline">
              Digital Twin
            </button>
            <button type="button" onClick={() => navigate('settings')} className="hover:underline">
              Diagnostics & Sync
            </button>
          </div>
        </div>
      </footer>

      <AccountDialog
        open={accountDialogOpen}
        initialMode={accountDialogMode}
        onClose={() => setAccountDialogOpen(false)}
        onAuthenticated={() => {
          setAccountDialogOpen(false);
          navigate('dashboard');
        }}
      />
    </div>
  );
};