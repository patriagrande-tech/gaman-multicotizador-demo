import {test} from 'node:test';import assert from 'node:assert/strict';
import {fields,preview,isoDate,daysTo} from './portfolio.mjs';
import {createRequire} from 'node:module';
const XLSX=createRequire(import.meta.url)('./vendor/xlsx.full.min.js');
const map=Object.fromEntries(Object.keys(fields).map((k,i)=>[k,i]));
const row=['001','Compañía A','Autos','Cliente ficticio','Equipo A','2027-01-10'];
test('imports only unique valid rows and preserves existing records',()=>{const existing=[{poliza:'001',compania:'compañía a',ramo:'autos'}];const result=preview([row,[...row.slice(0,5),'31/02/2027']],map,existing);assert(result.every(r=>r.errors.length));assert.equal(existing.length,1);});
test('identifies duplicates within a sheet and preserves policy leading zero',()=>{const result=preview([row,row],map,[]);assert.equal(result[0].record.poliza,'001');assert.equal(result[0].errors.length,0);assert(result[1].errors.some(e=>e.includes('Duplicado')));});
test('same policy number in different companies is not duplicate',()=>{assert(preview([row,['001','Compañía B',...row.slice(2)]],map,[]).every(r=>!r.errors.length));});
test('mapping must be complete and injective',()=>{assert.throws(()=>preview([row],{...map,cliente:0},[]));assert.throws(()=>preview([row],{...map,cliente:-1},[]));});
test('dates validate calendar days and distinguish overdue from future',()=>{assert.equal(isoDate('29/02/2027'),null);assert.equal(isoDate('29/02/2028'),'2028-02-29');assert.equal(daysTo('2026-11-04','2026-11-03'),1);});
test('vendored parser reads Excel and semicolon CSV with header and zero-prefixed policy',()=>{
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([Object.keys(fields),row]),'Cartera');
 for(const input of [XLSX.write(book,{type:'buffer',bookType:'xlsx'}),Buffer.from([Object.keys(fields),row].map(r=>r.join(';')).join('\n'))]){
  const parsed=XLSX.read(input,{type:'buffer',sheetRows:502});
  const rows=XLSX.utils.sheet_to_json(parsed.Sheets[parsed.SheetNames[0]],{header:1,raw:false,defval:''});
  assert.equal(rows[1][0],'001');assert.equal(preview(rows.slice(1),map,[])[0].errors.length,0);
 }
});
test('accepts unpadded and dash/dot dates, rejects ambiguous two-digit year',()=>{assert.equal(isoDate('5/1/2027'),'2027-01-05');assert.equal(isoDate('05-01-2027'),'2027-01-05');assert.equal(isoDate('5.1.2027'),'2027-01-05');assert.equal(isoDate('1/10/27'),null);});
test('Excel date cells become ISO dates regardless of display format',async()=>{const {cellValue}=await import('./portfolio.mjs');assert.equal(cellValue(new Date(2027,0,10),'1/10/27'),'2027-01-10');assert.equal(cellValue('','x'),'x');});
test('blank rows are skipped, not reported as errors',()=>{const result=preview([row,['','','','','',''],[' ','','','','','']],map,[]);assert.equal(result.length,1);assert.equal(result[0].errors.length,0);});
