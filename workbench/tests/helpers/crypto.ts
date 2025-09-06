import { createHmac } from 'crypto'

/**
 * Sign a request body with HMAC SHA-256 for webhook verification
 */
export function signBody(secret: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

/**
 * Verify webhook signature
 */
export function verifySignature(signature: string, secret: string, body: string): boolean {
  const expectedSignature = signBody(secret, body)
  return signature === expectedSignature
}