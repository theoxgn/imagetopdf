import React, { useState } from 'react';
import axios from 'axios';
import { Switch } from '@headlessui/react';

function App() {
  
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPDF, setIsPDF] = useState(true);
  const [orderData, setOrderData] = useState({
    koNumber: '',
    orderDate: '',
    assignment: '',
    confirmationDate: ''
  });


  // Fungsi untuk mengekstrak nomor dan caption dari nama file
  const extractNumberAndCaption = (filename) => {
    const nameWithoutExt = filename.split('.')[0];
    const number = parseInt(nameWithoutExt.split('_')[0]) || 0;
    return { 
      number,
      filename // Return original filename
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrderData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear errors on input change
  };


  // const handleFileChange = (e) => {
  //   try {
  //     const fileList = Array.from(e.target.files);

  //     const sortedFiles = fileList.sort((a, b) => {
  //       const numA = parseInt(a.name.split('_')[0]) || 0;
  //       const numB = parseInt(b.name.split('_')[0]) || 0;
  //       return numA - numB;
  //     });

  //     setFiles(sortedFiles);
  //     setError('');
  //   } catch (err) {
  //     setError(err.message);
  //     e.target.value = ''; // Reset input
  //   }
  // };

  const handleFileChange = (e) => {
    try {
      const fileList = Array.from(e.target.files);
      const sortedFiles = fileList.sort((a, b) => {
        const numA = parseInt(a.name.split('_')[0]) || 0;
        const numB = parseInt(b.name.split('_')[0]) || 0;
        return numA - numB;
      });
  
      // Add index number to each file
      const numberedFiles = sortedFiles.map((file, index) => {
        const numberedFile = new File([file], file.name, { type: file.type });
        numberedFile.index = index + 1; // Add 1-based index
        return numberedFile;
      });
  
      setFiles(numberedFiles);
      setError('');
    } catch (err) {
      setError(err.message);
      e.target.value = '';
    }
  };

  const handleUpload = async () => {
    try {
      if (files.length === 0) {
        alert('Pilih file terlebih dahulu');
        return;
      }

      if (!orderData.koNumber || !orderData.orderDate || !orderData.assignment || !orderData.confirmationDate) {
        alert('Semua field harus diisi');
        return;
      }

      setLoading(true);
      const formData = new FormData();
      
      Object.entries(orderData).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      files.forEach((file) => {
        formData.append('images', file);
      });

      const endpoint = isPDF ? '/convert-pdf' : '/convert-doc';
      
      const response = await axios.post(`http://localhost:3001${endpoint}`, formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.size === 0) {
        throw new Error('File kosong');
      }

      // Generate filename
      const fileName = `${orderData.koNumber} - Lampiran Design ${orderData.assignment}`.replace(/[/\\?%*:|"<>]/g, '-');

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileName}.${isPDF ? 'pdf' : 'docx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      // Reset form after successful conversion
      setFiles([]);
      document.querySelector('input[type="file"]').value = '';
      
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Terjadi kesalahan saat mengkonversi file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Image Converter</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Format Switch */}
      <div className="flex items-center space-x-4 mb-6">
        <span className={`text-sm ${!isPDF ? 'text-gray-500' : 'text-black font-medium'}`}>PDF</span>
        <Switch
          checked={!isPDF}
          onChange={() => setIsPDF(!isPDF)}
          className={`${
            !isPDF ? 'bg-blue-600' : 'bg-gray-200'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
        >
          <span
            className={`${
              !isPDF ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
        <span className={`text-sm ${isPDF ? 'text-gray-500' : 'text-black font-medium'}`}>DOC</span>
      </div>

      {/* Form Input */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Nomor KO:</label>
          <input
            type="text"
            name="koNumber"
            value={orderData.koNumber}
            onChange={handleInputChange}
            className="border rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0060/KO/AZ/IV/2024"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Tanggal KO:</label>
          <input
            type="date"
            name="orderDate"
            value={orderData.orderDate}
            onChange={handleInputChange}
            className="border rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Penugasan:</label>
          <input
            type="text"
            name="assignment"
            value={orderData.assignment}
            onChange={handleInputChange}
            className="border rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Internal Web"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Tanggal Konfirmasi:</label>
          <input
            type="date"
            name="confirmationDate"
            value={orderData.confirmationDate}
            onChange={handleInputChange}
            className="border rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Upload Gambar:</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="border rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Preview Files */}
      {files.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Selected Files:</h2>
          <ul className="space-y-2">
          {/* {files.map((file, index) => {
              const { number } = extractNumberAndCaption(file.name);
              return (
                <li key={index} className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  <div className="font-medium text-gray-800">
                    {number}. {file.name}
                  </div>
                </li>
              );
            })} */}

            {files.map((file, index) => (
              <li key={index} className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <div className="font-medium text-gray-800">
                  {file.index}. {file.name}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Convert Button */}
      <button
        onClick={handleUpload}
        disabled={loading || files.length === 0}
        className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Converting...' : `Convert to ${isPDF ? 'PDF' : 'DOC'}`}
      </button>
    </div>
  );
}

export default App;