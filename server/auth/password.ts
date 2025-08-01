import bcrypt from 'bcrypt';
import { storage } from '../storage';
import type { User, UpsertUser } from '@shared/schema';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  role?: 'admin' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
}

export class PasswordAuthService {
  private readonly saltRounds = 12;

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async registerEmployee(data: RegisterData): Promise<User> {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user
    const userData: UpsertUser = {
      id: crypto.randomUUID(),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      address: data.address,
      role: data.role || 'employee',
      department: data.department,
      employeeId: data.employeeId,
      passwordHash,
      isActive: true,
    };

    return await storage.upsertUser(userData);
  }

  async authenticateUser(credentials: LoginCredentials): Promise<User | null> {
    const user = await storage.getUserByEmail(credentials.email);
    if (!user || !user.passwordHash || !user.isActive) {
      return null;
    }

    const isValid = await this.verifyPassword(credentials.password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  async updateUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user || !user.passwordHash) {
      throw new Error('User not found or password not set');
    }

    const isCurrentValid = await this.verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new Error('Current password is incorrect');
    }

    const newPasswordHash = await this.hashPassword(newPassword);
    await storage.updateUser(userId, { passwordHash: newPasswordHash });
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const newPasswordHash = await this.hashPassword(newPassword);
    await storage.updateUser(userId, { passwordHash: newPasswordHash });
  }
}

export const passwordAuthService = new PasswordAuthService();