import { Button } from '@/components/ui/button';

type ResultViewProps = {
  results: string[];
  onReset: () => void;
};

export function ResultView({ results, onReset }: ResultViewProps) {
  return (
    <div className="flex flex-col gap-6 p-12">
      <div className="flex items-center justify-center gap-4">
        {results.map((result, index) => (
          <div key={`result-${index}`} className="relative">
            <img
              src={result}
              alt="生成结果"
              className="max-h-[500px] w-auto rounded-lg object-contain"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={onReset}>
          换个发型再试
        </Button>
      </div>
    </div>
  );
}
