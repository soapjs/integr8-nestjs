# @soapjs/integr8-nestjs

[![npm version](https://badge.fury.io/js/@soapjs%2Fintegr8-nestjs.svg)](https://badge.fury.io/js/@soapjs%2Fintegr8-nestjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Runtime method patching for NestJS applications. Override any service method **AFTER** application startup via HTTP API - perfect for integration testing with [@soapjs/integr8](https://www.npmjs.com/package/@soapjs/integr8).

## Key Features

- **Runtime Override** - Patch methods after app starts (no DI restart needed)
- **HTTP API** - Send code as strings via REST endpoints  
- **VM Sandbox** - Secure code execution (no eval)
- **Auto-Discovery** - Wraps all providers automatically
- **Factory Support** - Replace entire providers
- **Fully Tested** - 124 tests including 26 E2E

## Installation

```bash
npm install @soapjs/integr8-nestjs
npm install @nestjs/core @nestjs/common @nestjs/platform-express
```

## Quick Start

### 1. Enable in Your App

```typescript
// app.module.ts
import { TestOverridesModule } from '@soapjs/integr8-nestjs';

const testModules = TestOverridesModule.isEnabled() 
  ? [TestOverridesModule] 
  : [];

@Module({
  imports: [...testModules, YourOtherModules],
})
export class AppModule {}
```

### 2. Set Environment

```bash
export INTEGR8_OVERRIDES_ENABLED=1
export INTEGR8_OVERRIDES_TOKEN=your-secret-token
```

### 3. Start & Override

```bash
# Start your app
npm start

# Override a method via HTTP
curl -X POST http://localhost:3000/__integr8__/override/UsersService \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "methods": {
      "findAll": {
        "type": "fn",
        "body": "return [{ id: 999, name: \"Mocked User\" }];"
      }
    }
  }'

# Test it
curl http://localhost:3000/users
# Returns: [{"id":999,"name":"Mocked User"}]
```

## 📖 Examples

### Override Single Method

```bash
POST /__integr8__/override/UsersService
{
  "methods": {
    "findOne": {
      "type": "fn",
      "args": ["id"],
      "body": "return { id, name: \"User \" + id };"
    }
  }
}
```

### Replace Entire Provider (Factory)

```bash
POST /__integr8__/override/UsersService
{
  "factory": {
    "body": "return { findAll: () => [], findOne: (id) => null };"
  }
}
```

### Reset Override

```bash
POST /__integr8__/override/UsersService
{ "reset": true }

# Or reset all
POST /__integr8__/override/reset-all
```

### List Active Overrides

```bash
GET /__integr8__/overrides
```

## 🧪 Using in Tests

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'Authorization': 'Bearer your-secret-token' }
});

describe('Users API', () => {
  beforeEach(async () => {
    // Apply override
    await api.post('/__integr8__/override/UsersService', {
      methods: {
        findAll: {
          type: 'fn',
          body: 'return [{ id: 1, name: "Test User" }];'
        }
      }
    });
  });

  afterEach(async () => {
    // Reset
    await api.post('/__integr8__/override/reset-all');
  });

  it('returns mocked data', async () => {
    const res = await axios.get('http://localhost:3000/users');
    expect(res.data[0].name).toBe('Test User');
  });
});
```

## Security

⚠️ **Only for test environments!**

Protection layers:
- Environment gate: `INTEGR8_OVERRIDES_ENABLED=1`
- Bearer token auth: `INTEGR8_OVERRIDES_TOKEN`
- VM sandbox: No access to require/process
- Execution timeout: 5000ms

## Documentation

- **[TestOverridesModule Guide](./TEST_OVERRIDES_MODULE.md)** - Complete documentation
- **[Examples](./examples/)** - Working code samples

## License

MIT © [Radoslaw Kamysz](mailto:radoslaw.kamysz@gmail.com)

## Related

- [@soapjs/integr8](https://www.npmjs.com/package/@soapjs/integr8) - Core testing framework
- [@soapjs/soap](https://www.npmjs.com/package/@soapjs/soap) - SOAP framework

---

Made with ❤️ by the [SoapJS](https://soapjs.com) team
