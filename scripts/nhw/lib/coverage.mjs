import { inventoryHash } from './inventory.mjs';

function unitSourcePaths(units) {
  const paths = new Set();
  for (const unit of units) {
    for (const source of unit.sources ?? []) paths.add(source.path);
  }
  return paths;
}

export function buildSourceMap(inventory, units) {
  const hashes = new Map(inventory.map((record) => [record.path, record.sha256]));
  const records = [];
  for (const unit of units) {
    for (const source of unit.sources ?? []) {
      records.push({
        knowledgeId: unit.id,
        path: source.path,
        symbol: source.symbol ?? '',
        lineStart: Number(source.line_start ?? 1),
        lineEnd: Number(source.line_end ?? source.line_start ?? 1),
        fileHash: source.file_hash ?? hashes.get(source.path) ?? '',
        confidence: source.confidence ?? (unit.status === 'inferred' ? 'inferred' : 'observed'),
      });
    }
  }
  return records.sort((left, right) => {
    const leftKey = `${left.knowledgeId}\u0000${left.path}\u0000${left.lineStart}`;
    const rightKey = `${right.knowledgeId}\u0000${right.path}\u0000${right.lineStart}`;
    return leftKey.localeCompare(rightKey, 'en');
  });
}

export function buildCoverage(inventory, discoveries, units) {
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const documentedPaths = unitSourcePaths(units);
  const discoveriesByPath = new Map();
  for (const discovery of discoveries) {
    const records = discoveriesByPath.get(discovery.sourcePath) ?? [];
    records.push(discovery);
    discoveriesByPath.set(discovery.sourcePath, records);
  }

  const records = inventory.map((item) => {
    let status = 'unresolved';
    if (item.classification === 'generated-excluded') status = 'generated-excluded';
    else if (item.classification === 'metadata-only') status = 'metadata-only';
    else if (documentedPaths.has(item.path)) status = 'documented';
    else if (
      (discoveriesByPath.get(item.path) ?? []).some((discovery) => unitsById.has(discovery.id))
    ) {
      status = 'documented';
    }
    return {
      path: item.path,
      recordType: 'inventory',
      classification: item.classification,
      status,
    };
  });

  const discoveryRecords = discoveries.map((discovery) => ({
    discoveryId: discovery.id,
    kind: discovery.kind,
    path: discovery.sourcePath,
    recordType: 'discovery',
    status: unitsById.has(discovery.id) ? 'documented' : 'unresolved',
  }));
  records.push(...discoveryRecords);
  records.sort((left, right) => {
    const leftKey = `${left.path}\u0000${left.discoveryId ?? ''}\u0000${left.recordType}`;
    const rightKey = `${right.path}\u0000${right.discoveryId ?? ''}\u0000${right.recordType}`;
    return leftKey.localeCompare(rightKey, 'en');
  });

  const unresolvedDiscoveries = discoveryRecords.filter((record) => record.status === 'unresolved');
  const discoverySourcePaths = new Set(discoveries.map((record) => record.sourcePath));
  const unresolvedInventory = records.filter(
    (record) =>
      record.recordType === 'inventory' &&
      record.status === 'unresolved' &&
      !discoverySourcePaths.has(record.path),
  );

  return {
    inventoryHash: inventoryHash(inventory),
    documented: records.filter(
      (record) => record.recordType === 'inventory' && record.status === 'documented',
    ).length,
    metadataOnly: records.filter(
      (record) => record.recordType === 'inventory' && record.status === 'metadata-only',
    ).length,
    generatedExcluded: records.filter(
      (record) => record.recordType === 'inventory' && record.status === 'generated-excluded',
    ).length,
    unresolved: unresolvedDiscoveries.length + unresolvedInventory.length,
    records,
  };
}
