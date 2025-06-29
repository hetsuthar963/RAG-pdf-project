// 'use client';
// import React from 'react'
// import { Worker, Viewer } from '@react-pdf-viewer/core';
// import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// // Import styles
// import '@react-pdf-viewer/core/lib/styles/index.css';
// import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// type Props = { pdf_url: string };

// // import { pdfjs } from 'react-pdf'; // <-- ADD this
// // pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`; // <-- ADD this

// const PDFViewer = ({ pdf_url }: Props) => {

//     const defaultLayoutPluginInstance = defaultLayoutPlugin();

//   return (
//     <div style={{ height: '100vh' }}>
//             <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
//                 <Viewer
//                     fileUrl={pdf_url}
//                     plugins={[defaultLayoutPluginInstance]}
//                 />
//             </Worker>
//         </div>
//   );
// }

// export default PDFViewer;


// 'use client';

// import React, { useState } from 'react';
// import { Document, Page, pdfjs } from 'react-pdf';
// import 'react-pdf/dist/esm/Page/TextLayer.css';
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
// import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

// // Use dynamic loading for the worker
// const setupPdfWorker = () => {
//     pdfjs.GlobalWorkerOptions.workerSrc = 
//       `//cdnjs.cloudflare.com/ajax/libs/pdf.js/pdfjs-dist@3.11.174/pdf.worker.min.js`;
//   };
  

// type PDFViewerProps = {
//   pdf_url: string;
// };

// const PDFViewer: React.FC<PDFViewerProps> = ({ pdf_url }) => {
//   const [numPages, setNumPages] = useState<number | null>(null);
//   const [pageNumber, setPageNumber] = useState<number>(1);
//   const [scale, setScale] = useState<number>(1.0);
  
//   function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
//     setNumPages(numPages);
//   }

//   function changePage(offset: number) {
//     setPageNumber(prevPageNumber => 
//       Math.min(Math.max(prevPageNumber + offset, 1), numPages || 1)
//     );
//   }

//   function zoomIn() {
//     setScale(prevScale => Math.min(prevScale + 0.2, 2.5));
//   }

//   function zoomOut() {
//     setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
//   }

//   return (
//     <div className="flex flex-col items-center h-full">
//       <div className="flex justify-between w-full p-4 bg-gray-100 mb-4">
//         <div className="flex space-x-2">
//           <button 
//             onClick={() => changePage(-1)} 
//             disabled={pageNumber <= 1}
//             className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
//           >
//             Previous
//           </button>
//           <button 
//             onClick={() => changePage(1)} 
//             disabled={pageNumber >= (numPages || 1)}
//             className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
//           >
//             Next
//           </button>
//           <p className="my-auto">
//             Page {pageNumber} of {numPages || '--'}
//           </p>
//         </div>
//         <div className="flex space-x-2">
//           <button 
//             onClick={zoomOut} 
//             className="px-3 py-1 bg-gray-200 rounded"
//           >
//             -
//           </button>
//           <p className="my-auto">{Math.round(scale * 100)}%</p>
//           <button 
//             onClick={zoomIn} 
//             className="px-3 py-1 bg-gray-200 rounded"
//           >
//             +
//           </button>
//         </div>
//       </div>
//       <div className="overflow-auto w-full h-full border border-gray-200 rounded">
//         <Document
//           file={pdf_url}
//           onLoadSuccess={onDocumentLoadSuccess}
//           loading={<div className="flex justify-center p-10">Loading PDF...</div>}
//           error={<div className="flex justify-center p-10">Failed to load PDF</div>}
//         >
//           <Page 
//             pageNumber={pageNumber} 
//             scale={scale} 
//             renderTextLayer={true}
//           />
//         </Document>
//       </div>
//     </div>
//   );
// };

// export default PDFViewer;

// components/PDFViewer.tsx

// 'use client';

// import { Viewer, Worker } from '@react-pdf-viewer/core';
// import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
// import { useMemo } from 'react';

// import '@react-pdf-viewer/core/lib/styles/index.css';
// import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// const PDFViewer = ({ pdfUrl }: { pdfUrl: string }) => {
//   const defaultLayoutPluginInstance = defaultLayoutPlugin();
  
