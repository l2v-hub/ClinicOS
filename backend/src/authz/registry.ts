// Runtime capability registry (generated from the catalog of record by
// scripts/ai-architecture/build-authz-registry.mjs) + route → capability matching.

import registryJson from './capability-registry.json' with { type: 'json' };
import type { CapabilityEntry } from './types.js';

const entries = (registryJson as { capabilities: CapabilityEntry[] }).capabilities;
const byId = new Map(entries.map((entry) => [entry.id, entry]));

export function allCapabilities(): readonly CapabilityEntry[] {
  return entries;
}

export function capabilityById(id: string): CapabilityEntry | undefined {
  return byId.get(id);
}

/** Capabilities that appear in the role matrix (policy-governed, not derived). */
export function governedCapabilities(): CapabilityEntry[] {
  return entries.filter((entry) => entry.gate === 'policy' && !entry.governedBy);
}

/** The capability whose policy decides for `id` (itself, or the functional one it derives from). */
export function governingCapability(id: string): CapabilityEntry | undefined {
  const entry = byId.get(id);
  if (!entry) return undefined;
  return entry.governedBy ? byId.get(entry.governedBy) : entry;
}

interface CompiledRoute {
  method: string;
  segments: string[];
  score: number;
  capability: CapabilityEntry;
}

const compiled: CompiledRoute[] = entries.flatMap((capability) =>
  capability.routes.map((route) => {
    // Express routing is case-insensitive and ignores empty/trailing segments: match the same way,
    // otherwise `/PATIENTS/x/Therapies` would reach the router while looking "uncatalogued" here.
    const segments = route.path
      .split('/')
      .filter(Boolean)
      .map((segment) => (segment.startsWith(':') ? segment : segment.toLowerCase()));
    return {
      method: route.method,
      segments,
      // Literal segments outrank parameters: `/patients/page` beats `/patients/:id`.
      score: segments.reduce((sum, segment) => sum + (segment.startsWith(':') ? 1 : 2), 0),
      capability,
    };
  }),
);

/** Most specific catalogued capability for a request, or undefined when the route is uncatalogued. */
export function matchRoute(method: string, path: string): CapabilityEntry | undefined {
  const parts = path
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map((part) => part.toLowerCase());
  // Express serves HEAD with the GET handler: decide HEAD exactly like GET.
  const requested = method.toUpperCase();
  const upper = requested === 'HEAD' ? 'GET' : requested;
  let best: CompiledRoute | undefined;
  for (const route of compiled) {
    if (route.method !== upper || route.segments.length !== parts.length) continue;
    const matches = route.segments.every(
      (segment, index) => segment.startsWith(':') || segment === parts[index],
    );
    if (matches && (!best || route.score > best.score)) best = route;
  }
  return best?.capability;
}
