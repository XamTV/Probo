import { NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@probo/shared';
import { orNotFound, scopedWhere } from './tenant';

const claire: SessionUser = {
  id: 'u-1',
  institutionId: 'inst-a',
  email: 'claire@esm-lyon.fr',
  name: 'Claire Fontaine',
  role: 'ADMISSIONS_OFFICER',
};

describe('US-03: tenant isolation', () => {
  it('adds the caller institution to the where clause', () => {
    expect(scopedWhere(claire, { id: 'x' })).toEqual({ id: 'x', institutionId: 'inst-a' });
  });

  it('overrides an institution supplied by the caller rather than trusting it', () => {
    const forged = { id: 'x', institutionId: 'inst-b' };
    expect(scopedWhere(claire, forged).institutionId).toBe('inst-a');
  });

  it('leaves the original object untouched', () => {
    const where = { id: 'x' };
    scopedWhere(claire, where);
    expect(where).toEqual({ id: 'x' });
  });

  it('turns a missing row into 404, never 403', () => {
    expect(() => orNotFound(null)).toThrow(NotFoundException);
  });

  it('returns the row when it exists', () => {
    expect(orNotFound({ id: 'x' })).toEqual({ id: 'x' });
  });

  it('does not mistake a falsy row for a missing one', () => {
    expect(orNotFound(0)).toBe(0);
    expect(orNotFound('')).toBe('');
    expect(orNotFound(false)).toBe(false);
  });
});
