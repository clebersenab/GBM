class Cancellation < ApplicationRecord
  REASONS = %w[preco poucos_livros perderam_interesse problema_tecnico so_testando outro].freeze
  belongs_to :account
  validates :nps_score, inclusion: { in: 0..10 }
  validates :reason, inclusion: { in: REASONS }, allow_nil: true
  validates :comment, length: { maximum: 2000 }
end
