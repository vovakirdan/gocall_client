export const getLocalStream = async (): Promise<MediaStream> => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Не удалось получить доступ к камере и микрофону.');
    }
  } else {
    console.error('navigator.mediaDevices.getUserMedia is not available');
    throw new Error('Ваша среда выполнения не поддерживает доступ к медиаустройствам.');
  }
};