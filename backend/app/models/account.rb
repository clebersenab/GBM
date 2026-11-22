class Account < ApplicationRecord
  THEMES = %w[dark light].freeze
  has_secure_password :password, validations: false

  has_many :sessions, dependent: :destroy
  has_many :child_profiles, dependent: :destroy
  has_one :subscription, dependent: :destroy
  has_many :cancellations, dependent: :destroy
  has_many :downloads, dependent: :destroy
  has_many :owned_titles, through: :downloads, source: :title

  MAX_PROFILES = 6
  ACCESS_STATUSES = %w[cadastrado liberado bloqueado].freeze

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 8, message: "deve ter pelo menos 8 caracteres" }, allow_nil: true
  validates :access_status, inclusion: { in: ACCESS_STATUSES }
  validates :theme, inclusion: { in: THEMES }, allow_nil: true
  validate :release_period, if: -> { access_status == "liberado" }

  normalizes :email, with: ->(e) { e.to_s.strip.downcase }

  # Liberado pelo admin dentro do período definido.
  def released?
    access_status == "liberado" && access_from.present? && access_until.present? &&
      Time.current.between?(access_from, access_until)
  end

  # Acesso pleno: liberação manual vigente OU assinatura paga ativa. Bloqueio vence tudo.
  def full_access?
    return false if access_status == "bloqueado"
    released? || subscription&.active? || false
  end

  def renewal_canceled? = renewal_canceled_at.present?

  def owns?(title) = downloads.exists?(title_id: title.id)

  def access_summary
    sub = subscription
    reason = if access_status == "bloqueado" then "bloqueado"
             elsif released? then "liberado"
             elsif sub&.active? then "assinatura"
             else "sem_acesso"
             end
    { full_access: full_access?, reason: reason, access_status: access_status,
      access_until: (access_until if access_status == "liberado"),
      subscription: sub && { plan: sub.plan, status: sub.status, active: sub.active?, current_period_end: sub.current_period_end } }
  end

  private

  def release_period
    errors.add(:access_from, "obrigatório para liberar") if access_from.blank?
    errors.add(:access_until, "obrigatório para liberar") if access_until.blank?
    errors.add(:access_until, "deve ser depois do início") if access_from && access_until && access_until <= access_from
  end
end
