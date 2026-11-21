class Title < ApplicationRecord
  has_many :downloads, dependent: :restrict_with_error
  validates :slug, :title, presence: true
  validates :slug, uniqueness: true
  def to_param = slug
end
