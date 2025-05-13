import React from 'react';

export const ImprimirTicket = ({ children }) => {
  const imprimir = () => {
    const ventana = window.open('', '_blank');
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              #ticket, #ticket * { visibility: visible !important; }
              #ticket {
                position: absolute;
                top: 0;
                left: 0;
                width: 58mm !important;
                padding: 5px !important;
                font-size: 10px !important;
                font-family: monospace !important;
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
          ${children.props.datos ? React.createElement(children.type, children.props).outerHTML : ''}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          </script>
        </body>
      </html>
    `;
    
    ventana.document.write(html);
    ventana.document.close();
  };

  return React.cloneElement(children, { onClick: imprimir });
};