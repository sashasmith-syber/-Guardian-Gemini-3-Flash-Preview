import { describe, expect, it } from 'vitest';
import { buildLocalGuardianBrief, buildUpstreamFailureBrief } from './localGuardianFallback';

describe('buildLocalGuardianBrief', () => {
  it('routes jitter inquiries to investigation brief', () => {
    const brief = buildLocalGuardianBrief('Investigate interface jitter', 4.82);
    expect(brief).toContain('TACTICAL INVESTIGATION BRIEF');
    expect(brief).toContain('OPERATOR');
  });

  it('routes udp/threat inquiries to illumination brief', () => {
    const brief = buildLocalGuardianBrief('Deconstruct anomalous UDP burst', 4.1);
    expect(brief).toContain('DECONSTRUCTION & TACTICAL ILLUMINATION');
  });

  it('embeds ingress on status inquiries', () => {
    const brief = buildLocalGuardianBrief('Assess sanctuary perimeter & telemetry', 5.12);
    expect(brief).toContain('5.12 GB/s');
  });
});

describe('buildUpstreamFailureBrief', () => {
  it('includes error message and ingress', () => {
    const brief = buildUpstreamFailureBrief('429 quota', 3.9);
    expect(brief).toContain('429 quota');
    expect(brief).toContain('3.90 GB/s');
  });
});
