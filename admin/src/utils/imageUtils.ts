export const imageUrlToPngBase64 = async (url: string): Promise<string> => {
    try {
        // Use fetch to get the image as a blob (better CORS handling)
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();

        // Convert blob to base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;

                // Always convert through canvas to ensure PNG format for PDF compatibility
                // (React-PDF doesn't support WebP, so we must convert even if it's already a data URL)

                // Otherwise, we need to convert through canvas to ensure PNG format
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0);
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL);
                };
                img.onerror = (e) => reject(e);
                img.src = result;
            };
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error in imageUrlToPngBase64:', error);
        throw error;
    }
};
