import { inventoryHash } from './inventory.mjs';

function unitSourcePaths(units) {
  const paths = new Set();
  for (const unit of units) {
    paths.add(unit.path);
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
  const knowledgeByPath = new Map();
  for (const unit of units) {
    for (const path of [unit.path, ...(unit.sources ?? []).map((source) => source.path)]) {
      const identifiers = knowledgeByPath.get(path) ?? new Set();
      identifiers.add(unit.id);
      knowledgeByPath.set(path, identifiers);
    }
  }
  const discoveriesByPath = new Map();
  for (const discovery of discoveries) {
    const records = discoveriesByPath.get(discovery.sourcePath) ?? [];
    records.push(discovery);
    discoveriesByPath.set(discovery.sourcePath, records);
  }

  const records = inventory.map((item) => {
    let coverageStatus = 'unresolved';
    if (item.classification === 'generated-excluded') coverageStatus = 'generated-excluded';
    else if (item.classification === 'metadata-only') coverageStatus = 'metadata-only';
    else if (documentedPaths.has(item.path)) coverageStatus = 'documented';
    else if (
      (discoveriesByPath.get(item.path) ?? []).some((discovery) => unitsById.has(discovery.id))
    ) {
      coverageStatus = 'documented';
    }
    const knowledgeIds = new Set(knowledgeByPath.get(item.path) ?? []);
    for (const discovery of discoveriesByPath.get(item.path) ?? []) {
      if (unitsById.has(discovery.id)) knowledgeIds.add(discovery.id);
    }
    return {
      path: item.path,
      classification: item.classification,
      coverageStatus,
      reason:
        coverageStatus === 'unresolved'
          ? 'No knowledge unit or explicit exclusion covers this inventory path'
          : item.reason || `Inventory path is ${coverageStatus}`,
      ...(knowledgeIds.size > 0 ? { knowledgeIds: [...knowledgeIds].sort() } : {}),
    };
  });

  const discoveryRecords = discoveries.map((discovery) => ({
    path: discovery.sourcePath,
    classification: `discovery:${discovery.kind}`,
    coverageStatus: unitsById.has(discovery.id) ? 'documented' : 'unresolved',
    reason: unitsById.has(discovery.id)
      ? `Discovery is defined by ${discovery.id}`
      : `Discovery ${discovery.id} has no canonical knowledge unit`,
    ...(unitsById.has(discovery.id) ? { knowledgeIds: [discovery.id] } : {}),
  }));
  records.push(...discoveryRecords);
  records.sort((left, right) => {
    const leftKey = `${left.path}\u0000${left.classification}\u0000${left.reason}`;
    const rightKey = `${right.path}\u0000${right.classification}\u0000${right.reason}`;
    return leftKey.localeCompare(rightKey, 'en');
  });

  const unresolvedDiscoveries = discoveryRecords.filter(
    (record) => record.coverageStatus === 'unresolved',
  );
  const discoverySourcePaths = new Set(discoveries.map((record) => record.sourcePath));
  const unresolvedInventory = records.filter(
    (record) =>
      !record.classification.startsWith('discovery:') &&
      record.coverageStatus === 'unresolved' &&
      !discoverySourcePaths.has(record.path),
  );

  return {
    inventoryHash: inventoryHash(inventory),
    documented: records.filter(
      (record) =>
        !record.classification.startsWith('discovery:') && record.coverageStatus === 'documented',
    ).length,
    metadataOnly: records.filter(
      (record) =>
        !record.classification.startsWith('discovery:') &&
        record.coverageStatus === 'metadata-only',
    ).length,
    generatedExcluded: records.filter(
      (record) =>
        !record.classification.startsWith('discovery:') &&
        record.coverageStatus === 'generated-excluded',
    ).length,
    unresolved: unresolvedDiscoveries.length + unresolvedInventory.length,
    records,
  };
}
