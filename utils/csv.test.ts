import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { csvCell } from './csv.ts';

describe('csvCell', () => {
  it('quotes ordinary text and doubles embedded quotes', () => {
    assert.equal(csvCell('Ashburn Primus'), '"Ashburn Primus"');
    assert.equal(csvCell('say "hold"'), '"say ""hold"""');
  });

  it('prefixes spreadsheet formulas and flattens newlines', () => {
    assert.equal(csvCell('=HYPERLINK("http://evil")'), `"'=HYPERLINK(""http://evil"")"`);
    assert.equal(csvCell('+cmd'), '"\'+cmd"');
    assert.equal(csvCell('-10'), '"\'-10"');
    assert.equal(csvCell('@SUM(A1)'), `"'@SUM(A1)"`);
    assert.equal(csvCell(' \n=2'), `"'  =2"`);
  });

  it('leaves numeric telemetry as quoted digits', () => {
    assert.equal(csvCell(14.2), '"14.2"');
  });
});
