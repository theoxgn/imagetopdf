import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const fileArray = Array.from(e.target.files).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    setFiles(fileArray);
  };

  

  const handleUpload = async () => {
    try {
      if (files.length === 0) {
        alert('Pilih file terlebih dahulu');
        return;
      }
  
      setLoading(true);
      const formData = new FormData();
      
      // Validasi tipe file
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          alert('Hanya file gambar yang diperbolehkan');
          return;
        }
        formData.append('images', file);
      }
  
      const response = await axios.post('http://localhost:3001/convert', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
  
      if (response.data.size === 0) {
        throw new Error('PDF kosong');
      }
  
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'converted.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan saat mengkonversi file');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Image to PDF Converter</h1>
      
      <div className="mb-4">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="border p-2"
        />
      </div>

      {files.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Selected Files:</h2>
          <ul className="list-disc pl-5">
            {files.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={loading || files.length === 0}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
      >
        {loading ? 'Converting...' : 'Convert to PDF'}
      </button>
    </div>
  );
}

export default App;