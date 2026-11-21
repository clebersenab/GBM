# Plano vendido em loja parceira, ativado pelo cliente no site.
class ActivationCode < ApplicationRecord
  ALPHABET = %w[A B C D E F G H J K L M N P Q R S T U V W X Y Z 2 3 4 5 6 7 8 9].freeze # sem 0/O e 1/I

  belongs_to :redeemed_by, class_name: "Account", optional: true

  validates :code, presence: true, uniqueness: true
  validates :months, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 24 }

  before_validation { self.code ||= self.class.generate }

  def self.generate = Array.new(3) { Array.new(4) { ALPHABET.sample(random: SecureRandom) }.join }.join("-")

  def self.normalize(raw) = raw.to_s.upcase.gsub(/[^A-Z0-9]/, "").scan(/.{1,4}/).join("-")

  def redeemed? = redeemed_at.present?
  def expired? = expires_at.present? && expires_at <= Time.current

  # Resgata para a conta. Devolve nil em caso de sucesso ou o motivo da recusa.
  def redeem!(account)
    with_lock do
      return "código já utilizado" if redeemed?
      return "código expirado" if expired?
      sub = account.subscription || account.build_subscription(current_period_end: Time.current)
      sub.save! if sub.new_record?
      sub.extend_by!(months, source: "codigo")
      update!(redeemed_by: account, redeemed_at: Time.current)
    end
    nil
  end
end
