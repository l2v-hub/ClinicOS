// 016 F3: composable read-query DSL. The LLM EMITS a plan of these shapes (all fields untrusted);
// `validate.ts` checks every entity/field/relation/operator against the whitelist (deny-by-default)
// and `engine.ts` executes the validated plan via Prisma. No mutation ops exist here — read-only.

export type FilterOp =
  'eq' | 'in' | 'lt' | 'lte' | 'gt' | 'gte' | 'isNull' | 'contains' | 'between' | 'dateWindow';

export interface RawFilter {
  field: string;
  op: FilterOp;
  value?: unknown;
}

export interface RawAggregate {
  op: 'count' | 'countDistinct' | 'min' | 'max' | 'avg' | 'sum';
  field?: string;
  groupBy?: string[];
}

export interface RawRunIf {
  step: string;
  predicate: 'nonEmpty' | 'empty' | 'countGte';
  value?: number;
}

export interface RawBindFrom {
  step: string;
  field: string;
  into: string;
}

export interface RawStep {
  id: string;
  from: string;
  filter?: RawFilter[];
  relate?: string[];
  aggregate?: RawAggregate;
  select?: string[];
  sort?: Array<{ field: string; dir?: 'asc' | 'desc' }>;
  limit?: number;
  runIf?: RawRunIf;
  bindFrom?: RawBindFrom;
}

export interface RawQueryPlan {
  steps: RawStep[];
  answer?: { primaryStep?: string };
}
