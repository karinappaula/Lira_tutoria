// Arquivos e imagens são enviados pelo frontend direto ao Cloudinary
// (upload sem assinatura). O backend só aceita referências a essa conta.
export function urlCloudinaryValida(url: string): boolean {
  let endereco: URL;
  try {
    endereco = new URL(url);
  } catch {
    return false;
  }
  const nuvem = process.env.CLOUDINARY_CLOUD_NAME;
  const prefixo = nuvem ? `/${nuvem}/` : "/";
  return (
    endereco.protocol === "https:" &&
    endereco.hostname === "res.cloudinary.com" &&
    endereco.pathname.startsWith(prefixo)
  );
}
