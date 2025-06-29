// src/types/pdf-worker.d.ts
declare module 'pdfjs-dist/build/pdf.worker.min.js?url' {
    const workerUrl: string;
    export default workerUrl;
}



declare module 'pdfjs-dist/webpack' {
    export * from 'pdfjs-dist';
}