import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('GET /health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close(); // beforeAll 이 실패했을 때 진짜 원인이 TypeError 에 가려지지 않게
  });

  it('DB 가 붙어 있으면 ok + asOf', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe(true);
    expect(new Date(res.body.asOf).toString()).not.toBe('Invalid Date');
  });

  // 4-b-1: 스케줄러 상태 필드가 노출되고 잡 off 시 초기값이다
  it('scheduler off (env 미설정) 일 때 scheduler.enabled=false · backfillWorker 초기값', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.scheduler).toBeDefined();
    expect(res.body.scheduler.enabled).toBe(false);
    expect(res.body.scheduler.jobs.backfillWorker).toEqual({
      enabled: false,
      running: false,
      lastStartedAt: null,
      lastFinishedAt: null,
      lastOutcome: null,
      lastError: null,
      lastProcessed: null,
      currentSeason: null,
    });
  });
});
