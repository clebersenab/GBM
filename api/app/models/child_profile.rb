class ChildProfile < ApplicationRecord
  AGE_BANDS = %w[0-2 3-5 6-8].freeze
  AVATARS = %w[raposa leao baleia coruja tartaruga elefante].freeze

  belongs_to :account

  validates :name, presence: true, length: { maximum: 30 }
  validates :age_band, inclusion: { in: AGE_BANDS }
  validates :avatar, inclusion: { in: AVATARS }
  validate :profile_limit, on: :create

  private

  def profile_limit
    return unless account && account.child_profiles.count >= Account::MAX_PROFILES
    errors.add(:base, "limite de #{Account::MAX_PROFILES} perfis por família")
  end
end
