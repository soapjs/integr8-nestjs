# Usage Examples

Detailed examples for using `@soapjs/integr8-nestjs` in various scenarios.

## 📋 Table of Contents

- [Basic Usage](#basic-usage)
- [Advanced Overrides](#advanced-overrides)
- [Integration with Testing Frameworks](#integration-with-testing-frameworks)
- [Real-world Scenarios](#real-world-scenarios)
- [Troubleshooting](#troubleshooting)

## Basic Usage

### Override Service Method

```bash
curl -X POST http://localhost:3000/__integr8__/override/UsersService \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "methods": {
      "findAll": {
        "type": "fn",
        "body": "return [{ id: 1, name: \"Mock User\" }];"
      }
    }
  }'
```

### Override with Parameters

```bash
curl -X POST http://localhost:3000/__integr8__/override/UsersService \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "methods": {
      "findOne": {
        "type": "fn",
        "args": ["id"],
        "body": "return { id: parseInt(id), name: \"User \" + id, email: \"user\" + id + \"@test.com\" };"
      }
    }
  }'
```

### Override Async Method

```bash
curl -X POST http://localhost:3000/__integr8__/override/UsersService \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "methods": {
      "create": {
        "type": "fn",
        "args": ["userData"],
        "body": "return Promise.resolve({ id: 999, ...userData, createdAt: new Date().toISOString() });"
      }
    }
  }'
```

## Advanced Overrides

### Replace Entire Provider (Factory)

```bash
curl -X POST http://localhost:3000/__integr8__/override/UsersService \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "factory": {
      "body": "return { findAll: () => [], findOne: (id) => null, create: (data) => ({ id: 1, ...data }) };"
    }
  }'
```

### Conditional Logic

```bash
curl -X POST http://localhost:3000/__integr8__/override/AuthService \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "methods": {
      "validateUser": {
        "type": "fn",
        "args": ["email", "password"],
        "body": "if (email === \"admin@test.com\") return { id: 1, role: \"admin\" }; return null;"
      }
    }
  }'
```

### Error Simulation

```bash
curl -X POST http://localhost:3000/__integr8__/override/DatabaseService \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "methods": {
      "query": {
        "type": "fn",
        "body": "throw new Error(\"Simulated database connection error\");"
      }
    }
  }'
```

## Integration with Testing Frameworks

### Jest/Vitest

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:3000',
  headers: { 'Authorization': `Bearer ${process.env.INTEGR8_TOKEN}` }
});

describe('Users API', () => {
  beforeEach(async () => {
    await api.post('/__integr8__/override/UsersService', {
      methods: {
        findAll: {
          type: 'fn',
          body: 'return [{ id: 999, name: "Test" }];'
        }
      }
    });
  });

  afterEach(async () => {
    await api.post('/__integr8__/override/reset-all');
  });

  it('returns mocked users', async () => {
    const response = await axios.get(`${api.defaults.baseURL}/users`);
    expect(response.data[0].name).toBe('Test');
  });
});
```

### Pytest (Python)

```python
import requests
import os

BASE_URL = os.getenv('API_URL', 'http://localhost:3000')
TOKEN = os.getenv('INTEGR8_TOKEN')
HEADERS = {'Authorization': f'Bearer {TOKEN}'}

def setup_function():
    """Reset before each test"""
    requests.post(f'{BASE_URL}/__integr8__/override/reset-all', headers=HEADERS)

def test_users_with_override():
    # Apply override
    requests.post(
        f'{BASE_URL}/__integr8__/override/UsersService',
        json={
            'methods': {
                'findAll': {
                    'type': 'fn',
                    'body': 'return [{ id: 999, name: "Python Test" }];'
                }
            }
        },
        headers=HEADERS
    )
    
    # Test
    response = requests.get(f'{BASE_URL}/users')
    assert response.json()[0]['name'] == 'Python Test'
```

### Postman

```javascript
// Pre-request Script
pm.sendRequest({
  url: pm.environment.get('baseUrl') + '/__integr8__/override/UsersService',
  method: 'POST',
  header: {
    'Authorization': 'Bearer ' + pm.environment.get('token'),
    'Content-Type': 'application/json'
  },
  body: {
    mode: 'raw',
    raw: JSON.stringify({
      methods: {
        findAll: {
          type: 'fn',
          body: 'return [{ id: 1, name: "Postman Test" }];'
        }
      }
    })
  }
});

// Test Script
pm.test("Returns mocked data", function () {
  pm.response.to.have.jsonBody([{id: 1, name: "Postman Test"}]);
});
```

## Real-world Scenarios

### Scenario 1: Test Authentication Without Real Auth Service

```typescript
// Override auth guard to always allow access
await api.post('/__integr8__/override/AuthGuard', {
  methods: {
    canActivate: {
      type: 'fn',
      body: 'return true;'
    }
  }
});

// Now you can test protected endpoints without auth
const response = await axios.get('/admin/users');
expect(response.status).toBe(200);
```

### Scenario 2: Test Error Handling

```typescript
// Make service throw an error
await api.post('/__integr8__/override/PaymentService', {
  methods: {
    processPayment: {
      type: 'fn',
      body: 'throw new Error("Payment gateway timeout");'
    }
  }
});

// Verify your app handles the error correctly
const response = await axios.post('/payments', paymentData);
expect(response.status).toBe(503);
expect(response.data.error).toContain('timeout');
```

### Scenario 3: Test Rate Limiting

```typescript
// Override rate limiter to always allow
await api.post('/__integr8__/override/RateLimiterService', {
  methods: {
    checkLimit: {
      type: 'fn',
      body: 'return { allowed: true, remaining: 999 };'
    }
  }
});

// Make many requests without hitting rate limit
for (let i = 0; i < 100; i++) {
  const response = await axios.get('/api/endpoint');
  expect(response.status).toBe(200);
}
```

### Scenario 4: Test with Different User Roles

```typescript
// Test as admin
await api.post('/__integr8__/override/AuthService', {
  methods: {
    getCurrentUser: {
      type: 'fn',
      body: 'return { id: 1, role: "admin", permissions: ["*"] };'
    }
  }
});

let response = await axios.get('/admin/dashboard');
expect(response.status).toBe(200);

// Reset and test as regular user
await api.post('/__integr8__/override/AuthService', {
  methods: {
    getCurrentUser: {
      type: 'fn',
      body: 'return { id: 2, role: "user", permissions: ["read"] };'
    }
  }
});

response = await axios.get('/admin/dashboard');
expect(response.status).toBe(403);
```

## Troubleshooting

### Override Doesn't Work

**Check:**
1. Module is imported: `TestOverridesModule` in AppModule
2. Environment variables are set
3. Token is correct
4. Service name matches class name exactly (case-sensitive)

```bash
# Verify module is loaded
curl -H "Authorization: Bearer token" \
  http://localhost:3000/__integr8__/health

# Check if provider is wrapped
curl -H "Authorization: Bearer token" \
  http://localhost:3000/__integr8__/overrides
# Look for your service in "proxiedProviders"
```

### Authorization Fails

```bash
# Verify token matches
echo $INTEGR8_OVERRIDES_TOKEN

# Test with explicit token
curl -H "Authorization: Bearer $(echo $INTEGR8_OVERRIDES_TOKEN)" \
  http://localhost:3000/__integr8__/health
```

### Function Syntax Error

```bash
# Test your function locally first
node -e "console.log((function() { return [{ id: 1 }]; })())"

# Then use it in override
# Make sure to escape quotes properly in JSON
```

## More Information

- **[Complete API Reference](./TEST_OVERRIDES_MODULE.md)**
- **[HTTP Examples](./HTTP_OVERRIDE_EXAMPLE.md)**
- **[Technical Details](./HOW_IT_WORKS.md)**
- **[Code Examples](./examples/)**

---

**Need help?** Open an issue on [GitHub](https://github.com/soapjs/integr8-nestjs)

