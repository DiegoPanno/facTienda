import React from 'react';
import { createRoot } from 'react-dom/client';

export const ImprimirTicket = ({ children }) => {
  const imprimir = () => {
    const ventana = window.open('', '_blank', 'width=600,height=800');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket</title>
          <style>
            @media print {
              html, body {
                margin: 0;
                padding: 0;
                width: 58mm;
                height: auto;
              }

              body * {
                visibility: hidden;
              }

              #ticket, #ticket * {
                visibility: visible !important;
              }

              #ticket {
                width: 58mm !important;
                padding: 5px !important;
                font-size: 10px !important;
                font-family: monospace !important;
                page-break-inside: avoid;
                page-break-after: avoid;
              }
            }

            #ticket {
              width: 58mm;
              padding: 5px;
              font-size: 10px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    ventana.document.write(html);
    ventana.document.close();

    // Esperamos a que la nueva ventana esté lista y montamos el componente React dentro
    const interval = setInterval(() => {
      const container = ventana.document.getElementById('print-root');
      if (container) {
        clearInterval(interval);
        const root = createRoot(container);
        root.render(children);
      }
    }, 50);
  };

  return React.cloneElement(children, { onClick: imprimir });
};
