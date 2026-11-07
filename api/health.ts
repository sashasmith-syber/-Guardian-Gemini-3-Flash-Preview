import { handleBubbleRequest } from '../server/vercel.ts';

export function GET(request: Request): Promise<Response> {
  return handleBubbleRequest(request, '/api/health');
}

export function POST(request: Request): Promise<Response> {
  return handleBubbleRequest(request, '/api/health');
}
