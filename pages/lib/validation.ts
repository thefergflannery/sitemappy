export const validateWebsite = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual'
    });

    // Check for redirects
    if (response.status >= 300 && response.status < 400) {
      return false;
    }

    // Check content type from headers
    const contentType = response.headers.get('content-type') || '';
    return contentType.startsWith('text/html');
  } catch (error) {
    return false;
  }
};