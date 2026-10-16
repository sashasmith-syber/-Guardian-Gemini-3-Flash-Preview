export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFO';
export type AlertStatus = 'ACTIVE' | 'TRIAGED' | 'MITIGATED';

export interface StrategicAlert {
  id: string;
  timestamp: string;
  timeAgo: string;
  severity: AlertSeverity;
  title: string;
  origin: string;
  targetSubsystem: string;
  impactScore: number; // 1-100
  description: string;
  recommendedAction: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  mitigationProtocol?: string;
}

export interface TelemetryNode {
  id: string;
  name: string;
  region: string;
  tier: 'CORE_PRIMARY' | 'ENCLAVE_VAULT' | 'EDGE_RELAY' | 'ORBITAL_UPLINK';
  status: 'NOMINAL' | 'AUDIT_ACTIVE' | 'DEGRADED' | 'QUARANTINED';
  cpuLoad: number; // percentage
  memoryUsage: number; // percentage
  thermalC: number;
  ingressRateMbps: number;
  egressRateMbps: number;
  latencyMs: number;
  activeSessions: number;
  encryptionState: 'KYBER_768_SEALED' | 'AES_256_ACTIVE' | 'ROTATING';
  lastHeartbeat: string;
}

export interface SubsystemStatus {
  id: string;
  name: string;
  category: 'NEURAL_CORE' | 'CRYPTOGRAPHY' | 'CONSENSUS_MESH' | 'SENSOR_ARRAYS' | 'QUANTUM_ENTROPY';
  status: 'ONLINE' | 'ACTIVE_DIAGNOSTIC' | 'STANDBY' | 'WARNING';
  healthScore: number; // 0-100
  activeModelOrSpec: string;
  throughputRate: string;
  lastInspection: string;
  details: string;
}

export interface VitalMetrics {
  clusterHealth: number; // e.g. 99.8%
  activeNodesCount: number;
  totalNodesCount: number;
  ingressBandwidthGbps: number;
  egressBandwidthGbps: number;
  threatLevel: 'DEFCON 5' | 'DEFCON 4' | 'DEFCON 3' | 'DEFCON 2' | 'DEFCON 1';
  quantumEntropyJitter: number; // e.g. 0.012%
  globalLatencyMs: number;
  coherenceScore: number;
  verifiedTransactionsRate: number;
}

export interface ChatMessage {
  id: string;
  role: 'OPERATOR' | 'GUARDIAN';
  content: string;
  timestamp: string;
  imageData?: string;
  alertRefId?: string;
}
