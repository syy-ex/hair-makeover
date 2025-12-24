import Link from 'next/link';

export function Footer() {
  return (
    <footer className="py-4 text-xs">
      <div className="grid grid-cols-[auto_1fr_auto] px-4">
        <div />
        <div className="flex items-center justify-center gap-3 font-medium text-gray-500 uppercase">
          <span>
            © {new Date().getFullYear()}
            {` `}
            <Link
              href="https://a-little-task.vercel.app/"
              target="_blank"
              className="outline-none hover:text-black focus-visible:text-black"
            >
              鱼哥出品，必是精品
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
