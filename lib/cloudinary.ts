// lib/cloudinary.ts
// Configuración de Cloudinary para subir fotos

const CLOUDINARY_CLOUD_NAME = 'dbyfgwf3m';
const CLOUDINARY_UPLOAD_PRESET = 'nenas-fotos';

export async function uploadToCloudinary(file: File, notaId: string, itemIndex: number): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `nenas/notas/${notaId}`);
  formData.append('public_id', `item${itemIndex}_${Date.now()}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('Cloudinary error:', error);
    throw new Error('Error al subir imagen');
  }

  const data = await response.json();
  return data.secure_url;
}

export async function deleteFromCloudinary(imageUrl: string): Promise<void> {
  // Para eliminar desde cliente necesitarías firma del servidor
  // Por simplicidad, dejamos las imágenes en Cloudinary
  // 25GB gratis es suficiente para miles de fotos
  console.log('Imagen en Cloudinary:', imageUrl);
}
