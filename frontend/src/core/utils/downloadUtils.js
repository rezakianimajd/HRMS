import axiosInstance from '../api/axiosConfig';

/**
 * دانستن نام فایل از هدر Content-Disposition پاسخ.
 */
const filenameFromDisposition = (disposition, fallback) => {
  if (!disposition) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8 && utf8[1]) return decodeURIComponent(utf8[1]);
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain && plain[1] ? plain[1] : fallback;
};

/**
 * خواندن پیام خطا وقتی پاسخ سرور Blob است (خطاهای DRF مثل 401/400).
 */
const messageFromBlob = async (blob) => {
  try {
    const text = await blob.text();
    try {
      const data = JSON.parse(text);
      return data?.detail || data?.error || data?.message || text.slice(0, 300) || 'خطا در تهیهٔ فایل';
    } catch {
      return text.slice(0, 300) || 'خطا در تهیهٔ فایل';
    }
  } catch {
    return 'خطا در تهیهٔ فایل';
  }
};

/**
 * دانلود فایل از API با احراز هویت (JWT).
 *
 * چرا از window.open استفاده نمی‌کنیم؟ چون درخواستِ تب جدید هدر
 * `Authorization: Bearer ...` را نمی‌فرستد و سرور پاسخ
 * «Authentication credentials were not provided.» می‌دهد. این تابع با axios
 * و `responseType: 'blob'` فایل را می‌گیرد (توکن توسط interceptor اضافه می‌شود)
 * و سپس آن را با نام اصلی از `Content-Disposition` ذخیره می‌کند.
 */
const downloadFile = async (url, { params, filename = '', fallbackName = 'download' } = {}) => {
  let response;
  try {
    response = await axiosInstance.get(url, { params, responseType: 'blob' });
  } catch (error) {
    const data = error?.response?.data;
    if (data instanceof Blob) {
      throw new Error(await messageFromBlob(data));
    }
    throw error;
  }

  const name = filename || filenameFromDisposition(
    response.headers?.['content-disposition'], fallbackName,
  );
  const type = response.headers?.['content-type'] || 'application/octet-stream';
  const objectUrl = URL.createObjectURL(new Blob([response.data], { type }));

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  return name;
};

export default downloadFile;
