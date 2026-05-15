// AI integrations — not configured yet. Replace with real implementations when needed.

export const InvokeLLM = async () => {
  throw new Error('AI search not configured. Please enter nutritional values manually.');
};

export const UploadFile = async () => {
  throw new Error('File upload not configured.');
};

export const ExtractDataFromUploadedFile = async () => {
  throw new Error('File extraction not configured.');
};

export const SendEmail = async () => {
  throw new Error('Email not configured.');
};

export const GenerateImage = async () => {
  throw new Error('Image generation not configured.');
};

export const Core = {
  InvokeLLM,
  SendEmail,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
};
