import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';

/**
 * Smoke test: verifies the AppModule compiles and key providers are resolvable
 * without a real database connection (ConfigModule loaded with test env).
 */
describe('AppModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test_secret_that_is_long_enough_32chars';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';

    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Override PrismaService so no real DB connection is attempted
      .overrideProvider('PrismaService')
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
      })
      .compile();
  });

  afterAll(async () => {
    await module?.close();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('ConfigService should be resolvable', () => {
    const { ConfigService } = require('@nestjs/config');
    const config = module.get(ConfigService);
    expect(config).toBeDefined();
  });

  it('EventEmitter should be resolvable', () => {
    const { EventEmitter2 } = require('@nestjs/event-emitter');
    const emitter = module.get(EventEmitter2, { strict: false });
    expect(emitter).toBeDefined();
  });
});
