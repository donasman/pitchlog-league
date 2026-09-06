/**
 * 고아 행 검사 — CI 에서 매 PR 마다 (SCHEMA_DESIGN 2-3)
 * 외래키가 없으므로 이 테스트가 참조 무결성의 유일한 자동 검증이다.
 */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { IntegrityService, REFERENCE_CHECKS } from '../src/prisma/integrity.service.js';

describe('참조 무결성 (e2e)', () => {
  let app: INestApplication;
  let integrity: IntegrityService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    integrity = app.get(IntegrityService);
  });

  afterAll(async () => {
    await app?.close(); // beforeAll 이 실패했을 때 진짜 원인이 TypeError 에 가려지지 않게
  });

  it(`관계 ${REFERENCE_CHECKS.length}개에 고아 행이 없다`, async () => {
    const orphans = await integrity.findOrphans();
    const summary = orphans.map((o) => `${o.child}.${o.column}→${o.parent}: ${o.count}건 (표본 ${o.sampleIds.join(',')})`);
    expect(summary, summary.join('\n')).toEqual([]);
  });

  it('대진표 슬롯에 순환 참조가 없다', async () => {
    expect(await integrity.findSlotCycles()).toEqual([]);
  });
});
