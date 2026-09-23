import { Prisma } from '@prisma/client';
import { patientNameSortKey } from '../patients/alphabetical-order.js';
import type { RosterOrder } from './order-contract.js';

export interface RosterPosition {
  patientId: string;
  firstName: string;
  lastName: string;
  room: string | null;
  bed: string | null;
  therapyId?: string;
}

/** Numeric tokens compare by significant length/digits, without bounded numeric casts. */
export function naturalRosterKey(value: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`ARRAY(SELECT CASE WHEN token[1] ~ '^[0-9]+$'
    THEN '0:' || lpad(length(coalesce(nullif(ltrim(token[1], '0'), ''), '0'))::text, 10, '0')
      || ':' || coalesce(nullif(ltrim(token[1], '0'), ''), '0')
    ELSE '1:' || token[1] END
    FROM regexp_matches(${patientNameSortKey(Prisma.sql`coalesce(${value}, '')`)}, '([0-9]+|[^0-9]+)', 'g')
      WITH ORDINALITY AS tokens(token, ordinal)
    ORDER BY ordinal) COLLATE "C"`;
}

function components(
  order: RosterOrder,
  location: Prisma.Sql,
  therapy: boolean,
  position?: RosterPosition,
) {
  const field = (name: 'lastName' | 'firstName' | 'patientId') =>
    position
      ? Prisma.sql`${position[name]}::text`
      : name === 'patientId'
        ? Prisma.sql`p.id`
        : name === 'lastName'
          ? Prisma.sql`p."lastName"`
          : Prisma.sql`p."firstName"`;
  const room = position ? Prisma.sql`${position.room}::text` : Prisma.sql`${location}->>'room'`;
  const bed = position ? Prisma.sql`${position.bed}::text` : Prisma.sql`${location}->>'bed'`;
  const keys: Array<{ expression: Prisma.Sql; direction: 'asc' | 'desc' }> = [];
  if (order.criterion === 'location')
    keys.push(
      { expression: Prisma.sql`(${room} IS NULL)`, direction: 'asc' },
      { expression: naturalRosterKey(room), direction: order.direction },
      { expression: Prisma.sql`(${bed} IS NULL)`, direction: 'asc' },
      { expression: naturalRosterKey(bed), direction: order.direction },
    );
  const nameDirection = order.criterion === 'name' ? order.direction : 'asc';
  keys.push(
    { expression: patientNameSortKey(field('lastName')), direction: nameDirection },
    { expression: patientNameSortKey(field('firstName')), direction: nameDirection },
    { expression: Prisma.sql`${field('patientId')} COLLATE "C"`, direction: 'asc' },
  );
  if (therapy)
    keys.push({
      expression: position
        ? Prisma.sql`${position.therapyId}::text COLLATE "C"`
        : Prisma.sql`pt.id COLLATE "C"`,
      direction: 'asc',
    });
  return keys;
}
export function rosterOrderSql(
  order: RosterOrder,
  location = Prisma.sql`location.location`,
  therapy = false,
): Prisma.Sql {
  return Prisma.join(
    components(order, location, therapy).map(
      ({ expression, direction }) =>
        Prisma.sql`${expression} ${Prisma.raw(direction === 'asc' ? 'ASC' : 'DESC')}`,
    ),
  );
}
export function rosterAfterSql(
  order: RosterOrder,
  position: RosterPosition,
  location = Prisma.sql`location.location`,
  therapy = false,
): Prisma.Sql {
  const left = components(order, location, therapy);
  const right = components(order, location, therapy, position);
  return Prisma.sql`(${Prisma.join(
    left.map(
      (key, index) => Prisma.sql`(
    ${
      index
        ? Prisma.join(
            left
              .slice(0, index)
              .map((previous, i) => Prisma.sql`${previous.expression} = ${right[i].expression}`),
            ' AND ',
          )
        : Prisma.empty
    }
    ${index ? Prisma.sql`AND` : Prisma.empty}
    ${key.expression} ${Prisma.raw(key.direction === 'asc' ? '>' : '<')} ${right[index].expression}
  )`,
    ),
    ' OR ',
  )})`;
}
