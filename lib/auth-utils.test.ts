import { describe, it, expect, beforeEach } from 'vitest'
import { createUser, authenticateUser, setUserSession, getUserSession, clearUserSession } from './auth-utils'

describe('auth-utils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should create a user with hashed password', async () => {
    const user = await createUser('test@example.com', 'password123', 'Test User')
    expect(user.email).toBe('test@example.com')
    expect(user.name).toBe('Test User')
    expect(user.password).toBeUndefined()
  })

  it('should authenticate user with correct credentials', async () => {
    await createUser('test@example.com', 'password123', 'Test User')
    const user = await authenticateUser('test@example.com', 'password123')
    expect(user).not.toBeNull()
    expect(user?.email).toBe('test@example.com')
  })

  it('should not authenticate user with incorrect password', async () => {
    await createUser('test@example.com', 'password123', 'Test User')
    const user = await authenticateUser('test@example.com', 'wrongpassword')
    expect(user).toBeNull()
  })

  it('should manage user session in localStorage', async () => {
    const user = await createUser('test@example.com', 'password123', 'Test User')
    await setUserSession(user)
    const sessionUser = await getUserSession()
    expect(sessionUser?.email).toBe(user.email)
  })

  it('should clear user session', async () => {
    const user = await createUser('test@example.com', 'password123', 'Test User')
    await setUserSession(user)
    clearUserSession()
    const sessionUser = await getUserSession()
    expect(sessionUser).toBeNull()
  })
})