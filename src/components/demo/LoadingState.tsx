'use client';

import { useTextToImageContext } from '@/contexts/TextToImageContext';
import { Status } from '@/hooks/useTextToImage';
import { Button } from '../ui/button';

type LoadingStateProps = {
  onCancel: () => void;
};

const copy = {
  [Status.IDLE]: '加载中...',
  [Status.PENDING]: '正在火速生成，大约需要十几秒...',
  [Status.RUNNING]: '正在处理你的图片...',
  [Status.SUCCEEDED]: '图片生成完成！',
  [Status.FAILED]: '生成失败',
};

export function LoadingState({ onCancel }: LoadingStateProps) {
  const { status, cancelTask } = useTextToImageContext();

  const handleCancel = async () => {
    await cancelTask();
    onCancel();
  };

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center">
      <Spinner />
      <p className="mt-4 text-lg">{copy[status]}</p>

      <Button onClick={handleCancel} variant="outline" className="mt-4">
        取消
      </Button>
    </div>
  );
}

const Spinner = () => (
  <div className="border-primary h-16 w-16 animate-spin rounded-full border-b-2" />
);
