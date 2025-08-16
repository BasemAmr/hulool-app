// Convert font files to base64 for pdfMake
export const loadFontAsBase64 = async (fontPath: string): Promise<string> => {
  try {
    const response = await fetch(fontPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binaryString);
  } catch (error) {
    console.error('Error loading font:', fontPath, error);
    throw error;
  }
};

// Font paths - these will be served as static assets from the public directory
export const FONT_PATHS = {
  amiriRegular: '/src/assets/font/Amiri-Regular.ttf',
  amiriBold: '/src/assets/font/Amiri-Bold.ttf',
  amiriItalic: '/src/assets/font/Amiri-Italic.ttf',
  amiriBoldItalic: '/src/assets/font/Amiri-BoldItalic.ttf'
};
