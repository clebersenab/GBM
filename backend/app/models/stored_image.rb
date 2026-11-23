# Imagens enviadas pelo cadastro (capas e ilustrações), guardadas no próprio banco.
# O navegador já envia em WebP redimensionado; aqui só conferimos tipo e tamanho.
class StoredImage < ApplicationRecord
  TYPES = %w[image/webp image/jpeg image/png].freeze
  MAX_BYTES = 2_500_000

  belongs_to :account, optional: true

  validates :content_type, inclusion: { in: TYPES, message: "precisa ser WebP, JPEG ou PNG" }
  validates :byte_size, numericality: { less_than_or_equal_to: MAX_BYTES, message: "passa de 2,5 MB" }

  def self.from_upload(file, account)
    data = file.read
    create!(account: account, content_type: file.content_type.to_s, data: data, byte_size: data.bytesize,
            width: nil, height: nil)
  end

  def url(base) = "#{base}/images/#{id}"
end
