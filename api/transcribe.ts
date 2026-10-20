import { handleBubbleRequest } from '../server/vercel.ts';

export const maxDuration = 60;

export function GET(request: Request): Promise<Response> {
  return handleBubbleRequest(request, '/api/transcribe');
}

export function POST(request: Request): Promise<Response> {
  return handleBubbleRequest(request, '/api/transcribe');
}
