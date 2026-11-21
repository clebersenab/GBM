# Código de 6 dígitos enviado por e-mail para redefinir a senha. Guardamos só o HMAC do código.
class LoginCode < ApplicationRecord
  TTL = 30.minutes
  MAX_ATTEMPTS = 5
  MAX_PER_HOUR = 5

  scope :usable, -> { where(consumed_at: nil).where("expires_at > ?", Time.current).where("attempts < ?", MAX_ATTEMPTS) }

  def self.digest(code) = OpenSSL::HMAC.hexdigest("SHA256", Rails.application.secret_key_base, code.to_s)

  # Devolve [registro, código em texto] ou nil se o limite por hora foi atingido.
  def self.issue!(email)
    return nil if where(email: email).where("created_at > ?", 1.hour.ago).count >= MAX_PER_HOUR
    code = format("%06d", SecureRandom.random_number(1_000_000))
    [create!(email: email, code_digest: digest(code), expires_at: TTL.from_now), code]
  end

  # Confere o código mais recente ainda utilizável para o e-mail.
  def self.verify(email, code)
    record = usable.where(email: email).order(created_at: :desc).first
    return false unless record
    if ActiveSupport::SecurityUtils.secure_compare(record.code_digest, digest(code))
      record.update!(consumed_at: Time.current)
      true
    else
      record.increment!(:attempts)
      false
    end
  end
end
