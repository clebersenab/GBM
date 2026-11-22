class ProfileSignal < ApplicationRecord
  KINDS = %w[valor caminho].freeze
  belongs_to :child_profile
  validates :kind, inclusion: { in: KINDS }
  validates :key, presence: true, length: { maximum: 40 }

  def self.bump!(profile, kind, key)
    s = profile.profile_signals.find_or_initialize_by(kind: kind, key: key)
    s.count += 1
    s.last_at = Time.current
    s.save!
    s
  end
end
