import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyBubbleFailure,
  onboardGuardianReply,
} from '../utils/bubbleHealth.ts';

describe('bubble health onboard copy', () => {
  it('classifies unconfigured and cooling failures', () => {
    assert.equal(classifyBubbleFailure('API interface is not configured.'), 'unconfigured');
    assert.equal(classifyBubbleFailure('API keys are cooling down. Retry shortly.'), 'cooling');
    assert.equal(classifyBubbleFailure('API interface destabilized. Check network link.'), 'other');
  });

  it('keeps onboard replies honest (no Potemkin tactical brief)', () => {
    const offline = onboardGuardianReply('unconfigured');
    assert.match(offline, /ONBOARDING REQUIRED/);
    assert.match(offline, /GEMINI_API_KEY/);
    assert.equal(/TACTICAL INVESTIGATION BRIEF/i.test(offline), false);
    assert.equal(/Confirmed\. Action underway/i.test(offline), false);

    const cooling = onboardGuardianReply('cooling');
    assert.match(cooling, /BUBBLE COOLING/);
    assert.equal(/SANCTUARY TELEMETRY AUDIT/i.test(cooling), false);
  });
});
