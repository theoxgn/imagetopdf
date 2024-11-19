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
    confirmationDate: '',
    imageRatio: '',
    smallImageRatio: '' // Tambah state untuk small image ratio
  });

  const [useCustomRatio, setUseCustomRatio] = useState(false);
  const [useSmallImageRatio, setUseSmallImageRatio] = useState(false);
  const [hasSmallImages, setHasSmallImages] = useState(false); // Track if there are small images

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
    
    // Validasi untuk input ratio
    if (name === 'imageRatio' || name === 'smallImageRatio') {
      const numValue = value === '' ? '' : parseFloat(value);
      if (value === '' || (!isNaN(numValue) && numValue > 0)) {
        setOrderData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else {
      setOrderData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
  };


  const handleFileChange = (e) => {
    try {
      const fileList = Array.from(e.target.files);
      const sortedFiles = fileList.sort((a, b) => {
        const numA = parseInt(a.name.split('_')[0]) || 0;
        const numB = parseInt(b.name.split('_')[0]) || 0;
        return numA - numB;
      });
  
      // Check for small images
      const checkSmallImages = async () => {
        let hasSmall = false;
        for (const file of sortedFiles) {
          const img = new Image();
          const url = URL.createObjectURL(file);
          
          await new Promise((resolve) => {
            img.onload = () => {
              if (img.width < 360) {
                hasSmall = true;
              }
              URL.revokeObjectURL(url);
              resolve();
            };
            img.src = url;
          });
        }
        setHasSmallImages(hasSmall);
      };

      checkSmallImages();
  
      // Add index number to each file
      const numberedFiles = sortedFiles.map((file, index) => {
        const numberedFile = new File([file], file.name, { type: file.type });
        numberedFile.index = index + 1;
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
      // Validasi ratio jika diaktifkan
      if (useCustomRatio && !orderData.imageRatio) {
        alert('Masukkan ratio gambar');
        return;
      }

      if (useSmallImageRatio && hasSmallImages && !orderData.smallImageRatio) {
        alert('Masukkan ratio untuk gambar kecil');
        return;
      }

      setLoading(true);
      const formData = new FormData();
      
      // Append semua data termasuk ratio
      Object.entries(orderData).forEach(([key, value]) => {
        if (!useCustomRatio && key === 'imageRatio') return;
        if (!useSmallImageRatio && key === 'smallImageRatio') return;
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

      {/* Image Ratio Controls */}
      <div className="mb-6 space-y-4">
        {/* Normal Image Ratio */}
        <div className="border-b pb-4">
          <div className="flex items-center space-x-4 mb-2">
            <Switch
              checked={useCustomRatio}
              onChange={setUseCustomRatio}
              className={`${
                useCustomRatio ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
            >
              <span
                className={`${
                  useCustomRatio ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
            <span className="text-sm font-medium">Rasio Gambar Tertentu</span>
          </div>

          {useCustomRatio && (
            <div className="mt-2">
              <label className="block text-sm font-medium mb-2">Rasio Gambar (lebar:tinggi):</label>
              <input
                type="number"
                name="imageRatio"
                value={orderData.imageRatio}
                onChange={handleInputChange}
                min="0.1"
                step="0.1"
                placeholder="Contoh: 1.5 untuk rasio 3:2"
                className="border rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Masukkan angka desimal. Contoh: 1.33 untuk rasio 4:3, 1.78 untuk rasio 16:9
              </p>
            </div>
          )}
        </div>

        {/* Small Image Ratio - hanya muncul jika ada gambar kecil */}
        {hasSmallImages && (
          <div className="border-t pt-4">
            <div className="flex items-center space-x-4 mb-2">
              <Switch
                checked={useSmallImageRatio}
                onChange={setUseSmallImageRatio}
                className={`${
                  useSmallImageRatio ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
              >
                <span
                  className={`${
                    useSmallImageRatio ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
              <span className="text-sm font-medium">Rasio Khusus untuk Gambar Kecil (&lt;360px)</span>
            </div>

            {useSmallImageRatio && (
              <div className="mt-2">
                <label className="block text-sm font-medium mb-2">
                  Rasio untuk Gambar Kecil (lebar:tinggi):
                </label>
                <input
                  type="number"
                  name="smallImageRatio"
                  value={orderData.smallImageRatio}
                  onChange={handleInputChange}
                  min="0.1"
                  step="0.1"
                  placeholder="Contoh: 1.5 untuk rasio 3:2"
                  className="border rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Rasio ini hanya akan diterapkan pada gambar dengan lebar kurang dari 360px
                </p>
              </div>
            )}
          </div>
        )}
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