/**
 * Security Tests - セキュリティ機能のテスト
 */

import { PasswordManager, JWTManager, SecurityHelper, SessionManager } from '../security';
import { AuditLogManager, AuditEventType, AuditLogLevel } from '../audit-log';
import { RateLimitManager, IPBlockManager } from '../rate-limit';

// テスト環境でのセキュリティ設定をモック
jest.mock('../config', () => ({
  securityConfig: {
    jwt: {
      secret: 'test-jwt-secret-key-for-testing-purposes-only',
      expiresIn: '1h',
      algorithm: 'HS256',
    },
    bcrypt: {
      rounds: 10, // テストでは低めに設定
    },
    rateLimit: {
      windowMs: 60000, // 1分
      maxRequests: 10,
    },
    session: {
      timeoutMs: 3600000, // 1時間
    },
    audit: {
      enabled: false, // テストでは無効化
      logFile: '/tmp/test-audit.log',
    },
  },
}));

describe('PasswordManager', () => {
  describe('validatePassword', () => {
    test('should validate strong password', () => {
      const result = PasswordManager.validatePassword('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject weak password', () => {
      const result = PasswordManager.validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject password without uppercase', () => {
      const result = PasswordManager.validatePassword('lowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    test('should reject password without lowercase', () => {
      const result = PasswordManager.validatePassword('UPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    test('should reject password without numbers', () => {
      const result = PasswordManager.validatePassword('NoNumbers!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    test('should reject password without special characters', () => {
      const result = PasswordManager.validatePassword('NoSpecial123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    test('should reject too short password', () => {
      const result = PasswordManager.validatePassword('Sh1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });

  describe('hashPassword', () => {
    test('should hash valid password', async () => {
      const result = await PasswordManager.hashPassword('ValidPass123!');
      expect(result.success).toBe(true);
      expect(result.hash).toBeDefined();
      expect(result.hash?.length).toBeGreaterThan(50);
    });

    test('should reject invalid password', async () => {
      const result = await PasswordManager.hashPassword('weak');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.hash).toBeUndefined();
    });
  });

  describe('verifyPassword', () => {
    test('should verify correct password', async () => {
      const password = 'TestPass123!';
      const hashResult = await PasswordManager.hashPassword(password);
      
      expect(hashResult.success).toBe(true);
      
      const verifyResult = await PasswordManager.verifyPassword(password, hashResult.hash!);
      expect(verifyResult.success).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'TestPass123!';
      const wrongPassword = 'WrongPass123!';
      const hashResult = await PasswordManager.hashPassword(password);
      
      expect(hashResult.success).toBe(true);
      
      const verifyResult = await PasswordManager.verifyPassword(wrongPassword, hashResult.hash!);
      expect(verifyResult.success).toBe(false);
      expect(verifyResult.error).toBe('Invalid password');
    });
  });

  describe('generateRandomPassword', () => {
    test('should generate password with default length', () => {
      const password = PasswordManager.generateRandomPassword();
      expect(password.length).toBe(16);
    });

    test('should generate password with custom length', () => {
      const password = PasswordManager.generateRandomPassword(20);
      expect(password.length).toBe(20);
    });

    test('should generate different passwords', () => {
      const password1 = PasswordManager.generateRandomPassword();
      const password2 = PasswordManager.generateRandomPassword();
      expect(password1).not.toBe(password2);
    });
  });
});

describe('JWTManager', () => {
  const testPayload = {
    sub: 'user123',
    email: 'test@example.com',
    role: 'user',
    tenantId: 'tenant123',
    userId: 'user123',
  };

  describe('generateToken', () => {
    test('should generate valid JWT token', () => {
      const token = JWTManager.generateToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT should have 3 parts
    });
  });

  describe('verifyToken', () => {
    test('should verify valid token', () => {
      const token = JWTManager.generateToken(testPayload);
      const result = JWTManager.verifyToken(token);
      
      expect(result.success).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe(testPayload.sub);
      expect(result.payload?.email).toBe(testPayload.email);
    });

    test('should reject invalid token', () => {
      const result = JWTManager.verifyToken('invalid.token.here');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should reject token with missing required fields', () => {
      const invalidPayload = { sub: 'user123' }; // missing email and userId
      const token = JWTManager.generateToken(invalidPayload as any);
      const result = JWTManager.verifyToken(token);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('missing required fields');
    });
  });

  describe('generateRefreshToken', () => {
    test('should generate refresh token', () => {
      const refreshToken = JWTManager.generateRefreshToken('user123');
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
    });
  });

  describe('verifyRefreshToken', () => {
    test('should verify valid refresh token', () => {
      const refreshToken = JWTManager.generateRefreshToken('user123');
      const result = JWTManager.verifyRefreshToken(refreshToken);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user123');
    });

    test('should reject access token as refresh token', () => {
      const accessToken = JWTManager.generateToken(testPayload);
      const result = JWTManager.verifyRefreshToken(accessToken);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
    });
  });
});

describe('SecurityHelper', () => {
  describe('generateSecureRandomString', () => {
    test('should generate random string with default length', () => {
      const str = SecurityHelper.generateSecureRandomString();
      expect(str.length).toBe(64); // 32 bytes * 2 (hex)
    });

    test('should generate random string with custom length', () => {
      const str = SecurityHelper.generateSecureRandomString(16);
      expect(str.length).toBe(32); // 16 bytes * 2 (hex)
    });

    test('should generate different strings', () => {
      const str1 = SecurityHelper.generateSecureRandomString();
      const str2 = SecurityHelper.generateSecureRandomString();
      expect(str1).not.toBe(str2);
    });
  });

  describe('generateApiKey', () => {
    test('should generate API key with gftd prefix', () => {
      const apiKey = SecurityHelper.generateApiKey();
      expect(apiKey).toMatch(/^gftd_[a-f0-9]{64}$/);
    });
  });

  describe('sanitizeInput', () => {
    test('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = SecurityHelper.sanitizeInput(input);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    test('should remove quotes and semicolons', () => {
      const input = 'test"quote\'single;semicolon';
      const sanitized = SecurityHelper.sanitizeInput(input);
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
    });
  });

  describe('escapeSQLString', () => {
    test('should escape single quotes', () => {
      const input = "O'Reilly";
      const escaped = SecurityHelper.escapeSQLString(input);
      expect(escaped).toBe("O''Reilly");
    });
  });

  describe('escapeHTML', () => {
    test('should escape HTML characters', () => {
      const input = '<script>alert("test")</script>';
      const escaped = SecurityHelper.escapeHTML(input);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
    });
  });

  describe('hashString', () => {
    test('should generate consistent hash', () => {
      const input = 'test string';
      const hash1 = SecurityHelper.hashString(input);
      const hash2 = SecurityHelper.hashString(input);
      expect(hash1).toBe(hash2);
    });

    test('should generate different hashes for different inputs', () => {
      const hash1 = SecurityHelper.hashString('input1');
      const hash2 = SecurityHelper.hashString('input2');
      expect(hash1).not.toBe(hash2);
    });
  });
});

describe('SessionManager', () => {
  beforeEach(() => {
    // セッションをクリア
    SessionManager.cleanupExpiredSessions();
  });

  describe('createSession', () => {
    test('should create new session', () => {
      const sessionId = SessionManager.createSession('user123', { role: 'user' });
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^sess_/);
    });
  });

  describe('getSession', () => {
    test('should retrieve valid session', () => {
      const sessionId = SessionManager.createSession('user123', { role: 'user' });
      const session = SessionManager.getSession(sessionId);
      
      expect(session).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.data.role).toBe('user');
    });

    test('should return null for non-existent session', () => {
      const session = SessionManager.getSession('invalid-session-id');
      expect(session).toBeNull();
    });
  });

  describe('deleteSession', () => {
    test('should delete session', () => {
      const sessionId = SessionManager.createSession('user123', { role: 'user' });
      SessionManager.deleteSession(sessionId);
      
      const session = SessionManager.getSession(sessionId);
      expect(session).toBeNull();
    });
  });
});

describe('RateLimitManager', () => {
  let rateLimitManager: RateLimitManager;

  beforeEach(() => {
    rateLimitManager = RateLimitManager.getInstance();
    rateLimitManager.resetAllLimits();
  });

  describe('checkLimit', () => {
    test('should allow requests within limit', () => {
      const result1 = rateLimitManager.checkLimit('test-key');
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(9); // 10 - 1

      const result2 = rateLimitManager.checkLimit('test-key');
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(8); // 10 - 2
    });

    test('should block requests exceeding limit', () => {
      // 制限まで使い切る
      for (let i = 0; i < 10; i++) {
        rateLimitManager.checkLimit('test-key');
      }

      // 11回目は拒否される
      const result = rateLimitManager.checkLimit('test-key');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('resetLimit', () => {
    test('should reset limit for specific key', () => {
      // 制限まで使い切る
      for (let i = 0; i < 10; i++) {
        rateLimitManager.checkLimit('test-key');
      }

      // リセット
      rateLimitManager.resetLimit('test-key');

      // 再度アクセス可能
      const result = rateLimitManager.checkLimit('test-key');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });
});

describe('IPBlockManager', () => {
  beforeEach(() => {
    // ブロックリストをクリア
    IPBlockManager.getBlockedIPs().forEach(ip => {
      IPBlockManager.unblockIP(ip);
    });
  });

  describe('blockIP', () => {
    test('should block IP address', () => {
      IPBlockManager.blockIP('192.168.1.100');
      const blockedIPs = IPBlockManager.getBlockedIPs();
      expect(blockedIPs).toContain('192.168.1.100');
    });
  });

  describe('unblockIP', () => {
    test('should unblock IP address', () => {
      IPBlockManager.blockIP('192.168.1.100');
      IPBlockManager.unblockIP('192.168.1.100');
      
      const blockedIPs = IPBlockManager.getBlockedIPs();
      expect(blockedIPs).not.toContain('192.168.1.100');
    });
  });

  describe('trackSuspiciousIP', () => {
    test('should track suspicious activity', () => {
      IPBlockManager.trackSuspiciousIP('192.168.1.200');
      
      const suspiciousIPs = IPBlockManager.getSuspiciousIPs();
      expect(suspiciousIPs).toHaveLength(1);
      expect(suspiciousIPs[0].ip).toBe('192.168.1.200');
      expect(suspiciousIPs[0].count).toBe(1);
    });

    test('should auto-block after threshold', () => {
      // 10回違反を記録
      for (let i = 0; i < 10; i++) {
        IPBlockManager.trackSuspiciousIP('192.168.1.201');
      }

      const blockedIPs = IPBlockManager.getBlockedIPs();
      expect(blockedIPs).toContain('192.168.1.201');
    });
  });
});

describe('SQL Injection Protection', () => {
  test('should escape dangerous SQL characters', () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const escaped = SecurityHelper.escapeSQLString(maliciousInput);
    expect(escaped).toBe("''; DROP TABLE users; --");
  });

  test('should sanitize input to prevent injection', () => {
    const maliciousInput = "test'; DELETE FROM users WHERE '1'='1";
    const sanitized = SecurityHelper.sanitizeInput(maliciousInput);
    expect(sanitized).not.toContain("'");
    expect(sanitized).not.toContain(';');
  });
});

describe('XSS Protection', () => {
  test('should escape script tags', () => {
    const xssInput = '<script>alert("xss")</script>';
    const escaped = SecurityHelper.escapeHTML(xssInput);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  test('should handle multiple XSS vectors', () => {
    const xssInput = '<img src="x" onerror="alert(1)">';
    const escaped = SecurityHelper.escapeHTML(xssInput);
    expect(escaped).not.toContain('<img');
    expect(escaped).not.toContain('onerror');
  });
});

describe('Token Security', () => {
  test('should generate cryptographically secure tokens', () => {
    const token1 = SecurityHelper.generateSecureRandomString(32);
    const token2 = SecurityHelper.generateSecureRandomString(32);
    
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    expect(/^[a-f0-9]+$/i.test(token1)).toBe(true);
  });

  test('should generate time-based tokens correctly', () => {
    const secret = 'test-secret-key';
    const token1 = SecurityHelper.generateTimeBasedToken(secret);
    const token2 = SecurityHelper.generateTimeBasedToken(secret);
    
    // 同じ時間窓では同じトークン
    expect(token1).toBe(token2);
    
    // 検証が成功
    const isValid = SecurityHelper.verifyTimeBasedToken(token1, secret);
    expect(isValid).toBe(true);
    
    // 無効なトークンは拒否
    const isInvalid = SecurityHelper.verifyTimeBasedToken('invalid-token', secret);
    expect(isInvalid).toBe(false);
  });
});

describe('Integration Tests', () => {
  test('should handle complete authentication flow securely', async () => {
    // 1. パスワードをハッシュ化
    const password = 'SecurePass123!';
    const hashResult = await PasswordManager.hashPassword(password);
    expect(hashResult.success).toBe(true);

    // 2. JWTトークンを生成
    const payload = {
      sub: 'user123',
      email: 'test@example.com',
      role: 'user',
      tenantId: 'tenant123',
      userId: 'user123',
    };
    const token = JWTManager.generateToken(payload);

    // 3. トークンを検証
    const verifyResult = JWTManager.verifyToken(token);
    expect(verifyResult.success).toBe(true);

    // 4. セッションを作成
    const sessionId = SessionManager.createSession('user123', { token });
    const session = SessionManager.getSession(sessionId);
    expect(session).toBeDefined();

    // 5. パスワードを検証
    const passwordResult = await PasswordManager.verifyPassword(password, hashResult.hash!);
    expect(passwordResult.success).toBe(true);
  });
}); 