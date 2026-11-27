# Sessão por aparelho. O token só existe em texto no momento da criação.
class Session < ApplicationRecord
  TTL = 60.days
  MAX_DEVICES = 6           # aparelhos conectados por conta; o sétimo derruba o de uso mais antigo
  MAX_READINGS = 2          # leituras ao mesmo tempo por conta
  READING_TTL = 150.seconds # sem aviso do leitor por esse tempo, a vaga se libera

  belongs_to :account
  attr_reader :token

  scope :live, -> { where(revoked_at: nil).where("expires_at > ?", Time.current) }

  def self.digest(token) = Digest::SHA256.hexdigest(token.to_s)

  def self.start!(account, user_agent: nil, ip: nil)
    token = SecureRandom.urlsafe_base64(32)
    session = account.sessions.create!(token_digest: digest(token), user_agent: user_agent&.first(255),
                                       ip: ip, expires_at: TTL.from_now, last_used_at: Time.current)
    session.instance_variable_set(:@token, token)
    account.sessions.live.where.not(id: session.id).order(last_used_at: :desc).offset(MAX_DEVICES - 1).each(&:revoke!)
    session
  end

  def self.find_by_token(token)
    return nil if token.blank?
    live.find_by(token_digest: digest(token))
  end

  def touch_usage! = update_columns(last_used_at: Time.current, expires_at: TTL.from_now)

  def revoke! = update!(revoked_at: Time.current, reading_until: nil)

  def reading? = reading_until.present? && reading_until.future?

  # Nome legível do aparelho, a partir do navegador: "iPad · Safari", "Android · Chrome".
  def device_label
    ua = user_agent.to_s
    sistema = case ua
              when /iPad/ then "iPad"
              when /iPhone/ then "iPhone"
              when /Android/ then "Android"
              when /Macintosh|Mac OS X/ then "Mac"
              when /Windows/ then "Windows"
              when /Linux/ then "Linux"
              else "Aparelho"
              end
    navegador = case ua
                when /Edg\// then "Edge"
                when /OPR\/|Opera/ then "Opera"
                when /Firefox|FxiOS/ then "Firefox"
                when /Chrome|CriOS/ then "Chrome"
                when /Safari/ then "Safari"
                end
    [sistema, navegador].compact.join(" · ")
  end

  def view(current_id = nil)
    { id: id, aparelho: device_label, ultimo_uso: last_used_at, atual: id == current_id,
      lendo: (reading? ? reading_slug : nil) }
  end

end
