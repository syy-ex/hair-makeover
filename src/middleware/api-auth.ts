import { NextRequest, NextResponse } from 'next/server';

type RouteHandler<T = unknown> = (
  req: NextRequest,
  context: T,
  apiKey: string
) => Promise<NextResponse>;

type ApiAuthOptions = {
  envKey?: string;
};

export function withApiAuth<T>(
  handler: RouteHandler<T>,
  options: ApiAuthOptions = {}
): (req: NextRequest, context: T) => Promise<NextResponse> {
  return async function (req: NextRequest, context: T): Promise<NextResponse> {
    const envKey = options.envKey ?? 'RUNWAY_API_KEY';
    const apiKey = process.env[envKey];

    if (!apiKey) {
      return NextResponse.json(
        { error: `${envKey} environment variable is not set` },
        { status: 500 }
      );
    }

    // Pass the API key from environment variable to the handler
    return handler(req, context, apiKey);
  };
}
