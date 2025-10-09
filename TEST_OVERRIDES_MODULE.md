# TestOverridesModule - Runtime Method Patching for NestJS

## 🎯 Problem Solved

NestJS DI system doesn't allow runtime provider replacement after application startup. This module **solves that** by wrapping all providers in Proxy during initialization, enabling runtime method patching through HTTP API.

## ✨ Key Features

- ✅ **Runtime Override** - Works AFTER app startup
- ✅ **Proxy Pattern** - No DI modifications needed
- ✅ **VM Sandbox** - Secure code execution (no eval)
- ✅ **HTTP API** - Apply overrides via REST endpoints
- ✅ **Zero Mocks** - All configuration via HTTP/JSON
- ✅ **Auto-Discovery** - Automatically wraps all providers
- ✅ **Factory Support** - Replace entire providers
- ✅ **Authorization** - Bearer token protection
- ✅ **Environment Gated** - Only works when explicitly enabled

## 📦 Installation

Already included in `@soapjs/integr8-nestjs` v1.0.2+

## 🚀 Quick Start

### 1. Enable in AppModule

```typescript
import { Module } from '@nestjs/common';
import { TestOverridesModule } from '@soapjs/integr8-nestjs';

// Conditionally include only in test environment
const testModules = TestOverridesModule.isEnabled() 
  ? [TestOverridesModule] 
  : [];

@Module({
  imports: [
    ...testModules,
    // Your other modules
  ],
})
export class AppModule {}
```

### 2. Set Environment Variables

```bash
export INTEGR8_OVERRIDES_ENABLED=1
export INTEGR8_OVERRIDES_TOKEN=your-secret-token
export NODE_ENV=test
```

### 3. Start Application

```bash
npm run start
```

The module will automatically wrap all providers in Proxy!

## 📡 HTTP API

All endpoints require `Authorization: Bearer your-secret-token` header.

### List Active Overrides

```http
GET /__integr8__/overrides
Authorization: Bearer your-secret-token
```

**Response:**
```json
{
  "overrides": {
    "UsersService": {
      "methods": ["findAll", "findOne"],
      "hasFactory": false
    }
  },
  "proxiedProviders": ["UsersService", "OrdersService", ...]
}
```

### Patch Method(s)

```http
POST /__integr8__/override/:token
Authorization: Bearer your-secret-token
Content-Type: application/json

{
  "methods": {
    "methodName": {
      "type": "fn",
      "args": ["param1", "param2"],
      "body": "return `mocked:${param1}-${param2}`;"
    }
  }
}
```

### Replace with Factory

```http
POST /__integr8__/override/:token
Authorization: Bearer your-secret-token
Content-Type: application/json

{
  "factory": {
    "body": "return { method1: () => 'mock1', method2: () => 'mock2' };"
  }
}
```

### Reset Single Override

```http
POST /__integr8__/override/:token
Authorization: Bearer your-secret-token
Content-Type: application/json

{ "reset": true }
```

### Reset All Overrides

```http
POST /__integr8__/override/reset-all
Authorization: Bearer your-secret-token
```

### Health Check

```http
GET /__integr8__/health
Authorization: Bearer your-secret-token
```

## 🔧 How It Works

### Architecture

```
┌─────────────────────────────────────────┐
│  TestOverridesModule (OnModuleInit)     │
│  - Discovers all providers              │
│  - Wraps each in Proxy                  │
│  - Replaces instance in DI container    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  PatchManager                           │
│  - Creates Proxy for each provider      │
│  - Handler intercepts method calls      │
│  - Delegates to Registry                │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Registry                               │
│  - Stores method patches                │
│  - Stores factory functions             │
│  - Returns appropriate implementation   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Controller (HTTP API)                  │
│  - Receives override requests           │
│  - Compiles functions in VM sandbox     │
│  - Updates Registry                     │
└─────────────────────────────────────────┘
```

### Proxy Handler Logic

```typescript
proxy.get(target, method) {
  const override = registry.get(token);
  
  if (override.factory) {
    return override.factory()[method];  // Factory takes precedence
  }
  
  if (override.methods.has(method)) {
    return override.methods.get(method);  // Method patch
  }
  
  return target[method];  // Original implementation
}
```

### VM Sandbox

Functions are compiled in isolated VM context:
- No access to `require()`
- No access to `process`
- No access to global scope
- 1000ms execution timeout
- Only standard JavaScript features

## 💡 Examples

### Example 1: Patch Single Method

```bash
curl -X POST http://localhost:3000/__integr8__/override/UsersService \
  -H "Authorization: Bearer supersecret" \
  -H "Content-Type: application/json" \
  -d '{
    "methods": {
      "findAll": {
        "type": "fn",
        "body": "return [{ id: 999, name: \"Mocked User\" }];"
      }
    }
  }'
```

### Example 2: Patch with Logic

```bash
curl -X POST http://localhost:3000/__integr8__/override/UsersService \
  -H "Authorization: Bearer supersecret" \
  -H "Content-Type: application/json" \
  -d '{
    "methods": {
      "findOne": {
        "type": "fn",
        "args": ["id"],
        "body": "return { id: parseInt(id), name: \"User \" + id, isTest: true };"
      }
    }
  }'
```

### Example 3: Async Method

```bash
curl -X POST http://localhost:3000/__integr8__/override/UsersService \
  -H "Authorization: Bearer supersecret" \
  -H "Content-Type: application/json" \
  -d '{
    "methods": {
      "create": {
        "type": "fn",
        "args": ["data"],
        "body": "return new Promise(r => setTimeout(() => r({ id: 888, ...data }), 100));"
      }
    }
  }'
```

