import { nanoBananaRequest } from '@/lib/nano-banana-api';
import { withApiAuth } from '@/middleware/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { creditPoints, debitPoints } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

const DEFAULT_PROMPT =
  '保留人物五官与肤色，完全替换原有发型为参考图发型，去掉原发型痕迹，不要叠加或残影，只保留一个发型，发际线自然，发丝清晰，保持光线与肤色自然，背景不变';
const DEFAULT_MODEL = 'nano-banana';
const DEFAULT_RESPONSE_FORMAT = 'url';
const DEFAULT_ASPECT_RATIO = '1:1';
const GENERATION_COST = 5;

type NanoImage = {
  url?: string;
  b64_json?: string;
};

type NanoResponse = {
  data?: NanoImage[];
  output?: string[];
  url?: string;
  b64_json?: string;
};

async function safeRefund(userId: string, amount: number) {
  try {
    await creditPoints(userId, amount, 'generate_refund');
  } catch (error) {
    console.error('Failed to refund points:', error);
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('图片数据格式不正确');
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');

  return new Blob([buffer], { type: mimeType });
}

function normalizeNanoOutput(data: NanoResponse): string[] {
  if (!data) {
    return [];
  }

  if (Array.isArray(data.output)) {
    return data.output;
  }

  if (Array.isArray(data.data)) {
    return data.data
      .map(item => {
        if (typeof item?.url === 'string') {
          return item.url;
        }
        if (typeof item?.b64_json === 'string') {
          return `data:image/png;base64,${item.b64_json}`;
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));
  }

  if (typeof data.url === 'string') {
    return [data.url];
  }

  if (typeof data.b64_json === 'string') {
    return [`data:image/png;base64,${data.b64_json}`];
  }

  return [];
}

async function generateHandler(req: NextRequest, _: unknown, apiKey: string) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { userImage, hairstyleImage, prompt } = await req.json();

    const promptText = prompt || DEFAULT_PROMPT;

    if (!promptText || !userImage || !hairstyleImage) {
      return NextResponse.json(
        { error: '缺少必要参数：prompt、userImage 或 hairstyleImage' },
        { status: 400 }
      );
    }

    const debit = await debitPoints(user.id, GENERATION_COST, 'generate');
    if (!debit.ok) {
      return NextResponse.json({ error: '积分不足' }, { status: 402 });
    }

    const model = process.env.NANO_MODEL || DEFAULT_MODEL;
    const responseFormat = process.env.NANO_RESPONSE_FORMAT || DEFAULT_RESPONSE_FORMAT;
    const aspectRatio = process.env.NANO_ASPECT_RATIO || DEFAULT_ASPECT_RATIO;
    const imageSize = process.env.NANO_IMAGE_SIZE;

    const userBlob = dataUrlToBlob(userImage);
    const hairstyleBlob = dataUrlToBlob(hairstyleImage);

    const formData = new FormData();
    formData.append('model', model);
    formData.append('prompt', promptText);
    formData.append('response_format', responseFormat);
    formData.append('aspect_ratio', aspectRatio);

    if (imageSize) {
      formData.append('image_size', imageSize);
    }

    formData.append('image', userBlob, 'user-image.png');
    formData.append('image', hairstyleBlob, 'hairstyle-image.png');

    let data: NanoResponse;
    try {
      data = await nanoBananaRequest<NanoResponse>('/v1/images/edits', apiKey, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      await safeRefund(user.id, GENERATION_COST);
      throw error;
    }

    const output = normalizeNanoOutput(data);

    if (output.length === 0) {
      await safeRefund(user.id, GENERATION_COST);
      return NextResponse.json(
        { error: '未获取到生成结果' },
        { status: 502 }
      );
    }

    return NextResponse.json({ output });
  } catch (error) {
    console.error('Error generating image:', error);

    if (error instanceof Error && error.message) {
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.status && parsedError.details) {
          return NextResponse.json(parsedError.details, { status: parsedError.status });
        }
      } catch (parseError) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export const POST = withApiAuth(generateHandler, { envKey: 'NANO_API_KEY' });
export const runtime = 'nodejs';
