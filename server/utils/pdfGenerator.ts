import puppeteer from 'puppeteer';

/**
 * Generates a PDF buffer from an HTML string
 * @param html The complete HTML document string
 * @param format Paper format, e.g., 'A4'
 * @param landscape Boolean for landscape orientation
 * @returns Buffer containing the PDF data
 */
export const generatePDFFromHTML = async (html: string, format: any = 'A4', landscape: boolean = false): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set content and wait for network/images to load
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Create PDF
    const pdfBuffer = await page.pdf({
      format,
      landscape,
      printBackground: true, // Important for background images and colors
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
};
