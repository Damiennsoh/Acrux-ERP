import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface LocalUser {
  id: string;
  username: string; 
  name: string;
  passwordHash: string;
  role: 'admin' | 'user';
  isAdmin: boolean;
  organizationName: string;
  department: string;
  staffId: string;
  securityQuestion?: string;
  securityAnswerHash?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  isDeleted?: boolean;
}

export interface UserDBSchema extends DBSchema {
  users: {
    key: string;
    value: LocalUser;
    indexes: {
      'by-username': string;
      'by-role': string;
      'by-staff-org': [string, string];
    };
  };
}

class UserDatabase {
  private db: IDBPDatabase<UserDBSchema> | null = null;
  private readonly DB_NAME = 'finmanage-pro-db';
  private readonly DB_VERSION = 5;
  private readonly STORE_NAME = 'users';

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<UserDBSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        let userStore;
        if (!db.objectStoreNames.contains('users')) {
          userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('by-username', 'username', { unique: true });
          userStore.createIndex('by-role', 'role');
        } else {
          userStore = transaction.objectStore('users');
        }

        if (!userStore.indexNames.contains('by-staff-org')) {
          // If upgrading from v4, 'facility' was the property name. 
          // New records will use 'organizationName'.
          userStore.createIndex('by-staff-org', ['staffId', 'organizationName']);
        }
      },
    });
  }

  async addUser(user: Omit<LocalUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocalUser> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const newUser: LocalUser = {
      ...user,
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.add(this.STORE_NAME, newUser);
    return newUser;
  }

  async getUserById(id: string): Promise<LocalUser | undefined> {
    await this.init();
    if (!this.db) return undefined;
    return this.db.get(this.STORE_NAME, id);
  }

  async getUserByUsername(username: string): Promise<LocalUser | undefined> {
    await this.init();
    if (!this.db) return undefined;
    return this.db.getFromIndex(this.STORE_NAME, 'by-username', username);
  }

  async getUserByStaffAndOrg(staffId: string, orgName: string): Promise<LocalUser | undefined> {
    await this.init();
    if (!this.db) return undefined;
    return this.db.getFromIndex(this.STORE_NAME, 'by-staff-org', [staffId, orgName]);
  }

  async getAllUsers(): Promise<LocalUser[]> {
    await this.init();
    if (!this.db) return [];
    return this.db.getAll(this.STORE_NAME);
  }

  async getActiveUsers(): Promise<LocalUser[]> {
    await this.init();
    if (!this.db) return [];
    const users = await this.db.getAll(this.STORE_NAME);
    return users.filter((user) => !user.isDeleted);
  }

  async updateUser(id: string, updates: Partial<LocalUser>): Promise<LocalUser | undefined> {
    await this.init();
    if (!this.db) return undefined;

    const user = await this.getUserById(id);
    if (!user) return undefined;

    const updated: LocalUser = {
      ...user,
      ...updates,
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await this.db.put(this.STORE_NAME, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await this.updateUser(id, { isDeleted: true });
  }

  async usernameExists(username: string): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    return !!user && !user.isDeleted;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.updateUser(userId, { lastLogin: new Date().toISOString() });
  }

  async clearAllUsers(): Promise<void> {
    await this.init();
    if (!this.db) return;
    await this.db.clear(this.STORE_NAME);
  }
}

export const userDB = new UserDatabase();
