class ChildProfile < ApplicationRecord
  AGE_BANDS = %w[0-2 3-5 6-8].freeze
  AVATARS = %w[raposa leao baleia coruja tartaruga cabra onca papagaio].freeze

  belongs_to :account
  has_many :reading_entries, dependent: :destroy
  has_many :profile_signals, dependent: :destroy

  validates :name, presence: true, length: { maximum: 30 }
  validates :age_band, inclusion: { in: AGE_BANDS }
  validates :avatar, inclusion: { in: AVATARS }
  validate :profile_limit, on: :create
  validate :focus_size

  def view = slice(:id, :name, :avatar, :age_band, :focus_valores, :focus_caminhos)

  private

  def focus_size
    errors.add(:base, "escolha até 5 valores e 5 jornadas") if focus_valores.size > 5 || focus_caminhos.size > 5
  end

  def profile_limit
    return unless account && account.child_profiles.count >= Account::MAX_PROFILES
    errors.add(:base, "limite de #{Account::MAX_PROFILES} perfis por família")
  end
end
