'use client';

import PDFViewer from '@/components/PDFViewer';

export default function PDFViewerWrapper({ pdfUrl }: { pdfUrl: string }) {
  return <PDFViewer pdf_url={pdfUrl} className="h-full" />;
}