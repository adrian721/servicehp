@import "tailwindcss";

@layer base {
  body {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    color: #0f172a;
    background-color: #f8fafc;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  .font-mono {
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
}

/* Custom scrollbar for preview and tables */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Ensure invoice document uses standard sRGB colors for pristine PDF generation */
#invoice-document-capture {
  background-color: #ffffff !important;
  color: #0f172a !important;
}

/* Print optimization styles for PDF generation and standard print */
@media print {
  body {
    background: white !important;
    color: black !important;
  }
  .no-print {
    display: none !important;
  }
  .print-only {
    display: block !important;
  }
  .invoice-printable {
    box-shadow: none !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    border: none !important;
  }
}
