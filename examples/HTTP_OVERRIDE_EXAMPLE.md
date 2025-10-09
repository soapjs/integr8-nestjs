# HTTP Override Example

This document shows how to use the `/__integr8__/override` endpoint to override providers via HTTP.

## 🎯 Key Concept

Since HTTP can only transfer JSON (not JavaScript functions), we send functions as **strings** that get evaluated on the server side.

## 📡 Endpoint

```
POST /__integr8__/override
```

## 📦 Request Format

### Option 1: String-based Functions (Recommended for HTTP)

```json
{
  "type": "service",
  "name": "UsersService",
  "implementation": {
    "findAll": "() => [{ id: 999, name: 'HTTP Override User', email: 'http@test.com' }]",
    "findOne": "(id) => ({ id: id, name: 'User ' + id, email: 'user' + id + '@test.com' })"
  }
}
```

### Option 2: Direct Objects (for simple data)

```json
{
  "type": "service",
  "name": "ConfigService",
  "implementation": {
    "get": "() => ({ apiKey: 'test-key-123', debug: true })"
  }
}
```

## 🔥 Examples

### Example 1: Override User Service

```bash
curl -X POST http://localhost:3000/__integr8__/override \
  -H "Content-Type: application/json" \
  -d '{
    "type": "service",
    "name": "UsersService",
    "implementation": {
      "findAll": "() => [{ id: 999, name: \"Mocked User\", email: \"mock@test.com\" }]"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Override applied: service:UsersService"
}
```

**Now test it:**
```bash
curl http://localhost:3000/users

# Returns:
[{ "id": 999, "name": "Mocked User", "email": "mock@test.com" }]
```

### Example 2: Override with Logic

```bash
curl -X POST http://localhost:3000/__integr8__/override \
  -H "Content-Type: application/json" \
  -d '{
    "type": "service",
    "name": "UsersService",
    "implementation": {
      "findOne": "(id) => ({ id: parseInt(id), name: \"User \" + id, email: \"user\" + id + \"@test.com\", isTest: true })"
    }
  }'
```

### Example 3: Override with Async Function

```bash
curl -X POST http://localhost:3000/__integr8__/override \
  -H "Content-Type: application/json" \
  -d '{
    "type": "service",
    "name": "UsersService",
    "implementation": {
      "create": "async (userData) => { await new Promise(r => setTimeout(r, 100)); return { id: 888, ...userData, createdAt: new Date().toISOString() }; }"
    }
  }'
```

### Example 4: Override Repository

```bash
curl -X POST http://localhost:3000/__integr8__/override \
  -H "Content-Type: application/json" \
  -d '{
    "type": "repository",
    "name": "User",
    "implementation": {
      "find": "() => Promise.resolve([{ id: 1, name: \"Repo Mock\", email: \"repo@test.com\" }])"
    }
  }'
```

### Example 5: Override Guard (Always Allow)

```bash
curl -X POST http://localhost:3000/__integr8__/override \
  -H "Content-Type: application/json" \
  -d '{
    "type": "guard",
    "name": "AuthGuard",
    "implementation": {
      "canActivate": "() => true"
    }
  }'
```

## 🧪 Using with Tests

### JavaScript/TypeScript Test

```typescript
import axios from 'axios';

describe('User API with HTTP Override', () => {
  const baseUrl = 'http://localhost:3000';

  beforeEach(async () => {
    // Apply override via HTTP
    await axios.post(`${baseUrl}/__integr8__/override`, {
      type: 'service',
      name: 'UsersService',
      implementation: {
        findAll: '() => [{ id: 999, name: "Test User", email: "test@example.com" }]'
      }
    });
  });

  afterEach(async () => {
    // Remove override
    await axios.delete(`${baseUrl}/__integr8__/override/service/UsersService`);
  });

  it('should return mocked users', async () => {
    const response = await axios.get(`${baseUrl}/users`);
    
    expect(response.data).toHaveLength(1);
    expect(response.data[0].name).toBe('Test User');
  });
});
```

### Python Test

```python
import requests

def test_users_with_override():
    base_url = 'http://localhost:3000'
    
    # Apply override
    requests.post(f'{base_url}/__integr8__/override', json={
        'type': 'service',
        'name': 'UsersService',
        'implementation': {
            'findAll': '() => [{ id: 999, name: "Python Test", email: "python@test.com" }]'
        }
    })
    
    # Test
    response = requests.get(f'{base_url}/users')
    users = response.json()
    
    assert len(users) == 1
    assert users[0]['name'] == 'Python Test'
    
    # Cleanup
    requests.delete(f'{base_url}/__integr8__/override/service/UsersService')
```

