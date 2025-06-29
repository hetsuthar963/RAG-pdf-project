'use client';

import PDFViewer from '@/components/PDFViewer';

export default function PDFViewerWrapper({ pdfUrl }: { pdfUrl: string }) {
  return <PDFViewer pdfUrl={pdfUrl} className="h-full" />;
}