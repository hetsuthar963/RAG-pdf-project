
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import type { LoadError } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

// import '@react-pdf-viewer/core/lib/styles/index.css';
// import '@react-pdf-viewer/default-layout/lib/styles/index.css';
// import '@react-pdf-viewer/toolbar/lib/styles/index.css';

interface PDFViewerProps {
  pdf_url: string;          // pre-signed S3 URL
  height?: string;          // default "85vh"
  className?: string;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
  children: React.ReactNode;
}

const Button = ({
  onClick,
  variant = 'default',
  className = '',
  children,
  ...props
}: ButtonProps) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      variant === 'outline'
        ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        : 'bg-blue-600 text-white hover:bg-blue-700'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

interface PdfErrorStateProps {
  message: string;
  onOpenInNewTab: () => void;
}

const PdfErrorState: React.FC<PdfErrorStateProps> = ({ message, onOpenInNewTab }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center p-8">
      <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        PDF Load Error
      </h3>
      <p className="text-gray-500 mb-4">{message}</p>
      <Button onClick={onOpenInNewTab} variant="outline">
        <ExternalLink className="w-4 h-4 mr-2" />
        Open in New Tab
      </Button>
    </div>
  </div>
);

interface ViewerErrorFallbackProps {
  loadError: LoadError;
  onError: (message: string) => void;
  onOpenInNewTab: () => void;
}

const ViewerErrorFallback: React.FC<ViewerErrorFallbackProps> = ({ loadError, onError, onOpenInNewTab }) => {
  const message = loadError.message ?? 'Failed to load PDF';

  useEffect(() => {
    onError(message);
  }, [message, onError]);

  return <PdfErrorState message={message} onOpenInNewTab={onOpenInNewTab} />;
};

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdf_url,
  height = '85vh',
  className = 'max-h-screen p-4 overflow-scroll flex-[5]',
}) => {
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  

  /* -----------------------------------------------------------
     1.  Make sure we keep the full query-string (signature) intact
  ----------------------------------------------------------- */
  const cleanedUrl = useMemo(() => {
    if (!pdf_url) return '';

    try {
      // Only decode once—do NOT strip query params
      return decodeURI(pdf_url.trim());
    } catch {
      setError('Invalid PDF URL');
      return pdf_url;
    }
  }, [pdf_url]);

  const openInNewTab = useCallback(() => {
    if (cleanedUrl) {
      window.open(cleanedUrl, '_blank');
    }
  }, [cleanedUrl]);

  /* -----------------------------------------------------------
     2.  pdf.js plugins
  ----------------------------------------------------------- */
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [defaultTabs[0], defaultTabs[1]],
  });
  const toolbarPluginInstance        = toolbarPlugin();
  const zoomPluginInstance           = zoomPlugin();
  const pageNavigationPluginInstance = pageNavigationPlugin();

  /* -----------------------------------------------------------
     3.  Handlers
  ----------------------------------------------------------- */
  const handleDocumentLoad  = () => { setLoading(false); setError(null); };

  const handleViewerError = useCallback(
    (loadError: LoadError) => (
      <ViewerErrorFallback
        loadError={loadError}
        onError={(message) => {
          setLoading(false);
          setError(message);
        }}
        onOpenInNewTab={openInNewTab}
      />
    ),
    [openInNewTab, setError, setLoading],
  );

  /* -----------------------------------------------------------
     4.  Early exit if no URL
  ----------------------------------------------------------- */
  if (!cleanedUrl) {
    return (
      <div
        className={`bg-white border rounded-lg shadow-sm flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center p-8">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No PDF Available
          </h3>
          <p className="text-gray-500">No PDF document URL provided</p>
        </div>
      </div>
    );
  }

  /* -----------------------------------------------------------
     5.  Main render
  ----------------------------------------------------------- */
  return (
    <div
      className={`bg-white border rounded-lg shadow-sm w-full relative ${className}`}
      style={{ height }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/75 z-10 rounded-lg">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-2" />
            <p className="text-sm text-gray-600">Loading PDF...</p>
          </div>
        </div>
      )}

      {error ? (
        <PdfErrorState
          message={error ?? 'Failed to load PDF'}
          onOpenInNewTab={openInNewTab}
        />
      ) : (
        <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
          <Viewer
            fileUrl={cleanedUrl}
            onDocumentLoad={handleDocumentLoad}
            renderError={handleViewerError}
            plugins={[
              defaultLayoutPluginInstance,
              toolbarPluginInstance,
              zoomPluginInstance,
              pageNavigationPluginInstance,
            ]}
            theme="auto"
          />
        </Worker>
      )}
    </div>
  );
};

export default PDFViewer;
