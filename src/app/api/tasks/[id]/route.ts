import { NextRequest, NextResponse } from 'next/server';

const NOT_SUPPORTED_MESSAGE = '当前模型为同步生成，不支持任务查询或取消';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  if (!taskId) {
    return NextResponse.json({ error: '任务 ID 不能为空' }, { status: 400 });
  }
  return NextResponse.json({ error: NOT_SUPPORTED_MESSAGE }, { status: 410 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  if (!taskId) {
    return NextResponse.json({ error: '任务 ID 不能为空' }, { status: 400 });
  }
  return NextResponse.json({ error: NOT_SUPPORTED_MESSAGE }, { status: 410 });
}
