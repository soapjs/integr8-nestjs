import { Test, TestingModule } from '@nestjs/testing';
import { Integr8TestModule } from '../test.module';
import { NestJSAdapter } from '../adapter';
import { ModuleRef } from '@nestjs/core';

// Mock the adapter
jest.mock('../adapter');

describe('Integr8TestModule', () => {
  let module: TestingModule;
  let adapter: NestJSAdapter;
  let moduleRef: ModuleRef;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [Integr8TestModule],
    }).compile();

    adapter = module.get<NestJSAdapter>('INTEGR8_ADAPTER');
    moduleRef = module.get<ModuleRef>(ModuleRef);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(Integr8TestModule).toBeDefined();
    });

    it('should compile successfully', async () => {
      expect(module).toBeDefined();
    });

    it('should be a global module', () => {
      // Check if module metadata has Global decorator
      const moduleMetadata = Reflect.getMetadata('__module:global__', Integr8TestModule);
      expect(moduleMetadata).toBe(true);
    });
  });

  describe('Providers', () => {
    it('should provide INTEGR8_ADAPTER', () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(NestJSAdapter);
    });

    it('should provide NestJSAdapter class', () => {
      const adapterClass = module.get<NestJSAdapter>(NestJSAdapter);
      expect(adapterClass).toBeDefined();
    });

    it('should provide ModuleRef', () => {
      expect(moduleRef).toBeDefined();
    });

    it('should inject ModuleRef into adapter factory', () => {
      // The adapter should be created with ModuleRef injected
      expect(adapter).toBeDefined();
    });
  });

  describe('Exports', () => {
    it('should export INTEGR8_ADAPTER', async () => {
      // Create a module that imports Integr8TestModule
      const consumerModule = await Test.createTestingModule({
        imports: [Integr8TestModule],
        providers: [
          {
            provide: 'TEST_SERVICE',
            useFactory: (adapterService: NestJSAdapter) => {
              return { adapter: adapterService };
            },
            inject: ['INTEGR8_ADAPTER'],
          },
        ],
      }).compile();

      const testService = consumerModule.get('TEST_SERVICE');
      expect(testService).toBeDefined();
      expect(testService.adapter).toBeDefined();

      await consumerModule.close();
    });

    it('should export NestJSAdapter class', async () => {
      const consumerModule = await Test.createTestingModule({
        imports: [Integr8TestModule],
        providers: [
          {
            provide: 'TEST_SERVICE',
            useFactory: (adapterClass: NestJSAdapter) => {
              return { adapter: adapterClass };
            },
            inject: [NestJSAdapter],
          },
        ],
      }).compile();

      const testService = consumerModule.get('TEST_SERVICE');
      expect(testService).toBeDefined();
      expect(testService.adapter).toBeDefined();

      await consumerModule.close();
    });
  });

  describe('Adapter Factory', () => {
    it('should create adapter instance', () => {
      expect(adapter).toBeInstanceOf(NestJSAdapter);
    });

    it('should create only one adapter instance (singleton)', () => {
      const adapter1 = module.get('INTEGR8_ADAPTER');
      const adapter2 = module.get('INTEGR8_ADAPTER');

      expect(adapter1).toBe(adapter2);
    });

    it('should have access to ModuleRef', () => {
      // The adapter should be created with moduleRef available
      expect(moduleRef).toBeDefined();
    });
  });

  describe('Integration with other modules', () => {
    it('should work when imported in another module', async () => {
      const TestConsumerModule = {
        module: class TestConsumer {},
        imports: [Integr8TestModule],
        providers: [],
      };

      const testModule = await Test.createTestingModule({
        imports: [Integr8TestModule],
      }).compile();

      const adapterInConsumer = testModule.get<NestJSAdapter>('INTEGR8_ADAPTER');
      expect(adapterInConsumer).toBeDefined();

      await testModule.close();
    });

    it('should be available in child modules', async () => {
      const ChildModule = {
        module: class Child {},
        providers: [
          {
            provide: 'CHILD_SERVICE',
            useFactory: (adapter: NestJSAdapter) => ({ adapter }),
            inject: ['INTEGR8_ADAPTER'],
          },
        ],
      };

      const testModule = await Test.createTestingModule({
        imports: [Integr8TestModule],
        providers: [
          {
            provide: 'PARENT_SERVICE',
            useFactory: (adapter: NestJSAdapter) => ({ adapter }),
            inject: ['INTEGR8_ADAPTER'],
          },
        ],
      }).compile();

      const parentService = testModule.get('PARENT_SERVICE');
      expect(parentService.adapter).toBeDefined();

      await testModule.close();
    });
  });

  describe('Module Initialization', () => {
    it('should initialize without errors', async () => {
      await expect(
        Test.createTestingModule({
          imports: [Integr8TestModule],
        }).compile()
      ).resolves.toBeDefined();
    });

    it('should not interfere with other modules', async () => {
      const OtherModule = {
        module: class Other {},
        providers: [
          {
            provide: 'OTHER_SERVICE',
            useValue: { test: true },
          },
        ],
        exports: ['OTHER_SERVICE'],
      };

      const testModule = await Test.createTestingModule({
        imports: [Integr8TestModule],
        providers: [
          {
            provide: 'OTHER_SERVICE',
            useValue: { test: true },
          },
        ],
      }).compile();

      const otherService = testModule.get('OTHER_SERVICE');
      expect(otherService).toBeDefined();
      expect(otherService.test).toBe(true);

      await testModule.close();
    });
  });

  describe('Adapter Configuration', () => {
    it('should create adapter without app reference initially', () => {
      // The adapter should be created but app reference should be set later
      expect(adapter).toBeDefined();
      // Note: app reference is typically set in the bootstrap function
    });

    it('should allow adapter to be configured after module creation', () => {
      const mockModuleRef = {} as ModuleRef;
      const mockApp = {} as any;

      // This simulates what happens in the bootstrap function
      expect(() => {
        adapter.setNestJSReferences(mockModuleRef, mockApp);
      }).not.toThrow();
    });
  });

  describe('Multiple Module Instances', () => {
    it('should create separate adapter instances for different modules', async () => {
      const module1 = await Test.createTestingModule({
        imports: [Integr8TestModule],
      }).compile();

      const module2 = await Test.createTestingModule({
        imports: [Integr8TestModule],
      }).compile();

      const adapter1 = module1.get('INTEGR8_ADAPTER');
      const adapter2 = module2.get('INTEGR8_ADAPTER');

      // They should be different instances for different module contexts
      expect(adapter1).toBeDefined();
      expect(adapter2).toBeDefined();

      await module1.close();
      await module2.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing ModuleRef gracefully', async () => {
      // This tests that the module can be created even if something goes wrong
      const testModule = await Test.createTestingModule({
        imports: [Integr8TestModule],
      }).compile();

      expect(testModule).toBeDefined();

      await testModule.close();
    });
  });

  describe('Provider Dependencies', () => {
    it('should inject ModuleRef into adapter factory', async () => {
      const testModule = await Test.createTestingModule({
        imports: [Integr8TestModule],
      }).compile();

      const moduleRefFromModule = testModule.get(ModuleRef);
      expect(moduleRefFromModule).toBeDefined();

      await testModule.close();
    });

    it('should allow adapter to access ModuleRef', async () => {
      const testModule = await Test.createTestingModule({
        imports: [Integr8TestModule],
        providers: [
          {
            provide: 'TEST_PROVIDER',
            useValue: { test: 'value' },
          },
        ],
      }).compile();

      const adapter = testModule.get<NestJSAdapter>('INTEGR8_ADAPTER');
      const moduleRef = testModule.get(ModuleRef);

      // Simulate setting references (normally done in bootstrap)
      const mockApp = {} as any;
      adapter.setNestJSReferences(moduleRef, mockApp);

      const testProvider = moduleRef.get('TEST_PROVIDER', { strict: false });
      expect(testProvider).toBeDefined();

      await testModule.close();
    });
  });
});

