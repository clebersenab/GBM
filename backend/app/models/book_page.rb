# Uma página da história: ilustração, texto e a pergunta para o adulto fazer.
class BookPage < ApplicationRecord
  belongs_to :title
  belongs_to :image, class_name: "StoredImage", optional: true

  validates :text, length: { maximum: 1500 }
  validates :parent_question, length: { maximum: 300 }

  def image_url(base) = image ? image.url(base) : image_path.presence
end
