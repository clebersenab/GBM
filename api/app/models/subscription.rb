# Sem gateway por enquanto: quem altera é o admin ou um código de ativação.
class Subscription < ApplicationRecord
  PLANS = %w[mensal anual].freeze
  STATUSES = %w[active canceled].freeze
  SOURCES = %w[admin codigo gateway].freeze

  belongs_to :account

  validates :plan, inclusion: { in: PLANS }
  validates :status, inclusion: { in: STATUSES }
  validates :source, inclusion: { in: SOURCES }
  validates :current_period_end, presence: true

  # Ativa = status ativo e período pago ainda em curso.
  def active? = status == "active" && current_period_end > Time.current

  def cancel! = update!(status: "canceled", canceled_at: Time.current)

  # Soma meses a partir do fim do período, se ainda ativo, ou a partir de agora.
  def extend_by!(months, source:)
    base = active? ? current_period_end : Time.current
    update!(status: "active", canceled_at: nil, source: source,
            plan: months >= 12 ? "anual" : plan, current_period_end: base + months.months)
  end
end
