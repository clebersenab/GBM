// Prepara a imagem no navegador antes de enviar: reduz o lado maior e converte para WebP.
// Assim cada ilustração fica com uns 100–300 KB, o que cabe bem no banco.
export async function prepararImagem(file, max = 1600) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error('Use uma imagem PNG, JPG ou WebP.')
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/webp', 0.85))
  if (blob?.type === 'image/webp') return blob
  return new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.88))
}
