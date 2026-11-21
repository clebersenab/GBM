# Sessão por aparelho. O token só existe em texto no momento da criação.
class Session < ApplicationRecord
  TTL = 60.days
  PARENT_WINDOW = 10.minutes

  belongs_to :account
  attr_reader :token

  scope :live, -> { where(revoked_at: nil).where("expires_at > ?", Time.current) }

  def self.digest(token) = Digest::SHA256.hexdigest(token.to_s)

  def self.start!(account, user_agent: nil, ip: nil)
    token = SecureRandom.urlsafe_base64(32)
    session = account.sessions.create!(token_digest: digest(token), user_agent: user_agent&.first(255),
                                       ip: ip, expires_at: TTL.from_now, last_used_at: Time.current)
    session.instance_variable_set(:@token, token)
    session
  end

  def self.find_by_token(token)
    return nil if token.blank?
    live.find_by(token_digest: digest(token))
  end

  def touch_usage! = update_columns(last_used_at: Time.current, expires_at: TTL.from_now)

  def revoke! = update!(revoked_at: Time.current)

  def parent_unlocked? = parent_unlocked_until.present? && parent_unlocked_until > Time.current

  def unlock_parent! = update!(parent_unlocked_until: PARENT_WINDOW.from_now)

  def lock_parent! = update!(parent_unlocked_until: nil)
end
