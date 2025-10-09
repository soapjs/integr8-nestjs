import * as vm from 'node:vm';

/**
 * Compile a function in a secure sandbox without eval
 * Uses Node.js VM module for safe code execution
 */
export function compileFunctionInSandbox(
  body: string,
  params: string[] = [],
  timeoutMs = 5000,
): Function {
  if (!body || typeof body !== 'string') {
    throw new Error('Function body must be a non-empty string');
  }

  // Sandbox with safe globals (Math, Date, JSON, Promise, etc.)
  const sandbox = {
    Math,
    Date,
    JSON,
    Promise,
    Array,
    Object,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };

  const context = vm.createContext(sandbox);
  
  try {
    // Compile function with parameters
    const fn = vm.compileFunction(body, params, {
      parsingContext: context,
    });
    
    // Return the compiled function directly
    // It will execute in the sandbox context
    return fn;
  } catch (error) {
    throw new Error(`Failed to compile function: ${(error as Error).message}`);
  }
}

/**
 * Convert any token to string representation
 */
export function tokenToString(token: any): string {
  if (typeof token === 'string') return token;
  if (typeof token === 'symbol') return token.toString();
  if (typeof token === 'function' && token.name) return token.name;
  try {
    return String(token);
  } catch {
    return 'unknown-token';
  }
}

