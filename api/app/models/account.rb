class Account < ApplicationRecord
  has_secure_password :pin, validations: false

  has_many :sessions, dependent: :destroy
  has_many :child_profiles, dependent: :destroy
  has_one :subscription, dependent: :destroy
  has_many :downloads, dependent: :destroy
  has_many :owned_titles, through: :downloads, source: :title

  MAX_PROFILES = 6

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :pin, format: { with: /\A\d{4}\z/, message: "deve ter 4 dígitos" }, allow_nil: true

  def pin_set? = pin_digest.present?

  def subscription_active? = subscription&.active? || false

  def owns?(title) = downloads.exists?(title_id: title.id)
end
