import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET ?? 'dev-secret'
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN ?? '15m'
const REFRESH_EXPIRES = process.env.REFRESH_EXPIRES_IN ?? '7d'

export interface TokenPayload {
  sub: number
  email: string
  role: string
  area_id: number
}

export function signAccess(payload: TokenPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions)
}

export function signRefresh(payload: TokenPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions)
}

export function verify(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as unknown as TokenPayload
}