## 🔍 Checking Active Overrides

```bash
curl http://localhost:3000/__integr8__/overrides
```

**Response:**
```json
{
  "count": 2,
  "overrides": [
    {
      "type": "service",
      "name": "UsersService",
      "hasImplementation": true
    },
    {
      "type": "guard",
      "name": "AuthGuard",
      "hasImplementation": true
    }
  ]
}
```

## 🗑️ Removing Overrides

### Remove Specific Override

```bash
curl -X DELETE http://localhost:3000/__integr8__/override/service/UsersService
```

### Remove All Overrides

```bash
# Get all overrides
OVERRIDES=$(curl -s http://localhost:3000/__integr8__/overrides | jq -r '.overrides[] | "\(.type)/\(.name)"')

# Remove each one
for override in $OVERRIDES; do
  curl -X DELETE http://localhost:3000/__integr8__/override/$override
done
```

## ⚠️ Important Notes

### 1. Function String Format

Functions must be sent as valid JavaScript code strings:

✅ **Correct:**
```json
{
  "findAll": "() => [{ id: 1 }]"
}
```

❌ **Incorrect:**
```json
{
  "findAll": () => [{ id: 1 }]  // Not a string!
}
```

### 2. Escaping Quotes

When sending via command line, escape quotes properly:

```bash
# Bash/sh
curl -d '{"implementation": {"findAll": "() => [{\"id\": 1}]"}}'

# Or use single quotes for JSON, double for strings:
curl -d "{\"implementation\": {\"findAll\": \"() => [{id: 1}]\"}}"
```

### 3. Complex Logic

For complex logic, you can use multi-line strings:

```typescript
await axios.post('/override', {
  type: 'service',
  name: 'UsersService',
  implementation: {
    findAll: `
      () => {
        const users = [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' }
        ];
        return users.filter(u => u.id > 0);
      }
    `
  }
});
```

### 4. Async Functions

Async functions work too:

```json
{
  "create": "async (data) => { await new Promise(r => setTimeout(r, 100)); return { id: Date.now(), ...data }; }"
}
```

### 5. Access to Variables

The evaluated function has access to standard JavaScript globals, but NOT to the application context. For accessing external data, use closures or pass data through function parameters.

## 🔒 Security Considerations

⚠️ **WARNING**: Using `eval()` for string-based functions is a **security risk** in production!

**This feature should ONLY be used:**
- In test environments
- With trusted input
- Behind authentication
- Never in production

**Recommendations:**
1. Only enable in test mode: `if (process.env.NODE_ENV === 'test')`
2. Add authentication to `/__integr8__` endpoints
3. Validate input before evaluation
4. Use IP whitelisting for test endpoints

## 🎭 Advanced Patterns

### Pattern 1: Stateful Overrides

```javascript
// Counter that increments on each call
await axios.post('/override', {
  type: 'service',
  name: 'CounterService',
  implementation: {
    getCount: `
      (() => {
        let count = 0;
        return () => ++count;
      })()
    `
  }
});
```

### Pattern 2: Conditional Logic

```javascript
await axios.post('/override', {
  type: 'service',
  name: 'UsersService',
  implementation: {
    findOne: `
      (id) => {
        if (id === 999) {
          return { id: 999, name: 'Special User', role: 'admin' };
        }
        return { id: id, name: 'Regular User', role: 'user' };
      }
    `
  }
});
```

### Pattern 3: Error Simulation

```javascript
await axios.post('/override', {
  type: 'service',
  name: 'UsersService',
  implementation: {
    findAll: `
      () => {
        throw new Error('Simulated database error');
      }
    `
  }
});
```

## 🧩 Integration with Testing Frameworks

### Jest

```typescript
beforeAll(async () => {
  await global.integr8.override({
    type: 'service',
    name: 'UsersService',
    implementation: {
      findAll: '() => [{ id: 1, name: "Jest User" }]'
    }
  });
});
```

### Mocha

```typescript
before(async function() {
  await this.integr8.override({
    type: 'service',
    name: 'UsersService',
    implementation: {
      findAll: '() => [{ id: 1, name: "Mocha User" }]'
    }
  });
});
```

### Postman

```javascript
// In Postman Pre-request Script
pm.sendRequest({
  url: pm.environment.get('baseUrl') + '/__integr8__/override',
  method: 'POST',
  header: 'Content-Type: application/json',
  body: {
    mode: 'raw',
    raw: JSON.stringify({
      type: 'service',
      name: 'UsersService',
      implementation: {
        findAll: '() => [{ id: 1, name: "Postman User" }]'
      }
    })
  }
});
```

---

**Remember**: This is a powerful testing tool. Use responsibly! 🚀

