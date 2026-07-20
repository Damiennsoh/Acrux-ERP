import bcrypt from 'bcryptjs';

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDurationMs: number;
  saltRounds: number;
}

const DEFAULT_CONFIG: SecurityConfig = {
  maxLoginAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  saltRounds: 10,
};

class SecurityService {
  private config: SecurityConfig;
  private lockoutMap = new Map<string, { attempts: number; lastAttempt: number }>();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.saltRounds);
  }

  /**
   * Compare a password with its hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a unique device ID
   */
  generateDeviceId(): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 11);
    return `device-${timestamp}-${randomStr}`;
  }

  /**
   * Check if a user is locked out due to failed login attempts
   */
  isLockedOut(userId: string): boolean {
    const lockout = this.lockoutMap.get(userId);
    if (!lockout) return false;

    const now = Date.now();
    const timeSinceLast = now - lockout.lastAttempt;

    if (timeSinceLast > this.config.lockoutDurationMs) {
      // Lockout period has expired
      this.lockoutMap.delete(userId);
      return false;
    }

    return lockout.attempts >= this.config.maxLoginAttempts;
  }

  /**
   * Record a failed login attempt
   */
  recordFailedAttempt(userId: string): void {
    const now = Date.now();
    const lockout = this.lockoutMap.get(userId);

    if (lockout) {
      const timeSinceLast = now - lockout.lastAttempt;
      if (timeSinceLast > this.config.lockoutDurationMs) {
        // Reset counter after lockout period
        this.lockoutMap.set(userId, { attempts: 1, lastAttempt: now });
      } else {
        lockout.attempts++;
        lockout.lastAttempt = now;
      }
    } else {
      this.lockoutMap.set(userId, { attempts: 1, lastAttempt: now });
    }
  }

  /**
   * Clear failed login attempts
   */
  clearFailedAttempts(userId: string): void {
    this.lockoutMap.delete(userId);
  }

  /**
   * Get remaining attempts before lockout
   */
  getRemainingAttempts(userId: string): number {
    const lockout = this.lockoutMap.get(userId);
    if (!lockout) return this.config.maxLoginAttempts;

    const now = Date.now();
    const timeSinceLast = now - lockout.lastAttempt;

    if (timeSinceLast > this.config.lockoutDurationMs) {
      return this.config.maxLoginAttempts;
    }

    return Math.max(0, this.config.maxLoginAttempts - lockout.attempts);
  }

  /**
   * Get lockout time remaining in seconds
   */
  getLockoutTimeRemaining(userId: string): number {
    const lockout = this.lockoutMap.get(userId);
    if (!lockout) return 0;

    const now = Date.now();
    const timeSinceLast = now - lockout.lastAttempt;
    const remaining = this.config.lockoutDurationMs - timeSinceLast;

    return Math.max(0, Math.ceil(remaining / 1000));
  }
}

export const securityService = new SecurityService();
