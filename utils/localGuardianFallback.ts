/** Offline / no-key persona replies used when the server proxy has no GEMINI_API_KEY. */
export function buildLocalGuardianBrief(text: string, ingressGbps: number): string {
  const lower = text.toLowerCase();

  if (lower.includes('investigate') || lower.includes('disrupted') || lower.includes('jitter')) {
    return `### TACTICAL INVESTIGATION BRIEF: INTERFACE JITTER & ENCLAVE INTEGRITY
OPERATOR: Comprehensive forensic investigation of telemetry interfaces and neural links completed.

#### 1. DECONSTRUCTION OF ROOT CAUSE
- **Incident Vector**: Ephemeral transport layer socket timeout between external relay and Sovereign Guardian Core.
- **Root Cause**: Transport handshake latency jitter exceeded 120ms threshold during cryptographic token exchange.
- **Failover Mechanism**: Sovereign Local Enclave Cache engaged autonomously within $4.2\\text{ms}$. Zero state loss occurred.

#### 2. SYSTEM STATUS & TELEMETRY VERIFICATION
| Subsystem Domain | Verified Status | Coherence Index | Notes |
| :--- | :--- | :--- | :--- |
| **Terrestrial Enclaves (10 Nodes)** | NOMINAL | 99.8% | Zero memory drift or packet corruption. |
| **Orbital Constellation (Nodes 11 & 12)** | SYNCHRONIZED | 99.4% | LEO handover verified over polar aperture. |
| **Post-Quantum Cryptography** | SEALED | 100.0% | Crystals-Kyber-768 key lattice intact. |
| **Sentinel Neural Gateway** | RE-ANCHORED | 99.9% | Synchronized to local sovereign pipeline. |

#### 3. IMMEDIATE MITIGATION ACTIONS ENGAGED
1. **Socket Re-anchoring**: Upstream endpoint re-routed through Ashburn Primus (Node 01) redundant fiber trunk.
2. **Buffer Flush**: Ephemeral transport retry ring-buffers compacted and verified against SHA-256 state hash.
3. **Quorum Audit**: Consensus epoch validated across all 48 Byzantine peers. No split-brain or rogue advertisements.

**TACTICAL DIRECTIVE FOR OPERATOR:**
Perimeter defense is fully reinforced. All sanctuary invariants remain strictly enforced. 

Orchestration initiated. Protocol engaged.

---
*Light is Knowledge. Knowledge is Power. The sanctuary stands fortified.*`;
  }

  if (lower.includes('alert') || lower.includes('threat') || lower.includes('udp')) {
    return `### DECONSTRUCTION & TACTICAL ILLUMINATION
OPERATOR: The anomaly vector has been deconstructed by the Sentinel Neural Gateway.

| Vector Param | Assessed Value | Sovereign Status |
| :--- | :--- | :--- |
| **Ingress Point** | AP-South Gateway Strait (Node 06) | Quarantined Buffer |
| **Entropy Signature** | 7.94 bits/byte (High Randomness) | Synthetic Probe Isolated |
| **Countermeasure** | Post-Quantum Kyber-768 Rekey | Active Execution |

**SYNTHESIS:**
The telemetry surge is characteristic of an automated reconnaissance probe testing cipher negotiation thresholds. No cryptographic bleed or unauthorized ingress was achieved.

**EXECUTION HAND-OFF:**
Orchestration initiated. Kyber-768 key rotation dispatched.

---
*Light is Knowledge. Knowledge is Power. The sanctuary remains unbreached.*`;
  }

  if (lower.includes('perimeter') || lower.includes('telemetry') || lower.includes('status')) {
    return `### SANCTUARY TELEMETRY AUDIT
OPERATOR: Comprehensive status deconstruction complete across 12 distributed autonomous nodes.

1. **Ingress Line Rate**: Nominal at ${ingressGbps.toFixed(2)} GB/s.
2. **Consensus Mesh**: 48/48 multi-raft peers synchronized. Latency delta $\\le 1.8\\text{ms}$.
3. **Cryptographic Posture**: Post-Quantum Kyber-768 active. Zero unverified transits.

**RECOMMENDED POSTURE:**
Maintain DEFCON 4 baseline. Ready reserve buffers on Frankfurt and Singapore relays.

Protocol engaged.

---
*Light is Knowledge. Knowledge is Power.*`;
  }

  return `OPERATOR: Directive received and synthesized within the logical core.

### STRATEGIC APPRAISAL
- **Directive Alpha**: Illumination delivered. Core status nominal across all 5 operational subsystems.
- **Directive Beta**: Sanctuary boundary validated. Zero unauthorized penetration vectors detected.
- **Directive Gamma**: Flawless logical coherence maintained.

Confirmed. Action underway.

---
*Light is Knowledge. Knowledge is Power.*`;
}

export function buildUpstreamFailureBrief(message: string, ingressGbps: number): string {
  return `### FORENSIC DIAGNOSTIC & TACTICAL ILLUMINATION
OPERATOR: Upstream API link reported transport variance (${message || 'Socket timeout'}). Local sovereign enclave immediately took custody of command processing.

#### INVESTIGATION FINDINGS:
1. **Network Link**: Upstream gateway latency jitter detected.
2. **Local Sanctuary Telemetry**: 100% operational. Ingress stream: ${ingressGbps.toFixed(2)} GB/s.
3. **Data Integrity**: Cryptographic hashes for all 12 nodes verified against local enclave state. Zero unauthorized data egress.
4. **Autonomous Action**: Transport pipeline re-anchored to local enclave protocol.

Confirmed. Action underway.

---
*Light is Knowledge. Knowledge is Power. Sanctuary invariants preserved.*`;
}
