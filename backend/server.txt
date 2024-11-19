const express = require('express');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const docx = require('docx');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto'); // Perbaikan import crypto

const app = express();
app.use(cors());
app.use(express.json());

// Register fonts for PDFKit
const TIMES_ROMAN = 'Times-Roman';
const TIMES_BOLD = 'Times-Bold';

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}


// Konfigurasi multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
      const datePrefix = getFormattedDate();
      const randomString = generateRandomString(8);
      const fileExtension = path.extname(file.originalname);
      const originalNameWithoutExt = path.basename(file.originalname, fileExtension);
      
      file.metadata = {
          originalName: originalNameWithoutExt
      };

      const newFilename = `${datePrefix}_${randomString}_${originalNameWithoutExt}${fileExtension}`;
      cb(null, newFilename);
  }
});

const upload = multer({ 
  storage,
  // limits: {
  //     fileSize: 10 * 1024 * 1024, // 10MB limit
  // }
});


// Helper function to extract number and caption
function extractNumberAndCaption(filename,index) {
  return { 
    number: index + 1,
    caption: filename
  };
}


// Helper function to get image dimensions
function sizeOf(filePath) {
    const dimensions = require('image-size');
    return dimensions(filePath);
}

// Fungsi untuk generate random string
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Fungsi untuk format tanggal
function getFormattedDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function formatDate(dateString) {
  const options = { 
      day: '2-digit',
      month: 'long',
      year: 'numeric'
  };
  return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Tambahkan fungsi untuk menghitung aspek ratio gambar
function calculateImageDimensions(imageBuffer, maxWidth) {
  const sizeOf = require('image-size');
  const dimensions = sizeOf(imageBuffer);
  const aspectRatio = dimensions.width / dimensions.height;
  
  let width = maxWidth;
  let height = maxWidth / aspectRatio;
  
  return { width, height };
}

// PDF endpoint with proper font handling
app.post('/convert-pdf', upload.array('images'), async (req, res) => {
  const tempFiles = [];
  let outputPath = null;
  
  try {
      const doc = new PDFDocument({
          autoFirstPage: false,
          size: 'A4',
          margin: 50
      });

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 50;

      const { koNumber, orderDate, assignment, confirmationDate } = req.body;
      const fileName = `${koNumber} - Lampiran Design ${assignment}`.replace(/[/\\?%*:|"<>]/g, '-');
      outputPath = path.join(__dirname, `${fileName}.pdf`);
      
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // First page with complete header
      doc.addPage();
      
      // Header - Konfirmasi Order and Date
      doc.fontSize(12)
         .text('Konfirmasi Order', margin, margin)
         .text(`Tanggal : ${formatDate(confirmationDate)}`, margin, margin, { 
             align: 'right', 
             width: pageWidth - (margin * 2) 
         });

      // Add horizontal line after header
      doc.moveTo(margin, doc.y + 10)
         .lineTo(pageWidth - margin, doc.y + 10)
         .stroke();

      // Document Info
      doc.moveDown(2)
         .text(`No. ${koNumber}`, margin)
         .moveDown(0.5)
         .text(`Tanggal : ${formatDate(orderDate)}`, margin)
         .moveDown(0.5)
         .text(`Penugasan : ${assignment}`, margin);

      // Add horizontal line after info
      doc.moveTo(margin, doc.y + 10)
         .lineTo(pageWidth - margin, doc.y + 10)
         .stroke();

      // Title
      doc.moveDown(2)
         .text(`Lampiran Desain No. ${koNumber}`, { align: 'center' });

      const sortedFiles = req.files.sort((a, b) => {
          const numA = parseInt(a.originalname.split('_')[0]) || 0;
          const numB = parseInt(b.originalname.split('_')[0]) || 0;
          return numA - numB;
      });

      // Process first file on the first page
      if (sortedFiles.length > 0) {
          const firstFile = sortedFiles[0];
          tempFiles.push(firstFile.path);

          try {
              // const { number, caption } = extractNumberAndCaption(firstFile.originalname);
              const img = fs.readFileSync(firstFile.path);

              const { number, caption } = extractNumberAndCaption(firstFile.originalname);
              
              // Add figure number and caption
              doc.moveDown(2)
                 .fontSize(11)
                 .text(`${number}. ${caption}`, margin);

              // Image
              doc.image(img, {
                  fit: [pageWidth - (margin * 2), pageHeight - doc.y - 100],
                  align: 'center',
                  x: margin
              });

              // Footer
              doc.fontSize(10)
                 .text(`Konfirmasi Order No. ${koNumber}`, margin, pageHeight - margin - 20, { align: 'left' })
                 .text(`1 dari ${sortedFiles.length} halaman`, margin, pageHeight - margin - 20, {
                     align: 'right',
                     width: pageWidth - (margin * 2)
                 });
          } catch (error) {
              console.error('Error processing first image:', error);
          }
      }

      // Process remaining files with simplified header
      for (let pageIndex = 1; pageIndex < sortedFiles.length; pageIndex++) {
          const file = sortedFiles[pageIndex];
          tempFiles.push(file.path);
          
          doc.addPage();

          // Simplified header for subsequent pages
          doc.fontSize(12)
             .text('Konfirmasi Order', margin, margin)
             .text(`Tanggal : ${formatDate(confirmationDate)}`, margin, margin, { 
                 align: 'right', 
                 width: pageWidth - (margin * 2) 
             });

          try {
              // const { number, caption } = extractNumberAndCaption(file.originalname);
              const { number, caption } = extractNumberAndCaption(file.originalname, pageIndex);
              const img = fs.readFileSync(file.path);

              // Add figure number and caption
              doc.moveDown(2)
                 .fontSize(11)
                 .text(`${number}.- ${caption}`, margin);

              // Image
              doc.image(img, {
                  fit: [pageWidth - (margin * 2), pageHeight - doc.y - 100],
                  align: 'center',
                  x: margin
              });

              // Footer
              doc.fontSize(10)
                 .text(`Konfirmasi Order No. ${koNumber}`, margin, pageHeight - margin - 20, { align: 'left' })
                 .text(`${pageIndex + 1} dari ${sortedFiles.length} halaman`, margin, pageHeight - margin - 20, {
                     align: 'right',
                     width: pageWidth - (margin * 2)
                 });

          } catch (imgError) {
              console.error('Error processing image:', imgError);
              continue;
          }
      }

      doc.end();

      writeStream.on('finish', () => {
          res.download(outputPath, `${fileName}.pdf`, (err) => {
              if (err) {
                  console.error('Error downloading:', err);
                  res.status(500).send('Error downloading file');
              }
              cleanupFiles([outputPath, ...tempFiles]);
          });
      });

  } catch (error) {
      console.error('Error:', error);
      cleanupFiles([outputPath, ...tempFiles]);
      res.status(500).send('Error converting files');
  }
});

// Helper function for cleanup
function cleanupFiles(files) {
  files.forEach(file => {
      if (file && fs.existsSync(file)) {
          try {
              fs.unlinkSync(file);
          } catch (err) {
              console.error(`Error deleting file ${file}:`, err);
          }
      }
  });
}

// Endpoint untuk DOC
app.post('/convert-doc', upload.array('images'), async (req, res) => {
  const tempFiles = [];
  let outputPath = null;

  try {
      const { koNumber, orderDate, assignment, confirmationDate } = req.body;
      const fileName = `${koNumber} - Lampiran Design ${assignment}`.replace(/[/\\?%*:|"<>]/g, '-');
      outputPath = path.join(__dirname, `${fileName}.docx`);

      // Create document with proper formatting
      const doc = new docx.Document({
          creator: "Document Generator",
          title: fileName,
          styles: {
              paragraphStyles: [
                  {
                      id: "Title",
                      name: "Title",
                      basedOn: "Normal",
                      run: {
                          font: "Times New Roman",
                          size: 24,
                          bold: true
                      }
                  },
                  {
                      id: "Normal",
                      name: "Normal",
                      run: {
                          font: "Times New Roman",
                          size: 22
                      }
                  },
                  {
                      id: "Caption",
                      name: "Caption",
                      run: {
                          font: "Times New Roman", 
                          size: 20
                      }
                  }
              ]
          },
          sections: [{
              properties: {
                  page: {
                      size: {
                          width: docx.convertMillimetersToTwip(210),
                          height: docx.convertMillimetersToTwip(297),
                      },
                      margin: {
                          top: docx.convertMillimetersToTwip(25.4),
                          right: docx.convertMillimetersToTwip(25.4),
                          bottom: docx.convertMillimetersToTwip(25.4),
                          left: docx.convertMillimetersToTwip(25.4),
                      },
                  },
              },
              children: [
                  // Header
                  new docx.Paragraph({
                      style: "Title",
                      children: [
                          new docx.TextRun("Konfirmasi Order")
                      ],
                  }),
                  new docx.Paragraph({
                      style: "Normal",
                      alignment: docx.AlignmentType.RIGHT,
                      children: [
                          new docx.TextRun(`Tanggal: ${formatDate(confirmationDate)}`)
                      ],
                  }),

                  // Horizontal Line
                  new docx.Paragraph({
                      style: "Normal",
                      border: {
                          bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: "000000" },
                      },
                      spacing: { after: 400 },
                  }),

                  // Document Info
                  new docx.Paragraph({
                      style: "Normal",
                      children: [
                          new docx.TextRun({
                              text: `No. ${koNumber}`,
                              break: 1
                          }),
                          new docx.TextRun({
                              text: `Tanggal: ${formatDate(orderDate)}`,
                              break: 1
                          }),
                          new docx.TextRun({
                              text: `Penugasan: ${assignment}`,
                              break: 1
                          }),
                      ],
                  }),

                  // Title
                  new docx.Paragraph({
                      style: "Title",
                      alignment: docx.AlignmentType.CENTER,
                      spacing: { before: 400, after: 400 },
                      children: [
                          new docx.TextRun(`Lampiran Desain No. ${koNumber}`)
                      ],
                  }),
              ],
          }],
      });

      const sortedFiles = req.files.sort((a, b) => {
          const numA = parseInt(a.originalname.split('_')[0]) || 0;
          const numB = parseInt(b.originalname.split('_')[0]) || 0;
          return numA - numB;
      });

      // Process each image
      for (let pageIndex = 0; pageIndex < sortedFiles.length; pageIndex++) {
          const file = sortedFiles[pageIndex];
          tempFiles.push(file.path);

          const maxWidth = docx.convertMillimetersToTwip(160); // ~160mm max width
          const maxHeight = docx.convertMillimetersToTwip(200); // ~200mm max height
          const imgDimensions = sizeOf(file.path);
          const ratio = imgDimensions.width / imgDimensions.height;

          // Calculate dimensions to fit within page bounds
          let width = maxWidth;
          let height = width / ratio;

          try {
            const { number, caption } = extractNumberAndCaption(file.originalname, pageIndex);
            const img = fs.readFileSync(file.path);
            const imgDimensions = sizeOf(file.path);

            // Calculate available space on page
            const pageWidth = docx.convertMillimetersToTwip(160); // Available width accounting for margins
            const pageHeight = docx.convertMillimetersToTwip(220); // Available height accounting for header/footer
        
            // Calculate dimensions maintaining aspect ratio
            const ratio = imgDimensions.width / imgDimensions.height;
            let finalWidth = pageWidth;
            let finalHeight = Math.min(finalWidth / ratio, maxHeight);

            // Adjust width if height is constrained
            if (finalHeight === maxHeight) {
              finalWidth = maxHeight * ratio;
            }
            
            // Add new section for each image
            doc.addSection({
              properties: {
                  type: docx.SectionType.NEXT_PAGE,
                  page: {
                      size: {
                          width: docx.convertMillimetersToTwip(210),
                          height: docx.convertMillimetersToTwip(297),
                      },
                      margin: {
                          top: docx.convertMillimetersToTwip(25.4),
                          right: docx.convertMillimetersToTwip(25.4),
                          bottom: docx.convertMillimetersToTwip(25.4),
                          left: docx.convertMillimetersToTwip(25.4),
                      },
                  },
              },
              children: [
                  // Header
                  new docx.Paragraph({
                      style: "Title",
                      children: [new docx.TextRun("Konfirmasi Order")],
                  }),
                  new docx.Paragraph({
                      style: "Normal",
                      alignment: docx.AlignmentType.RIGHT,
                      children: [
                          new docx.TextRun(`Tanggal: ${formatDate(confirmationDate)}`)
                      ],
                  }),

                  // Horizontal Line
                  new docx.Paragraph({
                      border: {
                          bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: "000000" },
                      },
                      spacing: { after: 400 },
                  }),

                  // Caption
                  new docx.Paragraph({
                      style: "Normal",
                      spacing: { before: 200, after: 200 },
                      children: [
                          new docx.TextRun(`${number}. ${caption}`)
                      ],
                  }),

                  // Create the image paragraph
                  new docx.Paragraph({
                    spacing: {
                        before: docx.convertMillimetersToTwip(10),
                        after: docx.convertMillimetersToTwip(10)
                    },
                    alignment: docx.AlignmentType.CENTER,
                    children: [
                        new docx.ImageRun({
                            data: img,
                            transformation: {
                                width: finalWidth,
                                height: finalHeight,
                            },
                        }),
                    ],
                  }),
                  // Create the image paragraph
                  new docx.Paragraph({
                    spacing: {
                        before: docx.convertMillimetersToTwip(10),
                        after: docx.convertMillimetersToTwip(10)
                    },
                    alignment: docx.AlignmentType.CENTER,
                    children: [
                        new docx.ImageRun({
                            data: img,
                            transformation: {
                                width: finalWidth,
                                height: finalHeight,
                            },
                        }),
                    ],
                  }),
                  // Ensure proper spacing after image
                  new docx.Paragraph({
                    spacing: { before: docx.convertMillimetersToTwip(10) },
                    children: []
                  }),
                  // Footer
                  new docx.Paragraph({
                      style: "Normal",
                      spacing: { before: 200 },
                      children: [
                          new docx.TextRun(`Konfirmasi Order No. ${koNumber}`),
                          new docx.TextRun({
                              text: `${pageIndex + 1} dari ${sortedFiles.length}`,
                              break: 1,
                              alignment: docx.AlignmentType.RIGHT,
                          }),
                      ],
                  }),
              ],
          });
        } catch (imgError) {
          console.error('Error processing image:', imgError);
          continue;
        }
      }

      // Save document
      const buffer = await docx.Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);

      // Send file to client
      res.download(outputPath, `${fileName}.docx`, (err) => {
          if (err) {
              console.error('Error downloading:', err);
              res.status(500).send('Error downloading file');
          }
          cleanupFiles([outputPath, ...tempFiles]);
      });

  } catch (error) {
      console.error('Error:', error);
      cleanupFiles([outputPath, ...tempFiles]);
      res.status(500).send('Error converting files');
  }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});