### Example 4: Full Provider Replacement

```bash
curl -X POST http://localhost:3000/__integr8__/override/UsersService \
  -H "Authorization: Bearer supersecret" \
  -H "Content-Type: application/json" \
  -d '{
    "factory": {
      "body": "return { findAll: () => [], findOne: () => null, create: () => ({ id: 1 }) };"
    }
  }'
```

### Example 5: Error Simulation

```bash
curl -X POST http://localhost:3000/__integr8__/override/UsersService \
  -H "Authorization: Bearer supersecret" \
  -H "Content-Type: application/json" \
  -d '{
    "methods": {
      "findAll": {
        "type": "fn",
        "body": "throw new Error(\"Simulated database error\");"
      }
    }
  }'
```

## 🧪 Integration with Tests

### Jest/Vitest

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'Authorization': 'Bearer supersecret' }
});

describe('Users API', () => {
  beforeEach(async () => {
    await api.post('/__integr8__/override/UsersService', {
      methods: {
        findAll: {
          type: 'fn',
          body: 'return [{ id: 999, name: "Test User" }];'
        }
      }
    });
  });

  afterEach(async () => {
    await api.post('/__integr8__/override/UsersService', {
      reset: true
    });
  });

  it('returns mocked data', async () => {
    const res = await axios.get('http://localhost:3000/users');
    expect(res.data[0].name).toBe('Test User');
  });
});
```

### Python (pytest)

```python
import requests

BASE = 'http://localhost:3000'
HEADERS = {'Authorization': 'Bearer supersecret'}

def test_users():
    # Apply override
    requests.post(
        f'{BASE}/__integr8__/override/UsersService',
        json={'methods': {'findAll': {'type': 'fn', 'body': 'return [];'}}},
        headers=HEADERS
    )
    
    # Test
    res = requests.get(f'{BASE}/users')
    assert res.json() == []
    
    # Cleanup
    requests.post(
        f'{BASE}/__integr8__/override/UsersService',
        json={'reset': True},
        headers=HEADERS
    )
```

## 🔒 Security

### Protection Layers

1. **Environment Gate**: Module only loads when `INTEGR8_OVERRIDES_ENABLED=1`
2. **Authorization**: Bearer token from `INTEGR8_OVERRIDES_TOKEN`
3. **VM Sandbox**: Code execution in isolated context
4. **Timeout**: 1000ms execution limit

### Best Practices

- ⚠️ **Never enable in production**
- ✅ Use strong random tokens
- ✅ Use environment-specific tokens
- ✅ Keep tokens in CI/CD secrets
- ✅ IP whitelist in staging environments
- ✅ Monitor `/__integr8__/*` endpoint access

## 📊 Comparison

| Feature | TestOverridesModule | Test.createTestingModule().override() | Manual Mocks |
|---------|-------------------|-------------------------------------|--------------|
| Runtime Override | ✅ Yes | ❌ No (before init) | ❌ No |
| Zero Mocks in Repo | ✅ Yes | ❌ No | ❌ No |
| HTTP API | ✅ Yes | ❌ No | ❌ No |
| Auto-Discovery | ✅ Yes | ❌ No | ❌ No |
| Safe Eval | ✅ VM Sandbox | N/A | N/A |
| Works with Running App | ✅ Yes | ❌ No | ❌ No |

## 🐛 Troubleshooting

### Module Not Loading

**Problem**: Overrides don't work
**Solution**: Check `INTEGR8_OVERRIDES_ENABLED=1` is set

### Authorization Failed

**Problem**: 401 Unauthorized
**Solution**: Check `INTEGR8_OVERRIDES_TOKEN` matches header

### Method Not Patched

**Problem**: Original method still executes
**Solution**: 
- Verify token name matches provider class name
- Check override was applied: `GET /__integr8__/overrides`

### Syntax Error in Function Body

**Problem**: Override fails with parse error
**Solution**: Test function body syntax:
```javascript
// Valid
"return { id: 1 };"

// Invalid
"{ id: 1 }"  // Missing return
```

## 🎓 Advanced Topics

### Multi-line Functions

```json
{
  "methods": {
    "complexMethod": {
      "type": "fn",
      "args": ["a", "b"],
      "body": `
        const sum = a + b;
        if (sum > 10) {
          return { result: 'high', value: sum };
        }
        return { result: 'low', value: sum };
      `
    }
  }
}
```

### Stateful Overrides

```json
{
  "methods": {
    "counter": {
      "type": "fn",
      "body": `
        (() => {
          let count = 0;
          return () => ++count;
        })()
      `
    }
  }
}
```

### Access to 'this'

Method patches have access to original provider via `this`:
```json
{
  "methods": {
    "enhanced": {
      "type": "fn",
      "body": `
        // 'this' refers to original UsersService instance
        const original = this.originalMethod();
        return { ...original, enhanced: true };
      `
    }
  }
}
```

## 📚 Resources

- [Examples](./examples/test-overrides-example/)
- [Source Code](./src/test-overrides/)
- [Main README](./README.md)
- [Changelog](./CHANGELOG.md)

## 🤝 Credits

Design inspired by modern testing frameworks and runtime patching patterns. Special thanks to the NestJS and Integr8 communities.

---

**This is the recommended approach for runtime testing with Integr8 and NestJS!** 🚀