//   // Enhanced URL cleaning
//   const cleanUrl = useMemo(() => {
//     try {
//       // Handle double-encoding and S3 signature issues
//       const decoded = decodeURIComponent(pdfUrl);
//       const url = new URL(decoded);
//       return `${url.origin}${url.pathname}`;
//     } catch (error) {
//       console.error('Invalid PDF URL:', pdfUrl);
//       return pdfUrl;
//     }
//   }, [pdfUrl]);

//   return (
//     <div className="h-[80vh]">
//       <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
//         <Viewer
//           fileUrl={cleanUrl}
//           plugins={[defaultLayoutPluginInstance]}
//           renderError={(error) => (
//             <div className="text-red-500 p-4">
//               PDF Error: {error.message}
//               <div className="mt-2 text-sm">
//                 <a 
//                   href={cleanUrl} 
//                   target="_blank" 
//                   rel="noopener noreferrer"
//                   className="text-blue-500 hover:underline"
//                 >
//                   Test Direct Access
//                 </a>
//               </div>
//             </div>
//           )}
//           theme="dark"
//         />
//       </Worker>
//     </div>
//   );
// };

// export default PDFViewer;


// 'use client';

// import { Worker, Viewer } from '@react-pdf-viewer/core';
// import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
// import { useMemo } from 'react';

// import '@react-pdf-viewer/core/lib/styles/index.css';
// import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// type Props = {
//   pdfUrl: string;
// };

// const PDFViewer = ({ pdfUrl }: Props) => {
//   const defaultLayoutPluginInstance = defaultLayoutPlugin();

//   const finalUrl = useMemo(() => {
//   try {
//     const decoded = decodeURIComponent(pdfUrl.trim());

//     // Fix: extract only valid full URL if double-prefixed
//     if (decoded.includes('s3.amazonaws.com/https://')) {
//       // Extract after second https://
//       const fixed = decoded.split('s3.amazonaws.com/https://')[1];
//       return 'https://' + fixed;
//     }

//     return decoded;
//   } catch (err) {
//     console.error('Invalid PDF URL:', pdfUrl);
//     return pdfUrl;
//   }
// }, [pdfUrl]);

//   return (
//     <div className="w-full h-[85vh] border rounded shadow">
//       <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
//         <Viewer
//           fileUrl={finalUrl}
//           plugins={[defaultLayoutPluginInstance]}
//           renderError={(error) => (
//             <div className="text-red-500 p-4">
//               PDF Load Error: {error.message}
//               <div className="mt-2 text-sm">
//                 <a
//                   href={finalUrl}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="text-blue-500 hover:underline"
//                 >
//                   Open PDF in New Tab
//                 </a>
//               </div>
//             </div>
//           )}
//         />
//       </Worker>
//     </div>
//   );
// };

// export default PDFViewer;



// import React from 'react'

// type Props = {pdf_url: string}

// const PDFViewer = ({pdf_url}: Props) => {
//   return (
//     <iframe 
//       src={`https://docs.google.com/gview?url=${pdf_url}&embedded=true`}
//       className='w-full h-full'
//     ></iframe>
//   )
// }

// export default PDFViewer;



'use client';

import { useState, useMemo } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';

interface PDFViewerProps {
  pdf_url: string;          // pre-signed S3 URL
  height?: string;          // default "85vh"
  className?: string;
}

const Button = ({
  onClick,
  variant = 'default',
  className = '',
  children,
  ...props
}: any) => (
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

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdf_url,
  height = '85vh',
  className = 'max-h-screen p-4 overflow-scroll flex-[5]',
}) => {
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  console.log("Signed URL : ", pdf_url)
  

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
  const handleDocumentError = (err: any) => {
    setLoading(false);
    setError(err?.message || 'Failed to load PDF');
  };

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
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              PDF Load Error
            </h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button
              onClick={() => window.open(cleanedUrl, '_blank')}
              variant="outline"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      ) : (
        <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
          <Viewer
            fileUrl={cleanedUrl}
            onDocumentLoad={handleDocumentLoad}
            renderError={(error) => (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    PDF Load Error
                  </h3>
                  <p className="text-gray-500 mb-4">{error.message || 'Failed to load PDF'}</p>
                  <Button
                    onClick={() => window.open(cleanedUrl, '_blank')}
                    variant="outline"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            )}
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