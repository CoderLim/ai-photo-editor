import { Link } from '@/core/i18n/navigation';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-12 text-slate-600 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-9 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <p className="text-lg font-bold tracking-tight text-slate-900">
            GetAIPhotoEditor
          </p>
          <p className="mt-3 max-w-sm text-sm leading-6">
            Edit photos with natural-language prompts. Practical AI tools for
            everyday creative work.
          </p>
          <p className="mt-4 text-sm">
            <span className="text-slate-500">Support: </span>
            <a
              href="mailto:support@getaiphotoeditor.com"
              className="font-medium text-slate-900 hover:text-blue-600"
            >
              support@getaiphotoeditor.com
            </a>
          </p>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold text-slate-900">Product</p>
          <div className="flex flex-col gap-3 text-sm">
            <Link href="/" className="hover:text-blue-600">
              AI Photo Editor
            </Link>
            <Link href="/tools" className="hover:text-blue-600">
              AI Tools
            </Link>
            <Link href="/pricing" className="hover:text-blue-600">
              Pricing
            </Link>
            <Link href="/blog" className="hover:text-blue-600">
              Blog
            </Link>
            <Link href="/examples" className="hover:text-blue-600">
              Examples
            </Link>
          </div>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold text-slate-900">Resources</p>
          <div className="flex flex-col gap-3 text-sm">
            <Link href="/ai-background-remover" className="hover:text-blue-600">
              AI Background Remover
            </Link>
            <Link href="/#editor" className="hover:text-blue-600">
              Object Remover
            </Link>
            <Link
              href="/photo-background-changer"
              className="hover:text-blue-600"
            >
              Photo Background Changer
            </Link>
            <Link href="/ai-photo-enhancer" className="hover:text-blue-600">
              Photo Enhancer
            </Link>
            <Link href="/photo-text-editor" className="hover:text-blue-600">
              Photo Text Editor
            </Link>
            <Link href="/image-to-image/" className="hover:text-blue-600">
              Image to Image
            </Link>
          </div>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold text-slate-900">Legal</p>
          <div className="flex flex-col gap-3 text-sm">
            <Link href="/privacy-policy" className="hover:text-blue-600">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:text-blue-600">
              Terms of Service
            </Link>
            <Link href="/acceptable-use-policy" className="hover:text-blue-600">
              Acceptable Use
            </Link>
            <a
              href="mailto:support@getaiphotoeditor.com"
              className="hover:text-blue-600"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500">
        <span>© {new Date().getFullYear()} GetAIPhotoEditor</span>
        <span>Built for simple, powerful photo edits</span>
      </div>
    </footer>
  );
}
