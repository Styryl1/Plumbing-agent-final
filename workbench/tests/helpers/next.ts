import { NextRequest } from 'next/server'

/**
 * Create a mock Next.js request for testing API routes
 */
export function makePostRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  const url = 'http://localhost:3000/api/wa/customer'
  
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body
  })
}

/**
 * Create a GET request for testing
 */
export function makeGetRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  })
}