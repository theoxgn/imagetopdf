// backend/server.js
const express = require('express');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

// Konfigurasi multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

const upload = multer({ storage });

app.post('/convert', upload.array('images'), async (req, res) => {
  try {
    // Buat dokumen PDF dengan ukuran A4
    const doc = new PDFDocument({
      autoFirstPage: false,
      size: 'A4',
      margin: 50
    });

    const pdfPath = path.join(__dirname, 'output.pdf');
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    // Definisikan ukuran halaman A4 dalam points
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;

    // Proses setiap gambar
    for (const file of req.files) {
      try {
        const img = fs.readFileSync(file.path);
        
        // Tambah halaman baru
        doc.addPage();
        
        // Tambah judul (nama file)
        const title = path.parse(file.originalname).name;
        doc.fontSize(14)
           .text(title, {
             align: 'center',
             y: margin
           });

        // Hitung area yang tersedia untuk gambar
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 3) - 20; // Kurangi ruang untuk judul

        // Tambahkan gambar
        doc.image(img, {
          fit: [availableWidth, availableHeight],
          align: 'center',
          valign: 'center',
          y: margin + 30 // Posisi setelah judul
        });

        // Hapus file temporary
        fs.unlinkSync(file.path);
      } catch (imgError) {
        console.error('Error processing image:', imgError);
        continue; // Lanjut ke gambar berikutnya jika ada error
      }
    }

    // Finalisasi PDF
    doc.end();

    // Kirim file setelah selesai
    writeStream.on('finish', () => {
      res.download(pdfPath, 'converted.pdf', (err) => {
        if (err) {
          console.error('Error downloading:', err);
          res.status(500).send('Error downloading file');
        }
        // Hapus file PDF setelah didownload
        fs.unlinkSync(pdfPath);
      });
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error converting files');
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});