/**
 * Serviço de upload direto no Cloudinary (unsigned upload).
 * Cloud Name: iduhyhxd
 * Upload Preset: tutoria_questoes
 */

export const CLOUDINARY_CONFIG = {
  cloudName: 'iduhyhxd',
  uploadPreset: 'tutoria_questoes',
  uploadUrl: 'https://api.cloudinary.com/v1_1/iduhyhxd/auto/upload',
} as const;

export interface UploadCloudinaryResultado {
  url: string;
  nomeArquivo: string;
  tipoArquivo: string;
  tamanho: number;
}

export async function uploadArquivoCloudinary(arquivo: File): Promise<UploadCloudinaryResultado> {
  const formData = new FormData();
  formData.append('file', arquivo);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  const resposta = await fetch(CLOUDINARY_CONFIG.uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!resposta.ok) {
    let detalhe = 'Falha no envio do arquivo para o Cloudinary.';
    try {
      const err = await resposta.json();
      if (err?.error?.message) {
        detalhe = err.error.message;
      }
    } catch {
      // Ignora erro ao parsear corpo do erro
    }
    throw new Error(detalhe);
  }

  const dados = await resposta.json();
  const urlFinal: string = dados.secure_url || dados.url;

  return {
    url: urlFinal,
    nomeArquivo: arquivo.name,
    tipoArquivo: arquivo.type || (arquivo.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
    tamanho: arquivo.size,
  };
}

/**
 * Upload específico para imagens de questões (unsigned preset 'tutoria_questoes').
 * Conforme ESPECIFICACAO_TECNICA.md seção 4.2.1.
 */
export async function uploadImagemCloudinary(arquivo: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', arquivo);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  const resposta = await fetch('https://api.cloudinary.com/v1_1/iduhyhxd/image/upload', {
    method: 'POST',
    body: formData,
  });

  if (!resposta.ok) {
    let detalhe = 'Falha ao enviar imagem da questão.';
    try {
      const err = await resposta.json();
      if (err?.error?.message) {
        detalhe = err.error.message;
      }
    } catch {
      // Ignora erro ao parsear corpo do erro
    }
    throw new Error(detalhe);
  }

  const dados = await resposta.json();
  return (dados.secure_url || dados.url) as string;
}
