# Image to Document Converter

A web application that converts multiple images into PDF or DOCX documents with proper formatting and layout.

## Features

- Convert multiple images to PDF/DOCX formats
- Automatic image sizing and aspect ratio maintenance
- Page numbering and headers
- Support for custom document metadata
- Organized file structure
- Error handling and cleanup

## Prerequisites

```
Node.js v14+
npm or yarn
```

## Dependencies

```json
{
  "express": "^4.18.2",
  "multer": "^1.4.5-lts.1",
  "pdfkit": "^0.13.0",
  "docx": "^8.2.3",
  "cors": "^2.8.5",
  "image-size": "^1.0.2"
}
```

## Installation

1. Clone repository:
```bash
git clone https://github.com/theoxgn/imagetopdf.git
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start server:
```bash
node server.js
```

4. Start React frontend:
```bash
cd frontend
npm install
npm start
```

## API Endpoints

### POST /convert-pdf
Converts images to PDF format.

### POST /convert-doc
Converts images to DOCX format.

## Supported File Types
- Images: JPG, PNG, GIF
- Maximum file size: 10MB

## Document Formatting
- Page size: A4
- Margins: 25.4mm
- Font: Times New Roman
- Headers and footers on each page
- Automatic page numbering
- Maintained image aspect ratios

## Error Handling
- File type validation
- Size limit checks
- Automatic cleanup of temporary files
- Error messages for failed conversions
